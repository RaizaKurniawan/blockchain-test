const {Web3} = require('web3');
const contractAddress = require('./address');
const privateKey = require('./privateKey');

// Connect to Sepolia test network
const web3 = new Web3('https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a');

// Replace with private
const account = web3.eth.accounts.privateKeyToAccount(privateKey);

const contractABI = [
    {
        "constant": false,
        "inputs": [],
        "name": "deposit",
        "outputs": [],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
    }
];

// create contract instance
const contract = new web3.eth.Contract(contractABI, contractAddress);

// Sign and send a transaction
async function signContract() {
    const block = await web3.eth.getBlock('latest');
    const baseFeePerGas = block.baseFeePerGas;
    const maxPriorityFee = '0x3b9aca00'; // 1 gwei
    const maxFee = web3.utils.toHex(
        BigInt(baseFeePerGas) + BigInt(maxPriorityFee)
    );

    const tx = {
        from: account.address,
        to: contractAddress,
        gas: '0x30d40', // 200,000
        maxPriorityFeePerGas: maxPriorityFee, 
        maxFeePerGas: maxFee, // 100 gwei
        value: '0x2386F26FC10000', // 0.01 ETH
        data: contract.methods.deposit().encodeABI()
    };
    const signedTx = await account.signTransaction(tx);
    console.log("Signed Transaction:", signedTx);
  
    // Send the signed transaction
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log("Transaction Receipt:", receipt);
    
}

signContract().catch(console.error);