// app/send.tsx
import { ChainConfig, SUPPORTED_CHAINS } from "@/config/chains";
import { WalletRepository } from "@/modules/wallet/infrastructure/WalletRepository";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { useAppStore } from "@/store/appStore";
import { Colors } from "@/theme/colors";
import { ZEROEX_API_KEY } from "@env";
import axios from "axios";
import { ethers } from "ethers";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  ScanLine,
  Search,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const LOCAL_ICON_MAP: Record<string, any> = {
  ETH: require("../assets/chains/eth.png"),
  USDT: require("../assets/coins/usdt.png"),
  USDC: require("../assets/coins/usdc.png"),
  BDAG: require("../assets/chains/bdag.png"),
  POL: require("../assets/chains/polygon.png"),
  BNB: require("../assets/chains/bnb.png"),
  SepoliaETH: require("../assets/chains/eth-sepolia.png"),
};

const LOCAL_CHAIN_ICON_MAP: Record<string, any> = {
  "ethereum-mainnet": require("../assets/chains/eth.png"),
  "ethereum-sepolia": require("../assets/chains/eth-sepolia.png"),
  "blockdag-mainnet": require("../assets/chains/bdag.png"),
  "blockdag-testnet": require("../assets/chains/bdag.png"),
  "polygon-mainnet": require("../assets/chains/polygon.png"),
  "polygon-amoy": require("../assets/chains/polygon.png"),
  "bnb-mainnet": require("../assets/chains/bnb.png"),
  "bnb-testnet": require("../assets/chains/bnb.png"),
};

const ALL_CHAINS = SUPPORTED_CHAINS;

const PUBLIC_RPC_MAP: Record<string, string[]> = {
  "ethereum-mainnet": [
    "https://cloudflare-eth.com",
    "https://rpc.ankr.com/eth",
    "https://ethereum.publicnode.com",
    "https://eth.llamarpc.com",
  ],
  "ethereum-sepolia": ["https://rpc.sepolia.org"],
  "blockdag-mainnet": ["https://rpc.primordial.bdagscan.com"],
  "blockdag-testnet": ["https://rpc.testnet.bdagscan.com"],
  "polygon-mainnet": ["https://polygon-rpc.com"],
  "polygon-amoy": ["https://rpc-amoy.polygon.technology"],
  "bnb-mainnet": ["https://bsc-dataseed.binance.org"],
  "bnb-testnet": ["https://data-seed-prebsc-1-s1.binance.org"],
};

const HARDCODED_GAS_FALLBACK: Record<string, string> = {
  "ethereum-mainnet": "20000000000",
  "ethereum-sepolia": "2000000000",
  "blockdag-mainnet": "1000000000",
  "blockdag-testnet": "1000000000",
  "polygon-mainnet": "30000000000",
  "bnb-mainnet": "5000000000",
};

const NATIVE_DECIMALS = 18;
const GAS_LIMIT_NATIVE = 21000;
const GAS_LIMIT_TOKEN = 65000;
const SERVICE_FEE_WALLET = "0x70d96B6463533741669cd6fC871a7761e88c50c8";
const SERVICE_FEE_PERCENT = 0.001; // 0.1% fee

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

interface AssetOption {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  chainId: string;
  isNative: boolean;
}

interface TxDetails {
  recipient: string;
  amount: string;
  symbol: string;
  serviceFee: string;
  gasEstimate: string;
  nativeSymbol: string;
  totalDeducted: string;
}

