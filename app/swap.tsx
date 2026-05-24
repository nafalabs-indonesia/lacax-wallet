import { SUPPORTED_CHAINS, TokenConfig } from "@/config/chains";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { ZEROEX_API_KEY } from "@env";
import { ethers } from "ethers";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  ArrowDown,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Info,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

const AFFILIATE_FEE_RECIPIENT = "0x70d96B6463533741669cd6fC871a7761e88c50c8";
const DEFAULT_AFFILIATE_FEE_BPS = 80;

const CHAIN_ID_MAP: Record<string, number> = {
  "ethereum-mainnet": 1,
  "polygon-mainnet": 137,
  "bnb-mainnet": 56,
  "arbitrum-mainnet": 42161,
  "base-mainnet": 8453,
  "optimism-mainnet": 10,
  "avalanche-mainnet": 43114,
  "ethereum-sepolia": 11155111,
  "polygon-amoy": 80002,
  "arbitrum-sepolia": 421614,
};

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

const parseFriendlyError = (error: any): string => {
  const raw: string =
    error?.message || error?.reason || error?.info?.error?.message || "";

  if (
    error?.code === "INSUFFICIENT_FUNDS" ||
    raw.includes("insufficient funds") ||
    raw.includes("insufficient funds for gas")
  ) {
    return "Your balance is not enough to cover this swap and the network gas fee. Please add more funds and try again.";
  }
  if (raw.includes("user rejected") || raw.includes("User denied")) {
    return "Transaction was cancelled.";
  }
  if (raw.includes("nonce") || raw.includes("replacement fee too low")) {
    return "Transaction conflict detected. Please wait a moment and try again.";
  }
  if (raw.includes("gas required exceeds allowance")) {
    return "Gas limit exceeded. Try reducing the swap amount.";
  }
  if (raw.includes("execution reverted")) {
    return "Transaction was rejected by the network. The price may have moved — try again.";
  }
  if (
    raw.includes("network") ||
    raw.includes("timeout") ||
    raw.includes("fetch")
  ) {
    return "Network error. Please check your internet connection and try again.";
  }
  if (raw.includes("Address mismatch")) {
    return "Wallet address mismatch. Please re-login and try again.";
  }
  return "Something went wrong. Please try again.";
};

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

interface SwapToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  price: number;
  coingeckoId: string | null;
}

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

const formatBalance = (raw: string): string => {
  const num = parseFloat(raw);
  if (isNaN(num) || num === 0) return "0.0000";
  if (num >= 0.0001) return num.toFixed(4);
  return "<0.0001";
};

type AlertType = "info" | "error" | "success" | "warning" | "confirm";

