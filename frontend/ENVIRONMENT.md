# Environment Variables

This project uses the following environment variables for configuration:

## Required Environment Variables

### WalletConnect Project ID
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

**How to get it:**
1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy your Project ID

## Optional Environment Variables

### Custom RPC URLs
```bash
# Custom Sepolia RPC URL (optional)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_key

# Custom Hardhat RPC URL (optional)
NEXT_PUBLIC_HARDHAT_RPC_URL=http://localhost:8545
```

## Vercel Deployment

When deploying to Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add the required environment variables

## Local Development

Create a `.env.local` file in the `frontend` directory with your environment variables:

```bash
cp .env.example .env.local
# Then edit .env.local with your actual values
```
