// app/swap.tsx
import { SUPPORTED_CHAINS, TokenConfig } from "@/config/chains";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { ZEROEX_API_KEY } from "@env";
import { ethers } from "ethers";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowDown,
  Check,
  ChevronDown,
  ChevronLeft,
  Info,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────
// Configuration & Constants
// ─────────────────────────────────────────────

// Wallet penerima fee affiliate
const AFFILIATE_FEE_RECIPIENT = "0x70d96B6463533741669cd6fC871a7761e88c50c8";
const DEFAULT_AFFILIATE_FEE_BPS = 80; // 0.8% fee

// Mapping Chain ID integer untuk 0x API
const CHAIN_ID_MAP: Record<string, number> = {
  "ethereum-mainnet": 1,
  "polygon-mainnet": 137,
  "bnb-mainnet": 56,
  "arbitrum-mainnet": 42161,
  "base-mainnet": 8453,
  "optimism-mainnet": 10,
  "avalanche-mainnet": 43114,

  // Testnets (Tidak didukung 0x Production API, tapi kita map untuk UI)
  "ethereum-sepolia": 11155111,
  "polygon-amoy": 80002,
  "arbitrum-sepolia": 421614,
};

// Mapping Icon Lokal untuk Token
const TOKEN_ICON_MAP: Record<string, any> = {
  ETH: require("../assets/chains/eth.png"),
  USDT: require("../assets/coins/usdt.png"),
  USDC: require("../assets/coins/usdc.png"),
  BDAG: require("../assets/chains/bdag.png"),
  POL: require("../assets/chains/polygon.png"),
  BNB: require("../assets/chains/bnb.png"),
  WETH: require("../assets/chains/eth.png"),
  ARB: require("../assets/chains/arbitrum.png"),
};

// Mapping Icon Lokal untuk Network
const NETWORK_ICON_MAP: Record<string, any> = {
  "ethereum-mainnet": require("../assets/chains/eth.png"),
  "ethereum-sepolia": require("../assets/chains/eth-sepolia.png"),
  "polygon-mainnet": require("../assets/chains/polygon.png"),
  "polygon-amoy": require("../assets/chains/polygon.png"),
  "bnb-mainnet": require("../assets/chains/bnb.png"),
  "bnb-testnet": require("../assets/chains/bnb.png"),
  "blockdag-mainnet": require("../assets/chains/bdag.png"),
  "blockdag-testnet": require("../assets/chains/bdag.png"),
  "arbitrum-mainnet": require("../assets/chains/arbitrum.png"),
  "arbitrum-sepolia": require("../assets/chains/arbitrum.png"),
};

// Helper: Get harga USD dari CoinGecko
const fetchCoinPrice = async (coinId: string): Promise<number> => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
    );
    const data = await response.json();
    return data[coinId]?.usd || 0;
  } catch (error) {
    console.warn(`Failed to fetch price for ${coinId}`, error);
    return 0;
  }
};

// Helper: Get Kurs USD to IDR Realtime
const fetchUsdToIdrRate = async (): Promise<number> => {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await response.json();
    if (data && data.rates && data.rates.IDR) {
      return data.rates.IDR;
    }
    return 15000;
  } catch (error) {
    console.warn("Failed to fetch USD to IDR rate", error);
    return 15000;
  }
};

// Interface untuk Token di UI
interface SwapToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  price: number;
  coingeckoId: string | null;
}

// Map Symbol ke Coingecko ID
const getCoingeckoId = (symbol: string): string | null => {
  const s = symbol.toUpperCase().trim();
  if (s === "ETH" || s === "WETH") return "ethereum";
  if (s === "USDT") return "tether";
  if (s === "USDC") return "usd-coin";
  if (s === "BDAG") return "blockdag";
  if (s === "POL" || s === "MATIC") return "polygon-ecosystem-token";
  if (s === "BNB") return "binancecoin";
  return null;
};

