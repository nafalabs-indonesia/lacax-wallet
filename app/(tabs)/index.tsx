// app/(tabs)/index.tsx
import { SUPPORTED_CHAINS, TokenConfig } from "@/config/chains";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Repeat2,
  Search,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

const { width: W } = Dimensions.get("window");

// ─────────────────────────────────────────────
// Helper: Detect Testnet
// ─────────────────────────────────────────────
const isTestnet = (id: string) => {
  return (
    id.includes("testnet") || id.includes("sepolia") || id.includes("amoy")
  );
};

// ─────────────────────────────────────────────
// Helper: Mapping Icon Lokal (Chains & Tokens)
// ─────────────────────────────────────────────
const LOCAL_ICON_MAP: Record<string, any> = {
  // Chains
  "ethereum-mainnet": require("../../assets/chains/eth.png"),
  "ethereum-sepolia": require("../../assets/chains/eth-sepolia.png"),
  "blockdag-mainnet": require("../../assets/chains/bdag.png"),
  "blockdag-testnet": require("../../assets/chains/bdag.png"),
  "polygon-mainnet": require("../../assets/chains/polygon.png"),
  "polygon-amoy": require("../../assets/chains/polygon.png"),
  "bnb-mainnet": require("../../assets/chains/bnb.png"),
  "bnb-testnet": require("../../assets/chains/bnb.png"),

  // Tokens
  USDT: require("../../assets/coins/usdt.png"),
  USDC: require("../../assets/coins/usdc.png"),
};

// Icon Kecil untuk Badge Network
const NETWORK_BADGE_ICON: Record<string, any> = {
  "ethereum-mainnet": require("../../assets/chains/eth.png"),
  "ethereum-sepolia": require("../../assets/chains/eth-symbol.webp"),
  "polygon-mainnet": require("../../assets/chains/polygon.png"),
  "polygon-amoy": require("../../assets/chains/polygon.png"),
  "bnb-mainnet": require("../../assets/chains/bnb.png"),
  "bnb-testnet": require("../../assets/chains/bnb.png"),
};

// ─────────────────────────────────────────────
// CoinGecko ID Mapping (Chains & Tokens)
// ─────────────────────────────────────────────
const COINGECKO_IDS: Record<string, string> = {
  "ethereum-mainnet": "ethereum",
  "blockdag-mainnet": "blockdag",
  "polygon-mainnet": "polygon-ecosystem-token", // Polygon native token price often tracked via MATIC or POL
  "bnb-mainnet": "binancecoin",
  USDT: "tether",
  USDC: "usd-coin",
};

// ─────────────────────────────────────────────
// Price Data Interface
// ─────────────────────────────────────────────
interface PriceData {
  usd: number;
  idr: number;
  change24h: number;
  lastUpdated: number;
}

// ─────────────────────────────────────────────
// Asset Display Interface
// ─────────────────────────────────────────────
interface DisplayAsset {
  id: string;
  chainId: string;
  name: string;
  symbol: string;
  balance: string;
  isNative: boolean;
  tokenConfig?: TokenConfig;
}

// ─────────────────────────────────────────────
// Balance History Snapshot Interface
// ─────────────────────────────────────────────
interface BalanceSnapshot {
  totalFiat: number;
  timestamp: number;
}

// ─────────────────────────────────────────────
// Helper: Format balance dengan presisi adaptif
// Jika balance < 0.00001 tampilkan "< 0.00001"
// Jika balance >= 0.00001 tampilkan 4 desimal
// ─────────────────────────────────────────────
const formatBalance = (balanceStr: string, symbol: string): string => {
  const val = parseFloat(balanceStr);
  if (isNaN(val)) return `0.0000 ${symbol}`;
  if (val > 0 && val < 0.00001) return `< 0.00001 ${symbol}`;
  return `${val.toFixed(4)} ${symbol}`;
};