interface CustomAlertConfig {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const CustomAlertModal = ({
  config,
  onClose,
  setAlertConfig,
  theme,
}: {
  config: CustomAlertConfig;
  onClose: () => void;
  setAlertConfig: React.Dispatch<React.SetStateAction<CustomAlertConfig>>;
  theme: any;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config.visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [config.visible]);

  const getIconConfig = () => {
    switch (config.type) {
      case "error":
        return { Icon: XCircle, color: "#FF3B30" };
      case "success":
        return { Icon: CheckCircle, color: "#34C759" };
      case "warning":
        return { Icon: AlertTriangle, color: "#FF9500" };
      case "confirm":
        return { Icon: Info, color: "#007AFF" };
      default:
        return { Icon: Info, color: "#007AFF" };
    }
  };

  const { Icon, color } = getIconConfig();
  const hasCancel = (config.cancelText || config.onCancel) && !config.isLoading;

  const isConfirmType = config.type === "confirm";

  return (
    <Modal visible={config.visible} transparent animationType="none">
      <Animated.View style={[alertStyles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            alertStyles.container,
            {
              backgroundColor: theme.card,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {!isConfirmType && !config.isLoading && (
            <TouchableOpacity
              style={alertStyles.closeBtn}
              onPress={() => {
                onClose();
                config.onConfirm?.();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}

          {!config.isLoading && (
            <View
              style={[
                alertStyles.iconCircle,
                { backgroundColor: color + "18" },
              ]}
            >
              <Icon size={32} color={color} />
            </View>
          )}

          {config.isLoading && (
            <View
              style={[alertStyles.iconCircle, { backgroundColor: "#007AFF18" }]}
            >
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}

          <Text style={[alertStyles.title, { color: theme.text }]}>
            {config.isLoading ? "Processing Swap..." : config.title}
          </Text>

          <Text style={[alertStyles.message, { color: theme.textSecondary }]}>
            {config.isLoading
              ? "Please wait. Do not close the app."
              : config.message}
          </Text>

          {isConfirmType && !config.isLoading && (
            <View
              style={[
                alertStyles.buttonRow,
                hasCancel && alertStyles.buttonRowDouble,
              ]}
            >
              {hasCancel && (
                <TouchableOpacity
                  style={[
                    alertStyles.btn,
                    alertStyles.btnCancel,
                    { borderColor: theme.textSecondary + "40" },
                  ]}
                  onPress={() => {
                    onClose();
                    config.onCancel?.();
                  }}
                >
                  <Text
                    style={[
                      alertStyles.btnCancelText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {config.cancelText ?? "Cancel"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  alertStyles.btn,
                  alertStyles.btnConfirm,
                  { backgroundColor: color },
                  hasCancel && { flex: 1 },
                ]}
                onPress={() => {
                  setAlertConfig((prev) => ({ ...prev, isLoading: true }));
                  setTimeout(() => {
                    config.onConfirm?.();
                  }, 50);
                }}
              >
                <Text style={alertStyles.btnConfirmText}>
                  {config.confirmText ?? "OK"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: {
    width: "100%",
  },
  buttonRowDouble: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 999,
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  btnConfirm: {
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  btnConfirmText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

const DisclaimerModal = ({
  visible,
  onAccept,
  onDecline,
  theme,
}: {
  visible: boolean;
  onAccept: (neverShow: boolean) => void;
  onDecline: () => void;
  theme: any;
}) => {
  const [understood, setUnderstood] = useState(false);
  const [neverShow, setNeverShow] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setUnderstood(false);
      setNeverShow(false);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        style={[disclaimerStyles.overlay, { opacity: opacityAnim }]}
      >
        <Animated.View
          style={[
            disclaimerStyles.container,
            {
              backgroundColor: theme.card,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={[disclaimerStyles.title, { color: theme.text }]}>
            Third-Party Service Notice
          </Text>

          <View
            style={[
              disclaimerStyles.divider,
              { backgroundColor: theme.textSecondary + "20" },
            ]}
          />

          <ScrollView
            style={disclaimerStyles.textScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[disclaimerStyles.body, { color: theme.textSecondary }]}
            >
              The swap feature in this app is powered by{" "}
              <Text style={{ color: theme.text, fontWeight: "600" }}>
                0x Protocol
              </Text>
              , a third-party decentralized exchange aggregator.
            </Text>

            <Text
              style={[
                disclaimerStyles.body,
                { color: theme.textSecondary, marginTop: 12 },
              ]}
            >
              By proceeding, you acknowledge and agree that:
            </Text>

            {[
              "LacaX is not responsible for any losses, failed transactions, or financial damages resulting from the use of this swap service.",
              "Cryptocurrency swaps are irreversible. Once submitted, transactions cannot be undone or refunded.",
              "Token prices, slippage, and liquidity are determined by third-party protocols and market conditions beyond our control.",
              "You are solely responsible for verifying token addresses, amounts, and all transaction details before confirming.",
              "Smart contract interactions carry inherent risks. Use this feature at your own discretion.",
            ].map((item, idx) => (
              <View key={idx} style={disclaimerStyles.bulletRow}>
                <View
                  style={[
                    disclaimerStyles.bullet,
                    { backgroundColor: theme.text },
                  ]}
                />
                <Text
                  style={[
                    disclaimerStyles.bulletText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View
            style={[
              disclaimerStyles.divider,
              { backgroundColor: theme.textSecondary + "20", marginTop: 16 },
            ]}
          />

          <TouchableOpacity
            style={disclaimerStyles.checkRow}
            onPress={() => setUnderstood(!understood)}
            activeOpacity={0.7}
          >
            <View
              style={[
                disclaimerStyles.checkbox,
                {
                  borderColor: understood
                    ? "#34C759"
                    : theme.textSecondary + "60",
                  backgroundColor: understood ? "#34C759" : "transparent",
                },
              ]}
            >
              {understood && <Check size={13} color="#FFF" strokeWidth={3} />}
            </View>
            <Text style={[disclaimerStyles.checkLabel, { color: theme.text }]}>
              I understand and accept the risks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[disclaimerStyles.checkRow, { marginTop: 10 }]}
            onPress={() => setNeverShow(!neverShow)}
            activeOpacity={0.7}
          >
            <View
              style={[
                disclaimerStyles.checkbox,
                {
                  borderColor: neverShow
                    ? theme.primary
                    : theme.textSecondary + "60",
                  backgroundColor: neverShow ? theme.primary : "transparent",
                },
              ]}
            >
              {neverShow && <Check size={13} color="#FFF" strokeWidth={3} />}
            </View>
            <Text style={[disclaimerStyles.checkLabel, { color: theme.text }]}>
              Don't show this again
            </Text>
          </TouchableOpacity>

          <View style={disclaimerStyles.btnRow}>
            <TouchableOpacity
              style={[
                disclaimerStyles.btn,
                disclaimerStyles.btnDecline,
                { borderColor: theme.textSecondary + "40" },
              ]}
              onPress={onDecline}
            >
              <Text
                style={[
                  disclaimerStyles.btnDeclineText,
                  { color: theme.textSecondary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                disclaimerStyles.btn,
                disclaimerStyles.btnAccept,
                {
                  backgroundColor: understood
                    ? theme.primary
                    : theme.textSecondary + "30",
                },
              ]}
              disabled={!understood}
              onPress={() => onAccept(neverShow)}
            >
              <Text
                style={[
                  disclaimerStyles.btnAcceptText,
                  { opacity: understood ? 1 : 0.4 },
                ]}
              >
                Proceed to Swap
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const disclaimerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.35,
    shadowRadius: 48,
    elevation: 24,
  },
  shieldWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  shieldBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 16,
  },
  textScroll: {
    maxHeight: 220,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
    alignItems: "flex-start",
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDecline: {
    borderWidth: 1.5,
    borderRadius: 999,
  },
  btnDeclineText: {
    fontSize: 14,
    fontWeight: "600",
  },
  btnAccept: {
    flex: 1.6,
    borderRadius: 999,
  },
  btnAcceptText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default function SwapScreen() {
  const { walletAddress, isDarkMode, mnemonic } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const params = useLocalSearchParams();
  const initialChainId = (
    (params.chainId as string) || "ethereum-mainnet"
  ).trim();

  const [selectedChainId, setSelectedChainId] = useState<ChainId>(
    initialChainId as ChainId,
  );
  const [showNetworkSheet, setShowNetworkSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showFromTokenSheet, setShowFromTokenSheet] = useState(false);
  const [showToTokenSheet, setShowToTokenSheet] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerNeverShow, setDisclaimerNeverShow] = useState(false);
  const pendingSwapRef = useRef<(() => Promise<void>) | null>(null);

  const [alertConfig, setAlertConfig] = useState<CustomAlertConfig>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showAlert = (config: Omit<CustomAlertConfig, "visible">) => {
    setAlertConfig({ ...config, visible: true });
  };
  const hideAlert = () =>
    setAlertConfig((prev) => ({ ...prev, visible: false }));

  const [fromToken, setFromToken] = useState<SwapToken | null>(null);
  const [toToken, setToToken] = useState<SwapToken | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slippage, setSlippage] = useState("0.5");

  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>(
    {},
  );
  const [usdToIdrRate, setUsdToIdrRate] = useState<number>(15000);

  const currentChainConfig = SUPPORTED_CHAINS.find(
    (c) => c.id.trim() === selectedChainId.trim(),
  );

  const mainnetChains = SUPPORTED_CHAINS.filter((chain) => {
    const isTestnet =
      chain.id.toLowerCase().includes("testnet") ||
      chain.id.toLowerCase().includes("sepolia");
    const isSupportedBy0x = CHAIN_ID_MAP[chain.id.trim()] !== undefined;
    return !isTestnet && isSupportedBy0x;
  });

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

  useEffect(() => {
    const getRate = async () => {
      const rate = await fetchUsdToIdrRate();
      setUsdToIdrRate(rate);
    };
    getRate();
    const interval = setInterval(getRate, 3600000);
    return () => clearInterval(interval);
  }, []);

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

  const executeSwap = async () => {
    if (!fromToken || !toToken || !walletAddress || !mnemonic) return;

    const chainIdInt = CHAIN_ID_MAP[selectedChainId];
    setIsSwapping(true);
    setError(null);

    try {
      const sellAmountWei = ethers
        .parseUnits(fromAmount, fromToken.decimals)
        .toString();

      const queryParams = new URLSearchParams({
        chainId: chainIdInt.toString(),
        sellToken: fromToken.address.trim(),
        buyToken: toToken.address.trim(),
        sellAmount: sellAmountWei,
        taker: walletAddress,
        slippagePercentage: (parseFloat(slippage) / 100).toString(),
        swapFeeRecipient: AFFILIATE_FEE_RECIPIENT,
        swapFeeBps: DEFAULT_AFFILIATE_FEE_BPS.toString(),
      });

      const headers = {
        "0x-api-key": ZEROEX_API_KEY || "",
        "0x-version": "v2",
      };

      const quoteResponse = await fetch(
        `https://api.0x.org/swap/allowance-holder/quote?${queryParams.toString()}`,
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

      const estimatedBuyAmount = ethers.formatUnits(
        quoteData.buyAmount,
        toToken.decimals,
      );

      showAlert({
        type: "confirm",
        title: "Confirm Swap",
        message: `Swap ${fromAmount} ${fromToken.symbol}\n→ ~${parseFloat(estimatedBuyAmount).toFixed(6)} ${toToken.symbol}\n\nSwap fees and network gas fees may apply. Please make sure your balance is sufficient before proceeding.`,
        confirmText: "Confirm",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const provider = BlockchainService.getProvider(selectedChainId);
            const walletFromMnemonic = ethers.Wallet.fromPhrase(mnemonic);
            const signer = walletFromMnemonic.connect(provider);

            if (signer.address.toLowerCase() !== walletAddress.toLowerCase()) {
              throw new Error("Address mismatch. Please re-login.");
            }

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
                const approveTx = await tokenContract.approve(
                  quoteData.transaction.to,
                  ethers.MaxUint256,
                );
                await approveTx.wait();
              }
            }

            const tx = await signer.sendTransaction({
              to: quoteData.transaction.to,
              data: quoteData.transaction.data,
              value: BigInt(quoteData.transaction.value || "0"),
              gasLimit: BigInt(quoteData.transaction.gas),
            });

            setFromAmount("");
            setToAmount("");

            showAlert({
              type: "success",
              title: "Swap Submitted!",
              message: `Transaction is being processed.\n\nTx Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`,
              confirmText: "Great!",
            });

            await tx.wait();
            fetchBalances();
            fetchAllTokenBalances();
          } catch (execError: any) {
            console.error("Swap execution error: ", execError);

            showAlert({
              type: "error",
              title: "Swap Failed",
              message: parseFriendlyError(execError),
              confirmText: "OK",
            });
          }
        },
      });
    } catch (quoteError: any) {
      console.error("Quote error: ", quoteError);
      setError(quoteError.message || "Failed to get swap quote.");
      showAlert({
        type: "error",
        title: "Quote Failed",
        message:
          quoteError.message || "Failed to get swap quote. Please try again.",
        confirmText: "OK",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwap = async () => {
    if (!fromToken || !toToken) {
      showAlert({
        type: "error",
        title: "Error",
        message: "Please select tokens first.",
        confirmText: "OK",
      });
      return;
    }
    if (fromToken.address.toLowerCase() === toToken.address.toLowerCase()) {
      showAlert({
        type: "warning",
        title: "Invalid Swap",
        message:
          "You cannot swap a token with itself.\nPlease choose different tokens.",
        confirmText: "OK",
      });
      return;
    }
    const numericAmount = parseFloat(fromAmount);
    if (!fromAmount || isNaN(numericAmount) || numericAmount <= 0) {
      showAlert({
        type: "warning",
        title: "Invalid Amount",
        message: "Please enter a valid amount greater than 0.",
        confirmText: "OK",
      });
      return;
    }
    if (numericAmount > parseFloat(fromToken.balance)) {
      showAlert({
        type: "error",
        title: "Insufficient Balance",
        message: "You do not have enough funds to complete this swap.",
        confirmText: "OK",
      });
      return;
    }
    if (!walletAddress || !mnemonic) {
      showAlert({
        type: "error",
        title: "Wallet Error",
        message: "No wallet address or mnemonic found.",
        confirmText: "OK",
      });
      return;
    }

    const chainIdInt = CHAIN_ID_MAP[selectedChainId];
    if (!chainIdInt) {
      showAlert({
        type: "error",
        title: "Unsupported Chain",
        message: "This chain is not supported by 0x Swap API yet.",
        confirmText: "OK",
      });
      return;
    }

    const isMainnet =
      !selectedChainId.toLowerCase().includes("testnet") &&
      !selectedChainId.toLowerCase().includes("sepolia");

    if (!isMainnet) {
      showAlert({
        type: "warning",
        title: "Testnet Not Supported",
        message:
          "0x Swap API only supports Mainnets. Please switch to Ethereum, Polygon, Arbitrum, etc.",
        confirmText: "OK",
      });
      return;
    }

    if (!disclaimerNeverShow) {
      setShowDisclaimer(true);
    } else {
      await executeSwap();
    }
  };

  const handleDisclaimerAccept = async (neverShow: boolean) => {
    setShowDisclaimer(false);
    if (neverShow) {
      setDisclaimerNeverShow(true);
    }
    await executeSwap();
  };

  const handleDisclaimerDecline = () => {
    setShowDisclaimer(false);
  };

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
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              You Pay
            </Text>
            <Text style={[styles.balanceText, { color: theme.textSecondary }]}>
              {isLoadingBalances
                ? "Loading..."
                : `Balance: ${formatBalance(fromToken.balance)}`}
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

        <View style={styles.swapButtonContainer}>
          <TouchableOpacity
            onPress={handleSwapTokens}
            style={[styles.swapCircle, { backgroundColor: theme.primary }]}
          >
            <ArrowDown size={25} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              You Receive
            </Text>
            <Text style={[styles.balanceText, { color: theme.textSecondary }]}>
              {isLoadingBalances
                ? "Loading..."
                : `Balance: ${formatBalance(toToken.balance)}`}
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

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

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

        <TouchableOpacity
          style={[styles.networkBtn, { borderColor: theme.text }]}
          onPress={() => setShowNetworkSheet(true)}
        >
          <Text style={[styles.networkBtnText, { color: theme.text }]}>
            Select Network
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <CustomAlertModal
        config={alertConfig}
        onClose={hideAlert}
        setAlertConfig={setAlertConfig}
        theme={theme}
      />

      <DisclaimerModal
        visible={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onDecline={handleDisclaimerDecline}
        theme={theme}
      />

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
                          ? formatBalance(fromToken.balance)
                          : "—"}
                      </Text>
                    </View>
                  </TouchableOpacity>

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
                            {bal === "..." ? "..." : formatBalance(bal)}
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
                          ? formatBalance(toToken.balance)
                          : "—"}
                      </Text>
                    </View>
                  </TouchableOpacity>

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
                            {bal === "..." ? "..." : formatBalance(bal)}
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
    marginBottom: 12,
  },
  slippageOptions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 0,
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
