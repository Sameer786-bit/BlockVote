// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BlockVote - one wallet, one vote, fully on-chain and auditable
contract BlockVote {
    struct Candidate { string name; uint256 votes; }
    struct Election {
        string title;
        string ipfsCid;   // IPFS CID of a JSON/markdown description (optional)
        uint64 start;
        uint64 end;
        uint256 totalVotes;
    }

    address public immutable admin;
    Election[] private elections;
    mapping(uint256 => Candidate[]) private candidates;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ElectionCreated(uint256 indexed id, string title, string ipfsCid, uint64 start, uint64 end);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 indexed candidateId);

    error NotAdmin();
    error BadInput();
    error NotOpen();
    error AlreadyVoted();

    modifier onlyAdmin() { if (msg.sender != admin) revert NotAdmin(); _; }

    constructor() { admin = msg.sender; }

    function createElection(
        string calldata title,
        string calldata ipfsCid,
        string[] calldata names,
        uint64 start,
        uint64 end
    ) external onlyAdmin returns (uint256 id) {
        if (names.length < 2 || end <= start || end <= block.timestamp) revert BadInput();
        id = elections.length;
        elections.push(Election(title, ipfsCid, start, end, 0));
        for (uint256 i; i < names.length; i++) candidates[id].push(Candidate(names[i], 0));
        emit ElectionCreated(id, title, ipfsCid, start, end);
    }

    function vote(uint256 electionId, uint256 candidateId) external {
        if (electionId >= elections.length) revert BadInput();
        Election storage e = elections[electionId];
        if (block.timestamp < e.start || block.timestamp > e.end) revert NotOpen();
        if (hasVoted[electionId][msg.sender]) revert AlreadyVoted();
        if (candidateId >= candidates[electionId].length) revert BadInput();

        hasVoted[electionId][msg.sender] = true;
        candidates[electionId][candidateId].votes++;
        e.totalVotes++;
        emit VoteCast(electionId, msg.sender, candidateId);
    }

    function electionCount() external view returns (uint256) { return elections.length; }
    function getElection(uint256 id) external view returns (Election memory) { return elections[id]; }
    function getCandidates(uint256 id) external view returns (Candidate[] memory) { return candidates[id]; }
}