// ─────────────────────────────────────────────
// Skeleton Pulse Item
// ─────────────────────────────────────────────
function SkeletonAssetRow({ isDarkMode }: { isDarkMode: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const skeletonBg = isDarkMode ? "#2a2a2a" : "#e0e0e0";

  return (
    <Animated.View style={[styles.assetRow, { opacity: pulseAnim }]}>
      <View style={[styles.skeletonCircle, { backgroundColor: skeletonBg }]} />
      <View style={styles.assetInfo}>
        <View
          style={[
            styles.skeletonLine,
            { width: "55%", marginBottom: 8, backgroundColor: skeletonBg },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: "38%", height: 11, backgroundColor: skeletonBg },
          ]}
        />
      </View>
      <View style={styles.assetRight}>
        <View
          style={[
            styles.skeletonLine,
            { width: 90, marginBottom: 8, backgroundColor: skeletonBg },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: 70, height: 11, backgroundColor: skeletonBg },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// Komponen Icon dengan Network Badge
// ─────────────────────────────────────────────
function AssetIcon({
  symbol,
  chainId,
  isNative,
}: {
  symbol: string;
  chainId: string;
  isNative: boolean;
}) {
  let mainSource = LOCAL_ICON_MAP[symbol];
  if (!mainSource) {
    mainSource = LOCAL_ICON_MAP[chainId];
  }

  const showBadge = !isNative;
  const badgeSource = NETWORK_BADGE_ICON[chainId];

  return (
    <View style={styles.assetIconContainer}>
      <View style={styles.assetIcon}>
        {mainSource ? (
          <Image
            source={mainSource}
            style={{
              width: 40,
              height: 40,
              resizeMode: "contain",
              borderRadius: 20,
            }}
          />
        ) : (
          <View style={[styles.fallbackIcon, { backgroundColor: "#627EEA18" }]}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#627EEA" }}>
              {symbol.charAt(0)}
            </Text>
          </View>
        )}
      </View>

      {showBadge && badgeSource && (
        <View style={styles.networkBadge}>
          <Image
            source={badgeSource}
            style={{
              width: 16,
              height: 16,
              resizeMode: "contain",
              borderRadius: 8,
            }}
          />
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Quick Action Button (Inside Card)
// ─────────────────────────────────────────────
function QuickActionCard({
  Icon,
  onPress,
}: {
  Icon: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.qaCardBtn}
    >
      <Icon size={22} color="#fff" strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Wallet Address Display with Copy Button
// ─────────────────────────────────────────────
function WalletAddressBar({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const truncated =
    address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TouchableOpacity
      style={styles.walletAddressBar}
      onPress={handleCopy}
      activeOpacity={0.7}
    >
      <Text style={styles.walletAddressText}>{truncated}</Text>
      {copied ? (
        <Check size={13} color="#7ed957" strokeWidth={2.5} />
      ) : (
        <Copy size={13} color="rgba(255,255,255,0.75)" strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const { walletAddress, isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [displayAssets, setDisplayAssets] = useState<DisplayAsset[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [activeChainId, setActiveChainId] =
    useState<ChainId>("ethereum-mainnet");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<"crypto" | "network">("crypto");

  // State for Modals
  const [showNetworkSheet, setShowNetworkSheet] = useState(false);
  const [showAssetSheet, setShowAssetSheet] = useState(false); // New state for Asset Sheet
  const [showTestnetAlert, setShowTestnetAlert] = useState(false);

  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  // State untuk menyimpan history saldo (untuk kalkulasi PnL personal)
  const [balanceHistory, setBalanceHistory] = useState<BalanceSnapshot[]>([]);

  // State for Enabled Networks
  const [enabledNetworks, setEnabledNetworks] = useState<
    Record<string, boolean>
  >(
    SUPPORTED_CHAINS.reduce((acc, chain) => ({ ...acc, [chain.id]: true }), {}),
  );

  // State for Enabled Assets (by ID) - Default all true
  const [enabledAssets, setEnabledAssets] = useState<Record<string, boolean>>(
    {},
  );

  // State for Network Search
  const [networkSearch, setNetworkSearch] = useState("");

  const activeChainConfig =
    SUPPORTED_CHAINS.find((c) => c.id === activeChainId) || SUPPORTED_CHAINS[0];

  // Initialize enabledAssets when displayAssets changes
  useEffect(() => {
    if (displayAssets.length > 0) {
      setEnabledAssets((prev) => {
        const next = { ...prev };
        displayAssets.forEach((asset) => {
          if (next[asset.id] === undefined) {
            next[asset.id] = true; // Default to visible
          }
        });
        return next;
      });
    }
  }, [displayAssets]);

  // ─── Hitung Total Balance Fiat (IDR) Kumulatif Semua Aset (mainnet only) ───
  const totalFiat = displayAssets.reduce((sum, asset) => {
    // Only count if enabled and not testnet
    if (!enabledAssets[asset.id]) return sum;
    if (isTestnet(asset.chainId)) return sum;

    const priceKey = asset.isNative ? asset.chainId : asset.symbol;
    const priceIDR = prices[priceKey]?.idr || 0;
    return sum + parseFloat(asset.balance || "0") * priceIDR;
  }, 0);

  // ─── Kalkulasi % Perubahan Kumulatif Berdasarkan Market change24h ───
  // Bobot tiap aset = nilai fiat-nya, perubahan = change24h masing-masing aset
  // Hasil: persentase perubahan portfolio secara kumulatif (weighted average)
  const { portfolioChangePercent, totalFiatChange } = (() => {
    let weightedChangeSum = 0;
    let totalWeight = 0;

    displayAssets.forEach((asset) => {
      if (!enabledAssets[asset.id]) return;
      if (isTestnet(asset.chainId)) return;

      const priceKey = asset.isNative ? asset.chainId : asset.symbol;
      const priceData = prices[priceKey];
      if (!priceData) return;

      const assetFiat = parseFloat(asset.balance || "0") * priceData.idr;
      if (assetFiat <= 0) return;

      weightedChangeSum += assetFiat * priceData.change24h;
      totalWeight += assetFiat;
    });

    const pct = totalWeight > 0 ? weightedChangeSum / totalWeight : 0;
    // Hitung perubahan absolut IDR dari persentase tertimbang
    const absChange = totalFiat * (pct / 100);

    return { portfolioChangePercent: pct, totalFiatChange: absChange };
  })();

  const isPortfolioUp = portfolioChangePercent >= 0;

  // ─── Format IDR ───
  const formatIDR = (val: number) => {
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
    return `IDR ${formatted}`;
  };

  const formatIDRCompact = (val: number) => {
    if (isBalanceHidden) return "IDR ****";
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
    return `IDR ${formatted}`;
  };

  // ─────────────────────────────────────────────
  // fetchPrices
  // ─────────────────────────────────────────────
  const fetchPrices = useCallback(async () => {
    try {
      const ids = Object.values(COINGECKO_IDS).join(",");
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,idr&include_24hr_change=true`,
      );
      const data = await response.json();
      const newPrices: Record<string, PriceData> = {};

      Object.entries(COINGECKO_IDS).forEach(([key, cgId]) => {
        if (data[cgId]) {
          newPrices[key] = {
            usd: data[cgId].usd ?? 0,
            idr: data[cgId].idr ?? 0,
            change24h: data[cgId].usd_24h_change ?? 0,
            lastUpdated: Date.now(),
          };
        }
      });
      setPrices(newPrices);
    } catch (error) {
      console.warn("Failed to fetch prices:", error);
    }
  }, []);

  // ─────────────────────────────────────────────
  // fetchAllBalances
  // ─────────────────────────────────────────────
  const fetchAllBalances = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoading(true);

    // Reset provider cache agar tidak pakai koneksi lama yang stale/rusak
    BlockchainService.resetProviders();

    const newAssets: DisplayAsset[] = [];

    try {
      await Promise.all(
        SUPPORTED_CHAINS.map(async (chain) => {
          // Skip chain yang RPC-nya tidak tersedia
          if (chain.disabled) {
            console.log(
              `⏭️ [${chain.id}] dilewati: ${chain.disabledReason ?? "disabled"}`,
            );
            return;
          }

          // ── Native Balance ──
          let nativeBal = "0.0000";
          try {
            nativeBal = await BlockchainService.getBalance(
              chain.id as ChainId,
              walletAddress,
            );
            console.log(
              `✅ [${chain.id}] native: ${nativeBal} ${chain.symbol}`,
            );
          } catch (e: any) {
            console.error(`❌ [${chain.id}] native FAILED: ${e?.message ?? e}`);
          }

          newAssets.push({
            id: `${chain.id}-native`,
            chainId: chain.id,
            name: chain.name.split(" ")[0],
            symbol: chain.symbol,
            balance: nativeBal,
            isNative: true,
          });

          // ── Token Balances ──
          if (chain.tokens && chain.tokens.length > 0) {
            await Promise.all(
              chain.tokens.map(async (token) => {
                let tokenBal = "0.0000";
                try {
                  tokenBal = await BlockchainService.getTokenBalance(
                    chain.id as ChainId,
                    walletAddress,
                    token.address,
                    token.decimals,
                  );
                  console.log(`✅ [${chain.id}] ${token.symbol}: ${tokenBal}`);
                } catch (e: any) {
                  console.error(
                    `❌ [${chain.id}] ${token.symbol} FAILED: ${e?.message ?? e}`,
                  );
                }

                newAssets.push({
                  id: `${chain.id}-${token.symbol}`,
                  chainId: chain.id,
                  name: token.name,
                  symbol: token.symbol,
                  balance: tokenBal,
                  isNative: false,
                  tokenConfig: token,
                });
              }),
            );
          }
        }),
      );
      setDisplayAssets(newAssets);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [walletAddress]);

  const fetchAllData = useCallback(async () => {
    await Promise.all([fetchPrices(), fetchAllBalances()]);
  }, [fetchPrices, fetchAllBalances]);

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData]),
  );

  useEffect(() => {
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const toggleNetwork = (chainId: string) => {
    setEnabledNetworks((prev) => ({
      ...prev,
      [chainId]: !prev[chainId],
    }));
  };

  const toggleAssetVisibility = (assetId: string) => {
    setEnabledAssets((prev) => ({
      ...prev,
      [assetId]: !prev[assetId],
    }));
  };

  const handleAssetPress = (asset: DisplayAsset) => {
    if (isTestnet(asset.chainId)) {
      setShowTestnetAlert(true);
    } else {
      const cgId = COINGECKO_IDS[asset.isNative ? asset.chainId : asset.symbol];
      if (cgId) {
        router.push({
          pathname: "/coin-detail",
          params: { coinId: cgId, symbol: asset.symbol, name: asset.name },
        });
      } else {
        setActiveChainId(asset.chainId as ChainId);
      }
    }
  };

  const SKELETON_COUNT = 4;

  if (!walletAddress) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>
          Wallet not setup yet.
        </Text>
      </View>
    );
  }

  // Filter assets for display based on enabled state
  const visibleAssets = displayAssets.filter(
    (asset) => enabledAssets[asset.id],
  );

  // Sort assets: Highest Fiat Value first
  const sortedVisibleAssets = [...visibleAssets].sort((a, b) => {
    const isTestA = isTestnet(a.chainId);
    const isTestB = isTestnet(b.chainId);

    // Calculate Fiat Value for A
    const priceKeyA = a.isNative ? a.chainId : a.symbol;
    const priceDataA = prices[priceKeyA];
    const valueA = isTestA
      ? 0
      : parseFloat(a.balance || "0") * (priceDataA?.idr || 0);

    // Calculate Fiat Value for B
    const priceKeyB = b.isNative ? b.chainId : b.symbol;
    const priceDataB = prices[priceKeyB];
    const valueB = isTestB
      ? 0
      : parseFloat(b.balance || "0") * (priceDataB?.idr || 0);

    // Sort descending (Highest first)
    return valueB - valueA;
  });

  // Filter networks for list based on search
  const filteredNetworks = SUPPORTED_CHAINS.filter(
    (chain) =>
      chain.name.toLowerCase().includes(networkSearch.toLowerCase()) ||
      chain.symbol.toLowerCase().includes(networkSearch.toLowerCase()),
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <HomeHeader
        onSettingsPress={() => router.push("/settings")}
        onScanPress={() => router.push("/scan")}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* ── Balance Card ── */}
        <View style={styles.balanceCardContainer}>
          <ImageBackground
            source={require("../../assets/bg-balance.png")}
            style={styles.balanceCard}
            resizeMode="cover"
            imageStyle={{ borderRadius: 24 }}
          >
            <View style={styles.cardContent}>
              {/* Header: Address & Toggle Eye */}
              <View style={styles.cardHeaderRow}>
                <WalletAddressBar address={walletAddress} />
                <TouchableOpacity
                  onPress={() => setIsBalanceHidden(!isBalanceHidden)}
                  style={styles.eyeButton}
                >
                  {isBalanceHidden ? (
                    <EyeOff size={20} color="rgba(255,255,255,0.8)" />
                  ) : (
                    <Eye size={20} color="rgba(255,255,255,0.8)" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Center block: Balance + change */}
              <View style={styles.balanceCenterBlock}>
                <Text style={styles.balanceAmount}>
                  {isLoading && !refreshing
                    ? "..."
                    : formatIDRCompact(totalFiat)}
                </Text>

                <View style={styles.changeRow}>
                  <Text
                    style={[
                      styles.changeAbsolute,
                      { color: "rgba(255,255,255,0.85)" },
                    ]}
                  >
                    {isBalanceHidden ? (
                      "****"
                    ) : (
                      <>
                        {isPortfolioUp ? "+" : ""}
                        {new Intl.NumberFormat("id-ID", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(totalFiatChange)}
                      </>
                    )}
                  </Text>
                  <View
                    style={[
                      styles.changeBadge,
                      {
                        backgroundColor: isPortfolioUp
                          ? "rgba(126,217,87,0.25)"
                          : "rgba(255,49,49,0.25)",
                        borderColor: isPortfolioUp ? "#7ed957" : "#ff3131",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.changeBadgeText,
                        { color: isPortfolioUp ? "#7ed957" : "#ff3131" },
                      ]}
                    >
                      {isPortfolioUp ? "↑" : "↓"}{" "}
                      {Math.abs(portfolioChangePercent).toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <QuickActionCard
                  Icon={ArrowUpRight}
                  onPress={() =>
                    router.push({
                      pathname: "/send",
                      params: { chainId: activeChainId },
                    })
                  }
                />
                <QuickActionCard
                  Icon={ArrowDownLeft}
                  onPress={() => router.push("/receive")}
                />
                <QuickActionCard
                  Icon={Repeat2}
                  onPress={() => router.push("/swap")}
                />
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* ── TABS: Crypto & Network ── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "crypto" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("crypto")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "crypto"
                  ? styles.tabTextActive
                  : { color: theme.textSecondary },
              ]}
            >
              Crypto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "network" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("network")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "network"
                  ? styles.tabTextActive
                  : { color: theme.textSecondary },
              ]}
            >
              Network
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Content Based on Active Tab ── */}
        {activeTab === "crypto" ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Assets
              </Text>
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => setShowAssetSheet(true)}
              >
                <Text style={[styles.manageBtnText, { color: theme.text }]}>
                  Manage
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Skeleton Loading atau Asset List ── */}
            {isLoading && !refreshing ? (
              Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <SkeletonAssetRow
                  key={`skeleton-${i}`}
                  isDarkMode={isDarkMode}
                />
              ))
            ) : (
              <>
                {sortedVisibleAssets.map((asset) => {
                  // Additional check: if network is disabled, don't show even if asset is enabled
                  if (!enabledNetworks[asset.chainId]) return null;

                  const bal = parseFloat(asset.balance);

                  // Untuk testnet: sembunyikan jika saldo benar-benar 0
                  // Jika ada saldo (walau sangat kecil), tetap tampilkan
                  if (isTestnet(asset.chainId) && bal === 0) return null;

                  // Untuk mainnet: sembunyikan jika saldo 0 dan tidak punya harga
                  // (aset seperti USDT/USDC yang 0 tetap muncul karena punya harga)
                  const priceKey = asset.isNative
                    ? asset.chainId
                    : asset.symbol;
                  const priceData = prices[priceKey];
                  const isTest = isTestnet(asset.chainId);
                  const displayPriceData = isTest ? null : priceData;

                  // Sembunyikan aset mainnet yang saldo 0 dan tidak ada harga market
                  if (!isTest && bal === 0 && !displayPriceData) return null;

                  const assetFiatVal = isTest
                    ? 0
                    : bal * (displayPriceData?.idr || 0);

                  const unitPriceIDR = displayPriceData?.idr || 0;

                  const isUp = displayPriceData
                    ? displayPriceData.change24h >= 0
                    : true;
                  const clr = isUp ? "#7ed957" : "#ff3131";

                  return (
                    <TouchableOpacity
                      key={asset.id}
                      activeOpacity={0.7}
                      onPress={() => handleAssetPress(asset)}
                      style={[styles.assetRow]}
                    >
                      <AssetIcon
                        symbol={asset.symbol}
                        chainId={asset.chainId}
                        isNative={asset.isNative}
                      />

                      <View style={styles.assetInfo}>
                        <Text style={[styles.assetName, { color: theme.text }]}>
                          {asset.name}
                        </Text>
                        <Text
                          style={[
                            styles.assetSub,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {formatBalance(asset.balance, asset.symbol)}
                        </Text>
                      </View>

                      <View style={styles.assetRight}>
                        <Text
                          style={[
                            styles.assetTotalValue,
                            { color: theme.text },
                          ]}
                        >
                          {isBalanceHidden ? "****" : formatIDR(assetFiatVal)}
                        </Text>

                        {displayPriceData ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Text
                              style={[
                                styles.assetUnitPrice,
                                { color: theme.textSecondary },
                              ]}
                            >
                              {formatIDR(unitPriceIDR)}
                            </Text>
                            <Text
                              style={[styles.assetChangeText, { color: clr }]}
                            >
                              {isUp ? "+" : ""}
                              {displayPriceData.change24h.toFixed(2)}%
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.assetUnitPrice,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Testnet
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {sortedVisibleAssets.filter(
                  (a) =>
                    enabledNetworks[a.chainId] &&
                    !(isTestnet(a.chainId) && parseFloat(a.balance) === 0),
                ).length === 0 && (
                  <View style={{ alignItems: "center", marginTop: 40 }}>
                    <Text style={{ color: theme.textSecondary }}>
                      No assets found.
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <View style={styles.networkPreviewContainer}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text, marginBottom: 12 },
              ]}
            >
              Manage Networks
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                marginBottom: 20,
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Enable or disable networks you want to see in your wallet.
            </Text>

            <TouchableOpacity
              style={styles.openNetworkSheetBtn}
              onPress={() => setShowNetworkSheet(true)}
            >
              <Text
                style={[styles.openNetworkSheetText, { color: theme.text }]}
              >
                Open Network Settings
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Asset Management Bottom Sheet (NEW) ── */}
      <Modal
        visible={showAssetSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssetSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowAssetSheet(false)}
          />
          <View style={[styles.sheetContent, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHandle} />

            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              Manage Assets
            </Text>

            <ScrollView style={styles.sheetList}>
              {displayAssets.length === 0 ? (
                <Text
                  style={{ textAlign: "center", color: theme.textSecondary }}
                >
                  Loading assets...
                </Text>
              ) : (
                displayAssets.map((asset) => {
                  const isEnabled = enabledAssets[asset.id];
                  return (
                    <View key={asset.id} style={styles.networkRow}>
                      <View style={styles.networkRowLeft}>
                        <AssetIcon
                          symbol={asset.symbol}
                          chainId={asset.chainId}
                          isNative={asset.isNative}
                        />
                        <View style={styles.networkInfo}>
                          <Text
                            style={[styles.networkName, { color: theme.text }]}
                          >
                            {asset.name}
                          </Text>
                          <Text
                            style={[
                              styles.networkSymbol,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {asset.symbol} •{" "}
                            {asset.chainId.replace("-mainnet", "")}
                          </Text>
                        </View>
                      </View>

                      <Switch
                        value={isEnabled}
                        onValueChange={() => toggleAssetVisibility(asset.id)}
                        trackColor={{
                          false: "#767577",
                          true: theme.primary + "80",
                        }}
                        thumbColor={isEnabled ? theme.primary : "#f4f3f4"}
                        ios_backgroundColor="#3e3e3e"
                      />
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeSheetBtn]}
              onPress={() => setShowAssetSheet(false)}
            >
              <Text style={[styles.closeSheetText]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Network Bottom Sheet ── */}
      <Modal
        visible={showNetworkSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNetworkSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowNetworkSheet(false)}
          />
          <View style={[styles.sheetContent, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHandle} />

            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              Network Settings
            </Text>

            {/* Search Network Input */}
            <View style={styles.searchContainer}>
              <Search
                size={18}
                color={theme.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: theme.text, backgroundColor: theme.card },
                ]}
                placeholder="Search network..."
                placeholderTextColor={theme.textSecondary}
                value={networkSearch}
                onChangeText={setNetworkSearch}
              />
              {networkSearch.length > 0 && (
                <TouchableOpacity onPress={() => setNetworkSearch("")}>
                  <X size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.sheetList}>
              {filteredNetworks.map((chain) => {
                const isEnabled = enabledNetworks[chain.id];
                const isDisabled = chain.disabled === true;
                return (
                  <View
                    key={chain.id}
                    style={[styles.networkRow, isDisabled && { opacity: 0.45 }]}
                  >
                    <View style={styles.networkRowLeft}>
                      <AssetIcon
                        symbol={chain.symbol}
                        chainId={chain.id}
                        isNative={true}
                      />
                      <View style={styles.networkInfo}>
                        <Text
                          style={[styles.networkName, { color: theme.text }]}
                        >
                          {chain.name}
                        </Text>
                        <Text
                          style={[
                            styles.networkSymbol,
                            {
                              color: isDisabled
                                ? "#ff9500"
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {isDisabled
                            ? (chain.disabledReason ?? "Tidak tersedia")
                            : chain.symbol}
                        </Text>
                      </View>
                    </View>

                    <Switch
                      value={isDisabled ? false : isEnabled}
                      onValueChange={() => {
                        if (!isDisabled) toggleNetwork(chain.id);
                      }}
                      disabled={isDisabled}
                      trackColor={{
                        false: "#767577",
                        true: theme.primary + "80",
                      }}
                      thumbColor={
                        isDisabled
                          ? "#cccccc"
                          : isEnabled
                            ? theme.primary
                            : "#f4f3f4"
                      }
                      ios_backgroundColor="#3e3e3e"
                    />
                  </View>
                );
              })}
              {filteredNetworks.length === 0 && (
                <Text
                  style={{
                    textAlign: "center",
                    color: theme.textSecondary,
                    marginTop: 20,
                  }}
                >
                  No networks found.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeSheetBtn]}
              onPress={() => setShowNetworkSheet(false)}
            >
              <Text style={[styles.closeSheetText]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Testnet Alert Modal ── */}
      <Modal
        visible={showTestnetAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTestnetAlert(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={[styles.alertBox, { backgroundColor: theme.card }]}>
            <View style={styles.alertIconContainer}>
              <AlertTriangle size={32} color="#F59E0B" strokeWidth={2} />
            </View>

            <Text style={[styles.alertTitle, { color: theme.text }]}>
              Testnet Asset
            </Text>

            <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>
              This token is on a test network. It has no real-world value and
              market charts are not available.
            </Text>

            <TouchableOpacity
              style={[styles.alertButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowTestnetAlert(false)}
            >
              <Text style={styles.alertButtonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingTop: 10,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Balance Card ──
  balanceCardContainer: {
    marginBottom: 24,
  },
  balanceCard: {
    width: "100%",
    height: 320,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  cardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  // ── Balance center block ──
  balanceCenterBlock: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  eyeButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },

  walletAddressBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  walletAddressText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 0.3,
  },

  balanceAmount: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "600",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    textAlign: "center",
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  changeAbsolute: {
    fontSize: 13,
    fontWeight: "500",
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  qaCardBtn: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // ── Tabs ──
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(128,128,128,0.1)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#000",
  },

  // ── Network Preview ──
  networkPreviewContainer: {
    padding: 16,
    alignItems: "center",
  },
  openNetworkSheetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.3)",
    borderRadius: 999,
  },
  openNetworkSheetText: {
    fontWeight: "600",
    fontSize: 14,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  manageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },

  // ── Asset Row ──
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    marginBottom: 8,
  },

  assetIconContainer: {
    marginRight: 12,
    position: "relative",
  },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallbackIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  networkBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
    zIndex: 10,
  },

  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  assetSub: {
    fontSize: 12,
    fontWeight: "500",
  },

  assetRight: {
    alignItems: "flex-end",
    minWidth: 100,
  },
  assetTotalValue: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  assetUnitPrice: {
    fontSize: 12,
    fontWeight: "500",
  },
  assetChangeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Skeleton Styles ──
  skeletonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  skeletonLine: {
    height: 13,
    borderRadius: 6,
  },

  // ── Bottom Sheet Styles ──
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "95%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(128,128,128,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  sheetList: {
    marginBottom: 20,
  },
  networkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  networkRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  networkInfo: {
    marginLeft: 12,
    flex: 1,
  },
  networkName: {
    fontSize: 15,
    fontWeight: "600",
  },
  networkSymbol: {
    fontSize: 13,
    marginTop: 2,
  },
  closeSheetBtn: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#5573ef",
  },
  closeSheetText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // ── Search Input Styles ──
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.2)",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 40,
  },

  // ── Alert Modal Styles ──
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertBox: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  alertIconContainer: {
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  alertButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: "100%",
    alignItems: "center",
  },
  alertButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
