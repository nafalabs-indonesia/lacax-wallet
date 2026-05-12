// config/chains.ts
export interface ChainConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  icon: string; // path ke icon
  symbol: string;
  decimals: number;
  type: "evm";
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: "ethereum-mainnet", // Spasi dihapus
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/LzPrMia5J5E5I0DfVqylx", // Pastikan API Key Anda valid
    explorerUrl: "https://etherscan.io",
    icon: "/assets/chains/eth.png",
    symbol: "ETH",
    decimals: 18,
    type: "evm",
  },
  {
    id: "blockdag-mainnet", // Spasi dihapus
    name: "BlockDAG Mainnet",
    chainId: 1404,
    rpcUrl: "https://rpc.bdagscan.com/",
    explorerUrl: "https://bdagscan.com/",
    icon: "/assets/chains/bdag.png",
    symbol: "BDAG",
    decimals: 18,
    type: "evm",
  },
];

export const getChainById = (id: string): ChainConfig | undefined => {
  return SUPPORTED_CHAINS.find((chain) => chain.id === id);
};
