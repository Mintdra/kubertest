// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title BallotBox
/// @notice A simple on-chain voting contract. The deployer sets the initial
///         candidate list; any address can vote exactly once for one
///         candidate. Vote counts and voter status are all publicly readable.
contract BallotBox {

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    address public owner;
    Candidate[] private candidates;

    mapping(address => bool) public hasVoted;
    mapping(address => uint256) public votedFor; // candidate index each address voted for

    bool public votingOpen = true;

    event Voted(address indexed voter, uint256 indexed candidateId, uint256 newVoteCount);
    event CandidateAdded(uint256 indexed candidateId, string name);
    event VotingClosed();

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can do this");
        _;
    }

    /// @param _candidateNames Initial list of candidate names, e.g. ["Alice","Bob","Carol"]
    constructor(string[] memory _candidateNames) {
        require(_candidateNames.length >= 2, "Need at least 2 candidates");
        owner = msg.sender;
        for (uint256 i = 0; i < _candidateNames.length; i++) {
            candidates.push(Candidate({ name: _candidateNames[i], voteCount: 0 }));
            emit CandidateAdded(i, _candidateNames[i]);
        }
    }

    /// @notice Cast a vote for a candidate by index
    function vote(uint256 _candidateId) external {
        require(votingOpen, "Voting is closed");
        require(_candidateId < candidates.length, "Invalid candidate");
        require(!hasVoted[msg.sender], "This address has already voted");

        hasVoted[msg.sender] = true;
        votedFor[msg.sender] = _candidateId;
        candidates[_candidateId].voteCount += 1;

        emit Voted(msg.sender, _candidateId, candidates[_candidateId].voteCount);
    }

    /// @notice Owner-only: add a new candidate before/during voting
    function addCandidate(string calldata _name) external onlyOwner {
        require(bytes(_name).length > 0, "Name cannot be empty");
        candidates.push(Candidate({ name: _name, voteCount: 0 }));
        emit CandidateAdded(candidates.length - 1, _name);
    }

    /// @notice Owner-only: permanently close voting
    function closeVoting() external onlyOwner {
        votingOpen = false;
        emit VotingClosed();
    }

    /// @notice Total number of candidates
    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    /// @notice Fetch a single candidate's name and vote count
    function getCandidate(uint256 _candidateId) external view returns (string memory name, uint256 voteCount) {
        require(_candidateId < candidates.length, "Invalid candidate");
        Candidate storage c = candidates[_candidateId];
        return (c.name, c.voteCount);
    }

    /// @notice Returns the index of the current leading candidate
    function getWinner() external view returns (string memory name, uint256 voteCount) {
        require(candidates.length > 0, "No candidates");
        uint256 winningIndex = 0;
        for (uint256 i = 1; i < candidates.length; i++) {
            if (candidates[i].voteCount > candidates[winningIndex].voteCount) {
                winningIndex = i;
            }
        }
        return (candidates[winningIndex].name, candidates[winningIndex].voteCount);
    }
}
