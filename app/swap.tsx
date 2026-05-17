// app/swap.tsx
import { SUPPORTED_CHAINS, TokenConfig } from "@/config/chains";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { ZeroExService } from "@/services/swap/ZeroExService";
import { ethers } from "ethers";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowDown,
  Check,
  ChevronDown,
  ChevronLeft,
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

// Mapping Icon Lokal untuk Token
const TOKEN_ICON_MAP: Record<string, any> = {
  ETH: require("../assets/chains/eth.png"),
  USDT: require("../assets/coins/usdt.png"),
  USDC: require("../assets/coins/usdc.png"),
  BDAG: require("../assets/chains/bdag.png"),
};

// Mapping Icon Lokal untuk Network (Digunakan di Sheet)
const NETWORK_ICON_MAP: Record<string, any> = {
  "ethereum-mainnet": require("../assets/chains/eth.png"),
  "blockdag-mainnet": require("../assets/chains/bdag.png"),
};

// Helper: Get harga dari CoinGecko
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

// Interface untuk Token di UI
interface SwapToken {
  symbol: string;
  name: string;
  address: string; // Contract Address (Native is '0xeeee...')
  decimals: number;
  balance: string;
  price: number; // USD Price
  coingeckoId: string | null;
}

// Map chainId ke chainId integer untuk 0x API
const CHAIN_ID_MAP: Record<string, number> = {
  "ethereum-mainnet": 1,
  "ethereum-sepolia": 11155111,
};

