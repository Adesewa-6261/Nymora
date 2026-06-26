const hre = require("hardhat");

async function main() {
  console.log("Deploying Nymora to Ethereum Sepolia...");

  const Registry = await hre.ethers.getContractFactory("Nymora");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\n✅ Nymora deployed to:", address);
  console.log("\nNext steps:");
  console.log("1. (Optional) Verify it so anyone can read the code:");
  console.log(`   npx hardhat verify --network sepolia ${address}`);
  console.log("2. Put this address in frontend/.env.local as NEXT_PUBLIC_CONTRACT_ADDRESS");
  console.log(`3. View it: https://sepolia.etherscan.io/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
