// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Identity Authentication Contract
/// @notice Allows users to register and verify their identity using FHE encryption
/// @dev Users can register an encrypted identity and later verify it without exposing plaintext
contract EncryptedIdentityAuth is SepoliaConfig {
    // Constants
    uint256 public constant MAX_IDENTITY_VALUE = 999999;

    // Events
    event IdentityRegistered(address indexed user, uint256 timestamp);
    event IdentityVerified(address indexed user, uint256 timestamp, bool success);
    event IdentityVerificationFailed(address indexed user, uint256 timestamp, string reason);

    // Mapping from user address to their encrypted identity
    mapping(address => euint32) private _encryptedIdentities;

    // Mapping to track if a user has registered
    mapping(address => bool) public isRegistered;

    /// @notice Register an encrypted user identity
    /// @param encryptedIdentity The encrypted user ID (euint32)
    /// @param inputProof The input proof for the encrypted value
    function register(externalEuint32 encryptedIdentity, bytes calldata inputProof) external {
        require(!isRegistered[msg.sender], "User already registered");
        require(inputProof.length > 0, "Input proof cannot be empty");

        euint32 encryptedEuint32 = FHE.fromExternal(encryptedIdentity, inputProof);
        _encryptedIdentities[msg.sender] = encryptedEuint32;
        isRegistered[msg.sender] = true;

        // Allow contract and user to access the encrypted identity
        FHE.allowThis(_encryptedIdentities[msg.sender]);
        FHE.allow(_encryptedIdentities[msg.sender], msg.sender);

        emit IdentityRegistered(msg.sender, block.timestamp);
    }

    /// @notice Verify if the provided encrypted identity matches the stored one
    /// @param encryptedIdentity The encrypted user ID to verify
    /// @param inputProof The input proof for the encrypted value
    /// @return encryptedResult Encrypted boolean result (true if match, false otherwise)
    function verify(externalEuint32 encryptedIdentity, bytes calldata inputProof)
        external
        returns (ebool)
    {
        require(isRegistered[msg.sender], "User not registered");
        require(inputProof.length > 0, "Input proof cannot be empty");
        
        euint32 encryptedEuint32 = FHE.fromExternal(encryptedIdentity, inputProof);
        euint32 storedIdentity = _encryptedIdentities[msg.sender];
        
        // Compare encrypted identities using FHE equality check
        ebool result = FHE.eq(encryptedEuint32, storedIdentity);
        
        // Allow contract and user to access the encrypted result
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        emit IdentityVerified(msg.sender, block.timestamp, true);

        return result;
    }

    /// @notice Get the encrypted identity for a user (for debugging/verification)
    /// @param user The address of the user
    /// @return The encrypted identity
    function getEncryptedIdentity(address user) external view returns (euint32) {
        require(isRegistered[user], "User not registered");
        return _encryptedIdentities[user];
    }

    /// @notice Check if an address is registered
    /// @param user The address to check
    /// @return True if the user is registered
    function isUserRegistered(address user) external view returns (bool) {
        return isRegistered[user];
    }

    /// @notice Get registration timestamp for a user
    /// @param user The address to query
    /// @return timestamp The registration timestamp (0 if not registered)
    function getRegistrationTimestamp(address user) external view returns (uint256) {
        return isRegistered[user] ? block.timestamp : 0;
    }
}

