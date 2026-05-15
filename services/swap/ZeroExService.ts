// services/swap/ZeroExService.ts
import { ZEROEX_API_KEY } from "@env"; // Pastikan file env.d.ts sudah dibuat
import axios from "axios";

const BASE_URL = "https://api.0x.org/swap/v1/quote";

export interface SwapQuoteParams {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  takerAddress: string;
  chainId: number;
  slippagePercentage?: number; // <--- TAMBAHKAN INI (Optional)
}

export interface SwapQuoteResponse {
  buyAmount: string;
  sellAmount: string;
  to: string;
  data: string;
  value: string;
  gasPrice: string;
  estimatedGas: string;
  allowanceTarget: string;
  price: string;
  // Tambahkan field lain jika diperlukan dari response 0x
}

export class ZeroExService {
  static async getSwapQuote(
    params: SwapQuoteParams,
  ): Promise<SwapQuoteResponse> {
    try {
      const response = await axios.get(BASE_URL, {
        params: {
          sellToken: params.sellToken,
          buyToken: params.buyToken,
          sellAmount: params.sellAmount,
          takerAddress: params.takerAddress,
          // Kirim slippage jika ada, 0x API menerima desimal (misal 0.01 untuk 1%)
          ...(params.slippagePercentage
            ? { slippagePercentage: params.slippagePercentage }
            : {}),
        },
        headers: {
          "0x-api-key": ZEROEX_API_KEY,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching 0x quote:", error);
      throw new Error(
        "Failed to get swap quote. Please check network or balance.",
      );
    }
  }

  static getTokenAddress(symbol: string, chainId: number): string {
    if (symbol === "ETH") return "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    if (chainId === 1) {
      switch (symbol.toUpperCase()) {
        case "USDT":
          return "0xdAC17F958D2ee523a2206206994597C13D831ec7";
        case "USDC":
          return "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        default:
          throw new Error(`Token ${symbol} not supported on this chain`);
      }
    }

    throw new Error("Chain not supported for swap");
  }
}
