const Pool = artifacts.require("Pool");

module.exports = function (deployer) {
  deployer.deploy(Pool);
};
