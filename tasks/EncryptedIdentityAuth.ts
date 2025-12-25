import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the EncryptedIdentityAuth contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the EncryptedIdentityAuth contract
 *
 *   npx hardhat --network localhost task:register --identity 12345
 *   npx hardhat --network localhost task:verify --identity 12345
 *   npx hardhat --network localhost task:check-registration --address 0x...
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the EncryptedIdentityAuth contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the EncryptedIdentityAuth contract
 *
 *   npx hardhat --network sepolia task:register --identity 12345
 *   npx hardhat --network sepolia task:verify --identity 12345
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the EncryptedIdentityAuth address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const contract = await deployments.get("EncryptedIdentityAuth");

  console.log("EncryptedIdentityAuth address is " + contract.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:register --identity 12345
 *   - npx hardhat --network sepolia task:register --identity 12345
 */
task("task:register", "Registers an encrypted identity")
  .addOptionalParam("address", "Optionally specify the EncryptedIdentityAuth contract address")
  .addParam("identity", "The user identity to register")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const identity = parseInt(taskArguments.identity);
    if (!Number.isInteger(identity)) {
      throw new Error(`Argument --identity is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const contractDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedIdentityAuth");
    console.log(`EncryptedIdentityAuth: ${contractDeployment.address}`);

    const signers = await ethers.getSigners();

    const contract = await ethers.getContractAt("EncryptedIdentityAuth", contractDeployment.address);

    // Check if already registered
    const isRegistered = await contract.isRegistered(signers[0].address);
    if (isRegistered) {
      console.log("User is already registered!");
      return;
    }

    // Encrypt the identity
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractDeployment.address, signers[0].address)
      .add32(identity)
      .encrypt();

    const tx = await contract
      .connect(signers[0])
      .register(encryptedIdentity.handles[0], encryptedIdentity.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`EncryptedIdentityAuth register(${identity}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:verify --identity 12345
 *   - npx hardhat --network sepolia task:verify --identity 12345
 */
task("task:verify", "Verifies an encrypted identity")
  .addOptionalParam("address", "Optionally specify the EncryptedIdentityAuth contract address")
  .addParam("identity", "The user identity to verify")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const identity = parseInt(taskArguments.identity);
    if (!Number.isInteger(identity)) {
      throw new Error(`Argument --identity is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const contractDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedIdentityAuth");
    console.log(`EncryptedIdentityAuth: ${contractDeployment.address}`);

    const signers = await ethers.getSigners();

    const contract = await ethers.getContractAt("EncryptedIdentityAuth", contractDeployment.address);

    // Check if registered
    const isRegistered = await contract.isRegistered(signers[0].address);
    if (!isRegistered) {
      console.log("User is not registered!");
      return;
    }

    // Encrypt the identity for verification
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractDeployment.address, signers[0].address)
      .add32(identity)
      .encrypt();

    const encryptedResult = await contract
      .connect(signers[0])
      .verify(encryptedIdentity.handles[0], encryptedIdentity.inputProof);

    // Decrypt the result
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractDeployment.address,
      signers[0],
    );

    console.log(`Verification result: ${clearResult ? "MATCH" : "NO MATCH"}`);
    console.log(`EncryptedIdentityAuth verify(${identity}) completed!`);
  });

