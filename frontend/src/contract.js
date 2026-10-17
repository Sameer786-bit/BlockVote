// After deploying in Remix, paste your address here (or set VITE_CONTRACT_ADDRESS in .env)
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xYourDeployedContractAddress";
export const SEPOLIA_CHAIN_ID = "0xaa36a7";
export const ABI = [
  "function admin() view returns (address)",
  "function electionCount() view returns (uint256)",
  "function getElection(uint256) view returns (tuple(string title,string ipfsCid,uint64 start,uint64 end,uint256 totalVotes))",
  "function getCandidates(uint256) view returns (tuple(string name,uint256 votes)[])",
  "function hasVoted(uint256,address) view returns (bool)",
  "function createElection(string,string,string[],uint64,uint64) returns (uint256)",
  "function vote(uint256,uint256)",
  "event VoteCast(uint256 indexed electionId, address indexed voter, uint256 indexed candidateId)"
];
