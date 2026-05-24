import { ChainConfig, getChainById } from "@/config/chains";
import { ETHERSCAN_API_KEY } from "@env";
import { ethers } from "ethers";

export type ChainId =
  | "ethereum-mainnet"
  | "polygon-mainnet"
  | "bnb-mainnet"
  | "blockdag-mainnet"
  | "ethereum-sepolia"
  | "polygon-amoy"
  | "bnb-testnet"
  | "blockdag-testnet"
  | "arbitrum-mainnet"
  | "arbitrum-sepolia"
  | "monad-mainnet"
  | "monad-testnet";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const NATIVE_ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export class BlockchainService {
  public static providers: Record<string, ethers.JsonRpcProvider> = {};

  static resetProviders(): void {
    this.providers = {};
  }

  static getProvider(chainId: string): ethers.JsonRpcProvider {
    if (this.providers[chainId]) {
      return this.providers[chainId];
    }

    const config = getChainById(chainId);
    if (!config) {
      throw new Error(`Chain config for ${chainId} not found`);
    }

    let provider: ethers.JsonRpcProvider;

    if (config.rpcHeaders && Object.keys(config.rpcHeaders).length > 0) {
      const fetchReq = new ethers.FetchRequest(config.rpcUrl);
      Object.entries(config.rpcHeaders).forEach(([key, value]) => {
        fetchReq.setHeader(key, value);
      });
      provider = new ethers.JsonRpcProvider(fetchReq);
    } else {
      const network = new ethers.Network(config.name, config.chainId);
      provider = new ethers.JsonRpcProvider(config.rpcUrl, network, {
        staticNetwork: true,
      });
    }

    this.providers[chainId] = provider;
    return provider;
  }

  static isNativeToken(tokenAddress: string): boolean {
    return (
      tokenAddress.toLowerCase() === NATIVE_ETH_ADDRESS ||
      tokenAddress.toLowerCase() === ethers.ZeroAddress.toLowerCase()
    );
  }

  static async getBalance(chainId: string, address: string): Promise<string> {
    const provider = this.getProvider(chainId);
    const balanceBigInt = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balanceBigInt)).toFixed(6);
  }

  static async getTokenBalance(
    chainId: string,
    walletAddress: string,
    tokenAddress: string,
    decimals: number,
  ): Promise<string> {
    const provider = this.getProvider(chainId);

    if (this.isNativeToken(tokenAddress)) {
      const balanceBigInt = await provider.getBalance(walletAddress);
      return parseFloat(ethers.formatEther(balanceBigInt)).toFixed(6);
    }

    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balanceRaw = await contract.balanceOf(walletAddress);
    return parseFloat(ethers.formatUnits(balanceRaw, decimals)).toFixed(6);
  }

  static getChainConfig(chainId: string): ChainConfig {
    const config = getChainById(chainId);
    if (!config)
      throw new Error(`Config untuk chain ${chainId} tidak ditemukan`);
    return config;
  }

  /**
   * Ambil riwayat transaksi.
   */
  static async getTransactionHistory(
    chainId: ChainId,
    address: string,
  ): Promise<any[]> {
    const apiKey = ETHERSCAN_API_KEY;
    const config = getChainById(chainId);
    if (!config) return [];

    if (config.chainId === 56 || config.chainId === 97) {
      return [];
    }

    if (config.chainId === 1404 || config.chainId === 1043) {
      return this.getBlockDAGHistory(config, address);
    }

    if (config.chainId === 143 || config.chainId === 10143) {
      return [];
    }

    if (!apiKey) {
      console.warn(`⚠️ ETHERSCAN_API_KEY is missing.`);
      return [];
    }

    try {
      const baseUrl = "https://api.etherscan.io/v2/api";
      const url = `${baseUrl}?chainid=${config.chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "0") {
        if (data.message === "NOTOK") {
          console.warn(`⚠️ API Error ${config.name}: ${data.result}`);
        }
        return [];
      }

      if (data.status === "1" && data.result && Array.isArray(data.result)) {
        return this.parseTransactions(data.result, address, config);
      }

      return [];
    } catch (error) {
      console.error(`❌ Error fetching history for ${chainId}:`, error);
      return [];
    }
  }

  private static async getBlockDAGHistory(
    config: ChainConfig,
    address: string,
  ): Promise<any[]> {
    let baseUrl = "";

    if (config.chainId === 1404) {
      baseUrl = "https://api.bdagscan.com";
    } else if (config.chainId === 1043) {
      baseUrl = "https://api.awakening.bdagscan.com";
    } else {
      return [];
    }

    try {
      const url = `${baseUrl}/v1/api//transaction/getTransactionByAddress?address=${address}&limit=50&page=1&export=false`;

      const response = await fetch(url);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn(
          `⚠️ BlockDAG Explorer returned non-JSON response for ${config.name}`,
        );
        return [];
      }

      const json = await response.json();

      if (json && json.data && Array.isArray(json.data)) {
        const mappedTxs = json.data.map((tx: any) => {
          let finalValue = tx.value;

          if (
            finalValue &&
            typeof finalValue === "string" &&
            finalValue.includes(".")
          ) {
          } else if (finalValue) {
            try {
              finalValue = ethers.formatEther(finalValue);
            } catch (e) {
              finalValue = "0";
            }
          } else {
            finalValue = "0";
          }

          return {
            hash: tx.txnHash,
            from: tx.from,
            to: tx.to,
            value: finalValue,
            timeStamp: tx.timeStamp || Math.floor(Date.now() / 1000),
            isError: tx.status === "success" ? "0" : "1",
            blockNumber: tx.blockId,
            gasUsed: tx.gasUsed || "0",
            gasPrice: tx.gasPrice || "0",
          };
        });

        return this.parseTransactions(mappedTxs, address, config);
      }

      return [];
    } catch (error) {
      console.warn(`⚠️ Failed to fetch BlockDAG history:`, error);
      return [];
    }
  }

  /**
   * Helper untuk parsing data transaksi dari JSON API
   */
  private static parseTransactions(
    result: any[],
    address: string,
    config: ChainConfig,
  ): any[] {
    return result.map((tx: any) => {
      const isSend = tx.from.toLowerCase() === address.toLowerCase();
      let valueFormatted = "0";

      try {
        if (typeof tx.value === "string" && tx.value.includes(".")) {
          valueFormatted = parseFloat(tx.value).toFixed(4);
        } else {
          valueFormatted = parseFloat(
            ethers.formatEther(tx.value || "0"),
          ).toFixed(4);
        }
      } catch (e) {
        console.warn("Error formatting value", e, tx.value);
        valueFormatted = "0";
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: valueFormatted,
        symbol: config.symbol,

        timestamp:
          typeof tx.timeStamp === "number"
            ? tx.timeStamp * 1000
            : parseInt(tx.timeStamp) * 1000,
        status: tx.isError === "1" ? "failed" : "confirmed",
        type: isSend ? "send" : "receive",
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
      };
    });
  }
}
