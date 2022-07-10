const axios = require("axios");
const args = require("yargs").argv;

const API_KEY = "49eba55a4d05cb02073c57d26df63e232773321deac73dd0e7add57ff422eb4d";
const URL =
    "https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH&tsyms=USD&api_key=" + API_KEY;

const {token, date} = args;


(async () => {
    const response = await axios.get(URL)
    const useRate = response.data.ETH.USD || 0;

    if (!token && !date) {
        console.log("No arguments are provided.")

    } else if (token && !date) {
        console.log("Token is provided.", token)

    } else if (!token && !date) {
        console.log("Date is provided.", date)

    } else {
        console.log("Token and Date both are provided.", {token, date})

    }
})()





