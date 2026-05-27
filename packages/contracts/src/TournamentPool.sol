// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CreditManager} from "./CreditManager.sol";

/// @title TournamentPool — per-tournament escrow for FRX Credits entry fees
contract TournamentPool is Ownable, ReentrancyGuard {
    CreditManager public immutable creditManager;

    struct Tournament {
        uint256 entryFee;
        uint256 prizePool;
        uint256 playerCount;
        uint256 maxPlayers;
        uint64 startsAt;
        uint64 endsAt;
        bool open;
        bool settled;
    }

    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => mapping(address => bool)) public joined;
    uint256 public nextTournamentId;

    event TournamentCreated(uint256 indexed id, uint256 entryFee, uint256 maxPlayers);
    event PlayerJoined(uint256 indexed tournamentId, address indexed player);
    event TournamentSettled(uint256 indexed tournamentId, uint256 prizePool);

    constructor(address _creditManager, address initialOwner) Ownable(initialOwner) {
        creditManager = CreditManager(_creditManager);
    }

    function createTournament(
        uint256 entryFee,
        uint256 maxPlayers,
        uint64 startsAt,
        uint64 endsAt
    ) external onlyOwner returns (uint256 id) {
        id = ++nextTournamentId;
        tournaments[id] = Tournament({
            entryFee: entryFee,
            prizePool: 0,
            playerCount: 0,
            maxPlayers: maxPlayers,
            startsAt: startsAt,
            endsAt: endsAt,
            open: true,
            settled: false
        });
        emit TournamentCreated(id, entryFee, maxPlayers);
    }

    function join(uint256 tournamentId) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.open && !t.settled, "closed");
        require(block.timestamp >= t.startsAt && block.timestamp <= t.endsAt, "outside window");
        require(t.playerCount < t.maxPlayers, "full");
        require(!joined[tournamentId][msg.sender], "already joined");

        if (t.entryFee > 0) {
            creditManager.burnCredits(msg.sender, t.entryFee, keccak256("ENTRY_FEE"));
            t.prizePool += t.entryFee;
        }

        joined[tournamentId][msg.sender] = true;
        t.playerCount += 1;
        emit PlayerJoined(tournamentId, msg.sender);
    }

    function close(uint256 tournamentId) external onlyOwner {
        tournaments[tournamentId].open = false;
    }

    function settle(uint256 tournamentId) external onlyOwner {
        Tournament storage t = tournaments[tournamentId];
        require(!t.settled, "already settled");
        t.settled = true;
        t.open = false;
        emit TournamentSettled(tournamentId, t.prizePool);
    }

    function prizePoolOf(uint256 tournamentId) external view returns (uint256) {
        return tournaments[tournamentId].prizePool;
    }
}
