// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Nymora
 * @notice A decentralized, ENS-style name registry. Users register a
 *         human-readable label (e.g. "john" -> shown as "john.bit") that maps
 *         to a wallet address. Names are leased, not owned forever: they have a
 *         registration fee, an expiry, and a grace period before they become
 *         available to others.
 */
contract Nymora is Ownable, ReentrancyGuard {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------
    struct Record {
        address owner;            // who controls the name
        address resolvedAddress;  // the wallet the name points to
        uint256 expiresAt;        // unix timestamp when the lease ends
    }

    // ---------------------------------------------------------------------
    // Config
    // ---------------------------------------------------------------------
    uint256 public registrationFee = 0.001 ether;     // fee per registration period
    uint256 public constant REGISTRATION_PERIOD = 365 days;
    uint256 public constant GRACE_PERIOD = 30 days;   // owner-only window after expiry
    uint256 public constant MIN_LENGTH = 3;
    uint256 public constant MAX_LENGTH = 63;

    // key (keccak of lowercased label) => record
    mapping(bytes32 => Record) private _records;
    // key => the original label string, kept for display / events
    mapping(bytes32 => string) public labelOf;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event NameRegistered(string label, address indexed owner, uint256 expiresAt);
    event NameRenewed(string label, address indexed owner, uint256 expiresAt);
    event AddressUpdated(string label, address indexed resolvedAddress);

    constructor() Ownable(msg.sender) {}

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------
    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory b = bytes(str);
        for (uint256 i = 0; i < b.length; i++) {
            // A-Z => a-z
            if (b[i] >= 0x41 && b[i] <= 0x5A) {
                b[i] = bytes1(uint8(b[i]) + 32);
            }
        }
        return string(b);
    }

    function _key(string memory label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_toLower(label)));
    }

    function _validate(string memory label) internal pure {
        uint256 len = bytes(label).length;
        require(len >= MIN_LENGTH, "Name too short");
        require(len <= MAX_LENGTH, "Name too long");
        bytes memory b = bytes(label);
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool isLower = (c >= 0x61 && c <= 0x7A); // a-z
            bool isUpper = (c >= 0x41 && c <= 0x5A); // A-Z
            bool isDigit = (c >= 0x30 && c <= 0x39); // 0-9
            bool isDash  = (c == 0x2D);              // -
            require(isLower || isUpper || isDigit || isDash, "Invalid character");
        }
    }

    // ---------------------------------------------------------------------
    // Read functions (free, no gas for callers)
    // ---------------------------------------------------------------------

    /// @notice True if the name can be registered right now (never taken, or fully lapsed past grace).
    function available(string memory label) public view returns (bool) {
        Record memory r = _records[_key(label)];
        if (r.owner == address(0)) return true;                       // never registered
        if (block.timestamp > r.expiresAt + GRACE_PERIOD) return true; // lapsed past grace
        return false;
    }

    /// @notice Returns the full record for a name.
    function getRecord(string memory label)
        public
        view
        returns (address owner, address resolvedAddress, uint256 expiresAt)
    {
        Record memory r = _records[_key(label)];
        return (r.owner, r.resolvedAddress, r.expiresAt);
    }

    /// @notice Resolves a name to the wallet it points to (address(0) if expired/unregistered).
    function resolve(string memory label) public view returns (address) {
        Record memory r = _records[_key(label)];
        if (r.owner == address(0)) return address(0);
        if (block.timestamp > r.expiresAt) return address(0); // expired names don't resolve
        return r.resolvedAddress;
    }

    // ---------------------------------------------------------------------
    // Write functions
    // ---------------------------------------------------------------------

    /// @notice Register an available name for one registration period.
    function register(string memory label) external payable nonReentrant {
        _validate(label);
        require(available(label), "Name not available");
        require(msg.value >= registrationFee, "Insufficient fee");

        bytes32 key = _key(label);
        _records[key] = Record({
            owner: msg.sender,
            resolvedAddress: msg.sender,
            expiresAt: block.timestamp + REGISTRATION_PERIOD
        });
        labelOf[key] = label;

        _refundExcess();
        emit NameRegistered(label, msg.sender, _records[key].expiresAt);
    }

    /// @notice Renew a name you own (allowed up to the end of the grace period).
    function renew(string memory label) external payable nonReentrant {
        bytes32 key = _key(label);
        Record storage r = _records[key];
        require(r.owner == msg.sender, "Not the owner");
        require(block.timestamp <= r.expiresAt + GRACE_PERIOD, "Lease fully lapsed");
        require(msg.value >= registrationFee, "Insufficient fee");

        // If already expired, restart from now; otherwise extend the existing lease.
        uint256 base = block.timestamp > r.expiresAt ? block.timestamp : r.expiresAt;
        r.expiresAt = base + REGISTRATION_PERIOD;

        _refundExcess();
        emit NameRenewed(label, msg.sender, r.expiresAt);
    }

    /// @notice Point a name you own to a different wallet address.
    function setResolvedAddress(string memory label, address addr) external {
        bytes32 key = _key(label);
        Record storage r = _records[key];
        require(r.owner == msg.sender, "Not the owner");
        require(block.timestamp <= r.expiresAt, "Lease expired");
        r.resolvedAddress = addr;
        emit AddressUpdated(label, addr);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------
    function setRegistrationFee(uint256 newFee) external onlyOwner {
        registrationFee = newFee;
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");
        (bool ok, ) = owner().call{value: balance}("");
        require(ok, "Withdraw failed");
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------
    function _refundExcess() internal {
        uint256 excess = msg.value - registrationFee;
        if (excess > 0) {
            (bool ok, ) = msg.sender.call{value: excess}("");
            require(ok, "Refund failed");
        }
    }
}
