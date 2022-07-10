# Propine programming test

## Installation

`npm install`

## Run

`node index.js --token=:token --date=:date --customFilepath=:filePath --customTokenTypes:tokenTypes`

## Design decisions

1. provided cli options to provide custom file path and types to support different files and tokens.
2. validated cli options with suggestions to improve user experience.
3. used stream to read file as the file is really big and could crash the system.
4. used fast-csv library to parse csv as it has support for streams and parsing options.
