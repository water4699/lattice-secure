import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { EncryptedIdentityAuth } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EncryptedIdentityAuthSepolia", function () {
  let signers: Signers;
  let contract: EncryptedIdentityAuth;
  let contractAddress: string;
  let step: number;
  let steps: number;
  let fhevm: FhevmType;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const EncryptedIdentityAuthDeployment = await deployments.get("EncryptedIdentityAuth");
      contractAddress = EncryptedIdentityAuthDeployment.address;
      contract = await ethers.getContractAt("EncryptedIdentityAuth", EncryptedIdentityAuthDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should register and verify encrypted identity", async function () {
    steps = 12;

    this.timeout(4 * 40000);

    const userIdentity = 12345;

    progress(`Encrypting user identity '${userIdentity}'...`);
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    progress(
      `Call register() EncryptedIdentityAuth=${contractAddress} handle=${ethers.hexlify(encryptedIdentity.handles[0])} signer=${signers.alice.address}...`,
    );
    let tx = await contract
      .connect(signers.alice)
      .register(encryptedIdentity.handles[0], encryptedIdentity.inputProof);
    await tx.wait();

    progress(`Checking registration status...`);
    const isRegistered = await contract.isRegistered(signers.alice.address);
    expect(isRegistered).to.eq(true);

    progress(`Encrypting verification identity '${userIdentity}'...`);
    const verifyEncryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    progress(
      `Call verify() EncryptedIdentityAuth=${contractAddress} handle=${ethers.hexlify(verifyEncryptedIdentity.handles[0])} signer=${signers.alice.address}...`,
    );
    const encryptedResult = await contract
      .connect(signers.alice)
      .verify(verifyEncryptedIdentity.handles[0], verifyEncryptedIdentity.inputProof);

    progress(`Decrypting verification result...`);
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      signers.alice,
    );
    progress(`Clear verification result=${clearResult}`);

    expect(clearResult).to.eq(true);
  });

  it("should reject incorrect identity", async function () {
    steps = 12;

    this.timeout(4 * 40000);

    const userIdentity = 12345;
    const wrongIdentity = 99999;

    progress(`Encrypting user identity '${userIdentity}'...`);
    const encryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(userIdentity)
      .encrypt();

    progress(
      `Call register() EncryptedIdentityAuth=${contractAddress} handle=${ethers.hexlify(encryptedIdentity.handles[0])} signer=${signers.alice.address}...`,
    );
    let tx = await contract
      .connect(signers.alice)
      .register(encryptedIdentity.handles[0], encryptedIdentity.inputProof);
    await tx.wait();

    progress(`Encrypting wrong identity '${wrongIdentity}'...`);
    const verifyEncryptedIdentity = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(wrongIdentity)
      .encrypt();

    progress(
      `Call verify() EncryptedIdentityAuth=${contractAddress} handle=${ethers.hexlify(verifyEncryptedIdentity.handles[0])} signer=${signers.alice.address}...`,
    );
    const encryptedResult = await contract
      .connect(signers.alice)
      .verify(verifyEncryptedIdentity.handles[0], verifyEncryptedIdentity.inputProof);

    progress(`Decrypting verification result...`);
    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractAddress,
      signers.alice,
    );
    progress(`Clear verification result=${clearResult}`);

    expect(clearResult).to.eq(false);
  });
});