export default function SwapScreen() {
  // ✅ Ambil mnemonic dari store (privateKey dihapus)
  const { walletAddress, isDarkMode, mnemonic } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const params = useLocalSearchParams();
  const initialChainId = (params.chainId as string) || "ethereum-mainnet";

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

  // ✅ State untuk balance ERC-20 di token list sheet
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>(
    {},
  );

  // Helper: Get Config for Current Chain
  const currentChainConfig = SUPPORTED_CHAINS.find(
    (c) => c.id === selectedChainId,
  );

  // Filter Mainnet Chains Only for Network Sheet
  const mainnetChains = SUPPORTED_CHAINS.filter(
    (chain) =>
      chain.type === "evm" &&
      !chain.id.toLowerCase().includes("testnet") &&
      !chain.id.toLowerCase().includes("sepolia"),
  );

  // Helper to map Symbol to Coingecko ID
  const getCoingeckoId = (symbol: string, chainId: string): string | null => {
    const s = symbol.toUpperCase();
    if (s === "ETH") return "ethereum";
    if (s === "USDT") return "tether";
    if (s === "USDC") return "usd-coin";
    if (s === "BDAG") return "blockdag";
    return null;
  };

  // Initialize Tokens when Chain Changes
  useEffect(() => {
    if (!currentChainConfig) return;

    const nativeSymbol = currentChainConfig.symbol;
    const tokens = currentChainConfig.tokens || [];

    let defaultToTokenConfig: TokenConfig | undefined =
      tokens.find((t) => t.symbol === "USDT") ||
      tokens.find((t) => t.symbol === "USDC") ||
      tokens[0];

    const initFrom: SwapToken = {
      symbol: nativeSymbol,
      name: currentChainConfig.name.split(" ")[0],
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      decimals: currentChainConfig.decimals,
      balance: "0",
      price: 0,
      coingeckoId: getCoingeckoId(nativeSymbol, selectedChainId),
    };

    const initTo: SwapToken = defaultToTokenConfig
      ? {
          symbol: defaultToTokenConfig.symbol,
          name: defaultToTokenConfig.name,
          address: defaultToTokenConfig.address,
          decimals: defaultToTokenConfig.decimals,
          balance: "0",
          price: 0,
          coingeckoId: getCoingeckoId(
            defaultToTokenConfig.symbol,
            selectedChainId,
          ),
        }
      : initFrom;

    setFromToken(initFrom);
    setToToken(initTo);
    setFromAmount("");
    setToAmount("");
    setError(null);
    setTokenBalances({});
  }, [selectedChainId, currentChainConfig]);

  // ✅ Fetch balance semua token ERC-20 di chain ini (untuk ditampilkan di sheet)
  const fetchAllTokenBalances = useCallback(async () => {
    if (!walletAddress || !currentChainConfig?.tokens) return;

    const balances: Record<string, string> = {};

    await Promise.all(
      currentChainConfig.tokens.map(async (tokenConf) => {
        try {
          const bal = await BlockchainService.getTokenBalance(
            selectedChainId,
            walletAddress,
            tokenConf.address,
            tokenConf.decimals,
          );
          balances[tokenConf.address] = bal;
        } catch {
          balances[tokenConf.address] = "0.0000";
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

  // Fetch Balances Realtime (fromToken & toToken)
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

      // ✅ fromToken: gunakan getTokenBalance (sudah handle native ETH di BlockchainService)
      if (fromToken.symbol !== currentChainConfig.symbol) {
        fBal = await BlockchainService.getTokenBalance(
          selectedChainId,
          walletAddress,
          fromToken.address,
          fromToken.decimals,
        );
      }

      // ✅ toToken: sama
      if (toToken.symbol !== currentChainConfig.symbol) {
        tBal = await BlockchainService.getTokenBalance(
          selectedChainId,
          walletAddress,
          toToken.address,
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

  // ✅ Fetch semua token balance saat sheet dibuka atau chain berubah
  useEffect(() => {
    fetchAllTokenBalances();
    const interval = setInterval(fetchAllTokenBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchAllTokenBalances]);

  // Calculate Swap Output (estimasi lokal via harga CoinGecko)
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

  // ✅ Eksekusi Swap via 0x API
  const handleSwap = async () => {
    // 1. Validasi Dasar Input
    if (!fromToken || !toToken) {
      Alert.alert("Error", "Please select tokens first.");
      return;
    }

    // 2. Validasi Nominal (PENTING: Cek apakah > 0)
    const numericAmount = parseFloat(fromAmount);
    if (!fromAmount || isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount greater than 0.",
      );
      return;
    }

    // 3. Validasi Saldo
    if (numericAmount > parseFloat(fromToken.balance)) {
      Alert.alert("Insufficient Balance", "You do not have enough funds.");
      return;
    }

    // 4. Validasi Wallet (Hanya dicek jika input sudah valid)
    if (!walletAddress) {
      Alert.alert("Wallet Error", "No wallet address found.");
      return;
    }

    if (!mnemonic) {
      Alert.alert(
        "Wallet Locked",
        "Wallet is locked or invalid. Please login again.",
      );
      return;
    }

    const chainIdInt = CHAIN_ID_MAP[selectedChainId];
    if (!chainIdInt) {
      Alert.alert(
        "Unsupported Chain",
        "This chain does not support swap via 0x yet.",
      );
      return;
    }

    setIsSwapping(true);
    setError(null);

    try {
      // Konversi amount ke unit terkecil (wei/satoshi)
      const sellAmountWei = ethers.utils
        .parseUnits(fromAmount, fromToken.decimals)
        .toString();

      // Ambil quote dari 0x
      const quote = await ZeroExService.getSwapQuote({
        sellToken: fromToken.address,
        buyToken: toToken.address,
        sellAmount: sellAmountWei,
        takerAddress: walletAddress,
        chainId: chainIdInt,
        slippagePercentage: parseFloat(slippage) / 100, // 0.5% → 0.005
      });

      // Konfirmasi ke user
      const estimatedOut = ethers.utils.formatUnits(
        quote.buyAmount,
        toToken.decimals,
      );

      Alert.alert(
        "Confirm Swap",
        `Swap ${fromAmount} ${fromToken.symbol}\n→ ~${parseFloat(estimatedOut).toFixed(6)} ${toToken.symbol}\n\nSlippage: ${slippage}%`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              try {
                const provider = BlockchainService.getProvider(selectedChainId);

                // ✅ GENERATE SIGNER DARI MNEMONIC DI SINI
                const walletFromMnemonic = ethers.Wallet.fromMnemonic(mnemonic);
                const signer = walletFromMnemonic.connect(provider);

                // Double check address match
                if (
                  signer.address.toLowerCase() !== walletAddress.toLowerCase()
                ) {
                  throw new Error("Address mismatch. Please re-login.");
                }

                // Jika fromToken adalah ERC-20, perlu approve dulu
                if (
                  !BlockchainService.isNativeToken(fromToken.address) &&
                  quote.allowanceTarget &&
                  quote.allowanceTarget !== ethers.constants.AddressZero
                ) {
                  const ERC20_APPROVE_ABI = [
                    "function allowance(address owner, address spender) view returns (uint256)",
                    "function approve(address spender, uint256 amount) returns (bool)",
                  ];
                  const tokenContract = new ethers.Contract(
                    fromToken.address,
                    ERC20_APPROVE_ABI,
                    signer,
                  );

                  const allowance = await tokenContract.allowance(
                    walletAddress,
                    quote.allowanceTarget,
                  );
                  const sellAmountBN = ethers.BigNumber.from(sellAmountWei);

                  if (allowance.lt(sellAmountBN)) {
                    console.log("🔑 Approving token spend...");
                    const approveTx = await tokenContract.approve(
                      quote.allowanceTarget,
                      ethers.constants.MaxUint256,
                    );
                    await approveTx.wait();
                    console.log("✅ Approved!");
                  }
                }

                // Kirim transaksi swap
                const tx = await signer.sendTransaction({
                  to: quote.to,
                  data: quote.data,
                  value: ethers.BigNumber.from(quote.value || "0"),
                  gasLimit: ethers.BigNumber.from(
                    quote.estimatedGas || "300000",
                  ),
                  gasPrice: ethers.BigNumber.from(quote.gasPrice),
                });

                console.log("⏳ Swap tx sent:", tx.hash);
                Alert.alert(
                  "Swap Submitted!",
                  `Transaction is being processed.\nTx Hash: ${tx.hash}`,
                );

                // Reset form
                setFromAmount("");
                setToAmount("");

                // Refresh balances
                await tx.wait();
                fetchBalances();
                fetchAllTokenBalances();
              } catch (execError: any) {
                console.error("Swap execution error:", execError);
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
      console.error("Quote error:", quoteError);
      setError("Failed to get swap quote. Try again.");
    } finally {
      setIsSwapping(false);
    }
  };

  // Component for Token Icon
  const TokenIcon = ({ symbol }: { symbol: string }) => {
    const source = TOKEN_ICON_MAP[symbol.toUpperCase()];
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      {/* ── Header  */}
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
        {/* ── From Card ─ */}
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
              {fromAmount
                ? (
                    parseFloat(fromAmount) *
                    fromToken.price *
                    15000
                  ).toLocaleString("id-ID")
                : "0"}
            </Text>
            <TouchableOpacity onPress={handleMax}>
              <Text style={[styles.maxBtn, { color: theme.primary }]}>MAX</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Swap Button ─ */}
        <View style={styles.swapButtonContainer}>
          <TouchableOpacity
            onPress={handleSwapTokens}
            style={[styles.swapCircle, { backgroundColor: theme.primary }]}
          >
            <ArrowDown size={25} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* ── To Card ─ */}
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
              {toAmount
                ? (parseFloat(toAmount) * toToken.price * 15000).toLocaleString(
                    "id-ID",
                  )
                : "0"}
            </Text>
          </View>
        </View>

        {/* ── Error Message ─ */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Action Button ─ */}
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

        {/* ── Select Network Button (Bottom) ─ */}
        <TouchableOpacity
          style={[styles.networkBtn, { borderColor: theme.text }]}
          onPress={() => setShowNetworkSheet(true)}
        >
          <Text style={[styles.networkBtnText, { color: theme.text }]}>
            Select Network
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Network Bottom Sheet (Mainnet Only + Icons) ─ */}
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
                const isSelected = selectedChainId === chain.id;
                const chainIcon = NETWORK_ICON_MAP[chain.id];

                return (
                  <TouchableOpacity
                    key={chain.id}
                    style={styles.networkItem}
                    onPress={() => {
                      setSelectedChainId(chain.id as ChainId);
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

      {/* ── From Token Selection Sheet ─ */}
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
                        symbol: currentChainConfig.symbol,
                        name: currentChainConfig.name.split(" ")[0],
                        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                        decimals: currentChainConfig.decimals,
                        balance: fromToken.balance,
                        price: fromToken.price,
                        coingeckoId: getCoingeckoId(
                          currentChainConfig.symbol,
                          selectedChainId,
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
                        {fromToken.symbol === currentChainConfig.symbol
                          ? fromToken.balance
                          : "—"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 2. ERC20 Tokens Items — ✅ balance sudah di-fetch */}
                  {currentChainConfig.tokens?.map((tokenConf) => {
                    const bal = tokenBalances[tokenConf.address] ?? "...";
                    return (
                      <TouchableOpacity
                        key={tokenConf.address}
                        style={styles.networkItem}
                        onPress={() => {
                          const erc20Token: SwapToken = {
                            symbol: tokenConf.symbol,
                            name: tokenConf.name,
                            address: tokenConf.address,
                            decimals: tokenConf.decimals,
                            balance: bal !== "..." ? bal : "0",
                            price: 0,
                            coingeckoId: getCoingeckoId(
                              tokenConf.symbol,
                              selectedChainId,
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
                          {/* ✅ Tampil balance nyata */}
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

      {/* ── To Token Selection Sheet ─ */}
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
                        symbol: currentChainConfig.symbol,
                        name: currentChainConfig.name.split(" ")[0],
                        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                        decimals: currentChainConfig.decimals,
                        balance: toToken.balance,
                        price: toToken.price,
                        coingeckoId: getCoingeckoId(
                          currentChainConfig.symbol,
                          selectedChainId,
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
                        {toToken.symbol === currentChainConfig.symbol
                          ? toToken.balance
                          : "—"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 2. ERC20 Tokens Items — ✅ balance sudah di-fetch */}
                  {currentChainConfig.tokens?.map((tokenConf) => {
                    const bal = tokenBalances[tokenConf.address] ?? "...";
                    return (
                      <TouchableOpacity
                        key={tokenConf.address}
                        style={styles.networkItem}
                        onPress={() => {
                          const erc20Token: SwapToken = {
                            symbol: tokenConf.symbol,
                            name: tokenConf.name,
                            address: tokenConf.address,
                            decimals: tokenConf.decimals,
                            balance: bal !== "..." ? bal : "0",
                            price: 0,
                            coingeckoId: getCoingeckoId(
                              tokenConf.symbol,
                              selectedChainId,
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
                          {/* ✅ Tampil balance nyata */}
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

      {/* ── Settings Bottom Sheet ─ */}
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
    borderRadius: 16,
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
    marginBottom: 12,
  },
  slippageOptions: {
    flexDirection: "row",
    gap: 10,
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
    paddingVertical: 0,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
});
