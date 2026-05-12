// services/blockchain/EthereumService.ts
import { SUPPORTED_CHAINS } from "@/config/chains";
import { ethers } from "ethers";

// Cari config untuk Ethereum Mainnet
const ETH_CONFIG = SUPPORTED_CHAINS.find(
  (c) => c.id.trim() === "ethereum-mainnet",
);

if (!ETH_CONFIG) {
  console.error("❌ Ethereum Mainnet config not found!");
}

export class EthereumService {
  private static provider: ethers.providers.JsonRpcProvider | null = null;

  static getProvider(): ethers.providers.JsonRpcProvider {
    if (!this.provider) {
      if (!ETH_CONFIG) {
        throw new Error("Konfigurasi Ethereum Mainnet tidak ditemukan.");
      }

      // Inisialisasi dengan Network Object eksplisit untuk menghindari mismatch chainId
      const network = {
        name: "ethereum-mainnet",
        chainId: ETH_CONFIG.chainId,
      };

      this.provider = new ethers.providers.JsonRpcProvider(
        ETH_CONFIG.rpcUrl,
        network,
      );
      console.log("✅ Ethereum Mainnet Provider initialized");
    }
    return this.provider;
  }

  static async getBalance(address: string): Promise<string> {
    try {
      const provider = this.getProvider();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.utils.formatEther(balanceWei);
      return parseFloat(balanceEth).toFixed(4);
    } catch (error) {
      console.error("Error fetching ETH balance:", error);
      // Kembalikan 0 jika error agar UI tidak crash, tapi tetap log errornya
      return "0.0000";
    }
  }

  static getRawProvider() {
    return this.getProvider();
  }
}
