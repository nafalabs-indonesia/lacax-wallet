// services/blockchain/BlockchainService.ts
import { ChainConfig, getChainById } from "@/config/chains";
import { ethers } from "ethers";
import { BlockDAGService } from "./BlockDAGService";
import { EthereumService } from "./EthereumService";

export type ChainId = "ethereum-mainnet" | "blockdag-mainnet";

export class BlockchainService {
  /**
   * Ambil provider berdasarkan chain ID
   */
  static getProvider(chainId: ChainId): ethers.providers.JsonRpcProvider {
    switch (chainId) {
      case "ethereum-mainnet":
        return EthereumService.getRawProvider();
      case "blockdag-mainnet":
        return BlockDAGService.getRawProvider();
      default:
        throw new Error(`Chain ${chainId} tidak didukung`);
    }
  }

  /**
   * Ambil saldo berdasarkan chain ID dan alamat
   */
  static async getBalance(chainId: ChainId, address: string): Promise<string> {
    switch (chainId) {
      case "ethereum-mainnet":
        return EthereumService.getBalance(address);
      case "blockdag-mainnet":
        return BlockDAGService.getBalance(address);
      default:
        throw new Error(`Chain ${chainId} tidak didukung`);
    }
  }

  /**
   * Ambil config chain
   */
  static getChainConfig(chainId: ChainId): ChainConfig {
    const config = getChainById(chainId);
    if (!config)
      throw new Error(`Config untuk chain ${chainId} tidak ditemukan`);
    return config;
  }
}
