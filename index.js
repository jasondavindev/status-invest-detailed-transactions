const axios = require("axios").default;
const querystring = require("querystring");

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
    referenceDate,
    rank,
    operationType_F,
  } = transaction;

  return {
    code,
    quantity,
    unitValue,
    totalValue,
    referenceDate,
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

  const newPriceAvg = isSale(transaction)
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
  if (isSale(transaction)) {
    transaction.profit =
      Math.round(
        (transaction.unitValue - prevPriceAvg) * transaction.quantity * 100
      ) / 100;
  }
};

const detailTransaction = (acc, transaction, idx, transactionsArray) => {
  const { prevPriceAvg, prevPosition } = getPreviousPositionAndPriceAvg(
    transactionsArray,
    idx
  );

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

const getDetailedTransactions = (transactions) => {
  return transactions
    .map(mapTransaction)
    .reverse()
    .reduce(detailTransaction, []);
};

const processTransactionsByTicker = async (ticker) => {
  const transactions = await findTransactions(process.env.COOKIE);
  const tickerTransactions = transactions.filter((t) => t.code === ticker);
  const result = getDetailedTransactions(tickerTransactions);
  const groupByDate = groupTransactionsBy(result, "rank");
  console.log(JSON.stringify(groupByDate, null, 4));
};

const groupTransactionsBy = (transactions, field) =>
  transactions.reduce((acc, item) => {
    const key = item[field];
    return { ...acc, [key]: [...(acc[key] || []), item] };
  }, {});

(async () => {
  await processTransactionsByTicker(process.env.TICKER);
})();
