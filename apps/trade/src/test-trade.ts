import * as dotenv from "dotenv";
dotenv.config();

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
  PrivateKey,
  PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import axios from "axios";
import { prismaService } from "./services/prisma.service";
import { encryptionService } from "./services/encryption.service";

// Test configuration - UPDATE THESE VALUES
const TEST_USER_ID = "5f3755e2-3af3-4c5a-bc09-f8021705dbdf"; // Get from database
const TEST_MARKET_ID = 15; // APT-USD (number, not string)
const TEST_SIZE = 0.00023; // Trade size
const TEST_LEVERAGE = 20;
const TEST_ORDER_TYPE = 1; // 1=Long, 2=Short, 3=Exit Long, 4=Exit Short

// Convert order type to API parameters
// tradeSide: true for long, false for short
// direction: false to open, true to close
function getTradeParams(orderType: number): {
  tradeSide: boolean;
  direction: boolean;
} {
  switch (orderType) {
    case 1: // Long (open)
      return { tradeSide: true, direction: false };
    case 2: // Short (open)
      return { tradeSide: false, direction: false };
    case 3: // Exit Long (close)
      return { tradeSide: true, direction: true };
    case 4: // Exit Short (close)
      return { tradeSide: false, direction: true };
    default:
      return { tradeSide: true, direction: false };
  }
}

const { tradeSide, direction } = getTradeParams(TEST_ORDER_TYPE);

const KANA_API_KEY = process.env.KANA_API_KEY || "";
// Use kana.trade for mainnet
const KANA_REST_URL =
  process.env.KANA_REST || "https://perps-tradeapi.kana.trade";

