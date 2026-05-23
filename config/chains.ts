// config/chains.ts
import { ALCHEMY_API_KEY } from "@env";

export interface TokenConfig {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
}

export interface ChainConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  rpcHeaders?: Record<string, string>;
  explorerUrl: string;
  icon: string;
  symbol: string;
  decimals: number;
  type: "evm";
  disabled?: boolean;
  disabledReason?: string;
  tokens?: TokenConfig[];
}

const getAlchemyRpc = (network: string) => {
  const key = ALCHEMY_API_KEY || "";
  if (!key) {
    console.warn("⚠️ ALCHEMY_API_KEY is missing in .env");
  }
  return `https://${network}.g.alchemy.com/v2/${key}`;
};

const PROXY_BASE_URL = "https://lacax.vercel.app/api/v1/rpc";

export const SUPPORTED_CHAINS: ChainConfig[] = [
  // --- Existing Chains ---
  {
    id: "ethereum-mainnet",
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: getAlchemyRpc("eth-mainnet"),
    explorerUrl: "https://etherscan.io",
    icon: "/assets/chains/eth.png",
    symbol: "ETH",
    decimals: 18,
    type: "evm",
    tokens: [
      {
        name: "Tether USD",
        symbol: "USDT",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
      },
      {
        name: "USD Coin",
        symbol: "USDC",
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
      },
    ],
  },
  {
    id: "polygon-mainnet",
    name: "Polygon Mainnet",
    chainId: 137,
    rpcUrl: getAlchemyRpc("polygon-mainnet"),
    explorerUrl: "https://polygonscan.com",
    icon: "/assets/chains/polygon.png",
    symbol: "POL",
    decimals: 18,
    type: "evm",
    tokens: [
      {
        name: "Tether USD",
        symbol: "USDT",
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 6,
      },
      {
        name: "USD Coin",
        symbol: "USDC",
        address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        decimals: 6,
      },
    ],
  },
  {
    id: "bnb-mainnet",
    name: "BNB Smart Chain Mainnet",
    chainId: 56,
    rpcUrl: getAlchemyRpc("bnb-mainnet"),
    explorerUrl: "https://bscscan.com",
    icon: "/assets/chains/bnb.png",
    symbol: "BNB",
    decimals: 18,
    type: "evm",
    tokens: [
      {
        name: "Tether USD",
        symbol: "USDT",
        address: "0x55d398326f99059fF775485246999027B3197955",
        decimals: 18,
      },
    ],
  },
  {
    id: "blockdag-mainnet",
    name: "BlockDAG Mainnet",
    chainId: 1404,
    rpcUrl: `${PROXY_BASE_URL}/1404`,
    explorerUrl: "https://bdagscan.com/",
    icon: "/assets/chains/bdag.png",
    symbol: "BDAG",
    decimals: 18,
    type: "evm",
    disabled: false,
    disabledReason: "Mainnet RPC not available yet.",
  },
  {
    id: "ethereum-sepolia",
    name: "Ethereum Sepolia",
    chainId: 11155111,
    rpcUrl: getAlchemyRpc("eth-sepolia"),
    explorerUrl: "https://sepolia.etherscan.io",
    icon: "/assets/chains/eth-sepolia.png",
    symbol: "SepoliaETH",
    decimals: 18,
    type: "evm",
  },
  {
    id: "polygon-amoy",
    name: "Polygon Amoy Testnet",
    chainId: 80002,
    rpcUrl: getAlchemyRpc("polygon-amoy"),
    explorerUrl: "https://amoy.polygonscan.com",
    icon: "/assets/chains/polygon.png",
    symbol: "POL",
    decimals: 18,
    type: "evm",
  },
  {
    id: "bnb-testnet",
    name: "BNB Smart Chain Testnet",
    chainId: 97,
    rpcUrl: getAlchemyRpc("bnb-testnet"),
    explorerUrl: "https://testnet.bscscan.com",
    icon: "/assets/chains/bnb.png",
    symbol: "tBNB",
    decimals: 18,
    type: "evm",
  },
  {
    id: "blockdag-testnet",
    name: "BlockDAG Awakening Testnet",
    chainId: 1043,
    rpcUrl: "https://rpc.awakening.bdagscan.com",
    explorerUrl: "https://awakening.bdagscan.com",
    icon: "/assets/chains/bdag.png",
    symbol: "BDAG",
    decimals: 18,
    type: "evm",
  },

  // --- NEW CHAINS: ARBITRUM & MONAD ---

  // Arbitrum One Mainnet
  {
    id: "arbitrum-mainnet",
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: getAlchemyRpc("arb-mainnet"),
    explorerUrl: "https://arbiscan.io",
    icon: "/assets/chains/arbitrum.png",
    symbol: "ARB",
    decimals: 18,
    type: "evm",
  },

  // Arbitrum Sepolia Testnet
  {
    id: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chainId: 421614,
    rpcUrl: getAlchemyRpc("arb-sepolia"),
    explorerUrl: "https://sepolia.arbiscan.io",
    icon: "/assets/chains/arbitrum.png",
    symbol: "ETH",
    decimals: 18,
    type: "evm",
  },

  // Monad Mainnet
  {
    id: "monad-mainnet",
    name: "Monad Mainnet",
    chainId: 143,
    rpcUrl: getAlchemyRpc("monad-mainnet"),
    explorerUrl: "https://monadvision.com/",
    icon: "/assets/chains/monad.png",
    symbol: "MON",
    decimals: 18,
    type: "evm",
  },

  // Monad Testnet
  {
    id: "monad-testnet",
    name: "Monad Testnet",
    chainId: 10143,
    rpcUrl: getAlchemyRpc("monad-testnet"),
    explorerUrl: "https://testnet.monadvision.com/",
    icon: "/assets/chains/monad.png",
    symbol: "MON",
    decimals: 18,
    type: "evm",
  },
];

export const getChainById = (id: string): ChainConfig | undefined => {
  return SUPPORTED_CHAINS.find((chain) => chain.id === id);
};
