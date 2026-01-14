import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { X402Facilitator } from '../src/blockchain/X402Facilitator';
import { CronosNetwork } from '@crypto.com/facilitator-client';

dotenv.config();

async function testX402Testnet() {
    console.log('🚀 Starting x402 Testnet Verification...\n');

    const privateKey = process.env.X402_PRIVATE_KEY;
    const rpcUrl = process.env.X402_CRONOS_RPC_URL || 'https://evm-t3.cronos.org';
    const network = process.env.X402_NETWORK === 'mainnet' ? CronosNetwork.CronosMainnet : CronosNetwork.CronosTestnet;

    if (!privateKey || privateKey === 'your_private_key_here') {
        console.error('❌ Error: X402_PRIVATE_KEY not found in .env');
        process.exit(1);
    }

    const facilitator = new X402Facilitator(
        network,
        privateKey,
        rpcUrl
    );

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const buyerAddress = await wallet.getAddress();
    const farmerAddress = '0x000000000000000000000000000000000000dEaD'; // Burn address for test
    const amount = '100000'; // 0.1 USDC (6 decimals)

    console.log(`👤 Using Wallet: ${buyerAddress}`);
    console.log(`💰 Target Amount: ${amount} units`);

    try {
        console.log('\nStep 1: Creating Hold (EIP-3009 Authorization)...');
        const hold = await facilitator.createHold(buyerAddress, farmerAddress, amount);
        console.log('✅ Hold Created Successfully!');
        console.log(`🆔 Hold ID: ${hold.holdId}`);

        console.log('\nStep 2: Releasing Hold (On-chain Settlement)...');
        console.log('⏳ This may take a few seconds for block confirmation...');
        const result = await facilitator.releaseHold(hold.holdId);

        console.log('\n🎉 SUCCESS! Payment Settled on Cronos Testnet');
        console.log(`🔗 Transaction Hash: ${result.txHash}`);
        console.log(`📦 Block Number: ${result.blockNumber}`);
        console.log(`🌍 View on Explorer: https://explorer.cronos.org/testnet/tx/${result.txHash}`);

    } catch (error) {
        console.error('\n❌ Test Failed:');
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }
    }
}

testX402Testnet();
