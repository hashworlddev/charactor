import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;

describe("HashworldCharactor", function () {
  it("Normal mint", async function () {
    const HashworldCharactorFactory = await ethers.getContractFactory("HashworldCharactor");
    const HashworldCharactor = await HashworldCharactorFactory.deploy(19);
    await HashworldCharactor.deployed();

    const [owner, addr1, addr2] = await ethers.getSigners();

    await expect(HashworldCharactor.connect(addr1).mint(5)).to.be.revertedWith("Not enough ETH");

    await expect(HashworldCharactor.connect(addr1).mint(11)).to.be.revertedWith(
      "Exceed max buy per address"
    );

    await expect(
      HashworldCharactor.connect(addr1).mint(10, {
        value: ethers.utils.parseEther("0.1"),
      })
    ).to.be.revertedWith("Not enough ETH");

    const mintTransaction = await HashworldCharactor.connect(addr1).mint(10, {
      value: ethers.utils.parseEther("0.35"),
    });

    // test mintSuccess Event
    const receipt = await mintTransaction.wait();
    const mintSuccessEvents = receipt.events?.filter((x) => {
      return x.event === "MintSuccess";
    });
    expect(mintSuccessEvents?.length).to.equal(10);
    const firstEventArgs = mintSuccessEvents?.[0]?.args;
    expect(firstEventArgs?.to).to.equal(addr1.address);
    expect(firstEventArgs?._type).to.greaterThanOrEqual(1);
    expect(firstEventArgs?._type).to.lessThanOrEqual(6);
    expect(firstEventArgs?._attribute).to.greaterThanOrEqual(1);
    expect(firstEventArgs?._attribute).to.lessThanOrEqual(3);
    expect(firstEventArgs?._name).to.greaterThanOrEqual(1);
    expect(firstEventArgs?._name).to.lessThanOrEqual(52);

    // test max mint per address
    await expect(HashworldCharactor.connect(addr1).mint(1)).to.be.revertedWith(
      "Exceed max buy per address"
    );

    // test max supply
    await expect(
      HashworldCharactor.connect(addr2).mint(10, {
        value: ethers.utils.parseEther("0.35"),
      })
    ).to.be.revertedWith("Exceed max token supply");

    expect(await HashworldCharactor.baseURI()).to.equal("");
    expect((await HashworldCharactor.totalSupply()).toNumber()).to.equal(10);

    expect(await HashworldCharactor.exists(10)).to.be.true;
    expect(await HashworldCharactor.exists(0)).to.be.false;
    expect(await HashworldCharactor.exists(11)).to.be.false;
    expect((await HashworldCharactor.balanceOf(addr1.address)).toNumber()).to.equal(10);

    await HashworldCharactor.connect(owner).setBaseURI("https://hashworld.com/charactor/");

    // loop 1 to 10
    for (let i = 1; i <= 10; i++) {
      const _type = await HashworldCharactor.getType(i);
      expect(_type).to.greaterThanOrEqual(1);
      expect(_type).to.lessThanOrEqual(6);
      const _attribute = await HashworldCharactor.getAttribute(i);
      expect(_attribute).to.greaterThanOrEqual(1);
      expect(_attribute).to.lessThanOrEqual(3);
      const _name = await HashworldCharactor.getName(i);
      expect(_name).to.greaterThanOrEqual(1);
      expect(_name).to.lessThanOrEqual(52);
      const url = await HashworldCharactor.tokenURI(i);
      const index = _name * 52 + _type * 6 + _attribute * 3;
      expect(url).to.equal(`https://hashworld.com/charactor/${index}`);
    }
  });

  it("manage function", async function () {
    const HashworldCharactorFactory = await ethers.getContractFactory("HashworldCharactor");
    const HashworldCharactor = await HashworldCharactorFactory.deploy(5000);
    await HashworldCharactor.deployed();
    const [owner, addr1, addr2] = await ethers.getSigners();

    // baseURI
    await expect(HashworldCharactor.connect(addr1).setBaseURI("https://hashworld.com/charactor/"))
      .to.be.reverted;
    await HashworldCharactor.connect(owner).setBaseURI("https://hashworld.com/charactor/");
    expect(await HashworldCharactor.baseURI()).to.equal("https://hashworld.com/charactor/");

    // contract ownerable
    await HashworldCharactor.connect(owner).transferOwnership(addr1.address);
    expect(await HashworldCharactor.owner()).to.equal(addr1.address);
    await expect(HashworldCharactor.connect(owner).setBaseURI("https://hashworld.com/charactor/"))
      .to.be.reverted;
    await HashworldCharactor.connect(addr1).setBaseURI("http://test1.com");
    expect(await HashworldCharactor.baseURI()).to.equal("http://test1.com");
    await HashworldCharactor.connect(addr1).transferOwnership(owner.address);

    // pause
    await HashworldCharactor.connect(addr1).mint(1, {
      value: ethers.utils.parseEther("0.035"),
    });
    expect((await HashworldCharactor.balanceOf(addr1.address)).toNumber()).to.equal(1);
    await HashworldCharactor.connect(addr1).transferFrom(addr1.address, addr2.address, 1);
    expect((await HashworldCharactor.balanceOf(addr2.address)).toNumber()).to.equal(1);
    await HashworldCharactor.connect(owner).pause();
    await expect(
      HashworldCharactor.connect(addr2).transferFrom(addr2.address, addr1.address, 1)
    ).to.be.revertedWith("Pausable: paused");
    await HashworldCharactor.connect(owner).unpause();
    await HashworldCharactor.connect(addr2).transferFrom(addr2.address, addr1.address, 1);
    expect((await HashworldCharactor.balanceOf(addr1.address)).toNumber()).to.equal(1);

    // withdraw
    const oldBalance = await addr2.getBalance();
    await HashworldCharactor.connect(owner).withdraw(addr2.address);
    const newBalance = await addr2.getBalance();
    expect(newBalance.sub(oldBalance)).to.equal(ethers.utils.parseEther("0.035"));

    // burn
    await HashworldCharactor.connect(owner).burn(1);
    expect((await HashworldCharactor.balanceOf(addr1.address)).toNumber()).to.equal(0);
  });
});
