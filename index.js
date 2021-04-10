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

const getDetailedTransactions = (transactions) => {
  return transactions
    .map((t) => {
      const {
        code,
        quantity,
        unitValue,
        totalValue,
        referenceDate,
        rank,
        operationType_F,
      } = t;

      return {
        code,
        quantity,
        unitValue,
        totalValue,
        referenceDate,
        rank,
        operation: operationType_F.toLowerCase(),
      };
    })
    .reverse()
    .reduce((acc, tran, idx, array) => {
      let { newAvgPrice: prevAvgPrice, newPosition: prevPosition } =
        array[idx - 1] ?? {};

      prevAvgPrice = prevAvgPrice || 0;
      prevPosition = prevPosition || 0;

      const mod = tran.operation === "compra" ? 1 : -1;

      const newAvgPrice =
        (prevPosition * prevAvgPrice + tran.totalValue * mod) /
        (prevPosition + tran.quantity * mod);
      const newPosition = prevPosition + tran.quantity * mod;

      const newAvgPriceRounded = Math.round(newAvgPrice * 100) / 100;

      tran.newAvgPrice = [-Infinity, Infinity].includes(newAvgPriceRounded)
        ? 0
        : newAvgPriceRounded;
      tran.newPosition = newPosition;
      tran.prevPosition = prevPosition;
      tran.prevAvgPrice = prevAvgPrice;

      if (tran.operation === "venda") {
        tran.profit =
          Math.round((tran.unitValue - prevAvgPrice) * tran.quantity * 100) /
          100;
      }

      return [...acc, tran];
    }, []);
};

const processTransactionsByTicker = async (ticker) => {
  const transactions = await findTransactions(process.env.COOKIE);
  const tickerTransactions = transactions.filter((t) => t.code === ticker);
  const result = getDetailedTransactions(tickerTransactions);
  console.log(JSON.stringify(result, null, 4));
};

(async () => {
  await processTransactionsByTicker(process.env.TICKER);
})();
