// services/blockchain/EthereumService.ts
import { ethers } from "ethers";

// === GANTI DENGAN API KEY KAMU ===
const ALCHEMY_API_KEY = "LzPrMia5J5E5I0DfVqylx";

const SEPOLIA_RPC_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

export class EthereumService {
  private static provider: ethers.providers.JsonRpcProvider | null = null;

  static getProvider(): ethers.providers.JsonRpcProvider {
    if (!this.provider) {
      this.provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
      console.log("✅ Alchemy Provider initialized for Sepolia");
    }
    return this.provider;
  }

  /**
   * Mengambil saldo ETH untuk sebuah alamat
   */
  static async getBalance(address: string): Promise<string> {
    try {
      const provider = this.getProvider();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.utils.formatEther(balanceWei);

      return parseFloat(balanceEth).toFixed(4);
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw new Error("Gagal mengambil saldo");
    }
  }

  /**
   * Utility untuk mendapatkan provider langsung (bisa dipakai di tempat lain)
   */
  static getRawProvider() {
    return this.getProvider();
  }
}
