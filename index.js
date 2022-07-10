const yargs = require("yargs");
const axios = require("axios");
const fs = require("fs");
const fastCSV = require("fast-csv");

const API_KEY =
  "49eba55a4d05cb02073c57d26df63e232773321deac73dd0e7add57ff422eb4d";

const args = yargs.argv;
const { token, date, customFilePath, customTokenTypes } = args;

const filePath = customFilePath || "transactions.csv";
console.log(`Filepath: ${filePath}`);
const tokenTypes = (customTokenTypes &&
  customTokenTypes.split(",").map((tokenType) => tokenType.trim())) || [
  "BTC",
  "ETH",
  "XRP",
];
console.log(`Token types: ${tokenTypes.join(",")}`);

const URL = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${tokenTypes.join(
  ","
)}&tsyms=USD&api_key=${API_KEY}`;

if (token && !tokenTypes.includes(token)) {
  console.log(
    "Invalid token type. Available options are " + tokenTypes.join(",")
  );
  return;
}

if (
  date &&
  !date.match("([12]\\d{3})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])")
) {
  console.log("Invalid date. Please use yyyy-mm-dd format.");
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

const getPortfolio = (token, date) => {
  return new Promise((resolve, reject) => {
    const data = {};

    tokenTypes.forEach((types) => {
      data[types] = { amount: 0, timestamp: 0 };
    });

    fs.createReadStream(filePath)
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
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("No file found.");
    }

    const response = await axios.get(URL);
    const rates = response.data || 0;

    if (!token && !date) {
      console.log("Calculating...");

      const data = await getPortfolio();

      console.log(`Latest portfolio values:\n`);
      tokenTypes.forEach((tokenType) => {
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

      const data = await getPortfolio(token);
      const tokenData = data[token];

      console.log(
        `Latest portfolio value for ${token} on (${convertEpochToDate(
          tokenData.timestamp
        )}): $${getAmountInUSD(tokenData.amount, rates[token]?.USD)}\n`
      );
    } else if (!token && date) {
      console.log("Calculating...");

      const data = await getPortfolio(undefined, getEndOfDay(date));

      console.log(`Portfolio values on ${date}:\n`);
      tokenTypes.forEach((tokenType) => {
        console.log(
          `${tokenType} : $${getAmountInUSD(
            data[tokenType].amount,
            rates[tokenType]?.USD || 0
          )}\n`
        );
      });
    } else {
      console.log("Calculating...");

      const data = await getPortfolio(token, getEndOfDay(date));
      const tokenData = data[token];

      console.log(
        `Portfolio value for ${token} on ${date} : $${getAmountInUSD(
          tokenData.amount,
          rates[token]?.USD
        )}\n`
      );
    }
  } catch (e) {
    console.log(e.message);
  }
})();
