// app/send.tsx
import { ChainConfig, SUPPORTED_CHAINS } from "@/config/chains";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { useAppStore } from "@/store/appStore";
import { Colors } from "@/theme/colors";
import { ZEROEX_API_KEY } from "@env";
import axios from "axios";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  Info,
  ScanLine,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

// Mapping Icon Lokal
const LOCAL_ICON_MAP: Record<string, any> = {
  ETH: require("../assets/chains/eth.png"),
  USDT: require("../assets/coins/usdt.png"),
  USDC: require("../assets/coins/usdc.png"),
  BDAG: require("../assets/chains/bdag.png"),
};

// Mapping icon chain lokal (untuk dropdown network)
const LOCAL_CHAIN_ICON_MAP: Record<string, any> = {
  "ethereum-mainnet": require("../assets/chains/eth.png"),
  "blockdag-mainnet": require("../assets/chains/bdag.png"),
};

// Filter hanya Mainnet
const MAINNET_CHAINS = SUPPORTED_CHAINS.filter(
  (c) => !c.id.includes("testnet") && !c.id.includes("sepolia"),
);

// Public RPC endpoints sebagai fallback untuk gas estimation
// Beberapa alternatif per chain — dicoba satu per satu sampai berhasil
const PUBLIC_RPC_MAP: Record<string, string[]> = {
  "ethereum-mainnet": [
    "https://cloudflare-eth.com", // Cloudflare, sangat reliable
    "https://rpc.ankr.com/eth", // Ankr public
    "https://ethereum.publicnode.com", // PublicNode
    "https://eth.llamarpc.com", // LlamaRPC
  ],
  "blockdag-mainnet": ["https://rpc.primordial.bdagscan.com"],
};

// Default fallback gas price (wei) jika semua metode gagal
const HARDCODED_GAS_FALLBACK: Record<string, string> = {
  "ethereum-mainnet": "20000000000", // 20 gwei
  "blockdag-mainnet": "1000000000", // 1 gwei
};

// Gas limit konstanta — dipakai konsisten di seluruh file
const NATIVE_DECIMALS = 18; // gas selalu dalam ETH/native, bukan decimals token
const GAS_LIMIT_NATIVE = 21000; // transfer ETH biasa
const GAS_LIMIT_TOKEN = 65000; // transfer ERC-20

interface AssetOption {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  chainId: string;
  isNative: boolean;
}

