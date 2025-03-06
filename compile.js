const fs = require('fs');
const solc = require('solc');

const contractFile = fs.readFileSync('./SimpleStorage.sol', 'utf-8');

const input = {
    language: 'Solidity',
    sources: {
        'SimpleStorage.sol':{
            content: contractFile
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode']
            }
        }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contract = output.contracts['SimpleStorage.sol']['SimpleStorage'];

fs.writeFileSync('./SimpleStorageABI.json', JSON.stringify(contract.abi, null, 2));
fs.writeFileSync('./SimpleStorageBytecode.json', JSON.stringify(contract.evm.bytecode.object, null, 2));

console.log('Contract compiled. ABI and Bytecode saved.');