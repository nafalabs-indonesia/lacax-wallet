// config/chains.ts
import { ALCHEMY_API_KEY } from "@env";

export interface TokenConfig {
  name: string;
  symbol: string;
  address: string; // Contract Address
  decimals: number;
  // Icon akan di-handle di frontend via LOCAL_ICON_MAP atau assets/coins
}

export interface ChainConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  icon: string;
  symbol: string;
  decimals: number;
  type: "evm";
  tokens?: TokenConfig[]; // Tambahkan field opsional untuk daftar token
}

// Helper untuk membangun URL RPC Alchemy dengan aman
const getAlchemyRpc = (network: string) => {
  // Fallback ke string kosong atau default key jika env tidak terload,
  // tapi idealnya .env harus ada.
  const key = ALCHEMY_API_KEY || "";
  return `https://${network}.g.alchemy.com/v2/${key}`;
};

export const SUPPORTED_CHAINS: ChainConfig[] = [
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
    // Tambahkan token favorit di sini
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
    id: "blockdag-mainnet",
    name: "BlockDAG Mainnet",
    chainId: 1404,
    rpcUrl: "https://public-bdag.nownodes.io/", // ganti sementara "https://rpc.bdagscan.com/",
    explorerUrl: "https://bdagscan.com/",
    icon: "/assets/chains/bdag.png",
    symbol: "BDAG",
    decimals: 18,
    type: "evm",
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
];

export const getChainById = (id: string): ChainConfig | undefined => {
  return SUPPORTED_CHAINS.find((chain) => chain.id === id);
};