export default function SendScreen() {
  const { walletAddress, isDarkMode, mnemonic } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const params = useLocalSearchParams();
  const initialChainId = (params.chainId as string) || "ethereum-mainnet";
  const initialSymbol = (params.symbol as string) || "ETH";

  // State Selection
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(
    MAINNET_CHAINS.find((c) => c.id === initialChainId) || MAINNET_CHAINS[0],
  );
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null);
  const [availableAssets, setAvailableAssets] = useState<AssetOption[]>([]);

  // State Input
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  // State UI Dropdowns
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  // Camera Permission Hook
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  // State Data & Loading
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [gasPriceWei, setGasPriceWei] = useState<string>("0");
  const [isSending, setIsSending] = useState(false);

  // Constants
  const SERVICE_FEE_PERCENT = 0.0001; // 0.01%

  // ─── Fallback: estimasi gas via public RPC (eth_gasPrice JSON-RPC) ──────────
  // Pakai native fetch (bukan axios) agar tidak kena network proxy restriction.
  // Coba setiap URL dalam daftar secara berurutan sampai salah satu berhasil.
  const fetchGasFromPublicRpc = useCallback(
    async (chainId: string): Promise<string | null> => {
      const rpcUrls = PUBLIC_RPC_MAP[chainId];
      if (!rpcUrls?.length) return null;

      const body = JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 1,
      });

      for (const rpcUrl of rpcUrls) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: controller.signal,
          });

          clearTimeout(timer);

          if (!response.ok) {
            console.warn(
              `[GasFallback] ${rpcUrl} HTTP ${response.status}, trying next...`,
            );
            continue;
          }

          const json = await response.json();
          const hexPrice: string | undefined = json?.result;

          if (hexPrice && hexPrice.startsWith("0x")) {
            const parsed = parseInt(hexPrice, 16);
            if (!isNaN(parsed) && parsed > 0) {
              console.log(`[GasFallback] OK via ${rpcUrl}: ${parsed} wei`);
              return parsed.toString();
            }
          }
        } catch (err: any) {
          clearTimeout(timer);
          const reason =
            err?.name === "AbortError"
              ? "timeout"
              : (err?.message ?? "unknown");
          console.warn(
            `[GasFallback] ${rpcUrl} failed (${reason}), trying next...`,
          );
        }
      }

      console.warn(`[GasFallback] All RPC URLs exhausted for ${chainId}`);
      return null;
    },
    [],
  );

  // 1. Fetch Gas Price: coba 0x API → public RPC → hardcoded fallback
  const fetchGasPrice = useCallback(async () => {
    const chainIdMap: Record<string, number> = {
      "ethereum-mainnet": 1,
      "blockdag-mainnet": 1404,
    };
    const cid = chainIdMap[selectedChain.id];

    // --- Attempt 1: 0x API ---
    if (ZEROEX_API_KEY && cid) {
      try {
        const response = await axios.get(`https://api.0x.org/swap/v1/price`, {
          params: {
            sellToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            sellAmount: "1000000000000000000",
            takerAddress:
              walletAddress || "0x0000000000000000000000000000000000000000",
          },
          headers: { "0x-api-key": ZEROEX_API_KEY },
          timeout: 6000,
        });

        if (response.data?.gasPrice) {
          console.log("[Gas] 0x API success:", response.data.gasPrice);
          setGasPriceWei(response.data.gasPrice);
          return;
        }
      } catch (error) {
        console.warn("[Gas] 0x API failed, trying public RPC fallback...");
      }
    }

    // --- Attempt 2: Public RPC ---
    const rpcPrice = await fetchGasFromPublicRpc(selectedChain.id);
    if (rpcPrice) {
      setGasPriceWei(rpcPrice);
      return;
    }

    // --- Attempt 3: Hardcoded fallback ---
    const fallback = HARDCODED_GAS_FALLBACK[selectedChain.id] ?? "5000000000";
    console.warn(
      `[Gas] All methods failed, using hardcoded fallback: ${fallback} wei`,
    );
    setGasPriceWei(fallback);
  }, [selectedChain.id, walletAddress, fetchGasFromPublicRpc]);

  // 2. Fetch Balances & Populate Assets
  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoadingBalance(true);

    try {
      const nativeBal = await BlockchainService.getBalance(
        selectedChain.id as ChainId,
        walletAddress,
      );

      let assets: AssetOption[] = [];

      // Add Native
      assets.push({
        symbol: selectedChain.symbol,
        name: selectedChain.name.split(" ")[0],
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        decimals: selectedChain.decimals,
        balance: nativeBal,
        chainId: selectedChain.id,
        isNative: true,
      });

      // Add Tokens
      if (selectedChain.tokens) {
        for (const token of selectedChain.tokens) {
          try {
            const tokBal = await BlockchainService.getTokenBalance(
              selectedChain.id as ChainId,
              walletAddress,
              token.address,
              token.decimals,
            );
            assets.push({
              symbol: token.symbol,
              name: token.name,
              address: token.address,
              decimals: token.decimals,
              balance: tokBal,
              chainId: selectedChain.id,
              isNative: false,
            });
          } catch (e) {
            console.error(e);
          }
        }
      }

      setAvailableAssets(assets);

      // Set Default Selected
      const defaultAsset =
        assets.find((a) => a.symbol === initialSymbol) || assets[0];
      setSelectedAsset(defaultAsset);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [walletAddress, selectedChain.id, initialSymbol]);

  useEffect(() => {
    fetchGasPrice();
    fetchBalances();
    setIsNetworkDropdownOpen(false);
    setIsAssetDropdownOpen(false);
  }, [fetchGasPrice, fetchBalances]);

  // Handlers
  const handleMax = () => {
    if (!selectedAsset) return;
    let maxVal = parseFloat(selectedAsset.balance);

    if (selectedAsset.isNative) {
      // Gas selalu 18 decimals (ETH), buffer 10%
      const gasCostEth =
        (GAS_LIMIT_NATIVE * parseInt(gasPriceWei)) /
        Math.pow(10, NATIVE_DECIMALS);
      maxVal = Math.max(0, maxVal - gasCostEth * 1.1);
    }
    setAmount(maxVal.toString());
  };

  const handleScanPress = async () => {
    if (!permission) return;

    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Permission Denied",
          "We need camera permission to scan QR codes.",
        );
        return;
      }
    }

    setIsScanning(true);
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    setIsScanning(false);
    if (data.startsWith("0x") && data.length === 42) {
      setRecipientAddress(data);
      Alert.alert("Success", "Address scanned successfully!");
    } else {
      Alert.alert(
        "Invalid QR",
        "The scanned code does not appear to be a valid wallet address.",
      );
    }
  };

  const handleSend = async () => {
    if (!selectedAsset || !mnemonic) {
      Alert.alert("Error", "Wallet not initialized.");
      return;
    }
    if (!recipientAddress) {
      Alert.alert("Invalid Address", "Please enter a recipient address.");
      return;
    }
    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    if (sendAmount > parseFloat(selectedAsset.balance)) {
      Alert.alert("Insufficient Balance", "You do not have enough funds.");
      return;
    }

    const serviceFee = sendAmount * SERVICE_FEE_PERCENT;
    // ✅ Gas selalu dalam ETH (NATIVE_DECIMALS = 18), bukan decimals token
    const txGasLimit = selectedAsset.isNative
      ? GAS_LIMIT_NATIVE
      : GAS_LIMIT_TOKEN;
    const gasCostEth =
      (txGasLimit * parseInt(gasPriceWei)) / Math.pow(10, NATIVE_DECIMALS);

    let totalRequired = sendAmount;
    if (selectedAsset.isNative) {
      // Cek total ETH = amount + serviceFee + gas
      totalRequired += serviceFee + gasCostEth;
    }

    if (
      selectedAsset.isNative &&
      totalRequired > parseFloat(selectedAsset.balance)
    ) {
      Alert.alert(
        "Insufficient Balance",
        "Not enough balance to cover amount, fees, and gas.",
      );
      return;
    }

    Alert.alert(
      "Confirm Transfer",
      // ✅ Gas ditampilkan dalam nativeSymbol (ETH), bukan token
      `Send ${sendAmount} ${selectedAsset.symbol}?\n\nTo: ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}\nService Fee: ${serviceFee.toFixed(6)} ${selectedAsset.symbol}\nEst. Gas: ~${gasCostEth.toFixed(6)} ${nativeSymbol}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsSending(true);
            try {
              // TODO: Implement actual transaction signing
              setTimeout(() => {
                Alert.alert("Success", "Transaction submitted!");
                router.back();
              }, 2000);
            } catch (error: any) {
              Alert.alert("Failed", error.message);
            } finally {
              setIsSending(false);
            }
          },
        },
      ],
    );
  };

  // Helpers
  const formatCurrency = (val: string) => parseFloat(val).toFixed(4);

  // ✅ nativeSymbol & estimatedGasEth pakai NATIVE_DECIMALS (18), bukan selectedAsset.decimals
  const nativeSymbol =
    availableAssets.find((a) => a.isNative)?.symbol ?? selectedChain.symbol;
  const gasLimit = selectedAsset?.isNative ? GAS_LIMIT_NATIVE : GAS_LIMIT_TOKEN;
  const estimatedGasEth =
    (gasLimit * parseInt(gasPriceWei || "0")) / Math.pow(10, NATIVE_DECIMALS);

  if (isLoadingBalance && !selectedAsset) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={24} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Send Crypto
        </Text>
        <TouchableOpacity onPress={handleScanPress} style={styles.iconBtn}>
          <ScanLine size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          setIsAssetDropdownOpen(false);
          setIsNetworkDropdownOpen(false);
        }}
      >
        {/* Disclaimer */}
        <View style={[styles.alertBox, { backgroundColor: theme.card }]}>
          <AlertTriangle
            size={18}
            color="#F59E0B"
            style={{ marginRight: 10, marginTop: 2 }}
          />
          <Text style={[styles.alertText, { color: theme.textSecondary }]}>
            Double-check address & network. Transactions cannot be reversed.
          </Text>
        </View>

        {/* ── Dropdown Asset ───────────────────────────────────────────────── */}
        <View
          style={[
            styles.dropdownContainer,
            { zIndex: isAssetDropdownOpen ? 200 : 100 },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>
            Select Asset
          </Text>
          <TouchableOpacity
            style={[styles.selectorRow, { backgroundColor: theme.card }]}
            onPress={() => {
              setIsAssetDropdownOpen(!isAssetDropdownOpen);
              setIsNetworkDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.assetIconWrapper}>
              {LOCAL_ICON_MAP[selectedAsset?.symbol || ""] ? (
                <Image
                  source={LOCAL_ICON_MAP[selectedAsset?.symbol || ""]}
                  style={styles.assetIcon}
                />
              ) : (
                <View
                  style={[styles.fallbackIcon, { backgroundColor: "#555" }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    {selectedAsset?.symbol.charAt(0)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.assetDetails}>
              <Text style={[styles.assetName, { color: theme.text }]}>
                {selectedAsset?.name}
              </Text>
              <Text
                style={[styles.assetBalance, { color: theme.textSecondary }]}
              >
                Balance: {formatCurrency(selectedAsset?.balance || "0")}{" "}
                {selectedAsset?.symbol}
              </Text>
            </View>

            <ChevronDown
              size={20}
              color={theme.textSecondary}
              style={{
                transform: [
                  { rotate: isAssetDropdownOpen ? "180deg" : "0deg" },
                ],
              }}
            />
          </TouchableOpacity>

          {isAssetDropdownOpen && (
            <View
              style={[styles.dropdownList, { backgroundColor: theme.card }]}
            >
              {availableAssets.map((asset) => (
                <TouchableOpacity
                  key={asset.address}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedAsset(asset);
                    setIsAssetDropdownOpen(false);
                    setAmount("");
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {LOCAL_ICON_MAP[asset.symbol] ? (
                      <Image
                        source={LOCAL_ICON_MAP[asset.symbol]}
                        style={styles.ddAssetIcon}
                      />
                    ) : (
                      <View
                        style={[
                          styles.ddFallbackIcon,
                          { backgroundColor: "#555" },
                        ]}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "bold",
                          }}
                        >
                          {asset.symbol.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={[styles.ddItemTitle, { color: theme.text }]}>
                        {asset.symbol}
                      </Text>
                      <Text
                        style={[
                          styles.ddItemSub,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {parseFloat(asset.balance).toFixed(4)}
                      </Text>
                    </View>
                  </View>
                  {selectedAsset?.address === asset.address && (
                    <Check size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Recipient Address ─────────────────────────────────────────────── */}
        <View style={[styles.inputGroup, { zIndex: 50 }]}>
          <Text style={[styles.label, { color: theme.text }]}>
            Recipient Address
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.card, color: theme.text },
            ]}
            placeholder="0x..."
            placeholderTextColor={theme.textSecondary}
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            autoCapitalize="none"
            spellCheck={false}
          />
        </View>

        {/* ── Dropdown Network ──────────────────────────────────────────────── */}
        <View
          style={[
            styles.dropdownContainer,
            { zIndex: isNetworkDropdownOpen ? 200 : 90 },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>Network</Text>
          <TouchableOpacity
            style={[styles.networkSelector, { backgroundColor: theme.card }]}
            onPress={() => {
              setIsNetworkDropdownOpen(!isNetworkDropdownOpen);
              setIsAssetDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            {LOCAL_CHAIN_ICON_MAP[selectedChain.id] ? (
              <Image
                source={LOCAL_CHAIN_ICON_MAP[selectedChain.id]}
                style={styles.chainIcon}
              />
            ) : (
              <View
                style={[
                  styles.ddFallbackIcon,
                  { backgroundColor: "#3B82F6", marginRight: 10 },
                ]}
              >
                <Text
                  style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}
                >
                  {selectedChain.symbol?.charAt(0) ?? "?"}
                </Text>
              </View>
            )}

            <Text style={[styles.networkText, { color: theme.text, flex: 1 }]}>
              {selectedChain.name}
            </Text>

            <ChevronDown
              size={16}
              color={theme.textSecondary}
              style={{
                transform: [
                  { rotate: isNetworkDropdownOpen ? "180deg" : "0deg" },
                ],
              }}
            />
          </TouchableOpacity>

          {isNetworkDropdownOpen && (
            <View
              style={[styles.dropdownList, { backgroundColor: theme.card }]}
            >
              {MAINNET_CHAINS.map((chain) => (
                <TouchableOpacity
                  key={chain.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedChain(chain);
                    setIsNetworkDropdownOpen(false);
                    setRecipientAddress("");
                    setAmount("");
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {LOCAL_CHAIN_ICON_MAP[chain.id] ? (
                      <Image
                        source={LOCAL_CHAIN_ICON_MAP[chain.id]}
                        style={styles.ddAssetIcon}
                      />
                    ) : (
                      <View
                        style={[
                          styles.ddFallbackIcon,
                          { backgroundColor: "#3B82F6" },
                        ]}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "bold",
                          }}
                        >
                          {chain.symbol?.charAt(0) ?? "?"}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.ddItemTitle, { color: theme.text }]}>
                      {chain.name}
                    </Text>
                  </View>
                  {selectedChain.id === chain.id && (
                    <Check size={16} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Enter Amount ──────────────────────────────────────────────────── */}
        <View style={[styles.inputGroup, { zIndex: 50 }]}>
          <View style={styles.amountHeader}>
            <Text style={[styles.label, { color: theme.text }]}>
              Enter Amount
            </Text>
            <TouchableOpacity onPress={handleMax}>
              <Text style={[styles.maxText, { color: theme.primary }]}>
                MAX
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.amountInputContainer,
              { backgroundColor: theme.card },
            ]}
          >
            <TextInput
              style={[styles.amountInput, { color: theme.text }]}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <Text
              style={[styles.currencySymbol, { color: theme.textSecondary }]}
            >
              {selectedAsset?.symbol}
            </Text>
          </View>
        </View>

        {/* ── Fees Section ──────────────────────────────────────────────────── */}
        <View
          style={[
            styles.feeSection,
            { backgroundColor: theme.card, zIndex: 50 },
          ]}
        >
          {/* ✅ Network fee selalu dalam native token (ETH/BDAG), bukan token yg dikirim */}
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: theme.textSecondary }]}>
              Network Fee (Est.)
            </Text>
            <Text style={[styles.feeValue, { color: theme.text }]}>
              ~{estimatedGasEth.toFixed(6)} {nativeSymbol}
            </Text>
          </View>
          {/* Service fee dalam token yang dikirim */}
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: theme.textSecondary }]}>
              Service Fee (0.01%)
            </Text>
            <Text style={[styles.feeValue, { color: theme.text }]}>
              {((parseFloat(amount) || 0) * SERVICE_FEE_PERCENT).toFixed(6)}{" "}
              {selectedAsset?.symbol}
            </Text>
          </View>
          {/* Info jika kirim token ERC-20: gas tetap dibayar ETH */}
          {selectedAsset && !selectedAsset.isNative && (
            <View
              style={[
                styles.feeRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: "rgba(128,128,128,0.15)",
                  marginTop: 4,
                  paddingTop: 12,
                },
              ]}
            >
              <Text
                style={[
                  styles.feeLabel,
                  { color: theme.textSecondary, fontStyle: "italic", flex: 1 },
                ]}
              >
                Gas fees are paid in {nativeSymbol}. Ensure your {nativeSymbol}{" "}
                balance is sufficient.
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.infoRow, { zIndex: 50 }]}>
          <Info size={14} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Service fee helps maintain wallet infrastructure.
          </Text>
        </View>
      </ScrollView>

      {/* ── Footer Button ─────────────────────────────────────────────────── */}
      <View style={styles.footerWrapper}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: theme.primary,
              opacity: isSending || !amount || !recipientAddress ? 0.5 : 1,
            },
          ]}
          onPress={handleSend}
          disabled={isSending || !amount || !recipientAddress}
        >
          {isSending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>Review Transfer</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Camera Scanner Overlay ────────────────────────────────────────── */}
      {isScanning && permission?.granted && (
        <View style={styles.cameraOverlay}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.closeCameraBtn}
              onPress={() => setIsScanning(false)}
            >
              <X size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.scanFrame} />
            <Text style={styles.scanInstruction}>
              Align QR Code within frame
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  iconBtn: { padding: 8 },
  content: { padding: 20, paddingBottom: 40 },

  alertBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  alertText: { fontSize: 13, lineHeight: 18, flex: 1 },

  dropdownContainer: {
    marginBottom: 20,
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  assetIconWrapper: { marginRight: 12 },
  assetIcon: { width: 40, height: 40, borderRadius: 20 },
  fallbackIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  assetDetails: { flex: 1 },
  assetName: { fontSize: 16, fontWeight: "700" },
  assetBalance: { fontSize: 13, marginTop: 2 },

  ddAssetIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  ddFallbackIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 9999,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  ddItemTitle: { fontSize: 15, fontWeight: "600" },
  ddItemSub: { fontSize: 12 },

  networkSelector: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  chainIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  networkText: { fontSize: 16 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 16 },

  amountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  maxText: { fontSize: 13, fontWeight: "700" },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 60,
  },
  amountInput: { flex: 1, fontSize: 20, fontWeight: "600" },
  currencySymbol: { fontSize: 15, fontWeight: "600" },

  feeSection: { borderRadius: 16, padding: 16, marginBottom: 16 },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  feeLabel: { fontSize: 12 },
  feeValue: { fontSize: 12, fontWeight: "600" },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  infoText: { fontSize: 11, flex: 1 },

  footerWrapper: { padding: 20, paddingTop: 10 },
  sendButton: {
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  sendButtonText: { color: "#FFF", fontSize: 18, fontWeight: "700" },

  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "black",
    zIndex: 9999,
  },
  cameraControls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  closeCameraBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#FFF",
    borderRadius: 20,
  },
  scanInstruction: {
    color: "#FFF",
    marginTop: 20,
    fontSize: 16,
    fontWeight: "600",
  },
});
