const axios = require("axios").default;
const querystring = require("querystring");
const example = require("./example/simple.json");

const findTransactions = async (cookie) => {
  try {
    const response = await axios.post(
      "https://statusinvest.com.br/AdmWallet/TransactionMainResult",
      querystring.stringify({
        brokerId: "",
        groupView: "0",
        type: "6",
      }),
      {
        headers: {
          cookie: cookie,
        },
      }
    );
    return response.data.data[0].item2;
  } catch (error) {
    console.log("Status Invest request error");
    process.exit(1);
  }
};

const mapTransaction = (transaction) => {
  const {
    code,
    quantity,
    unitValue,
    totalValue,
    rank,
    operationType_F,
  } = transaction;

  return {
    code,
    quantity,
    unitValue,
    totalValue,
    rank,
    operation: operationType_F.toLowerCase(),
  };
};

const isSale = (transaction) => transaction.operation === "venda";

const getNewPositionAndPriceAvg = (
  prevPosition,
  prevPriceAvg,
  transaction,
  mod
) => {
  const newPosition = prevPosition + transaction.quantity * mod;

  const newPriceAvg =
    isSale(transaction) || transaction.isDayTrade
      ? prevPriceAvg
      : (prevPosition * prevPriceAvg + transaction.totalValue * mod) /
        newPosition;

  const newPriceAvgRounded = Math.round(newPriceAvg * 100) / 100;

  return { newPosition, newPriceAvgRounded };
};

const getPreviousPositionAndPriceAvg = (transactions, idx) => {
  let { newPriceAvg: prevPriceAvg, newPosition: prevPosition } =
    transactions[idx - 1] ?? {};

  prevPriceAvg = prevPriceAvg || 0;
  prevPosition = prevPosition || 0;

  return { prevPriceAvg, prevPosition };
};

const setProfit = (transaction, prevPriceAvg) => {
  if (isSale(transaction) && !transaction.isDayTrade) {
    transaction.profit =
      Math.round(
        (transaction.unitValue - prevPriceAvg) * transaction.quantity * 100
      ) / 100;
  }
};

const detailTransactions = (acc, transaction, idx, transactionsArray) => {
  const { prevPriceAvg, prevPosition } = transaction.prevPriceAvg
    ? transaction
    : getPreviousPositionAndPriceAvg(transactionsArray, idx);

  const mod = isSale(transaction) ? -1 : 1;

  const { newPosition, newPriceAvgRounded } = getNewPositionAndPriceAvg(
    prevPosition,
    prevPriceAvg,
    transaction,
    mod
  );

  transaction.newPriceAvg = [-Infinity, Infinity].includes(newPriceAvgRounded)
    ? 0
    : newPriceAvgRounded;
  transaction.newPosition = newPosition;
  transaction.prevPosition = prevPosition;
  transaction.prevPriceAvg = prevPriceAvg;

  setProfit(transaction, prevPriceAvg);

  return [...acc, transaction];
};

const hasDayTrade = (transactions) =>
  new Set(transactions.map((t) => t.operation)).size > 1;

const fillDayTradeAccumulator = (transactions) =>
  transactions.reduce((acc, transaction, idx, transactionsArray) => {
    const previousTransaction = transactionsArray[idx - 1] ?? {};
    let { daytradeAccumulator = 0 } = previousTransaction;

    if (isSale(transaction)) {
      daytradeAccumulator += transaction.totalValue;
    } else if (daytradeAccumulator >= 0) {
      daytradeAccumulator -= transaction.totalValue;
    }

    transaction.daytradeAccumulator = daytradeAccumulator;

    return [...acc, { ...transaction, daytradeAccumulator }];
  }, []);

const formatTransactions = (transactions) =>
  transactions.map(mapTransaction).reverse();

const getDetailedTransactions = (buckets) => {
  let [lastPriceAvg, lastPosition] = [0, 0];

  return Object.entries(buckets).reduce((acc, bucket) => {
    const [rank, transactions] = bucket;

    let filledTransactions = transactions;
    filledTransactions[0].prevPriceAvg = lastPriceAvg;
    filledTransactions[0].prevPosition = lastPosition;

    if (hasDayTrade(filledTransactions)) {
      const mappedTransactions = filledTransactions.map((t) => ({
        ...t,
        isDayTrade: true,
      }));

      filledTransactions = fillDayTradeAccumulator(mappedTransactions);
    }

    filledTransactions = filledTransactions.reduce(detailTransactions, []);
    const lastTransaction = filledTransactions[filledTransactions.length - 1];
    lastPriceAvg = lastTransaction.newPriceAvg;
    lastPosition = lastTransaction.newPosition;

    return {
      ...acc,
      [rank]: filledTransactions,
    };
  }, {});
};

const consolidate = (transactions) =>
  Object.values(transactions)
    .flatMap((t) => t)
    .reduce((acc, item) => acc + (item.profit ?? 0), 0);

const processTransactionsByTicker = async (ticker) => {
  const transactions = await findTransactions(process.env.COOKIE);
  const tickerTransactions = transactions.filter((t) => t.code === ticker);
  const formattedTransactions = formatTransactions(tickerTransactions);
  const groupByDate = groupTransactionsBy(formattedTransactions, "rank");
  const detailedTransactions = getDetailedTransactions(groupByDate);
  console.log(JSON.stringify(detailedTransactions, null, 4));
  console.log("Consolidate: " + consolidate(detailedTransactions));
};

const groupTransactionsBy = (transactions, field) =>
  transactions.reduce((acc, item) => {
    const key = item[field];
    return {
      ...acc,
      [key]: [...(acc[key] || []), item],
    };
  }, {});

(async () => {
  await processTransactionsByTicker(process.env.TICKER);
})();
