const yargs = require("yargs");
const axios = require("axios");
const fs = require("fs");
const fastCSV = require("fast-csv");

const API_KEY =
  "49eba55a4d05cb02073c57d26df63e232773321deac73dd0e7add57ff422eb4d";
const URL =
  "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,XRP&tsyms=USD&api_key=" +
  API_KEY;
const file = "transactions.csv";
const TOKEN_TYPES = ["BTC", "ETH", "XRP"];

const args = yargs.argv;
const { token, date } = args;

if (token && !TOKEN_TYPES.includes(token)) {
  console.log(
    "Invalid token type. Available options are " + TOKEN_TYPES.join(",")
  );
  return;
}

if (
  date &&
  !date.match("(0[1-9]|[12]\\d|3[01]))-(0[1-9]|1[0-2])-([12]\\d{3}")
) {
  console.log("Invalid date. Please use dd-mm-yyyy format.");
  return;
}

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
    const data = {};

    TOKEN_TYPES.forEach((types) => {
      data[types] = { amount: 0, timestamp: 0 };
    });

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
    console.log("Calculating...");

    const data = await getLatestPortfolioValuePerToken();

    console.log(`Latest portfolio values:\n`);
    TOKEN_TYPES.forEach((tokenType) => {
      console.log(
        `${tokenType} on ${convertEpochToDate(
          data[tokenType].timestamp
        )} : $${getAmountInUSD(
          data[tokenType].amount,
          rates[tokenType]?.USD || 0
        )}\n`
      );
    });
  } else if (token && !date) {
    console.log("Calculating...");

    const data = await getLatestPortfolioValuePerToken(token);
    const tokenData = data[token];

    console.log(
      `Latest portfolio value for ${token} on (${convertEpochToDate(
        tokenData.timestamp
      )}): $${getAmountInUSD(tokenData.amount, rates[token]?.USD)}\n`
    );
  } else if (!token && date) {
    console.log("Calculating...");

    const data = await getLatestPortfolioValuePerToken(
      undefined,
      getEndOfDay(date)
    );

    console.log(`Portfolio values on ${date}:\n`);
    TOKEN_TYPES.forEach((tokenType) => {
      console.log(
        `${tokenType} : $${getAmountInUSD(
          data[tokenType].amount,
          rates[tokenType]?.USD || 0
        )}\n`
      );
    });
  } else {
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
