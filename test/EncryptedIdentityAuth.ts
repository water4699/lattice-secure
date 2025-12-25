import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedIdentityAuth, EncryptedIdentityAuth__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedIdentityAuth")) as EncryptedIdentityAuth__factory;
  const contract = (await factory.deploy()) as EncryptedIdentityAuth;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("EncryptedIdentityAuth", function () {
  let signers: Signers;
  let contract: EncryptedIdentityAuth;
  let contractAddress: string;
  let fhevm: FhevmType;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
    fhevm = await ethers.getFhevm();
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("should not be registered initially", async function () {
    const isRegistered = await contract.isRegistered(signers.alice.address);
    expect(isRegistered).to.eq(false);
  });

  it("should register an encrypted identity", async function () {
    const userIdentity = 12345; // Example user ID
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .register(encryptedIdentity.handles[0], encryptedIdentity.inputProof);
    await tx.wait();

    const isRegistered = await contract.isRegistered(signers.alice.address);
    expect(isRegistered).to.eq(true);
  });

  it("should verify a correct encrypted identity", async function () {
    const userIdentity = 12345;
    
    // Register identity
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .register(encryptedIdentity.handles[0], encryptedIdentity.inputProof);
    await tx.wait();

    // Verify with correct identity
    const verifyEncryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    const encryptedResult = await contract
      .connect(signers.alice)
      .verify(verifyEncryptedIdentity.handles[0], verifyEncryptedIdentity.inputProof);

    // Decrypt the result
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      signers.alice,
    );

    expect(clearResult).to.eq(true);
  });

  it("should reject an incorrect encrypted identity", async function () {
    const userIdentity = 12345;
    const wrongIdentity = 99999;
    
    // Register identity
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .register(encryptedIdentity.handles[0], encryptedIdentity.inputProof);
    await tx.wait();

    // Verify with wrong identity
    const verifyEncryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(wrongIdentity)
      .encrypt();

    const encryptedResult = await contract
      .connect(signers.alice)
      .verify(verifyEncryptedIdentity.handles[0], verifyEncryptedIdentity.inputProof);

    // Decrypt the result
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      signers.alice,
    );

    expect(clearResult).to.eq(false);
  });

  it("should prevent double registration", async function () {
    const userIdentity = 12345;
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .register(encryptedIdentity.handles[0], encryptedIdentity.inputProof);
    await tx.wait();

    // Try to register again
    const encryptedIdentity2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(67890)
      .encrypt();

    await expect(
      contract
        .connect(signers.alice)
        .register(encryptedIdentity2.handles[0], encryptedIdentity2.inputProof)
    ).to.be.revertedWith("User already registered");
  });

  it("should prevent verification for unregistered users", async function () {
    const userIdentity = 12345;
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    await expect(
      contract
        .connect(signers.alice)
        .verify(encryptedIdentity.handles[0], encryptedIdentity.inputProof)
    ).to.be.revertedWith("User not registered");
  });

  it("should return correct registration timestamp", async function () {
    const userIdentity = 12345;
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .register(encryptedIdentity.handles[0], encryptedIdentity.inputProof);
    const receipt = await tx.wait();
    const registrationBlock = await ethers.provider.getBlock(receipt!.blockNumber);

    const timestamp = await contract.getRegistrationTimestamp(signers.alice.address);
    expect(timestamp).to.equal(registrationBlock!.timestamp);

    // Check unregistered user returns 0
    const unregisteredTimestamp = await contract.getRegistrationTimestamp(signers.bob.address);
    expect(unregisteredTimestamp).to.equal(0);
  });

  it("should reject empty input proofs", async function () {
    const userIdentity = 12345;
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    // Try to register with empty proof
    await expect(
      contract
        .connect(signers.alice)
        .register(encryptedIdentity.handles[0], "0x")
    ).to.be.revertedWith("Input proof cannot be empty");

    // Register normally first
    await contract
      .connect(signers.alice)
      .register(encryptedIdentity.handles[0], encryptedIdentity.inputProof);

    // Try to verify with empty proof
    await expect(
      contract
        .connect(signers.alice)
        .verify(encryptedIdentity.handles[0], "0x")
    ).to.be.revertedWith("Input proof cannot be empty");
  });
});

