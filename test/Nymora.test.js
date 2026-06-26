const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Nymora", function () {
  let registry, owner, alice, bob;
  const FEE = ethers.parseEther("0.001");
  const YEAR = 365 * 24 * 60 * 60;
  const GRACE = 30 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("Nymora");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
  });

  it("a fresh name is available", async function () {
    expect(await registry.available("john")).to.equal(true);
  });

  it("registers a name and marks it taken", async function () {
    await registry.connect(alice).register("john", { value: FEE });
    expect(await registry.available("john")).to.equal(false);

    const [recordOwner, resolved] = await registry.getRecord("john");
    expect(recordOwner).to.equal(alice.address);
    expect(resolved).to.equal(alice.address);
    expect(await registry.resolve("john")).to.equal(alice.address);
  });

  it("is case-insensitive", async function () {
    await registry.connect(alice).register("John", { value: FEE });
    expect(await registry.available("JOHN")).to.equal(false);
    expect(await registry.resolve("john")).to.equal(alice.address);
  });

  it("rejects registering a taken name", async function () {
    await registry.connect(alice).register("john", { value: FEE });
    await expect(
      registry.connect(bob).register("john", { value: FEE })
    ).to.be.revertedWith("Name not available");
  });

  it("rejects insufficient fee", async function () {
    await expect(
      registry.connect(alice).register("john", { value: 0 })
    ).to.be.revertedWith("Insufficient fee");
  });

  it("rejects names that are too short", async function () {
    await expect(
      registry.connect(alice).register("ab", { value: FEE })
    ).to.be.revertedWith("Name too short");
  });

  it("lets the owner renew and extends expiry", async function () {
    await registry.connect(alice).register("john", { value: FEE });
    const [, , expiry1] = await registry.getRecord("john");
    await registry.connect(alice).renew("john", { value: FEE });
    const [, , expiry2] = await registry.getRecord("john");
    expect(expiry2).to.be.greaterThan(expiry1);
  });

  it("blocks non-owners from renewing", async function () {
    await registry.connect(alice).register("john", { value: FEE });
    await expect(
      registry.connect(bob).renew("john", { value: FEE })
    ).to.be.revertedWith("Not the owner");
  });

  it("frees the name after expiry + grace period", async function () {
    await registry.connect(alice).register("john", { value: FEE });
    await time.increase(YEAR + GRACE + 1);
    expect(await registry.available("john")).to.equal(true);
    // bob can now claim it
    await registry.connect(bob).register("john", { value: FEE });
    const [recordOwner] = await registry.getRecord("john");
    expect(recordOwner).to.equal(bob.address);
  });

  it("lets the owner update the resolved address", async function () {
    await registry.connect(alice).register("john", { value: FEE });
    await registry.connect(alice).setResolvedAddress("john", bob.address);
    expect(await registry.resolve("john")).to.equal(bob.address);
  });

  it("collects fees and lets the owner withdraw", async function () {
    await registry.connect(alice).register("john", { value: FEE });
    const before = await ethers.provider.getBalance(owner.address);
    const tx = await registry.connect(owner).withdraw();
    await tx.wait();
    const after = await ethers.provider.getBalance(owner.address);
    expect(after).to.be.greaterThan(before - FEE); // gained roughly the fee
  });
});
