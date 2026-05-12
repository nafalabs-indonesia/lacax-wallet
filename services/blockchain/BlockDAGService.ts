// services/blockchain/BlockDAGService.ts
import { SUPPORTED_CHAINS } from "@/config/chains";
import { ethers } from "ethers";

const BDAG_CONFIG = SUPPORTED_CHAINS.find(
  (c) => c.id.trim() === "blockdag-mainnet",
);

export class BlockDAGService {
  private static provider: ethers.providers.JsonRpcProvider | null = null;

  static getProvider(): ethers.providers.JsonRpcProvider {
    if (!this.provider) {
      if (!BDAG_CONFIG) {
        throw new Error("Konfigurasi BlockDAG tidak ditemukan.");
      }

      const network = {
        name: "blockdag-mainnet",
        chainId: BDAG_CONFIG.chainId,
      };

      this.provider = new ethers.providers.JsonRpcProvider(
        BDAG_CONFIG.rpcUrl,
        network,
      );
      console.log("✅ BlockDAG Provider initialized");
    }
    return this.provider;
  }

  static async getBalance(address: string): Promise<string> {
    try {
      const provider = this.getProvider();
      const balanceWei = await provider.getBalance(address);
      const balanceBdag = ethers.utils.formatEther(balanceWei);
      return parseFloat(balanceBdag).toFixed(4);
    } catch (error) {
      console.error("Error fetching BDAG balance:", error);
      return "0.0000";
    }
  }

  static getRawProvider() {
    return this.getProvider();
  }
}
