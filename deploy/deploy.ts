import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedEncryptedIdentityAuth = await deploy("EncryptedIdentityAuth", {
    from: deployer,
    log: true,
  });

  console.log(`EncryptedIdentityAuth contract: `, deployedEncryptedIdentityAuth.address);
};
export default func;
func.id = "deploy_encryptedIdentityAuth"; // id required to prevent reexecution
func.tags = ["EncryptedIdentityAuth"];

