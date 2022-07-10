const args = require("yargs").argv;

const {token, date} = args;

if (!token && !date) {
    console.log("No arguments are provided.")

} else if (token && !date) {
    console.log("Token is provided.", token)

} else if (!token && !date) {
    console.log("Date is provided.", date)

} else {
    console.log("Token and Date both are provided.", {token, date})

}
