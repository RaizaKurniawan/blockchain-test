const { Web3 } = require('web3');
const { contractAddress, privateKey } = require('./config');

// Connect to Sepolia test network 
const web3 = new Web3('https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a');
const account = web3.eth.accounts.privateKeyToAccount(privateKey);

const contractABI = [
    {
        "constant": false,
        "input": [],
        "name": "deposit",
        "outputs": [],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
    }
];

// Base transaction signing function
async function signAndSendTx(testConfig){
    const { name, tweakFn } = testConfig;
    console.log(`\n=== Running Test Case: ${name} ===`);

    // Default tx config
    let tx = {
        from: account.address,
        to: contractAddress,
        gas: '0x30d40', // 200,000
        value: '0x2386F26FC10000', // 0.01 ETH
        data: new web3.eth.Contract(contractABI, contractAddress).methods.deposit().encodeABI()
    };

    // Apply dynamic gas unless overridden
    if(!testConfig.skipDynamicGas){
        try { 
        
        const block = await web3.eth.getBlock('latest');
        const baseFeePerGas = block.baseFeePerGas;
        const maxPriorityFee = '0x3b9acaa00'; // 1 gwei
        tx.maxPriorityFeePerGas = maxPriorityFee;
        tx.maxFeePerGas = web3.utils.toHex(
            BigInt(baseFeePerGas) + BigInt(maxPriorityFee)
            );
        } catch (e) {
            console.log("Gas Fetch Error:", e.message);
        }
    }

    // Apply test specifc 
    if (tweakFn){
        tx = tweakFn(tx);
    }

    try {
        console.log("Transaction Config:", tx)
        const signedTx = await account.signTransaction(tx);
        console.log("Signed Transaction:", signedTx);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log("Transaction Receipt:", receipt);
        console.log(`Result: SUCCESS - ${name} (Unexpected if negative case)`);
    } catch (error) {
        console.log("Error:", error.message);
        console.log(`Result: FAILED as expected - ${name} ${testConfig.shouldfail ? '(Expected)' : '(Unexpected)'}`);
    }
}

// Test cases 
const testCases = [
    // Test Case 1: Positive Success
    {
        name: "Positive Success - Valid Deposit",
        tweakFn: null, // Use default
        skipDynamicGas: false
    },

    // Test Case 2: Negative - Invalid Smart Contract
    {
        name: "Negative - Invalid Smart Contract Address",
        tweakFn: (tx) => ({
            ...tx,
            to: '0x12345BABIBABIBABI78901234567890' // invalid address
        }),
        skipDynamicGas: false
    },

    // Test Case 3: Negative - Gas Fee Too High
    {
        name: "Negative - Gas Fee Too High",
        tweakFn: (tx) => ({
            ...tx,
            maxFeePerGas: '0x152d02c7e14af6800000', // 100,000 ETH
            maxPriorityFeePerGas: '0x3b9aca00' // 1 gwei
        }),
        skipDynamicGas: true // Override dynamic gas
    },

    // Test Case 4: Negative - Insufficient Funds 
    {
        name: "Negative - Insufficient Funds",
        tweakFn: (tx) => ({
            ...tx,
            value: '0x152d02c7e14af6800000' // 100,000 ETH 
        }),
        skipDynamicGas: false
    },

    // Test Case 5: Negative - Error in Connection
    {
        name: "Negative - Error in Connection",
        tweakFn: (tx) => {
            const badWeb3 = new Web3('https://invalid.infuras.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a');
            tx.data = new badWeb3.eth.Contract(contractABI, contractAddress).methods.deposit().encodeABI();
            return tx;
        },
        skipDynamicGas: false 
    }
];

// Run all test cases
async function runTest() {
    for (const test of testCases) {
        await signAndSendTx(test);
    }
    console.log("\n=== All Test Completed ===")
}

runTest().catch(console.error);