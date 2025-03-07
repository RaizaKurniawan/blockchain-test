const fs = require('fs');
const solc = require('solc');

const contractFile = fs.readFileSync('./SimpleStaking.sol', 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'SimpleStaking.sol': {
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
const contract = output.contracts['SimpleStaking.sol']['SimpleStaking'];

fs.writeFileSync('./SimpleStakingABI.json', JSON.stringify(contract.abi, null, 2));
fs.writeFileSync('./SimpleStakingBytecode.json', JSON.stringify(contract.evm.bytecode.object, null, 2));

console.log('Staking contract compiled. ABI and Bytecode saved.');