async function testPlaceMarketOrder() {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("🧪 TESTING MARKET ORDER PLACEMENT");
    console.log("=".repeat(80));

    // Step 1: Connect to database
    console.log("\n[Step 1] Connecting to database...");
    await prismaService.connect();
    console.log("✅ Database connected");

    // Step 2: Get user wallet
    console.log("\n[Step 2] Getting user wallet...");
    const wallet = await prismaService.wallet.findUnique({
      where: { user_id: TEST_USER_ID },
      select: { address: true, key: true },
    });

    if (!wallet) {
      throw new Error(`Wallet not found for user ID: ${TEST_USER_ID}`);
    }

    console.log(`✅ Wallet found: ${wallet.address.substring(0, 10)}...`);

    // Step 3: Decrypt private key
    console.log("\n[Step 3] Decrypting private key...");
    const privateKeyEncrypted = wallet.key;
    console.log(`Encrypted key length: ${privateKeyEncrypted.length}`);
    console.log(
      `Encrypted key format: ${privateKeyEncrypted.substring(0, 20)}...`
    );

    const privateKeyPlain = encryptionService.decrypt(privateKeyEncrypted);
    console.log(`✅ Private key decrypted (length: ${privateKeyPlain.length})`);

    // Step 4: Format private key using PrivateKey.formatPrivateKey
    console.log("\n[Step 4] Formatting private key...");
    console.log(`Original key format: ${privateKeyPlain.substring(0, 30)}...`);

    const formattedPrivateKey = PrivateKey.formatPrivateKey(
      privateKeyPlain.trim(),
      "ed25519" as PrivateKeyVariants
    );
    console.log(`✅ Formatted key: ${formattedPrivateKey.substring(0, 20)}...`);

    // Step 5: Create Aptos account
    console.log("\n[Step 5] Creating Aptos account...");
    const account = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(formattedPrivateKey),
    });
    console.log(`✅ Account created: ${account.accountAddress.toString()}`);

    // Step 6: Initialize Aptos client
    console.log("\n[Step 6] Initializing Aptos client...");
    const network = "mainnet" as Network;
    const aptosConfig = new AptosConfig({ network });
    const aptos = new Aptos(aptosConfig);
    console.log("✅ Aptos client initialized (mainnet)");

    // Step 7: Check APT balance for gas
    console.log("\n[Step 7] Checking APT balance for gas fees...");
    try {
      const aptBalance = await aptos.getAccountAPTAmount({
        accountAddress: account.accountAddress,
      });
      const aptBalanceInAPT = Number(aptBalance) / 100000000;
      console.log(`APT Balance: ${aptBalanceInAPT.toFixed(8)} APT`);

      if (aptBalanceInAPT < 0.001) {
        console.warn(
          `⚠️  Low APT balance: ${aptBalanceInAPT.toFixed(8)} APT (need at least 0.001 APT)`
        );
      } else {
        console.log("✅ Sufficient APT balance for gas");
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not check APT balance: ${error.message}`);
    }

    // Step 8: Get market order payload from Kana API
    console.log("\n[Step 8] Getting market order payload from Kana API...");
    console.log(`API URL: ${KANA_REST_URL}/placeMarketOrder`);
    console.log(`Parameters:`);
    console.log(`  - marketId: ${TEST_MARKET_ID}`);
    console.log(
      `  - tradeSide: ${tradeSide} (${tradeSide ? "Long" : "Short"})`
    );
    console.log(
      `  - direction: ${direction} (${direction ? "Close" : "Open"})`
    );
    console.log(`  - size: ${TEST_SIZE}`);
    console.log(`  - leverage: ${TEST_LEVERAGE}`);
    console.log(
      `  - orderType: ${TEST_ORDER_TYPE} (mapped to tradeSide=${tradeSide}, direction=${direction})`
    );

    // Build query params using URLSearchParams (as per previous implementation)
    const queryParams = new URLSearchParams({
      marketId: TEST_MARKET_ID.toString(),
      tradeSide: tradeSide.toString(),
      direction: direction.toString(),
      size: TEST_SIZE.toString(),
      leverage: TEST_LEVERAGE.toString(),
    });

    console.log(`\nQuery params: ${queryParams.toString()}`);
    console.log("\nSending API request...");
    const response = await axios.get(
      `${KANA_REST_URL}/placeMarketOrder?${queryParams.toString()}`,
      {
        headers: {
          "x-api-key": KANA_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Response status: ${response.status}`);
    console.log(`Response data keys: ${Object.keys(response.data).join(", ")}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || "Failed to get market order payload"
      );
    }

    const payloadData = response.data.data;
    console.log(`✅ Payload received`);
    console.log(`Payload type: ${typeof payloadData}`);
    console.log(
      `Payload keys: ${payloadData ? Object.keys(payloadData).join(", ") : "null"}`
    );

    if (!payloadData) {
      throw new Error("No payload data received from Kana API");
    }

    // Step 9: Build transaction
    console.log("\n[Step 9] Building Aptos transaction...");
    console.log(`Sender: ${account.accountAddress.toString()}`);
    console.log(`Payload data type: ${typeof payloadData}`);
    console.log(
      `Payload data:`,
      JSON.stringify(payloadData, null, 2).substring(0, 500)
    );

    const transactionPayload = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: payloadData,
      options: {
        maxGasAmount: 10000, // Set lower gas limit (as per previous implementation)
        gasUnitPrice: 100, // Set lower gas price (as per previous implementation)
      },
    });

    console.log("✅ Transaction built");
    console.log(`Transaction type: ${typeof transactionPayload}`);

    // Step 10: Sign and submit transaction
    console.log("\n[Step 10] Signing and submitting transaction...");
    const committedTxn = await aptos.transaction.signAndSubmitTransaction({
      transaction: transactionPayload,
      signer: account,
    });

    console.log(`✅ Transaction submitted`);
    console.log(`Transaction hash: ${committedTxn.hash}`);

    // Step 11: Wait for transaction
    console.log("\n[Step 11] Waiting for transaction confirmation...");
    const executedTxn = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    if (!executedTxn.success) {
      throw new Error("Transaction failed on blockchain");
    }

    console.log("✅ Transaction executed successfully");
    console.log(
      `Transaction version: ${(executedTxn as any).version || "N/A"}`
    );

    console.log("\n" + "=".repeat(80));
    console.log("✅ TEST COMPLETED SUCCESSFULLY");
    console.log("=".repeat(80));
    console.log(`Transaction Hash: ${committedTxn.hash}`);
    console.log(
      `View on Aptos Explorer: https://explorer.aptoslabs.com/txn/${committedTxn.hash}`
    );
    console.log("=".repeat(80) + "\n");
  } catch (error: any) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ TEST FAILED");
    console.error("=".repeat(80));
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error("=".repeat(80) + "\n");
    throw error;
  } finally {
    await prismaService.disconnect();
  }
}

// Run the test
testPlaceMarketOrder()
  .then(() => {
    console.log("Test script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test script failed:", error);
    process.exit(1);
  });
