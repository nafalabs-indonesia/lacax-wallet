import { ZEROEX_API_KEY } from "@env";
import axios from "axios";

const AFFILIATE_FEE_RECIPIENT = "0x70d96B6463533741669cd6fC871a7761e88c50c8";
const AFFILIATE_FEE_BPS = 100;

const BASE_URL = "https://api.0x.org/swap/allowance-holder/quote";

export interface SwapQuoteParams {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  takerAddress: string;
  chainId: number;
  slippagePercentage?: number;
}

export interface SwapQuoteResponse {
  buyAmount: string;
  sellAmount: string;
  allowanceTarget: string;
  transaction: {
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
  };
  fees?: {
    zeroExFee?: {
      amount: string;
      token: string;
      type: string;
    };
    integratorFee?: {
      amount: string;
      token: string;
      type: string;
    };
  };
  issues?: {
    allowance?: {
      spender: string;
      actual: string;
    };
    balance?: any;
  };

  to?: string;
  data?: string;
  value?: string;
  gasPrice?: string;
  estimatedGas?: string;
}

export class ZeroExService {
  static async getSwapQuote(
    params: SwapQuoteParams,
  ): Promise<SwapQuoteResponse> {
    try {
      const headers: Record<string, string> = {
        "0x-api-key": ZEROEX_API_KEY || "",
        "0x-version": "v2",
        "Content-Type": "application/json",
      };

      const queryParams: Record<string, string | number> = {
        chainId: params.chainId,
        sellToken: params.sellToken,
        buyToken: params.buyToken,
        sellAmount: params.sellAmount,
        taker: params.takerAddress,

        swapFeeRecipient: AFFILIATE_FEE_RECIPIENT,
        swapFeeBps: AFFILIATE_FEE_BPS.toString(),

        slippagePercentage: params.slippagePercentage
          ? params.slippagePercentage.toString()
          : "0.005",
      };

      const response = await axios.get(BASE_URL, {
        params: queryParams,
        headers: headers,
      });

      const data = response.data;

      return {
        buyAmount: data.buyAmount,
        sellAmount: data.sellAmount,
        allowanceTarget: data.allowanceTarget,
        transaction: data.transaction,
        fees: data.fees,
        issues: data.issues,

        to: data.transaction?.to,
        data: data.transaction?.data,
        value: data.transaction?.value,
        gasPrice: data.transaction?.gasPrice,
        estimatedGas: data.transaction?.gas,
      };
    } catch (error: any) {
      console.error(
        "Error fetching 0x V2 quote:",
        error.response?.data || error.message,
      );

      let errorMsg = "Failed to get swap quote.";
      if (error.response?.data?.reason) {
        errorMsg = error.response.data.reason;
      } else if (error.message) {
        errorMsg = error.message;
      }

      throw new Error(errorMsg);
    }
  }

  static getTokenAddress(symbol: string, chainId: number): string {
    const s = symbol.toUpperCase();

    if (
      s === "ETH" ||
      s === "POL" ||
      s === "BNB" ||
      s === "AVAX" ||
      s === "MON"
    ) {
      return "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    }

    if (chainId === 1) {
      switch (s) {
        case "USDT":
          return "0xdAC17F958D2ee523a2206206994597C13D831ec7";
        case "USDC":
          return "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        case "DAI":
          return "0x6B175474E89094C44Da98b954EedeAC495271d0F";
        case "WETH":
          return "0xC02aaA39b223FE8D0A0e5C4F27ead9083C756Cc2";
      }
    }

    if (chainId === 137) {
      switch (s) {
        case "USDT":
          return "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
        case "USDC":
          return "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
        case "DAI":
          return "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
        case "WETH":
          return "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
      }
    }

    if (chainId === 56) {
      switch (s) {
        case "USDT":
          return "0x55d398326f99059fF775485246999027B3197955";
        case "USDC":
          return "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
        case "DAI":
          return "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3";
        case "WETH":
          return "0x2170Ed0880ac9A755fd29B2688956BD959F933F8";
      }
    }

    if (chainId === 42161) {
      switch (s) {
        case "USDT":
          return "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
        case "USDC":
          return "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
        case "DAI":
          return "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
        case "WETH":
          return "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
      }
    }

    if (chainId === 8453) {
      switch (s) {
        case "USDC":
          return "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
        case "DAI":
          return "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb";
        case "WETH":
          return "0x4200000000000000000000000000000000000006";
      }
    }

    if (chainId === 10) {
      switch (s) {
        case "USDT":
          return "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58";
        case "USDC":
          return "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
        case "DAI":
          return "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
        case "WETH":
          return "0x4200000000000000000000000000000000000006";
      }
    }

    if (chainId === 43114) {
      switch (s) {
        case "USDT":
          return "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";
        case "USDC":
          return "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
        case "DAI":
          return "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70";
        case "WETH":
          return "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB";
      }
    }

    throw new Error(
      `Token ${symbol} not supported or mapped on Chain ID ${chainId}`,
    );
  }
}
