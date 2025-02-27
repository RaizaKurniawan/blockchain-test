const { Web3 } = require('web3');
const fs = require('fs');
const privateKey = require('./config');

const web3 = new Web3('https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a');
const account = web3.eth.accounts.privateKeyToAccount(privateKey);

const abi = JSON.parse(fs.readFileSync('./SimpleStorageABI.json', 'utf8'));
const bytecode = JSON.parse(fs.readFileSync('./SimpleStorageBytecode.json', 'utf8'));

async function deploy() {
    const contract = new web3.eth.Contract(abi);
    const deployTx = contract.deploy({ data: '0x' + bytecode });

    const block = await web3.eth.Contract(abi);
    const baseFeePerGas = block.baseFeePerGas;
    const maxPriorityFee = '0x3b9aca00'; // 1 gwei
    const maxFee = web3.utils.toHex(BigInt(baseFeePerGas) + BigInt(maxPriorityFee));
    
    const tx = {
        from: account.address,
        data: deployTx.encodeABI(),
        gas: '0x100000', // 1,000,000 gas (adjust if needed)
        maxPriorityFeePerGas: maxPriorityFee,
        maxFeePerGas: maxFee
    };

    const signedTx = await account.signTransaction(tx);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log('Contract deployed at:', receipt.contractAddress);
    fs.writeFileSync('./deployedAddress.json', JSON.stringify(receipt.contractAddress));
}

deploy().catch(console.error);