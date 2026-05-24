import { SUPPORTED_CHAINS } from "@/config/chains";
import { ethers } from "ethers";

const ETH_CONFIG = SUPPORTED_CHAINS.find(
  (c) => c.id.trim() === "ethereum-mainnet",
);

if (!ETH_CONFIG) {
  console.error("❌ Ethereum Mainnet config not found!");
}

export class EthereumService {
  private static provider: ethers.JsonRpcProvider | null = null;

  static getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      if (!ETH_CONFIG) {
        throw new Error("Konfigurasi Ethereum Mainnet tidak ditemukan.");
      }

      const network = {
        name: "ethereum-mainnet",
        chainId: ETH_CONFIG.chainId,
      };

      this.provider = new ethers.JsonRpcProvider(ETH_CONFIG.rpcUrl, network);
    }
    return this.provider;
  }

  static async getBalance(address: string): Promise<string> {
    try {
      const provider = this.getProvider();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);
      return parseFloat(balanceEth).toFixed(4);
    } catch (error) {
      console.error("Error fetching ETH balance:", error);

      return "0.0000";
    }
  }

  static getRawProvider() {
    return this.getProvider();
  }
}
