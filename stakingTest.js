const { Web3 } = require('web3');
const deployedAddress = require('./deployedStakingAddress.json');
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
            const baseFeePerGas = block.baseFeePerGas;
            const maxPriorityFee = '0x3b9aca00';
            tx.maxPriorityFeePerGas = maxPriorityFee;
            tx.maxFeePerGas = web3.utils.toHex(
                BigInt(baseFeePerGas) + BigInt(web3.utils.hexToNumber(maxPriorityFee)));

            console.log(`Testing ${name.includes('Unstake') ? 'unstake' : 'stake'}() call...`);
            await (name.includes('Unstake') ?
                contract.methods.unstake().call({ from: account.address }) :
                contract.methods.stake().call({ from: account.address, value: tx.value }));
            console.log(`${name.includes('Unstake') ? 'unstake' : 'stake'}() call succeeded in simulation`);

            console.log("Estimating gas...");
            const gasEstimate = await web3.eth.estimateGas(tx);
            tx.gas = web3.utils.toHex((gasEstimate * BigInt(12)) / BigInt(10));
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
        tx = tweakFn(tx, web3);
        if (!skipDynamicGas) {
            delete tx.gas;
            console.log("Re-estimating gas for tweaked tx...");
            const gasEstimate = await web3.eth.estimateGas(tx);
            tx.gas = web3.utils.toHex((gasEstimate * BigInt(12)) / BigInt(10));
            console.log("Tweaked Gas Estimated:", tx.gas);
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
        tweakFn: (tx, web3) => ({
            ...tx,
            value: '0x0',
            data: new web3.eth.Contract(contractABI, deployedAddress).methods.unstake().encodeABI()
        }),
        shouldFail: false,
        skipDynamicGas: false
    },
    {
        name: "Negative - Invalid Smart Contract Address",
        web3Url: 'https://sepolia.infura.io/v3/ade5ee2ae6834fb8b914d2fa10f6853a',
        tweakFn: (tx, web3) => {
            const invalidAddress = '0x00000000BABE0000000000000000000000000123';
            const contract = new web3.eth.Contract(contractABI, invalidAddress);
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
        tweakFn: (tx, web3) => ({
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
        tweakFn: (tx, web3) => ({
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
        tweakFn: (tx, web3) => ({
            ...tx,
            value: '0x0',
            data: new web3.eth.Contract(contractABI, deployedAddress).methods.unstake().encodeABI()
        }),
        shouldFail: true,
        skipDynamicGas: false
    }
];

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log("Running Full Test Suite with Delay...");
    for (let i = 0; i < testCases.length; i++) {
        await signAndSendTx(testCases[i]);
        if (testCases[i].name === "Positive Success - Stake ETH" && i < testCases.length - 1) {
            console.log("Waiting 60 seconds for lock period...");
            await delay(60000);
        } else if (i < testCases.length - 1) {
            console.log("Pausing 10 seconds to avoid rate limit...");
            await delay(10000); // 10-second delay between tests
        }
    }
    console.log("\n=== All Tests Completed ===");
}

runTests().catch(console.error);