export default function SendScreen() {
  const { walletAddress, isDarkMode, mnemonic } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const params = useLocalSearchParams();
  const initialChainId = (params.chainId as string) || "ethereum-mainnet";
  const initialSymbol = (params.symbol as string) || "ETH";

  const [selectedChain, setSelectedChain] = useState<ChainConfig>(
    ALL_CHAINS.find((c) => c.id === initialChainId) || ALL_CHAINS[0],
  );
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null);
  const [availableAssets, setAvailableAssets] = useState<AssetOption[]>([]);

  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  const [isAssetSheetOpen, setIsAssetSheetOpen] = useState(false);
  const [isNetworkSheetOpen, setIsNetworkSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [gasPriceWei, setGasPriceWei] = useState<string>("0");
  const [isSending, setIsSending] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [txHash, setTxHash] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [pendingTxDetails, setPendingTxDetails] = useState<TxDetails | null>(
    null,
  );

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getRpcUrl = useCallback((chain: ChainConfig): string => {
    if (chain.rpcUrl) return chain.rpcUrl;
    const fallbacks = PUBLIC_RPC_MAP[chain.id];
    return fallbacks?.[0] ?? "";
  }, []);

  const getExplorerUrl = (chainId: string, hash: string) => {
    const chain = ALL_CHAINS.find((c) => c.id === chainId);
    if (chain?.explorerUrl) {
      const baseUrl = chain.explorerUrl.endsWith("/")
        ? chain.explorerUrl.slice(0, -1)
        : chain.explorerUrl;
      return `${baseUrl}/tx/${hash}`;
    }
    return null;
  };

  // ─── Gas Fetching ────────────────────────────────────────────────────────────

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

          if (!response.ok) continue;

          const json = await response.json();
          const hexPrice: string | undefined = json?.result;

          if (hexPrice && hexPrice.startsWith("0x")) {
            const parsed = parseInt(hexPrice, 16);
            if (!isNaN(parsed) && parsed > 0) {
              return parsed.toString();
            }
          }
        } catch (err: any) {
          clearTimeout(timer);
        }
      }
      return null;
    },
    [],
  );

  const fetchGasPrice = useCallback(async () => {
    const chainIdMap: Record<string, number> = {
      "ethereum-mainnet": 1,
      "blockdag-mainnet": 1404,
    };
    const cid = chainIdMap[selectedChain.id];

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
          setGasPriceWei(response.data.gasPrice);
          return;
        }
      } catch {
        // Ignore 0x error, fallback to RPC
      }
    }

    const rpcPrice = await fetchGasFromPublicRpc(selectedChain.id);
    if (rpcPrice) {
      setGasPriceWei(rpcPrice);
      return;
    }

    const fallback = HARDCODED_GAS_FALLBACK[selectedChain.id] ?? "5000000000";
    setGasPriceWei(fallback);
  }, [selectedChain.id, walletAddress, fetchGasFromPublicRpc]);

  // ─── Balance Fetching ────────────────────────────────────────────────────────

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoadingBalance(true);

    try {
      const nativeBal = await BlockchainService.getBalance(
        selectedChain.id as ChainId,
        walletAddress,
      );

      let assets: AssetOption[] = [];

      assets.push({
        symbol: selectedChain.symbol,
        name: selectedChain.name.split(" ")[0],
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        decimals: selectedChain.decimals,
        balance: nativeBal,
        chainId: selectedChain.id,
        isNative: true,
      });

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
  }, [fetchGasPrice, fetchBalances]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleMax = () => {
    if (!selectedAsset) return;
    let maxVal = parseFloat(selectedAsset.balance);

    if (selectedAsset.isNative) {
      const gasCostEth =
        (GAS_LIMIT_NATIVE * parseInt(gasPriceWei)) /
        Math.pow(10, NATIVE_DECIMALS);
      if (1 + SERVICE_FEE_PERCENT > 0) {
        maxVal = (maxVal - gasCostEth * 1.1) / (1 + SERVICE_FEE_PERCENT);
      } else {
        maxVal = Math.max(0, maxVal - gasCostEth * 1.1);
      }
    }
    if (maxVal < 0) maxVal = 0;
    setAmount(maxVal.toFixed(6));
  };

  const handleScanPress = async () => {
    if (!permission) return;
    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) return;
    }
    setIsScanning(true);
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    setIsScanning(false);
    if (data.startsWith("0x") && data.length === 42) {
      setRecipientAddress(data);
    }
  };

  // ─── Validation Logic ───────────────────────────────────────────────────────

  const validateTransaction = (): string | null => {
    if (!selectedAsset) return "Please select an asset.";
    if (!recipientAddress) return "Please enter a recipient address.";
    if (!ethers.isAddress(recipientAddress))
      return "Invalid recipient address format.";

    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0)
      return "Please enter a valid amount greater than 0.";

    const serviceFee = sendAmount * SERVICE_FEE_PERCENT;
    const txGasLimit = selectedAsset.isNative
      ? GAS_LIMIT_NATIVE
      : GAS_LIMIT_TOKEN;

    const gasCostNative =
      (txGasLimit * parseInt(gasPriceWei || "0")) /
      Math.pow(10, NATIVE_DECIMALS);

    const nativeAsset = availableAssets.find((a) => a.isNative);
    const nativeBalance = nativeAsset ? parseFloat(nativeAsset.balance) : 0;
    const assetBalance = parseFloat(selectedAsset.balance);

    if (selectedAsset.isNative) {
      const totalRequired = sendAmount + serviceFee + gasCostNative;
      if (totalRequired > assetBalance) {
        return `Insufficient ${selectedAsset.symbol} balance. You need ${totalRequired.toFixed(
          6,
        )} (Amount + Fee + Gas), but you have ${assetBalance.toFixed(6)}.`;
      }
    } else {
      if (sendAmount + serviceFee > assetBalance) {
        return `Insufficient ${selectedAsset.symbol} balance. You need ${(
          sendAmount + serviceFee
        ).toFixed(6)} (Amount + Fee), but you have ${assetBalance.toFixed(6)}.`;
      }
      if (gasCostNative > nativeBalance) {
        return `Insufficient ${nativeAsset?.symbol} balance for gas. You need ${gasCostNative.toFixed(
          6,
        )} for network fees, but you have ${nativeBalance.toFixed(6)}.`;
      }
    }

    return null;
  };

  // ─── Confirm & Send Logic ───────────────────────────────────────────────────

  const prepareTransaction = () => {
    if (!mnemonic) {
      setErrorMsg("Wallet not initialized properly.");
      setShowErrorModal(true);
      return;
    }

    const error = validateTransaction();
    if (error) {
      setErrorMsg(error);
      setShowErrorModal(true);
      return;
    }

    const sendAmount = parseFloat(amount);
    const serviceFee = sendAmount * SERVICE_FEE_PERCENT;
    const txGasLimit = selectedAsset!.isNative
      ? GAS_LIMIT_NATIVE
      : GAS_LIMIT_TOKEN;

    const gasCostEth =
      (txGasLimit * parseInt(gasPriceWei)) / Math.pow(10, NATIVE_DECIMALS);

    let totalDeducted = sendAmount + serviceFee;
    if (selectedAsset!.isNative) {
      totalDeducted += gasCostEth;
    }

    setPendingTxDetails({
      recipient: recipientAddress,
      amount: amount,
      symbol: selectedAsset!.symbol,
      serviceFee: serviceFee.toFixed(6),
      gasEstimate: gasCostEth.toFixed(6),
      nativeSymbol:
        availableAssets.find((a) => a.isNative)?.symbol ?? selectedChain.symbol,
      totalDeducted: totalDeducted.toFixed(6),
    });

    setShowConfirmModal(true);
  };

  const handleCopyTxHash = () => {
    if (!txHash) return;
    Clipboard.setString(txHash);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Step 1: Confirm modal → open password modal
  const executeTransaction = () => {
    if (!pendingTxDetails || !selectedAsset) return;
    setShowConfirmModal(false);
    requestAnimationFrame(() => {
      setPasswordInput("");
      setPasswordError("");
      setShowPasswordText(false);
      setShowPasswordModal(true);
    });
  };

  // Step 2: User submits password → verify → loading → run tx
  const handlePasswordSubmit = async () => {
    if (!passwordInput || isVerifying) return;

    setPasswordError("");
    setIsVerifying(true);

    try {
      const isValid = await WalletRepository.verifyPassword(passwordInput);

      if (!isValid) {
        setIsVerifying(false);
        setPasswordError("Incorrect password. Please try again.");
        setPasswordInput("");
        return;
      }

      // Password benar — langsung set loading, tutup modal, jalankan tx
      setIsVerifying(false);
      setIsSending(true);
      setShowPasswordModal(false);

      // Flush UI dulu (loading overlay muncul), baru kerja berat
      requestAnimationFrame(() => {
        setTimeout(() => {
          _runTransaction();
        }, 300);
      });
    } catch (error: any) {
      setIsVerifying(false);
      const msg = error?.message ?? "";
      if (msg.startsWith("RATE_LIMITED:")) {
        const secs = msg.split(":")[1];
        setPasswordError(`Too many attempts. Try again in ${secs} seconds.`);
      } else {
        setPasswordError("Verification failed. Please try again.");
      }
    }
  };

  const _runTransaction = async () => {
    try {
      const rpcUrl = getRpcUrl(selectedChain);
      if (!rpcUrl) throw new Error("No RPC URL available.");

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = ethers.Wallet.fromPhrase(mnemonic!).connect(provider);

      if (wallet.address.toLowerCase() !== walletAddress?.toLowerCase()) {
        throw new Error("Wallet address mismatch.");
      }

      // Ambil nonce awal sekali — kelola manual agar tidak ada collision
      const baseNonce = await provider.getTransactionCount(
        wallet.address,
        "pending",
      );
      const gasPrice = ethers.parseUnits(gasPriceWei, "wei");

      let finalHash = "";

      if (selectedAsset!.isNative) {
        const feeVal = ethers.parseUnits(
          pendingTxDetails!.serviceFee,
          NATIVE_DECIMALS,
        );

        if (feeVal > 0n) {
          // Tx 1: kirim fee dulu — nonce: baseNonce
          const feeTx = await wallet.sendTransaction({
            to: SERVICE_FEE_WALLET,
            value: feeVal,
            gasLimit: 21000,
            gasPrice,
            nonce: baseNonce,
          });
          // Tunggu fee confirmed sebelum lanjut
          await feeTx.wait(1);
        }

        // Tx 2: kirim main amount — nonce: baseNonce + 1 (atau +0 jika tidak ada fee)
        const mainNonce = feeVal > 0n ? baseNonce + 1 : baseNonce;
        const mainTx = await wallet.sendTransaction({
          to: pendingTxDetails!.recipient,
          value: ethers.parseUnits(pendingTxDetails!.amount, NATIVE_DECIMALS),
          gasLimit: GAS_LIMIT_NATIVE,
          gasPrice,
          nonce: mainNonce,
        });

        finalHash = mainTx.hash;
      } else {
        const feeVal = ethers.parseUnits(
          pendingTxDetails!.serviceFee,
          NATIVE_DECIMALS,
        );

        if (feeVal > 0n) {
          // Tx 1: kirim native fee dulu — nonce: baseNonce
          const feeTx = await wallet.sendTransaction({
            to: SERVICE_FEE_WALLET,
            value: feeVal,
            gasLimit: 21000,
            gasPrice,
            nonce: baseNonce,
          });
          // Tunggu fee confirmed
          await feeTx.wait(1);
        }

        // Tx 2: kirim token ke recipient — nonce: baseNonce + 1 (atau +0 jika tidak ada fee)
        const mainNonce = feeVal > 0n ? baseNonce + 1 : baseNonce;
        const contract = new ethers.Contract(
          selectedAsset!.address,
          ERC20_ABI,
          wallet,
        );
        const tokenTx = await contract.transfer(
          pendingTxDetails!.recipient,
          ethers.parseUnits(pendingTxDetails!.amount, selectedAsset!.decimals),
          {
            gasLimit: GAS_LIMIT_TOKEN,
            gasPrice,
            nonce: mainNonce,
          },
        );

        finalHash = tokenTx.hash;
      }

      setTxHash(finalHash);
      setIsCopied(false);
      setShowSuccessModal(true);

      setTimeout(() => {
        fetchBalances();
        setAmount("");
        setRecipientAddress("");
      }, 2000);
    } catch (error: any) {
      console.error("[Send] Error:", error);
      let message = error?.message ?? "Unknown error occurred.";
      if (error?.reason) message = error.reason;
      if (error?.code === "INSUFFICIENT_FUNDS") {
        message = "Insufficient funds for gas or transfer.";
      } else if (message.includes("user rejected")) {
        message = "Transaction rejected by user.";
      } else if (message.includes("nonce")) {
        message = "Nonce error. Please try again.";
      }

      setErrorMsg(message);
      setShowErrorModal(true);
    } finally {
      setIsSending(false);
    }
  };

  // ─── Display Helpers ─────────────────────────────────────────────────────────

  const formatCurrency = (val: string) => parseFloat(val).toFixed(4);

  const nativeSymbol =
    availableAssets.find((a) => a.isNative)?.symbol ?? selectedChain.symbol;

  const gasLimit = selectedAsset?.isNative ? GAS_LIMIT_NATIVE : GAS_LIMIT_TOKEN;
  const estimatedGasEth =
    (gasLimit * parseInt(gasPriceWei || "0")) / Math.pow(10, NATIVE_DECIMALS);

  const filteredAssets = availableAssets.filter(
    (asset) =>
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredChains = ALL_CHAINS.filter(
    (chain) =>
      chain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chain.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoadingBalance && !selectedAsset) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      {/* ── Global Loading Overlay ─────────────────────────────────────────── */}
      {isSending && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingBox, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingTitle, { color: theme.text }]}>
              Processing Transfer
            </Text>
            <Text
              style={[styles.loadingSubtitle, { color: theme.textSecondary }]}
            >
              Please wait, do not close the app...
            </Text>
          </View>
        </View>
      )}

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
        keyboardShouldPersistTaps="handled"
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

        {/* ── Select Asset Button ──────────────────────────────────────────── */}
        <View style={styles.dropdownContainer}>
          <Text style={[styles.label, { color: theme.text }]}>
            Select Asset
          </Text>
          <TouchableOpacity
            style={[styles.selectorRow, { backgroundColor: theme.card }]}
            onPress={() => {
              setSearchQuery("");
              setIsAssetSheetOpen(true);
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

            <ChevronDown size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Recipient Address ─────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>
            Recipient Address
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.card, color: theme.text },
            ]}
            placeholder="Your recipient's wallet address"
            placeholderTextColor={theme.textSecondary}
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            autoCapitalize="none"
            spellCheck={false}
          />
        </View>

        {/* ── Select Network Button ────────────────────────────────────────── */}
        <View style={styles.dropdownContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Network</Text>
          <TouchableOpacity
            style={[styles.networkSelector, { backgroundColor: theme.card }]}
            onPress={() => {
              setSearchQuery("");
              setIsNetworkSheetOpen(true);
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

            <ChevronDown size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Enter Amount ──────────────────────────────────────────────────── */}
        <View style={styles.inputGroup}>
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
        <View style={[styles.feeSection, { backgroundColor: theme.card }]}>
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: theme.textSecondary }]}>
              Network Fee (Est.)
            </Text>
            <Text style={[styles.feeValue, { color: theme.text }]}>
              ~{estimatedGasEth.toFixed(6)} {nativeSymbol}
            </Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: theme.textSecondary }]}>
              Service Fee (0.1%)
            </Text>
            <Text style={[styles.feeValue, { color: theme.text }]}>
              {((parseFloat(amount) || 0) * SERVICE_FEE_PERCENT).toFixed(6)}{" "}
              {selectedAsset?.symbol}
            </Text>
          </View>
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

        <View style={styles.infoRow}>
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
          onPress={prepareTransaction}
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

      {/* ── BOTTOM SHEET: SELECT ASSET ────────────────────────────────────── */}
      <Modal
        visible={isAssetSheetOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAssetSheetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Select Asset
              </Text>
              <TouchableOpacity onPress={() => setIsAssetSheetOpen(false)}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.searchContainer, { backgroundColor: theme.card }]}
            >
              <Search size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search assets..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredAssets}
              keyExtractor={(item) => item.address}
              style={styles.sheetList}
              renderItem={({ item: asset }) => (
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => {
                    setSelectedAsset(asset);
                    setIsAssetSheetOpen(false);
                    setAmount("");
                  }}
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
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>
                          {asset.symbol.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.ddItemTitle, { color: theme.text }]}>
                        {asset.symbol}
                      </Text>
                      <Text
                        style={[
                          styles.ddItemSub,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {asset.name}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.ddItemTitle, { color: theme.text }]}>
                      {parseFloat(asset.balance).toFixed(4)}
                    </Text>
                    <Text
                      style={[styles.ddItemSub, { color: theme.textSecondary }]}
                    >
                      Available
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={{ color: theme.textSecondary }}>
                    No assets found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── BOTTOM SHEET: SELECT NETWORK ──────────────────────────────────── */}
      <Modal
        visible={isNetworkSheetOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsNetworkSheetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Select Network
              </Text>
              <TouchableOpacity onPress={() => setIsNetworkSheetOpen(false)}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.searchContainer, { backgroundColor: theme.card }]}
            >
              <Search size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search networks..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredChains}
              keyExtractor={(item) => item.id}
              style={styles.sheetList}
              renderItem={({ item: chain }) => (
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => {
                    setSelectedChain(chain);
                    setIsNetworkSheetOpen(false);
                    setRecipientAddress("");
                    setAmount("");
                  }}
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
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>
                          {chain.symbol?.charAt(0) ?? "?"}
                        </Text>
                      </View>
                    )}
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.ddItemTitle, { color: theme.text }]}>
                        {chain.name}
                      </Text>
                      <Text
                        style={[
                          styles.ddItemSub,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {chain.symbol}
                      </Text>
                    </View>
                  </View>
                  {selectedChain.id === chain.id && (
                    <Check size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={{ color: theme.textSecondary }}>
                    No networks found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── ERROR MODAL ───────────────────────────────────────────────────── */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <View
            style={[styles.errorModalContent, { backgroundColor: theme.card }]}
          >
            {/* Icon */}
            <View style={styles.errorIconWrapper}>
              <AlertCircle size={36} color="#EF4444" />
            </View>

            <Text style={[styles.errorModalTitle, { color: theme.text }]}>
              Something Went Wrong
            </Text>

            <Text
              style={[styles.errorModalMessage, { color: theme.textSecondary }]}
            >
              {errorMsg}
            </Text>

            <TouchableOpacity
              style={[
                styles.errorDismissBtn,
                { backgroundColor: theme.primary },
              ]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorDismissBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── CONFIRM MODAL ─────────────────────────────────────────────────── */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <View
            style={[
              styles.confirmModalContent,
              { backgroundColor: theme.card },
            ]}
          >
            {/* Header */}
            <View style={styles.confirmModalHeader}>
              <Text style={[styles.confirmModalTitle, { color: theme.text }]}>
                Confirm Transfer
              </Text>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={[
                  styles.confirmCloseBtn,
                  { backgroundColor: theme.background },
                ]}
              >
                <X size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Recipient */}
            <View
              style={[
                styles.confirmSection,
                { backgroundColor: theme.background },
              ]}
            >
              <Text
                style={[
                  styles.confirmSectionLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Recipient
              </Text>
              <Text
                style={[
                  styles.confirmSectionValue,
                  {
                    color: theme.text,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  },
                ]}
              >
                {pendingTxDetails
                  ? `${pendingTxDetails.recipient.slice(0, 12)}...${pendingTxDetails.recipient.slice(-10)}`
                  : ""}
              </Text>
            </View>

            {/* Amount */}
            <View
              style={[
                styles.confirmAmountBlock,
                { borderColor: theme.primary + "30" },
              ]}
            >
              <Text
                style={[
                  styles.confirmAmountLabel,
                  { color: theme.textSecondary },
                ]}
              >
                You are sending
              </Text>
              <Text
                style={[styles.confirmAmountValue, { color: theme.primary }]}
              >
                {pendingTxDetails?.amount}{" "}
                <Text style={{ fontSize: 18 }}>{pendingTxDetails?.symbol}</Text>
              </Text>
            </View>

            {/* Fee breakdown */}
            <View style={styles.confirmFeeBreakdown}>
              <View style={styles.confirmFeeRow}>
                <Text
                  style={[
                    styles.confirmFeeLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Service Fee
                </Text>
                <Text style={[styles.confirmFeeValue, { color: theme.text }]}>
                  {pendingTxDetails?.serviceFee} {pendingTxDetails?.symbol}
                </Text>
              </View>
              <View
                style={[
                  styles.confirmFeeDivider,
                  { backgroundColor: theme.textSecondary + "20" },
                ]}
              />
              <View style={styles.confirmFeeRow}>
                <Text
                  style={[
                    styles.confirmFeeLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Est. Network Fee
                </Text>
                <Text style={[styles.confirmFeeValue, { color: theme.text }]}>
                  {pendingTxDetails?.gasEstimate}{" "}
                  {pendingTxDetails?.nativeSymbol}
                </Text>
              </View>
              <View
                style={[
                  styles.confirmFeeDivider,
                  { backgroundColor: theme.textSecondary + "20" },
                ]}
              />
              <View style={styles.confirmFeeRow}>
                <Text
                  style={[styles.confirmFeeTotalLabel, { color: theme.text }]}
                >
                  Total Deducted
                </Text>
                <Text
                  style={[
                    styles.confirmFeeTotalValue,
                    { color: theme.primary },
                  ]}
                >
                  ≈ {pendingTxDetails?.totalDeducted} {pendingTxDetails?.symbol}
                </Text>
              </View>
              {selectedAsset && !selectedAsset.isNative && (
                <Text
                  style={[
                    styles.confirmGasNote,
                    { color: theme.textSecondary },
                  ]}
                >
                  * Gas paid separately in {pendingTxDetails?.nativeSymbol}
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[
                  styles.confirmCancelBtn,
                  {
                    borderColor: theme.textSecondary + "40",
                    backgroundColor: theme.background,
                  },
                ]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={[styles.confirmCancelText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmSendBtn,
                  { backgroundColor: theme.primary },
                ]}
                onPress={executeTransaction}
              >
                <Text style={styles.confirmSendText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── PASSWORD MODAL ────────────────────────────────────────────────── */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isVerifying) {
            setShowPasswordModal(false);
            setPasswordInput("");
            setPasswordError("");
          }
        }}
      >
        <View style={styles.centeredModalOverlay}>
          <View
            style={[
              styles.passwordModalContent,
              { backgroundColor: theme.card },
            ]}
          >
            {/* Lock icon */}
            <View
              style={[
                styles.passwordIconWrapper,
                { backgroundColor: theme.primary + "18" },
              ]}
            >
              <View
                style={[
                  styles.passwordIconInner,
                  { backgroundColor: theme.primary + "30" },
                ]}
              >
                <LockKeyhole size={28} color={theme.primary} />
              </View>
            </View>

            <Text style={[styles.passwordModalTitle, { color: theme.text }]}>
              Verify Identity
            </Text>
            <Text
              style={[
                styles.passwordModalSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              Enter your wallet password to authorize this transfer.
            </Text>

            {/* Password input */}
            <View
              style={[
                styles.passwordInputWrapper,
                {
                  backgroundColor: theme.background,
                  borderColor: passwordError
                    ? "#EF4444"
                    : theme.textSecondary + "30",
                  marginBottom: passwordError ? 6 : 24,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInputField, { color: theme.text }]}
                placeholder="Enter password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPasswordText}
                value={passwordInput}
                onChangeText={(t) => {
                  setPasswordInput(t);
                  setPasswordError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isVerifying}
                onSubmitEditing={handlePasswordSubmit}
                returnKeyType="done"
                autoFocus
              />
              <TouchableOpacity
                onPress={() => setShowPasswordText((v) => !v)}
                style={styles.passwordEyeBtn}
                disabled={isVerifying}
              >
                {showPasswordText ? (
                  <EyeOff size={20} color={theme.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Error message */}
            {!!passwordError && (
              <View style={styles.passwordErrorRow}>
                <AlertCircle size={14} color="#EF4444" />
                <Text style={styles.passwordErrorText}>{passwordError}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.passwordActions}>
              <TouchableOpacity
                style={[
                  styles.passwordCancelBtn,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.textSecondary + "40",
                    opacity: isVerifying ? 0.4 : 1,
                  },
                ]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput("");
                  setPasswordError("");
                }}
                disabled={isVerifying}
              >
                <Text
                  style={[styles.passwordCancelText, { color: theme.text }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.passwordSubmitBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: !passwordInput || isVerifying ? 0.5 : 1,
                  },
                ]}
                onPress={handlePasswordSubmit}
                disabled={!passwordInput || isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.passwordSubmitText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── SUCCESS MODAL ─────────────────────────────────────────────────── */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      >
        <View style={styles.centeredModalOverlay}>
          <View
            style={[
              styles.successModalContent,
              { backgroundColor: theme.card },
            ]}
          >
            {/* Animated check icon */}
            <View
              style={[
                styles.successIconOuter,
                { backgroundColor: theme.primary + "18" },
              ]}
            >
              <View
                style={[
                  styles.successIconInner,
                  { backgroundColor: theme.primary + "30" },
                ]}
              >
                <Check size={36} color={theme.primary} strokeWidth={3} />
              </View>
            </View>

            <Text style={[styles.successTitle, { color: theme.text }]}>
              Transfer Successful!
            </Text>
            <Text
              style={[styles.successSubtitle, { color: theme.textSecondary }]}
            >
              Your transaction has been broadcast to the network.
            </Text>

            {/* TX Hash */}
            <View
              style={[styles.txHashBox, { backgroundColor: theme.background }]}
            >
              <Text
                style={[styles.txHashBoxLabel, { color: theme.textSecondary }]}
              >
                Transaction Hash
              </Text>
              <TouchableOpacity
                style={styles.txHashRow}
                onPress={handleCopyTxHash}
                activeOpacity={0.7}
              >
                <Text style={[styles.txHashText, { color: theme.text }]}>
                  {txHash.slice(0, 14)}...{txHash.slice(-10)}
                </Text>
                {isCopied ? (
                  <Check size={15} color="#22C55E" />
                ) : (
                  <Copy size={15} color={theme.primary} />
                )}
              </TouchableOpacity>
              {isCopied && (
                <Text
                  style={{
                    color: "#22C55E",
                    fontSize: 12,
                    marginTop: 6,
                    fontWeight: "600",
                  }}
                >
                  Copied to clipboard!
                </Text>
              )}
            </View>

            {/* View on Explorer */}
            {getExplorerUrl(selectedChain.id, txHash) && (
              <TouchableOpacity
                style={[
                  styles.explorerBtn,
                  { borderColor: theme.primary + "40" },
                ]}
                onPress={() =>
                  Linking.openURL(getExplorerUrl(selectedChain.id, txHash)!)
                }
              >
                <ExternalLink size={16} color={theme.primary} />
                <Text style={[styles.explorerText, { color: theme.primary }]}>
                  View on Explorer
                </Text>
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={styles.successActions}>
              <TouchableOpacity
                style={[
                  styles.successBackBtn,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.back();
                }}
              >
                <ArrowLeft size={18} color="#FFF" />
                <Text style={styles.successBackText}>Back to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.successSendAgainBtn,
                  { borderColor: theme.primary },
                ]}
                onPress={() => {
                  setShowSuccessModal(false);
                  setAmount("");
                  setRecipientAddress("");
                }}
              >
                <Text
                  style={[
                    styles.successSendAgainText,
                    { color: theme.primary },
                  ]}
                >
                  Send Another
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Loading Overlay ──────────────────────────────────────────────────────
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  loadingBox: {
    width: width * 0.75,
    maxWidth: 300,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Layout ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  iconBtn: { padding: 8 },
  content: { padding: 20, paddingBottom: 40 },

  alertBox: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  alertText: { fontSize: 13, lineHeight: 18, flex: 1 },

  dropdownContainer: { marginBottom: 20 },
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

  ddAssetIcon: { width: 32, height: 32, borderRadius: 16 },
  ddFallbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  networkSelector: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chainIcon: { width: 28, height: 28, borderRadius: 14, marginRight: 10 },
  networkText: { fontSize: 16 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: { height: 54, borderRadius: 12, paddingHorizontal: 16, fontSize: 16 },

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
    height: 64,
  },
  amountInput: { flex: 1, fontSize: 22, fontWeight: "600" },
  currencySymbol: { fontSize: 16, fontWeight: "600" },

  feeSection: { borderRadius: 16, padding: 16, marginBottom: 16 },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  feeLabel: { fontSize: 13 },
  feeValue: { fontSize: 13, fontWeight: "600" },

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

  // ── Bottom Sheets ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    height: height * 0.7,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.2)",
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  sheetList: { flex: 1 },
  sheetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  emptyState: { padding: 20, alignItems: "center" },

  // ── Centered Modal Base ──────────────────────────────────────────────────
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // ── Error Modal ──────────────────────────────────────────────────────────
  errorModalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  errorIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EF444415",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  errorModalMessage: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  errorDismissBtn: {
    width: "100%",
    height: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  errorDismissBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Confirm Modal ────────────────────────────────────────────────────────
  confirmModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  confirmModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  confirmCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmSection: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 4,
  },
  confirmSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  confirmSectionValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  confirmAmountBlock: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    gap: 4,
  },
  confirmAmountLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  confirmAmountValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  confirmFeeBreakdown: {
    marginBottom: 20,
  },
  confirmFeeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  confirmFeeLabel: {
    fontSize: 14,
  },
  confirmFeeValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmFeeDivider: {
    height: 1,
  },
  confirmFeeTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  confirmFeeTotalValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  confirmGasNote: {
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
    fontStyle: "italic",
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmSendBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmSendText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Success Modal ────────────────────────────────────────────────────────
  successModalContent: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  successIconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successIconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  txHashBox: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  txHashBoxLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  txHashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  txHashText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  explorerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  explorerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  successActions: {
    width: "100%",
    gap: 10,
  },
  successBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  successBackText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  successSendAgainBtn: {
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  successSendAgainText: {
    fontSize: 16,
    fontWeight: "700",
  },

  ddItemTitle: { fontSize: 15, fontWeight: "600" },
  ddItemSub: { fontSize: 12 },

  // ── Password Modal ───────────────────────────────────────────────────────
  passwordModalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  passwordIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  passwordIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  passwordModalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  passwordInputField: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  passwordEyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  passwordErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
    marginTop: 2,
  },
  passwordErrorText: {
    color: "#EF4444",
    fontSize: 13,
    flex: 1,
  },
  passwordActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  passwordCancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  passwordSubmitBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  passwordSubmitText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
