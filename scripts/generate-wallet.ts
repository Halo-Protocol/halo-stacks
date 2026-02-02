import { generateSecretKey, generateWallet } from "@stacks/wallet-sdk";
import { getAddressFromPrivateKey } from "@stacks/transactions";

async function main() {
  const mode = process.argv[2];

  if (mode === "from-mnemonic") {
    const mnemonic = process.argv.slice(3).join(" ").trim();
    if (!mnemonic || mnemonic.split(/\s+/).length < 12) {
      console.error(
        "Usage: npx tsx scripts/generate-wallet.ts from-mnemonic <word1> <word2> ... <word12+>",
      );
      console.error(
        "\nExample: npx tsx scripts/generate-wallet.ts from-mnemonic abandon ability able about above absent absorb abstract ...",
      );
      process.exit(1);
    }

    const wallet = await generateWallet({
      secretKey: mnemonic,
      password: "",
    });
    const account = wallet.accounts[0];
    const privateKey = account.stxPrivateKey;
    const address = getAddressFromPrivateKey(privateKey, "testnet");

    console.log("\n========================================");
    console.log("  Halo Protocol - Wallet from Mnemonic");
    console.log("========================================\n");
    console.log(`STX Address:  ${address}`);
    console.log(`Private Key:  ${privateKey}`);
    console.log("\n--- Next Steps ---");
    console.log("1. Add to .env.local:");
    console.log(`   DEPLOYER_ADDRESS=${address}`);
    console.log(`   DEPLOYER_PRIVATE_KEY=${privateKey}`);
    console.log(
      "2. Fund the wallet: https://explorer.hiro.so/sandbox/faucet?chain=testnet",
    );
    console.log("3. Update settings/Testnet.toml with your mnemonic");
    console.log("========================================\n");
  } else if (mode === "new") {
    const mnemonic = generateSecretKey(256);
    const wallet = await generateWallet({
      secretKey: mnemonic,
      password: "",
    });
    const account = wallet.accounts[0];
    const privateKey = account.stxPrivateKey;
    const address = getAddressFromPrivateKey(privateKey, "testnet");

    console.log("\n========================================");
    console.log("  Halo Protocol - New Testnet Wallet");
    console.log("========================================\n");
    console.log(`Mnemonic:     ${mnemonic}`);
    console.log(`STX Address:  ${address}`);
    console.log(`Private Key:  ${privateKey}`);
    console.log(
      "\n  *** SAVE THE MNEMONIC SECURELY — you cannot recover it later ***\n",
    );
    console.log("--- Next Steps ---");
    console.log("1. Add to .env.local:");
    console.log(`   DEPLOYER_ADDRESS=${address}`);
    console.log(`   DEPLOYER_PRIVATE_KEY=${privateKey}`);
    console.log(
      "2. Fund the wallet: https://explorer.hiro.so/sandbox/faucet?chain=testnet",
    );
    console.log("3. Update settings/Testnet.toml with the mnemonic above");
    console.log("========================================\n");
  } else {
    console.log("Halo Protocol - Testnet Wallet Generator\n");
    console.log("Usage:");
    console.log(
      "  npx tsx scripts/generate-wallet.ts new                              Generate a new wallet",
    );
    console.log(
      "  npx tsx scripts/generate-wallet.ts from-mnemonic <word1> <word2>... Derive from seed phrase",
    );
    console.log("\nExamples:");
    console.log("  npm run wallet:generate");
    console.log(
      "  npm run wallet:from-mnemonic -- abandon ability able about above absent ...",
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
