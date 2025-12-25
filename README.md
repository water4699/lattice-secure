# Encrypted Identity Authentication

A fully homomorphic encryption (FHE) based identity authentication system built with FHEVM, Hardhat, and Next.js.

## 🎥 Demo Video

📹 [Watch Project Demo Video](self.mp4)

## 🚀 Live Deployment

🔗 **Vercel**: [https://selfself.vercel.app/](https://selfself.vercel.app/)

## 📋 Overview

This project implements an encrypted identity authentication system where users can:
1. Register their identity (encrypted locally using FHE)
2. Verify their identity without exposing plaintext data
3. All operations use FHE encryption for complete privacy

## ✨ Features

- **🔐 Encrypted Identity Registration**: Users register their identity using FHE encryption
- **🔓 Privacy-Preserving Verification**: Identity verification without exposing plaintext
- **🌈 Rainbow Wallet Integration**: Modern wallet connection using RainbowKit
- **⚡ FHEVM Integration**: Full support for FHE operations on blockchain
- **🎨 Beautiful UI**: Modern, client-ready interface with loading states
- **📅 Registration Timestamp Tracking**: View when identities were registered
- **🛡️ Enhanced Security**: Input validation and proof verification
- **🧪 Comprehensive Testing**: Full test coverage including edge cases

## 🏗️ Contract Deployment

### Sepolia Testnet
- **Contract Address**: `0x9529C86672CDFd1DE83D64c5087B01B0e3A3fcBE`
- **Network**: Sepolia Testnet (Chain ID: 11155111)
- **Block Explorer**: [Etherscan Sepolia](https://sepolia.etherscan.io/address/0x9529C86672CDFd1DE83D64c5087B01B0e3A3fcBE)

## 🛠️ Quick Start

### Prerequisites
- Node.js >= 20
- npm >= 7.0.0
- Web3 wallet (MetaMask/Rainbow recommended)

### Installation & Setup

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Set up environment variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Copy FHEVM internal files from template
cp -r "../fhevm-hardhat-template旧/frontend/fhevm/internal" "frontend/fhevm/"
cp "../fhevm-hardhat-template旧/frontend/fhevm/FhevmDecryptionSignature.ts" "frontend/fhevm/"
```

### Development

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Start local Hardhat node
npx hardhat node

# Deploy to local network
npx hardhat deploy --network localhost

# Start frontend
cd frontend
npm run genabi
npm run dev
```

### Production Deployment

The project is configured for Vercel deployment with the live instance at [https://selfself.vercel.app/](https://selfself.vercel.app/).

**Supported Networks:**
- **Local Hardhat** (Chain ID: 31337)
- **Sepolia Testnet** (Chain ID: 11155111) - Contract: `0x9529C86672CDFd1DE83D64c5087B01B0e3A3fcBE`

## 📁 Project Structure

```
pro15/
├── contracts/           # Solidity smart contracts
├── test/               # Test suites
├── deploy/             # Deployment scripts
├── frontend/           # Next.js React application
│   ├── app/            # Next.js 13+ app router
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   └── fhevm/          # FHEVM integration
└── README.md
```

## 🔧 Core Functions

### Smart Contract
- `register()` - Register encrypted identity (one-time per address)
- `verify()` - Verify identity without exposing plaintext
- `getRegistrationTimestamp()` - Get registration timestamp
- `isUserRegistered()` - Check registration status

### Frontend Features
- 🌈 Rainbow Wallet integration
- 🔐 Client-side FHE encryption/decryption
- 📊 Real-time status updates
- 🎯 Network switching (Local/Sepolia)
- ⚡ Performance optimizations

## 🧪 Testing

```bash
npm run test              # Local tests
npm run test:sepolia      # Sepolia integration tests
```

## 🔒 Security

- **Fully Homomorphic Encryption**: All identity data remains encrypted
- **Client-side encryption**: Plaintext never leaves user device
- **Input validation**: Prevents malformed proof submissions
- **Access control**: One registration per address

## 📞 Support

- **FHEVM Docs**: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- **Zama Discord**: [https://discord.gg/zama](https://discord.gg/zama)

## 📄 License

BSD-3-Clause-Clear

