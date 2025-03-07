const { Web3 } = require('web3');
const deployedAddress = require('./deployedStakingAddress.json'); // Matches deploy.js
const { privateKey } = require('./config');
const fs = require('fs');

const contractABI = JSON.parse(fs.readFileSync('./SimpleStakingABI.json', 'utf8'));

async function signAndSendTx(testConfig) {
    const { name, tweakFn, web3Url, shouldFail, skipDynamicGas } = testConfig;
    console.log(`\n=== Running Test Case: ${name} ===`);

    const web3 = new Web3(web3Url);
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const contract = new web3.eth.Contract(contractABI, deployedAddress);

    let tx = {
        from: account.address,
        to: deployedAddress,
        value: '0x2386F26FC10000', // 0.01 ETH
        data: contract.methods.stake().encodeABI()
    };

    if (!skipDynamicGas) {
        try {
            const block = await web3.eth.getBlock('latest');
            const baseFeePerGas = block.baseFeePerGas; // BigInt
            const maxPriorityFee = '0x3b9aca00'; // 1 gwei in hex
            tx.maxPriorityFeePerGas = maxPriorityFee;
            // Convert maxPriorityFee to BigInt before adding
            tx.maxFeePerGas = web3.utils.toHex(BigInt(baseFeePerGas) + BigInt(web3.utils.hexToNumber(maxPriorityFee)));
            
            // Test call
            console.log("Testing stake() call...");
            await contract.methods.stake().call({ from: account.address, value: tx.value });
            console.log("stake() call succeeded in simulation");

            // Estimate gas
            console.log("Estimating gas...");
            const gasEstimate = await web3.eth.estimateGas(tx);
            tx.gas = web3.utils.toHex(Math.floor(gasEstimate * 1.2));
            console.log("Gas Estimated:", tx.gas);
        } catch (e) {
            console.log("Gas Fetch/Error: ", e.message);
            if (shouldFail) {
                console.log(`Result: FAILED - ${name} (Expected)`);
                return;
            }
            throw e;
        }
    }

    if (tweakFn) {
        tx = tweakFn(tx);
        if (!skipDynamicGas) {
            const gasEstimate = await web3.eth.estimateGas(tx);
            tx.gas = web3.utils.toHex(Math.floor(gasEstimate * 1.2));
        }
    }

    try {
        console.log("Transaction Config:", tx);
        const signedTx = await account.signTransaction(tx);
        console.log("Signed Transaction:", signedTx);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log("Transaction Receipt:", receipt);
        console.log(`Result: SUCCESS - ${name} ${shouldFail ? '(Unexpected)' : ''}`);
    } catch (error) {
        console.log("Error:", error.message);
        if (error.receipt) {
            console.log("Revert Receipt:", error.receipt);
        }
        console.log(`Result: FAILED - ${name} ${shouldFail ? '(Expected)' : '(Unexpected)'}`);
    }
}

const testCases = [
    { 
        name: "Positive Success - Stake ETH",
        web3Url: 'https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a',
        tweakFn: null,
        shouldFail: false,
        skipDynamicGas: false
    },
    {
        name: "Positive Success - Unstake ETH",
        web3Url: 'https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a',
        tweakFn: (tx) => ({
            ...tx,
            value: '0x0',
            data: new Web3(tx.web3Url).eth.Contract(contractABI, deployedAddress).methods.unstake().encodeABI()
        }),
        shouldFail: false,
        skipDynamicGas: false
    },
    {
        name: "Negative - Invalid Smart Contract Address",
        web3Url: 'https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a',
        tweakFn: (tx) => {
            const invalidAddress = '0x0000000000000000000000000000000000000123';
            const contract = new Web3(tx.web3Url).eth.Contract(contractABI, invalidAddress);
            return {
                ...tx,
                to: invalidAddress,
                data: contract.methods.stake().encodeABI()
            };
        },
        shouldFail: true,
        skipDynamicGas: false
    },
    {
        name: "Negative - Gas Fee Too High",
        web3Url: 'https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a',
        tweakFn: (tx) => ({
            ...tx,
            maxFeePerGas: '0x152d02c7e14af6800000',
            maxPriorityFeePerGas: '0x3b9aca00'
        }),
        shouldFail: true,
        skipDynamicGas: true
    },
    {
        name: "Negative - Insufficient Funds (High Value)",
        web3Url: 'https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a',
        tweakFn: (tx) => ({
            ...tx,
            value: '0x152d02c7e14af6800000'
        }),
        shouldFail: true,
        skipDynamicGas: false
    },
    {
        name: "Negative - Error in Connection",
        web3Url: 'https://invalid.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a',
        tweakFn: null,
        shouldFail: true,
        skipDynamicGas: false
    },
    {
        name: "Negative - Unstake Before Lock Period",
        web3Url: 'https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a',
        tweakFn: (tx) => ({
            ...tx,
            value: '0x0',
            data: new Web3(tx.web3Url).eth.Contract(contractABI, deployedAddress).methods.unstake().encodeABI()
        }),
        shouldFail: true,
        skipDynamicGas: false
    }
];

async function runTests() {
    console.log("Note: Run 'Positive Success - Stake ETH' first, wait 60 seconds, then run others.");
    for (const test of testCases) {
        await signAndSendTx(test);
    }
    console.log("\n=== All Tests Completed ===");
}

runTests().catch(console.error);