# BlockVote
Decentralised voting dApp on Ethereum Sepolia. One wallet = one vote, all votes on-chain and publicly auditable.

**Stack:** Solidity ^0.8.20 · Remix IDE · MetaMask · Ethers.js v6 · React + Vite · Tailwind CSS · IPFS · GitHub

## 1. Deploy the contract (Remix)
1. Open https://remix.ethereum.org, create `BlockVote.sol`, paste `contracts/BlockVote.sol`.
2. Compile with Solidity 0.8.20+.
3. Deploy & Run → Environment: *Injected Provider – MetaMask* (network: Sepolia). Get test ETH from a Sepolia faucet.
4. Click Deploy and copy the contract address. The deployer becomes admin.

## 2. Run the frontend
```bash
cd frontend
npm install
cp .env.example .env   # paste your contract address
npm run dev
```
Open the local URL, connect MetaMask (Sepolia), create an election as admin, and vote from other accounts.

## 3. IPFS (optional)
Upload an election description (text/JSON) via Pinata or web3.storage and paste the CID when creating an election.

## Design notes
- `hasVoted[election][address]` enforces one vote per wallet per election.
- `VoteCast` events give a public audit trail; results are readable by anyone.
- Limitation: one-person-one-vote is enforced per wallet. Preventing one person from owning many wallets needs identity checks (e.g. admin-managed voter whitelist or proof-of-personhood), a good next feature.

## Roadmap
Voter whitelist · Hardhat tests · deploy to Vercel/GitHub Pages · event-based audit page.
