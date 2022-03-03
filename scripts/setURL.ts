import { ethers } from "hardhat";
async function main() {
  const HashworldCharactorFactory = await ethers.getContractFactory("HashworldCharactor");
  const HashworldCharactor = HashworldCharactorFactory.attach(
    "0xE1f2ce44DA3686362f79CBC942bF876609755A6d"
  );

  const tx = await HashworldCharactor.setBaseURI(
    "ipfs://QmTc6QLFdxFrjBWQBH7joE3YMWcjujpKiy3thrGiJA2JPL/"
  );
  console.log("change url tx is", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
