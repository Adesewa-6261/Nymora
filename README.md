# Nymora — Decentralized Name Registry

An ENS-style name registry. Users register a human-readable name (e.g. `john.bit`)
that maps to their wallet address. Names are leased: they carry a registration fee
and an expiry, and lapse back to "available" if not renewed. The UI clearly shows
**Available / Taken / Expiring soon / In grace period** and warns owners before a
name they hold lapses.

- **Contract:** Solidity + Hardhat + OpenZeppelin, deployed to **Ethereum Sepolia** (testnet)
- **Frontend:** Next.js + wagmi + RainbowKit, deployable to **Vercel**
- Every action is a **real onchain transaction**, verifiable on Etherscan. Test ETH is free.

---

## Part 1 — Deploy the smart contract

```bash
# from the project root
npm install

# set up secrets
cp .env.example .env
# then edit .env and fill in PRIVATE_KEY (and optionally ETHERSCAN_API_KEY)
```

> **PRIVATE_KEY:** In MetaMask → ⋮ → Account details → Show private key.
> Use a throwaway wallet. Never use one holding real funds. Never commit `.env`.

```bash
# compile + run the test suite (all should pass)
npm run compile
npm test

# deploy to Ethereum Sepolia
npm run deploy
```

The deploy script prints your contract address. **Copy it.** Then (optionally) verify it so
anyone can read the code on the explorer:

```bash
npx hardhat verify --network sepolia <YOUR_CONTRACT_ADDRESS>
```

Your contract is now live at `https://sepolia.etherscan.io/address/<YOUR_CONTRACT_ADDRESS>`.

---

## Part 2 — Run the frontend locally

```bash
cd frontend
npm install

cp .env.local.example .env.local
# edit .env.local:
#   NEXT_PUBLIC_CONTRACT_ADDRESS = the address from Part 1
#   NEXT_PUBLIC_WC_PROJECT_ID    = your WalletConnect Project ID

npm run dev
```

Open http://localhost:3000, connect MetaMask (it will prompt to switch to Ethereum
Sepolia), search a name, and register it.

---

## Part 3 — Deploy the frontend to Vercel

1. Push this project to a GitHub repo.
2. On https://vercel.com → **New Project** → import the repo.
3. **Set the Root Directory to `frontend`** (important — the app lives in that folder).
4. Add the two environment variables under **Settings → Environment Variables**:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`
   - `NEXT_PUBLIC_WC_PROJECT_ID`
5. Deploy. You get a public URL like `https://your-project.vercel.app`.

That URL is your submission link.

---

## Part 4 — How a third party tests it independently

Anyone, anywhere, can verify and use it without your machine:

1. Open your Vercel URL.
2. Connect their own MetaMask.
3. Grab free Sepolia test ETH from a faucet (e.g. https://sepolia-faucet.pk910.de).
4. Search and register a name — they'll see the transaction confirm.
5. Cross-check it on Etherscan at your contract address: every registration, renewal,
   and the current owner are all publicly readable there.

This satisfies: **functional ✅ · verifiable onchain ✅ · independently testable ✅**

---

## The four UI states

| State | Meaning |
|---|---|
| **Available** | Never registered, or fully lapsed past its grace period. Anyone can register. |
| **Taken** | Owned and the lease is active. |
| **Expiring soon** | Owned but within 30 days of expiry — the owner is warned to renew. |
| **In grace period** | Lease expired, but a 30-day window remains where only the owner can renew before it's released to everyone. |

---

## How it works (one paragraph)

The contract stores a mapping from each name to a record `{ owner, resolvedAddress,
expiresAt }`. `register` checks availability, takes the fee, and sets a 1-year expiry.
`renew` extends it (owner only). A name is `available` once it's past `expiresAt +
GRACE_PERIOD`. The contract can't send notifications, so the "expiring soon" warning is
computed by the frontend from the on-chain `expiresAt` value, and your owned names are
tracked in the browser so the app can nag you before they lapse.
