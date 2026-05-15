// services/blockchain/BlockchainService.ts
import { ChainConfig, getChainById } from "@/config/chains";
import { ethers } from "ethers";

export type ChainId =
  | "ethereum-mainnet"
  | "blockdag-mainnet"
  | "ethereum-sepolia"
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
   * Cache provider agar tidak membuat koneksi baru setiap kali request
   */
  private static providers: Record<string, ethers.providers.JsonRpcProvider> =
    {};

  /**
   * Ambil provider berdasarkan chain ID secara dinamis dari Config
   */
  static getProvider(chainId: string): ethers.providers.JsonRpcProvider {
    // Jika sudah ada di cache, return yang lama
    if (this.providers[chainId]) {
      return this.providers[chainId];
    }

    const config = getChainById(chainId);

    if (!config) {
      console.error(`❌ Chain config for ${chainId} NOT FOUND in chains.ts`);
      throw new Error(`Chain config for ${chainId} not found`);
    }

    console.log(
      `✅ Creating provider for ${chainId}: ${config.rpcUrl.substring(0, 20)}...`,
    );

    // Buat provider baru (V5) dan simpan di cache
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
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
      tokenAddress === ethers.constants.AddressZero // 0x0000...0000
    );
  }

  /**
   * Ambil saldo Native Token (ETH, BDAG, dll)
   */
  static async getBalance(chainId: string, address: string): Promise<string> {
    try {
      const provider = this.getProvider(chainId);
      const balanceBigInt = await provider.getBalance(address);

      // V5: ethers.utils.formatEther
      const balanceFormatted = ethers.utils.formatEther(balanceBigInt);

      return parseFloat(balanceFormatted).toFixed(4);
    } catch (error) {
      console.error(`❌ Error fetching native balance for ${chainId}:`, error);
      return "0.0000";
    }
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
    try {
      const provider = this.getProvider(chainId);

      // ✅ FIX: Deteksi native ETH sentinel address
      // 0xeeee...eeee bukan smart contract — tidak punya balanceOf()
      if (this.isNativeToken(tokenAddress)) {
        console.log(
          `ℹ️ ${tokenAddress} adalah native token, menggunakan getBalance()`,
        );
        const balanceBigInt = await provider.getBalance(walletAddress);
        const balanceFormatted = ethers.utils.formatEther(balanceBigInt);
        return parseFloat(balanceFormatted).toFixed(4);
      }

      // ERC-20 biasa: panggil contract.balanceOf()
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balanceRaw = await contract.balanceOf(walletAddress);

      // V5: ethers.utils.formatUnits
      const balanceFormatted = ethers.utils.formatUnits(balanceRaw, decimals);

      return parseFloat(balanceFormatted).toFixed(4);
    } catch (error) {
      console.error(
        `❌ Error fetching token balance for ${tokenAddress} on ${chainId}:`,
        error,
      );
      return "0.0000";
    }
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
}
