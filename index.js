const args = require("yargs").argv;
const axios = require("axios");
const fs = require("fs");
const fastCSV = require("fast-csv");

const API_KEY =
  "49eba55a4d05cb02073c57d26df63e232773321deac73dd0e7add57ff422eb4d";
const URL =
  "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,XRP&tsyms=USD&api_key=" +
  API_KEY;
const file = "transactions.csv";

const { token, date } = args;

const convertEpochToDate = (epoch) => {
  return new Date(epoch * 1000);
};

const getAmountInUSD = (amount, usdRate) => {
  return (amount * usdRate).toFixed(2);
};

const getEndOfDay = (date) => {
  const dateInstance = new Date(date);
  dateInstance.setHours(23, 59, 59, 999);

  return dateInstance;
};

const processTransaction = (row, data, token, date) => {
  if (token && token !== row.token) {
    return;
  }

  if (date) {
    const rowDate = convertEpochToDate(row.timestamp);
    const isRowAfterDate = rowDate.getTime() > date.getTime();
    if (isRowAfterDate) {
      return;
    }
  }

  const typeData = data[row.token];

  if (row.transaction_type === "DEPOSIT") {
    typeData.amount = typeData.amount + row.amount;
  } else {
    typeData.amount = typeData.amount - row.amount;
  }

  typeData.amount = row.amount;
  if (!date) {
    if (row.timestamp > typeData.timestamp) {
      typeData.timestamp = row.timestamp;
    }
  }
};

const getLatestPortfolioValuePerToken = (token, date) => {
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
        processTransaction(row, data, token, date);
      })
      .on("end", (rowCount) => {
        resolve(data);
      });
  });
};

(async () => {
  const response = await axios.get(URL);
  const rates = response.data || 0;

  if (!token && !date) {
    console.log("No arguments are provided.");
    console.log("Calculating...");

    const data = await getLatestPortfolioValuePerToken();

    console.log(`Latest portfolio values:\n
              XRP (${convertEpochToDate(
                data.XRP.timestamp
              )}): $${getAmountInUSD(data.XRP.amount, rates?.XRP?.USD || 0)}\n
              ETH (${convertEpochToDate(
                data.ETH.timestamp
              )}): $${getAmountInUSD(data.ETH.amount, rates?.ETH?.USD || 0)}\n  
              BTC (${convertEpochToDate(
                data.BTC.timestamp
              )}): $${getAmountInUSD(
      data.BTC.amount,
      rates?.BTC?.USD || 0
    )}\n    
    `);
  } else if (token && !date) {
    console.log("Token is provided.", token);
    console.log("Calculating...");

    const data = await getLatestPortfolioValuePerToken(token);
    const tokenData = data[token];

    console.log(
      `Latest portfolio value for ${token} on (${convertEpochToDate(
        tokenData.timestamp
      )}): $${getAmountInUSD(tokenData.amount, rates[token]?.USD)}\n`
    );
  } else if (!token && date) {
    console.log("Date is provided.", date);
    console.log("Calculating...");

    const data = await getLatestPortfolioValuePerToken(
      undefined,
      getEndOfDay(date)
    );

    console.log(`Portfolio values on ${date}:\n
              XRP : $${getAmountInUSD(data.XRP.amount, rates?.XRP?.USD || 0)}\n
              ETH : $${getAmountInUSD(
                data.ETH.amount,
                rates?.ETH?.USD || 0
              )}\n  
              BTC : $${getAmountInUSD(
                data.BTC.amount,
                rates?.BTC?.USD || 0
              )}\n    
    `);
  } else {
    console.log("Token and Date both are provided.", { token, date });
    console.log("Calculating...");

    const data = await getLatestPortfolioValuePerToken(
      token,
      getEndOfDay(date)
    );
    const tokenData = data[token];

    console.log(
      `Portfolio value for ${token} on ${date} : $${getAmountInUSD(
        tokenData.amount,
        rates[token]?.USD
      )}\n`
    );
  }
})();
