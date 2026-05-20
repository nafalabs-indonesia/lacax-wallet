// services/blockchain/BlockchainService.ts
import { ChainConfig, getChainById } from "@/config/chains";
import { ETHERSCAN_API_KEY } from "@env";
import { ethers } from "ethers";

// Tambahkan chain baru ke type ChainId
export type ChainId =
  | "ethereum-mainnet"
  | "polygon-mainnet"
  | "bnb-mainnet"
  | "blockdag-mainnet"
  | "ethereum-sepolia"
  | "polygon-amoy"
  | "bnb-testnet"
  | "blockdag-testnet";

// ABI Minimal untuk ERC-20 Token
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

/**
 * Address sentinel yang digunakan DeFi protocol (1inch, 0x, Paraswap, dll.)
 * untuk merepresentasikan native ETH — bukan ERC-20 contract.
 */
const NATIVE_ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export class BlockchainService {
  /**
   * Cache provider agar tidak membuat koneksi baru setiap kali request.
   * Dijadikan public agar bisa di-reset dari luar (misalnya saat refresh).
   */
  public static providers: Record<string, ethers.JsonRpcProvider> = {};

  /**
   * Reset semua provider yang di-cache.
   * Panggil ini sebelum refresh agar koneksi RPC dibuat ulang dari awal,
   * mencegah penggunaan koneksi lama yang sudah stale atau gagal.
   */
  static resetProviders(): void {
    this.providers = {};
    console.log("🔄 BlockchainService: provider cache direset");
  }

  /**
   * Ambil provider berdasarkan chain ID secara dinamis dari Config
   */
  static getProvider(chainId: string): ethers.JsonRpcProvider {
    // Jika sudah ada di cache, return yang lama
    if (this.providers[chainId]) {
      return this.providers[chainId];
    }

    const config = getChainById(chainId);

    if (!config) {
      console.error(`❌ Chain config for ${chainId} NOT FOUND in chains.ts`);
      throw new Error(`Chain config for ${chainId} not found`);
    }

    if (!config.rpcUrl || config.rpcUrl.includes('/v2/"')) {
      console.warn(
        `⚠️ RPC URL untuk ${chainId} kemungkinan tidak valid: ${config.rpcUrl}`,
      );
    }

    console.log(
      `🔌 Creating provider for ${chainId}: ${config.rpcUrl.substring(0, 40)}...`,
    );

    // Jika chain config punya rpcHeaders (misal NOWNodes API key),
    // gunakan FetchRequest agar header bisa dikirim ke setiap request RPC
    let provider: ethers.JsonRpcProvider;
    if (config.rpcHeaders && Object.keys(config.rpcHeaders).length > 0) {
      const fetchReq = new ethers.FetchRequest(config.rpcUrl);
      Object.entries(config.rpcHeaders).forEach(([key, value]) => {
        fetchReq.setHeader(key, value);
      });
      provider = new ethers.JsonRpcProvider(fetchReq);
      console.log(
        `🔑 [${chainId}] Using custom headers: ${Object.keys(config.rpcHeaders).join(", ")}`,
      );
    } else {
      provider = new ethers.JsonRpcProvider(config.rpcUrl);
    }
    this.providers[chainId] = provider;

    return provider;
  }

  /**
   * Cek apakah suatu address merepresentasikan native token (ETH, BDAG, dll.)
   * bukan ERC-20 contract.
   */
  static isNativeToken(tokenAddress: string): boolean {
    return (
      tokenAddress.toLowerCase() === NATIVE_ETH_ADDRESS ||
      tokenAddress.toLowerCase() === ethers.ZeroAddress.toLowerCase()
    );
  }

  /**
   * Ambil saldo Native Token (ETH, BDAG, POL, BNB, dll)
   */
  static async getBalance(chainId: string, address: string): Promise<string> {
    const config = getChainById(chainId);
    const provider = this.getProvider(chainId);

    // Verifikasi bahwa RPC benar-benar melayani chain yang benar
    // Ini mendeteksi kasus di mana RPC testnet ternyata proxy ke mainnet
    try {
      const network = await provider.getNetwork();
      const rpcChainId = Number(network.chainId);
      const expectedChainId = config?.chainId;
      if (expectedChainId && rpcChainId !== expectedChainId) {
        console.warn(
          `⚠️ [${chainId}] chainId mismatch! RPC returned ${rpcChainId}, expected ${expectedChainId}. Skipping.`,
        );
        throw new Error(
          `ChainId mismatch for ${chainId}: got ${rpcChainId}, expected ${expectedChainId}`,
        );
      }
    } catch (netErr: any) {
      // Jika error bukan dari kita (bukan mismatch), tetap throw
      if (netErr.message?.startsWith("ChainId mismatch")) throw netErr;
      console.warn(
        `⚠️ [${chainId}] Could not verify network chainId: ${netErr?.message}`,
      );
    }

    const balanceBigInt = await provider.getBalance(address);
    const balanceFormatted = ethers.formatEther(balanceBigInt);
    return parseFloat(balanceFormatted).toFixed(6);
  }

  /**
   * Ambil saldo Token ERC-20 (USDT, USDC, dll)
   *
   * Jika tokenAddress adalah native ETH sentinel (0xeeee...eeee atau 0x0000...0000),
   * akan otomatis menggunakan provider.getBalance() alih-alih contract.balanceOf().
   */
  static async getTokenBalance(
    chainId: string,
    walletAddress: string,
    tokenAddress: string,
    decimals: number,
  ): Promise<string> {
    const provider = this.getProvider(chainId);

    // Deteksi native ETH sentinel address
    if (this.isNativeToken(tokenAddress)) {
      console.log(
        `ℹ️ ${tokenAddress} adalah native token, menggunakan getBalance()`,
      );
      const balanceBigInt = await provider.getBalance(walletAddress);
      const balanceFormatted = ethers.formatEther(balanceBigInt);
      return parseFloat(balanceFormatted).toFixed(6);
    }

    // ERC-20 biasa: panggil contract.balanceOf()
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balanceRaw = await contract.balanceOf(walletAddress);
    const balanceFormatted = ethers.formatUnits(balanceRaw, decimals);
    return parseFloat(balanceFormatted).toFixed(6);
  }

  /**
   * Ambil config chain
   */
  static getChainConfig(chainId: string): ChainConfig {
    const config = getChainById(chainId);
    if (!config)
      throw new Error(`Config untuk chain ${chainId} tidak ditemukan`);
    return config;
  }

  /**
   * Ambil riwayat transaksi menggunakan Explorer API (Etherscan/BscScan/PolygonScan)
   */
  static async getTransactionHistory(
    chainId: ChainId,
    address: string,
  ): Promise<any[]> {
    const apiKey = ETHERSCAN_API_KEY;

    // Catatan: BscScan dan PolygonScan biasanya memiliki API Key sendiri,
    // tapi seringkali bisa menggunakan key Etherscan untuk basic access atau
    // Anda mungkin perlu env var terpisah jika limit tercapai.
    // Untuk sekarang kita pakai key yang sama atau kosongkan jika tidak ada.

    let baseUrl = "";
    let useApiKey = true;

    // Mapping URL API Explorer
    switch (chainId) {
      case "ethereum-mainnet":
        baseUrl = "https://api.etherscan.io/api";
        break;
      case "ethereum-sepolia":
        baseUrl = "https://api-sepolia.etherscan.io/api";
        break;
      case "polygon-mainnet":
        baseUrl = "https://api.polygonscan.com/api";
        break;
      case "polygon-amoy":
        baseUrl = "https://api-amoy.polygonscan.com/api";
        break;
      case "bnb-mainnet":
        baseUrl = "https://api.bscscan.com/api";
        break;
      case "bnb-testnet":
        baseUrl = "https://api-testnet.bscscan.com/api";
        break;
      default:
        // BlockDAG atau chain lain yang belum punya API explorer publik standar
        console.warn(`⚠️ Explorer API for ${chainId} not configured yet.`);
        return [];
    }

    // Beberapa explorer testnet kadang tidak butuh API key atau keynya berbeda
    // Jika key tidak ada, kita coba tanpa key (beberapa explorer mengizinkan limit rendah tanpa key)
    const keyParam = apiKey ? `&apikey=${apiKey}` : "";

    try {
      const url = `${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc${keyParam}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "1" && data.result && Array.isArray(data.result)) {
        const config = this.getChainConfig(chainId);

        return data.result.map((tx: any) => {
          const isSend = tx.from.toLowerCase() === address.toLowerCase();

          let valueFormatted = "0";
          try {
            valueFormatted = parseFloat(ethers.formatEther(tx.value)).toFixed(
              4,
            );
          } catch (e) {
            valueFormatted = "0";
          }

          return {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: valueFormatted,
            symbol: config.symbol,
            timestamp: parseInt(tx.timeStamp),
            status: tx.isError === "1" ? "failed" : "confirmed",
            type: isSend ? "send" : "receive",
            blockNumber: parseInt(tx.blockNumber),
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
          };
        });
      }

      return [];
    } catch (error) {
      console.error(`❌ Error fetching history for ${chainId}:`, error);
      return [];
    }
  }
}
