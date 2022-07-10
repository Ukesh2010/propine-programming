const args = require("yargs").argv;
const axios = require("axios");
const fs = require("fs");
const fastCSV = require("fast-csv");

const API_KEY =
  "49eba55a4d05cb02073c57d26df63e232773321deac73dd0e7add57ff422eb4d";
const URL =
  "https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH&tsyms=USD&api_key=" +
  API_KEY;
const file = "transactions.csv";

const { token, date } = args;

const convertEpochToDate = (epoch) => {
  return new Date(epoch * 1000);
};

const getAmountInUSD = (amount, usdRate) => {
  return (amount * usdRate).toFixed(2);
};

const processTransaction = (row, data) => {
  const typeData = data[row.token];

  if (row.transaction_type === "DEPOSIT") {
    typeData.amount = typeData.amount + row.amount;
  } else {
    typeData.amount = typeData.amount - row.amount;
  }

  typeData.amount = row.amount;
  if (row.timestamp > typeData.timestamp) {
    typeData.timestamp = row.timestamp;
  }
};

const getLatestPortfolioValuePerToken = () => {
  return new Promise((resolve, reject) => {
    const data = {
      BTC: { amount: 0, timestamp: 0 },
      ETH: { amount: 0, timestamp: 0 },
      XRP: { amount: 0, timestamp: 0 },
    };

    fs.createReadStream(file)
      .pipe(fastCSV.parse({ headers: true }))
      .on("error", (error) => {
        reject(error);
      })
      .on("data", (row) => {
        processTransaction(row, data);
      })
      .on("end", (rowCount) => {
        resolve(data);
      });
  });
};

(async () => {
  const response = await axios.get(URL);
  const usdRate = response.data.ETH.USD || 0;

  if (!token && !date) {
    console.log("No arguments are provided.");
    console.log("Calculating...");

    const data = await getLatestPortfolioValuePerToken();

    console.log(`Latest portfolio values:\n`);
    console.log(
      `XRP (${convertEpochToDate(data.XRP.timestamp)}): $${getAmountInUSD(
        data.XRP.amount,
        usdRate
      )}\n`
    );
    console.log(
      `ETH (${convertEpochToDate(data.ETH.timestamp)}): $${getAmountInUSD(
        data.ETH.amount,
        usdRate
      )}\n`
    );
    console.log(
      `BTC (${convertEpochToDate(data.BTC.timestamp)}): $${getAmountInUSD(
        data.BTC.amount,
        usdRate
      )}\n`
    );
  } else if (token && !date) {
    console.log("Token is provided.", token);
  } else if (!token && !date) {
    console.log("Date is provided.", date);
  } else {
    console.log("Token and Date both are provided.", { token, date });
  }
})();