export default function SwapScreen() {
  const { walletAddress, isDarkMode, mnemonic } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const params = useLocalSearchParams();
  // Trim chainId dari params untuk menghindari spasi
  const initialChainId = (
    (params.chainId as string) || "ethereum-mainnet"
  ).trim();

  // State
  const [selectedChainId, setSelectedChainId] = useState<ChainId>(
    initialChainId as ChainId,
  );
  const [showNetworkSheet, setShowNetworkSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showFromTokenSheet, setShowFromTokenSheet] = useState(false);
  const [showToTokenSheet, setShowToTokenSheet] = useState(false);

  // Swap Data
  const [fromToken, setFromToken] = useState<SwapToken | null>(null);
  const [toToken, setToToken] = useState<SwapToken | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  // Loading & Errors
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [slippage, setSlippage] = useState("0.5");
  const [affiliateFeeBps, setAffiliateFeeBps] = useState(
    DEFAULT_AFFILIATE_FEE_BPS.toString(),
  );

  // State untuk balance ERC-20 di token list sheet
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>(
    {},
  );

  // State untuk Kurs USD ke IDR
  const [usdToIdrRate, setUsdToIdrRate] = useState<number>(15000);

  // Helper: Get Config for Current Chain
  const currentChainConfig = SUPPORTED_CHAINS.find(
    (c) => c.id.trim() === selectedChainId.trim(),
  );

  // Filter Mainnet Chains Only for Network Sheet
  const mainnetChains = SUPPORTED_CHAINS.filter((chain) => {
    const isTestnet =
      chain.id.toLowerCase().includes("testnet") ||
      chain.id.toLowerCase().includes("sepolia");
    const isSupportedBy0x = CHAIN_ID_MAP[chain.id.trim()] !== undefined;
    // Hanya tampilkan chain yang ada di mapping 0x untuk fitur swap
    return !isTestnet && isSupportedBy0x;
  });

  // Initialize Tokens when Chain Changes
  useEffect(() => {
    if (!currentChainConfig) return;

    const nativeSymbol = currentChainConfig.symbol.trim();
    const tokens = currentChainConfig.tokens || [];

    let defaultToTokenConfig: TokenConfig | undefined =
      tokens.find((t) => t.symbol.trim() === "USDT") ||
      tokens.find((t) => t.symbol.trim() === "USDC") ||
      tokens[0];

    const initFrom: SwapToken = {
      symbol: nativeSymbol,
      name: currentChainConfig.name.split(" ")[0],
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      decimals: currentChainConfig.decimals,
      balance: "0",
      price: 0,
      coingeckoId: getCoingeckoId(nativeSymbol),
    };

    const initTo: SwapToken = defaultToTokenConfig
      ? {
          symbol: defaultToTokenConfig.symbol.trim(),
          name: defaultToTokenConfig.name,
          address: defaultToTokenConfig.address.trim(),
          decimals: defaultToTokenConfig.decimals,
          balance: "0",
          price: 0,
          coingeckoId: getCoingeckoId(defaultToTokenConfig.symbol.trim()),
        }
      : initFrom;

    setFromToken(initFrom);
    setToToken(initTo);
    setFromAmount("");
    setToAmount("");
    setError(null);
    setTokenBalances({});
  }, [selectedChainId, currentChainConfig]);

  // Fetch Kurs USD to IDR
  useEffect(() => {
    const getRate = async () => {
      const rate = await fetchUsdToIdrRate();
      setUsdToIdrRate(rate);
    };
    getRate();
    const interval = setInterval(getRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  // Fetch balance semua token ERC-20 di chain ini
  const fetchAllTokenBalances = useCallback(async () => {
    if (!walletAddress || !currentChainConfig?.tokens) return;
    const balances: Record<string, string> = {};

    await Promise.all(
      currentChainConfig.tokens.map(async (tokenConf) => {
        try {
          const bal = await BlockchainService.getTokenBalance(
            selectedChainId,
            walletAddress,
            tokenConf.address.trim(),
            tokenConf.decimals,
          );
          balances[tokenConf.address.trim()] = bal;
        } catch {
          balances[tokenConf.address.trim()] = "0.0000";
        }
      }),
    );

    setTokenBalances(balances);
  }, [selectedChainId, walletAddress, currentChainConfig]);

  // Fetch Prices Realtime
  useEffect(() => {
    if (!fromToken || !toToken) return;
    const updatePrices = async () => {
      setIsLoadingPrices(true);
      let newFromPrice = fromToken.price;
      let newToPrice = toToken.price;

      if (fromToken.coingeckoId) {
        newFromPrice = await fetchCoinPrice(fromToken.coingeckoId);
      }
      if (toToken.coingeckoId) {
        newToPrice = await fetchCoinPrice(toToken.coingeckoId);
      }

      setFromToken((prev) => (prev ? { ...prev, price: newFromPrice } : null));
      setToToken((prev) => (prev ? { ...prev, price: newToPrice } : null));
      setIsLoadingPrices(false);
    };

    updatePrices();
    const interval = setInterval(updatePrices, 60000);
    return () => clearInterval(interval);
  }, [fromToken?.symbol, toToken?.symbol, selectedChainId]);

  // Fetch Balances Realtime
  const fetchBalances = useCallback(async () => {
    if (!walletAddress || !fromToken || !toToken || !currentChainConfig) return;
    setIsLoadingBalances(true);
    try {
      const nativeBal = await BlockchainService.getBalance(
        selectedChainId,
        walletAddress,
      );

      let fBal = nativeBal;
      let tBal = "0";

      if (fromToken.symbol !== currentChainConfig.symbol.trim()) {
        fBal = await BlockchainService.getTokenBalance(
          selectedChainId,
          walletAddress,
          fromToken.address.trim(),
          fromToken.decimals,
        );
      }

      if (toToken.symbol !== currentChainConfig.symbol.trim()) {
        tBal = await BlockchainService.getTokenBalance(
          selectedChainId,
          walletAddress,
          toToken.address.trim(),
          toToken.decimals,
        );
      } else {
        tBal = nativeBal;
      }

      setFromToken((prev) => (prev ? { ...prev, balance: fBal } : null));
      setToToken((prev) => (prev ? { ...prev, balance: tBal } : null));
    } catch (e) {
      console.error("Error fetching balances", e);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [
    selectedChainId,
    walletAddress,
    fromToken?.symbol,
    toToken?.symbol,
    currentChainConfig,
  ]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  useEffect(() => {
    fetchAllTokenBalances();
    const interval = setInterval(fetchAllTokenBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchAllTokenBalances]);

  // Calculate Swap Output (Local Estimate via CoinGecko Price)
  useEffect(() => {
    if (
      !fromAmount ||
      isNaN(parseFloat(fromAmount)) ||
      !fromToken ||
      !toToken
    ) {
      setToAmount("");
      setError(null);
      return;
    }
    const amount = parseFloat(fromAmount);

    if (amount > parseFloat(fromToken.balance)) {
      setError("Insufficient balance");
      setToAmount("");
      return;
    }

    if (fromToken.price > 0 && toToken.price > 0) {
      const rate = fromToken.price / toToken.price;
      const estimatedOut = amount * rate;
      setToAmount(estimatedOut.toFixed(6));
      setError(null);
    } else {
      setToAmount("0.00");
    }
  }, [
    fromAmount,
    fromToken?.symbol,
    toToken?.symbol,
    fromToken?.price,
    toToken?.price,
  ]);

  const handleSwapTokens = () => {
    if (!fromToken || !toToken) return;
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount("");
  };

  const handleMax = () => {
    if (fromToken) setFromAmount(fromToken.balance);
  };

  const getSelectedChainName = () => {
    return currentChainConfig ? currentChainConfig.name : "Unknown Network";
  };

  // ─────────────────────────────────────────────
  // 0x API Integration (V2 - AllowanceHolder)
  // ─────────────────────────────────────────────
  const handleSwap = async () => {
    // 1. Validasi Dasar
    if (!fromToken || !toToken) {
      Alert.alert("Error", "Please select tokens first.");
      return;
    }
    if (fromToken.address.toLowerCase() === toToken.address.toLowerCase()) {
      Alert.alert(
        "Invalid Swap",
        "You cannot swap a token with itself.\nPlease choose different tokens.",
      );
      return;
    }
    const numericAmount = parseFloat(fromAmount);
    if (!fromAmount || isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount greater than 0.",
      );
      return;
    }
    if (numericAmount > parseFloat(fromToken.balance)) {
      Alert.alert("Insufficient Balance", "You do not have enough funds.");
      return;
    }
    if (!walletAddress || !mnemonic) {
      Alert.alert("Wallet Error", "No wallet address or mnemonic found.");
      return;
    }

    const chainIdInt = CHAIN_ID_MAP[selectedChainId];
    if (!chainIdInt) {
      Alert.alert(
        "Unsupported Chain",
        "This chain is not supported by 0x Swap API yet.",
      );
      return;
    }

    // Cek apakah chain didukung oleh 0x Production API (Hanya Mainnet)
    const isMainnet =
      !selectedChainId.toLowerCase().includes("testnet") &&
      !selectedChainId.toLowerCase().includes("sepolia");

    if (!isMainnet) {
      Alert.alert(
        "Testnet Not Supported",
        "0x Swap API Production only supports Mainnets. Please switch to Ethereum, Polygon, Arbitrum, etc.",
      );
      return;
    }

    setIsSwapping(true);
    setError(null);

    try {
      // Convert amount to Wei/Base Unit
      const sellAmountWei = ethers
        .parseUnits(fromAmount, fromToken.decimals)
        .toString();

      // Prepare Parameters for 0x API V2
      const params = new URLSearchParams({
        chainId: chainIdInt.toString(),
        sellToken: fromToken.address.trim(),
        buyToken: toToken.address.trim(),
        sellAmount: sellAmountWei,
        taker: walletAddress,
        slippagePercentage: (parseFloat(slippage) / 100).toString(),

        // Affiliate Fee Params
        swapFeeRecipient: AFFILIATE_FEE_RECIPIENT,
        swapFeeBps: affiliateFeeBps,
      });

      // Headers
      const headers = {
        "0x-api-key": ZEROEX_API_KEY || "",
        "0x-version": "v2",
      };

      console.log("🔄 Fetching 0x Quote...", params.toString());

      // 1. Get Quote
      const quoteResponse = await fetch(
        `https://api.0x.org/swap/allowance-holder/quote?${params.toString()}`,
        { headers },
      );

      if (!quoteResponse.ok) {
        const errData = await quoteResponse.json();
        console.error("❌ 0x API Error:", errData);
        throw new Error(
          errData.reason || errData.message || "Failed to get quote",
        );
      }

      const quoteData = await quoteResponse.json();
      console.log("✅ Quote Received");

      // Display Confirmation
      const estimatedBuyAmount = ethers.formatUnits(
        quoteData.buyAmount,
        toToken.decimals,
      );

      Alert.alert(
        "Confirm Swap",
        `Swap ${fromAmount} ${fromToken.symbol}\n→ ~${parseFloat(estimatedBuyAmount).toFixed(6)} ${toToken.symbol}\n\nFee: ${affiliateFeeBps} bps to Integrator`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              try {
                const provider = BlockchainService.getProvider(selectedChainId);
                const walletFromMnemonic = ethers.Wallet.fromPhrase(mnemonic);
                const signer = walletFromMnemonic.connect(provider);

                if (
                  signer.address.toLowerCase() !== walletAddress.toLowerCase()
                ) {
                  throw new Error("Address mismatch. Please re-login.");
                }

                // 2. Check Allowance & Approve if needed
                if (
                  fromToken.address.toLowerCase() !==
                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee".toLowerCase() &&
                  quoteData.transaction.to
                ) {
                  const ERC20_ABI = [
                    "function allowance(address owner, address spender) view returns (uint256)",
                    "function approve(address spender, uint256 amount) returns (bool)",
                  ];
                  const tokenContract = new ethers.Contract(
                    fromToken.address.trim(),
                    ERC20_ABI,
                    signer,
                  );

                  const currentAllowance = await tokenContract.allowance(
                    walletAddress,
                    quoteData.transaction.to,
                  );

                  const sellAmountBN = BigInt(sellAmountWei);

                  if (currentAllowance < sellAmountBN) {
                    console.log(
                      "🔑 Approving token spend on AllowanceHolder...",
                    );
                    const approveTx = await tokenContract.approve(
                      quoteData.transaction.to,
                      ethers.MaxUint256,
                    );
                    await approveTx.wait();
                    console.log("✅ Approved!");
                  }
                }

                // 3. Send Transaction
                const tx = await signer.sendTransaction({
                  to: quoteData.transaction.to,
                  data: quoteData.transaction.data,
                  value: BigInt(quoteData.transaction.value || "0"),
                  gasLimit: BigInt(quoteData.transaction.gas),
                });

                console.log("⏳ Swap tx sent: ", tx.hash);
                Alert.alert(
                  "Swap Submitted!",
                  `Transaction is being processed.\nTx Hash: ${tx.hash}`,
                );

                setFromAmount("");
                setToAmount("");

                await tx.wait();
                fetchBalances();
                fetchAllTokenBalances();
              } catch (execError: any) {
                console.error("Swap execution error: ", execError);
                Alert.alert(
                  "Swap Failed",
                  execError?.message ||
                    "An error occurred while sending the transaction.",
                );
              }
            },
          },
        ],
      );
    } catch (quoteError: any) {
      console.error("Quote error: ", quoteError);
      setError(quoteError.message || "Failed to get swap quote.");
    } finally {
      setIsSwapping(false);
    }
  };

  // Component for Token Icon
  const TokenIcon = ({ symbol }: { symbol: string }) => {
    const source = TOKEN_ICON_MAP[symbol.toUpperCase().trim()];
    if (source) {
      return (
        <Image
          source={source}
          style={{ width: 24, height: 24, borderRadius: 12 }}
        />
      );
    }
    return (
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: "#555",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
          {symbol.charAt(0)}
        </Text>
      </View>
    );
  };

  if (!fromToken || !toToken)
    return (
      <ActivityIndicator
        size="large"
        color={theme.primary}
        style={{ flex: 1, backgroundColor: theme.background }}
      />
    );

  const isSwapDisabled =
    !!error || !fromAmount || isSwapping || isLoadingPrices;

  // Helper Format IDR
  const formatIDR = (usdValue: number) => {
    const idrValue = usdValue * usdToIdrRate;
    return idrValue.toLocaleString("id-ID", {
      maximumFractionDigits: 0,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      {/* ── Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {getSelectedChainName()}
        </Text>

        <TouchableOpacity
          onPress={() => setShowSettingsSheet(true)}
          style={styles.iconBtn}
        >
          <SlidersHorizontal size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── From Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              You Pay
            </Text>
            <Text style={[styles.balanceText, { color: theme.textSecondary }]}>
              {isLoadingBalances
                ? "Loading..."
                : `Balance: ${parseFloat(fromToken.balance).toFixed(4)}`}
            </Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.amountInput, { color: theme.text }]}
              placeholder="0.0"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={fromAmount}
              onChangeText={setFromAmount}
            />
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => setShowFromTokenSheet(true)}
            >
              <TokenIcon symbol={fromToken.symbol} />
              <Text
                style={[
                  styles.tokenSymbol,
                  { color: theme.text, marginLeft: 6 },
                ]}
              >
                {fromToken.symbol}
              </Text>
              <ChevronDown size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.fiatRow}>
            <Text style={{ color: theme.textSecondary }}>
              ~ IDR{" "}
              {fromAmount && fromToken.price > 0
                ? formatIDR(parseFloat(fromAmount) * fromToken.price)
                : "0"}
            </Text>
            <TouchableOpacity onPress={handleMax}>
              <Text style={[styles.maxBtn, { color: theme.primary }]}>MAX</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Swap Button */}
        <View style={styles.swapButtonContainer}>
          <TouchableOpacity
            onPress={handleSwapTokens}
            style={[styles.swapCircle, { backgroundColor: theme.primary }]}
          >
            <ArrowDown size={25} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* ── To Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              You Receive
            </Text>
            <Text style={[styles.balanceText, { color: theme.textSecondary }]}>
              {isLoadingBalances
                ? "Loading..."
                : `Balance: ${parseFloat(toToken.balance).toFixed(4)}`}
            </Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.amountInput, { color: theme.text }]}
              placeholder="0.0"
              placeholderTextColor={theme.textSecondary}
              value={toAmount}
              editable={false}
            />
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => setShowToTokenSheet(true)}
            >
              <TokenIcon symbol={toToken.symbol} />
              <Text
                style={[
                  styles.tokenSymbol,
                  { color: theme.text, marginLeft: 6 },
                ]}
              >
                {toToken.symbol}
              </Text>
              <ChevronDown size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.fiatRow}>
            <Text style={{ color: theme.textSecondary }}>
              ~ IDR{" "}
              {toAmount && toToken.price > 0
                ? formatIDR(parseFloat(toAmount) * toToken.price)
                : "0"}
            </Text>
          </View>
        </View>

        {/* ── Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Action Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: isSwapDisabled ? "#555" : theme.primary,
              opacity: isSwapDisabled ? 0.5 : 1,
            },
          ]}
          disabled={isSwapDisabled}
          onPress={handleSwap}
        >
          {isSwapping ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.actionBtnText}>{error ? "Error" : "Swap"}</Text>
          )}
        </TouchableOpacity>

        {/* ── Select Network Button (Bottom) */}
        <TouchableOpacity
          style={[styles.networkBtn, { borderColor: theme.text }]}
          onPress={() => setShowNetworkSheet(true)}
        >
          <Text style={[styles.networkBtnText, { color: theme.text }]}>
            Select Network
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Network Bottom Sheet */}
      <Modal visible={showNetworkSheet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContent, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Select Network
              </Text>
              <TouchableOpacity onPress={() => setShowNetworkSheet(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {mainnetChains.map((chain) => {
                const isSelected = selectedChainId.trim() === chain.id.trim();
                const chainIcon = NETWORK_ICON_MAP[chain.id.trim()];

                return (
                  <TouchableOpacity
                    key={chain.id}
                    style={styles.networkItem}
                    onPress={() => {
                      setSelectedChainId(chain.id.trim() as ChainId);
                      setShowNetworkSheet(false);
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View style={{ marginRight: 12 }}>
                        {chainIcon ? (
                          <Image
                            source={chainIcon}
                            style={{ width: 24, height: 24, borderRadius: 12 }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: "#555",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ color: "#fff", fontSize: 10 }}>
                              {chain.symbol.charAt(0)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.networkItemText, { color: theme.text }]}
                      >
                        {chain.name}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.checkBox,
                        {
                          borderColor: isSelected
                            ? theme.primary
                            : theme.textSecondary,
                          backgroundColor: isSelected
                            ? theme.primary
                            : "transparent",
                        },
                      ]}
                    >
                      {isSelected && (
                        <Check size={14} color="#FFF" strokeWidth={3} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── From Token Selection Sheet */}
      <Modal visible={showFromTokenSheet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContent, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Select Token
              </Text>
              <TouchableOpacity onPress={() => setShowFromTokenSheet(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {currentChainConfig && (
                <>
                  {/* 1. Native Token Item */}
                  <TouchableOpacity
                    style={styles.networkItem}
                    onPress={() => {
                      const nativeToken: SwapToken = {
                        symbol: currentChainConfig.symbol.trim(),
                        name: currentChainConfig.name.split(" ")[0],
                        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                        decimals: currentChainConfig.decimals,
                        balance: fromToken.balance,
                        price: fromToken.price,
                        coingeckoId: getCoingeckoId(
                          currentChainConfig.symbol.trim(),
                        ),
                      };
                      setFromToken(nativeToken);
                      setShowFromTokenSheet(false);
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <TokenIcon symbol={currentChainConfig.symbol} />
                      <View style={{ marginLeft: 12 }}>
                        <Text
                          style={[
                            styles.networkItemText,
                            { color: theme.text },
                          ]}
                        >
                          {currentChainConfig.symbol}
                        </Text>
                        <Text
                          style={{ fontSize: 12, color: theme.textSecondary }}
                        >
                          {currentChainConfig.name}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: theme.text, fontWeight: "600" }}>
                        {fromToken.symbol === currentChainConfig.symbol.trim()
                          ? fromToken.balance
                          : "—"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 2. ERC20 Tokens Items */}
                  {currentChainConfig.tokens?.map((tokenConf) => {
                    const bal =
                      tokenBalances[tokenConf.address.trim()] ?? "...";
                    return (
                      <TouchableOpacity
                        key={tokenConf.address}
                        style={styles.networkItem}
                        onPress={() => {
                          const erc20Token: SwapToken = {
                            symbol: tokenConf.symbol.trim(),
                            name: tokenConf.name,
                            address: tokenConf.address.trim(),
                            decimals: tokenConf.decimals,
                            balance: bal !== "..." ? bal : "0",
                            price: 0,
                            coingeckoId: getCoingeckoId(
                              tokenConf.symbol.trim(),
                            ),
                          };
                          setFromToken(erc20Token);
                          setShowFromTokenSheet(false);
                        }}
                      >
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <TokenIcon symbol={tokenConf.symbol} />
                          <View style={{ marginLeft: 12 }}>
                            <Text
                              style={[
                                styles.networkItemText,
                                { color: theme.text },
                              ]}
                            >
                              {tokenConf.symbol}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.textSecondary,
                              }}
                            >
                              {tokenConf.name}
                            </Text>
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{ color: theme.text, fontWeight: "600" }}
                          >
                            {bal}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── To Token Selection Sheet */}
      <Modal visible={showToTokenSheet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContent, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Select Token
              </Text>
              <TouchableOpacity onPress={() => setShowToTokenSheet(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {currentChainConfig && (
                <>
                  {/* 1. Native Token Item */}
                  <TouchableOpacity
                    style={styles.networkItem}
                    onPress={() => {
                      const nativeToken: SwapToken = {
                        symbol: currentChainConfig.symbol.trim(),
                        name: currentChainConfig.name.split(" ")[0],
                        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                        decimals: currentChainConfig.decimals,
                        balance: toToken.balance,
                        price: toToken.price,
                        coingeckoId: getCoingeckoId(
                          currentChainConfig.symbol.trim(),
                        ),
                      };
                      setToToken(nativeToken);
                      setShowToTokenSheet(false);
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <TokenIcon symbol={currentChainConfig.symbol} />
                      <View style={{ marginLeft: 12 }}>
                        <Text
                          style={[
                            styles.networkItemText,
                            { color: theme.text },
                          ]}
                        >
                          {currentChainConfig.symbol}
                        </Text>
                        <Text
                          style={{ fontSize: 12, color: theme.textSecondary }}
                        >
                          {currentChainConfig.name}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: theme.text, fontWeight: "600" }}>
                        {toToken.symbol === currentChainConfig.symbol.trim()
                          ? toToken.balance
                          : "—"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 2. ERC20 Tokens Items */}
                  {currentChainConfig.tokens?.map((tokenConf) => {
                    const bal =
                      tokenBalances[tokenConf.address.trim()] ?? "...";
                    return (
                      <TouchableOpacity
                        key={tokenConf.address}
                        style={styles.networkItem}
                        onPress={() => {
                          const erc20Token: SwapToken = {
                            symbol: tokenConf.symbol.trim(),
                            name: tokenConf.name,
                            address: tokenConf.address.trim(),
                            decimals: tokenConf.decimals,
                            balance: bal !== "..." ? bal : "0",
                            price: 0,
                            coingeckoId: getCoingeckoId(
                              tokenConf.symbol.trim(),
                            ),
                          };
                          setToToken(erc20Token);
                          setShowToTokenSheet(false);
                        }}
                      >
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <TokenIcon symbol={tokenConf.symbol} />
                          <View style={{ marginLeft: 12 }}>
                            <Text
                              style={[
                                styles.networkItemText,
                                { color: theme.text },
                              ]}
                            >
                              {tokenConf.symbol}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.textSecondary,
                              }}
                            >
                              {tokenConf.name}
                            </Text>
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{ color: theme.text, fontWeight: "600" }}
                          >
                            {bal}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Settings Bottom Sheet */}
      <Modal visible={showSettingsSheet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetContent, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Transaction Settings
              </Text>
              <TouchableOpacity onPress={() => setShowSettingsSheet(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Slippage Tolerance
              </Text>
              <View style={styles.slippageOptions}>
                {["0.1", "0.5", "1.0"].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.slippageBtn,
                      slippage === val && {
                        backgroundColor: theme.primary + "20",
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => setSlippage(val)}
                  >
                    <Text style={[styles.slippageText, { color: theme.text }]}>
                      {val}%
                    </Text>
                  </TouchableOpacity>
                ))}
                <View
                  style={[
                    styles.customSlippage,
                    { borderColor: theme.textSecondary },
                  ]}
                >
                  <TextInput
                    style={{ color: theme.text }}
                    value={slippage}
                    onChangeText={setSlippage}
                    keyboardType="decimal-pad"
                    placeholder="Custom"
                    placeholderTextColor={theme.textSecondary}
                  />
                  <Text style={{ color: theme.textSecondary }}>%</Text>
                </View>
              </View>
            </View>

            <View style={styles.settingSection}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Affiliate Fee
                </Text>
                <Info
                  size={14}
                  color={theme.textSecondary}
                  style={{ marginLeft: 6 }}
                />
              </View>
              <View style={styles.slippageOptions}>
                <View
                  style={[
                    styles.customSlippage,
                    { borderColor: theme.textSecondary, flex: 1 },
                  ]}
                >
                  <TextInput
                    style={{ color: theme.text }}
                    value={affiliateFeeBps}
                    onChangeText={setAffiliateFeeBps}
                    keyboardType="numeric"
                    placeholder="100"
                    placeholderTextColor={theme.textSecondary}
                  />
                  <Text style={{ color: theme.textSecondary }}>bps</Text>
                </View>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                  marginTop: 8,
                }}
              >
                Fee is sent to: {AFFILIATE_FEE_RECIPIENT.slice(0, 6)}...
                {AFFILIATE_FEE_RECIPIENT.slice(-4)}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  iconBtn: {
    padding: 8,
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  balanceText: {
    fontSize: 14,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: "500",
    flex: 1,
  },
  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    backgroundColor: "rgba(128,128,128,0.1)",
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: "600",
  },
  fiatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  maxBtn: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  swapButtonContainer: {
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    marginVertical: -23,
  },
  swapCircle: {
    width: 45,
    height: 45,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  actionBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 20,
  },
  actionBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  networkBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
  },
  networkBtnText: {
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    marginTop: 10,
    backgroundColor: "rgba(255, 50, 50, 0.1)",
    padding: 10,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  errorText: {
    color: "#FF3B30",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  networkItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  networkItemText: {
    fontSize: 16,
    fontWeight: "600",
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  settingSection: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  slippageOptions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  slippageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  slippageText: {
    fontWeight: "600",
  },
  customSlippage: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
});
