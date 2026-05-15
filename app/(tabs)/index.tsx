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
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

const { width: W, height: H } = Dimensions.get("window");

const COLOR_UP = "#7ed957";
const COLOR_DOWN = "#ff3131";

// ─────────────────────────────────────────────
// Helper: Detect Testnet
// ─────────────────────────────────────────────
const isTestnet = (id: string) => {
  return id.includes("testnet") || id.includes("sepolia");
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

  // Tokens
  USDT: require("../../assets/coins/usdt.png"),
  USDC: require("../../assets/coins/usdc.png"),
};

// Icon Kecil untuk Badge Network
const NETWORK_BADGE_ICON: Record<string, any> = {
  "ethereum-mainnet": require("../../assets/chains/eth-symbol.webp"),
  "ethereum-sepolia": require("../../assets/chains/eth-symbol.webp"),
  // Fallback jika badge lain belum ada
};

// ─────────────────────────────────────────────
// CoinGecko ID Mapping (Chains & Tokens)
// ─────────────────────────────────────────────
const COINGECKO_IDS: Record<string, string> = {
  "ethereum-mainnet": "ethereum",
  "blockdag-mainnet": "blockdag",
  USDT: "tether",
  USDC: "usd-coin",
};

// ─────────────────────────────────────────────
// Price Data Interface
// ─────────────────────────────────────────────
interface PriceData {
  price: number;
  change24h: number;
  lastUpdated: number;
}

// ─────────────────────────────────────────────
// Asset Display Interface
// ─────────────────────────────────────────────
interface DisplayAsset {
  id: string; // Unique ID
  chainId: string;
  name: string;
  symbol: string;
  balance: string;
  isNative: boolean;
  tokenConfig?: TokenConfig;
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
  // Tentukan source icon utama
  let mainSource = LOCAL_ICON_MAP[symbol]; // Coba cari berdasarkan symbol (untuk token)
  if (!mainSource) {
    mainSource = LOCAL_ICON_MAP[chainId]; // Fallback ke icon chain (untuk native)
  }

  // Tentukan source badge network
  const showBadge = !isNative;
  const badgeSource = NETWORK_BADGE_ICON[chainId];

  return (
    <View style={styles.assetIconContainer}>
      {/* Main Icon */}
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

      {/* Network Badge (Small Icon at Bottom Right) */}
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
// Mini Sparkline Chart
// ─────────────────────────────────────────────
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const W_CHART = 56;
  const H_CHART = 26;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W_CHART;
      const y = H_CHART - ((v - min) / range) * H_CHART;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Svg width={W_CHART} height={H_CHART} style={{ overflow: "visible" }}>
      <Polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────
// Large Balance Chart (inside card)
// ─────────────────────────────────────────────
function BalanceChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const CW = W - 230;
  const CH = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * CW;
      const y = CH - ((v - min) / range) * CH;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Svg width={CW} height={CH} style={{ overflow: "visible" }}>
      <Polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
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
  const [chartData, setChartData] = useState<number[]>([]);
  const [activeChainId, setActiveChainId] =
    useState<ChainId>("ethereum-mainnet");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // State baru untuk Tab dan Network Management
  const [activeTab, setActiveTab] = useState<"crypto" | "network">("crypto");
  const [showNetworkSheet, setShowNetworkSheet] = useState(false);

  // State untuk Modal Peringatan Testnet
  const [showTestnetAlert, setShowTestnetAlert] = useState(false);

  // ✅ State untuk Hide/Show Balance
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  // State untuk menyimpan network mana yang ON/OFF
  const [enabledNetworks, setEnabledNetworks] = useState<
    Record<string, boolean>
  >(
    SUPPORTED_CHAINS.reduce((acc, chain) => ({ ...acc, [chain.id]: true }), {}),
  );

  const activeChainConfig =
    SUPPORTED_CHAINS.find((c) => c.id === activeChainId) || SUPPORTED_CHAINS[0];

  // Hitung Total Balance Fiat (Hanya dari Native Active Chain untuk simplifikasi UI saat ini)
  const currentAsset = displayAssets.find(
    (a) => a.chainId === activeChainId && a.isNative,
  );
  const currentBalanceRaw = parseFloat(currentAsset?.balance || "0");
  const currentPrice = prices[activeChainId]?.price || 0;
  const totalFiat = currentBalanceRaw * currentPrice;

  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  const formatIDRCompact = (val: number) => {
    if (isBalanceHidden) return "IDR ****";
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
    return `IDR ${formatted}`;
  };

  const fetchPrices = useCallback(async () => {
    try {
      const ids = Object.values(COINGECKO_IDS).join(",");
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      );
      const data = await response.json();
      const newPrices: Record<string, PriceData> = {};

      // Map harga ke Key yang kita gunakan (Chain ID atau Symbol Token)
      Object.entries(COINGECKO_IDS).forEach(([key, cgId]) => {
        if (data[cgId]) {
          newPrices[key] = {
            price: data[cgId].usd,
            change24h: data[cgId].usd_24h_change || 0,
            lastUpdated: Date.now(),
          };
        }
      });
      setPrices(newPrices);
    } catch (error) {
      console.warn("Failed to fetch prices:", error);
    }
  }, []);

  const fetchChartHistory = useCallback(async () => {
    const cgId = COINGECKO_IDS[activeChainId];
    if (!cgId) {
      setChartData([]);
      return;
    }
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=1&interval=hourly`,
      );
      const data = await response.json();
      if (data.prices && Array.isArray(data.prices)) {
        setChartData(data.prices.map((p: any[]) => p[1]));
      } else {
        setChartData([]);
      }
    } catch {
      setChartData([]);
    }
  }, [activeChainId]);

  const fetchAllBalances = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoading(true);

    const newAssets: DisplayAsset[] = [];

    try {
      await Promise.all(
        SUPPORTED_CHAINS.map(async (chain) => {
          // 1. Fetch Native Balance
          try {
            const bal = await BlockchainService.getBalance(
              chain.id as ChainId,
              walletAddress,
            );
            newAssets.push({
              id: `${chain.id}-native`,
              chainId: chain.id,
              name: chain.name.split(" ")[0],
              symbol: chain.symbol,
              balance: bal,
              isNative: true,
            });
          } catch (e) {
            console.error(`Error fetching native balance for ${chain.id}`, e);
          }

          // 2. Fetch Token Balances (Jika ada)
          if (chain.tokens && chain.tokens.length > 0) {
            await Promise.all(
              chain.tokens.map(async (token) => {
                try {
                  const tokenBal = await BlockchainService.getTokenBalance(
                    chain.id as ChainId,
                    walletAddress,
                    token.address,
                    token.decimals,
                  );

                  newAssets.push({
                    id: `${chain.id}-${token.symbol}`,
                    chainId: chain.id,
                    name: token.name,
                    symbol: token.symbol,
                    balance: tokenBal,
                    isNative: false,
                    tokenConfig: token,
                  });
                } catch (e) {
                  console.error(`Error fetching token ${token.symbol}`, e);
                }
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
    await Promise.all([fetchPrices(), fetchAllBalances(), fetchChartHistory()]);
  }, [fetchPrices, fetchAllBalances, fetchChartHistory]);

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData]),
  );

  useEffect(() => {
    fetchChartHistory();
  }, [activeChainId, fetchChartHistory]);

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

  // Handler klik pada list aset
  const handleAssetPress = (asset: DisplayAsset) => {
    if (isTestnet(asset.chainId)) {
      setShowTestnetAlert(true);
    } else {
      // Logic navigasi untuk Mainnet
      const cgId = COINGECKO_IDS[asset.isNative ? asset.chainId : asset.symbol];

      if (cgId) {
        router.push({
          pathname: "/coin-detail",
          params: { coinId: cgId, symbol: asset.symbol, name: asset.name },
        });
      } else {
        // Fallback jika tidak ada ID coingecko (misal BDAG detail custom)
        setActiveChainId(asset.chainId as ChainId);
      }
    }
  };

  if (!walletAddress) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>
          Wallet not setup yet.
        </Text>
      </View>
    );
  }

  const portfolioChange = prices[activeChainId]?.change24h || 0;
  const isPortfolioUp = portfolioChange >= 0;

  const totalFiatChange = totalFiat * (portfolioChange / 100);

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
            <View style={styles.cardOverlay} />

            <View style={styles.cardContent}>
              {/* Header: Address & Toggle Eye */}
              <View style={styles.cardHeaderRow}>
                <WalletAddressBar address={walletAddress} />

                {/* ✅ Toggle Hide Balance Button */}
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

              <View style={styles.chartArea}>
                {chartData.length > 1 ? (
                  <BalanceChart data={chartData} color="#fff" />
                ) : (
                  <Text style={styles.emptyChartText}>~ ~ ~</Text>
                )}
              </View>

              <Text style={styles.balanceAmount}>
                {isLoading && !refreshing ? "..." : formatIDRCompact(totalFiat)}
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
                      borderColor: isPortfolioUp ? COLOR_UP : COLOR_DOWN,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.changeBadgeText,
                      { color: isPortfolioUp ? COLOR_UP : COLOR_DOWN },
                    ]}
                  >
                    {isPortfolioUp ? "↑" : "↓"}{" "}
                    {Math.abs(portfolioChange).toFixed(0)}%
                  </Text>
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
              <TouchableOpacity style={styles.manageBtn}>
                <Text style={[styles.manageBtnText, { color: theme.text }]}>
                  Manage
                </Text>
              </TouchableOpacity>
            </View>

            {displayAssets.map((asset) => {
              // Filter jika network dimatikan
              if (!enabledNetworks[asset.chainId]) return null;

              // Ambil harga: Key nya adalah ChainID (untuk native) atau Symbol (untuk token)
              const priceKey = asset.isNative ? asset.chainId : asset.symbol;
              const priceData = prices[priceKey];

              const isTest = isTestnet(asset.chainId);
              const displayPriceData = isTest ? null : priceData;

              const assetFiatVal = isTest
                ? 0
                : parseFloat(asset.balance) * (displayPriceData?.price || 0);

              const isUp = displayPriceData
                ? displayPriceData.change24h >= 0
                : true;
              const clr = isUp ? COLOR_UP : COLOR_DOWN;

              // ✅ Sparkline Logic Updated:
              // Tampilkan sparkline untuk SEMUA mainnet assets (USDT, USDC, BDAG, dll)
              // dengan generate dummy data berdasarkan trend 24h agar visual tetap hidup.
              let sparkData: number[] = [];

              if (!isTest) {
                if (asset.isNative && asset.chainId === activeChainId) {
                  // Gunakan data chart lengkap untuk active chain
                  sparkData = chartData;
                } else {
                  // Generate mini sparkline dummy berdasarkan % change 24h
                  // Agar USDT/USDC/BDAG punya grafik kecil yang relevan dengan tren
                  const base = 100;
                  const changePercent = displayPriceData
                    ? displayPriceData.change24h
                    : 0;
                  const endVal = base * (1 + changePercent / 100);

                  // Buat 10 titik data sederhana dari base ke endVal dengan sedikit noise
                  const points = 10;
                  for (let i = 0; i <= points; i++) {
                    const progress = i / points;
                    const linearVal = base + (endVal - base) * progress;
                    // Tambah noise acak kecil
                    const noise = (Math.random() - 0.5) * (base * 0.02);
                    sparkData.push(linearVal + noise);
                  }
                }
              }

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
                      style={[styles.assetSub, { color: theme.textSecondary }]}
                    >
                      {parseFloat(asset.balance).toFixed(4)} {asset.symbol}
                    </Text>
                  </View>

                  <View style={styles.sparklineArea}>
                    {sparkData.length > 1 ? (
                      <MiniSparkline data={sparkData} color={clr} />
                    ) : (
                      // Placeholder space agar layout rata
                      <View style={{ width: 56, height: 26 }} />
                    )}
                  </View>

                  <View style={styles.assetRight}>
                    {displayPriceData ? (
                      <Text style={[styles.assetChangeText, { color: clr }]}>
                        {isUp ? "+" : ""}
                        {displayPriceData.change24h.toFixed(2)}%
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.assetChangeText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        -
                      </Text>
                    )}
                    <Text style={[styles.assetFiat, { color: theme.text }]}>
                      {isBalanceHidden
                        ? "****"
                        : formatIDRCompact(assetFiatVal)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {displayAssets.length === 0 && !isLoading && (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <Text style={{ color: theme.textSecondary }}>
                  No assets found.
                </Text>
              </View>
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

            <ScrollView style={styles.sheetList}>
              {SUPPORTED_CHAINS.map((chain) => {
                const isEnabled = enabledNetworks[chain.id];
                return (
                  <View key={chain.id} style={styles.networkRow}>
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
                            { color: theme.textSecondary },
                          ]}
                        >
                          {chain.symbol}
                        </Text>
                      </View>
                    </View>

                    <Switch
                      value={isEnabled}
                      onValueChange={() => toggleNetwork(chain.id)}
                      trackColor={{
                        false: "#767577",
                        true: theme.primary + "80",
                      }}
                      thumbColor={isEnabled ? theme.primary : "#f4f3f4"}
                      ios_backgroundColor="#3e3e3e"
                    />
                  </View>
                );
              })}
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
    height: 340,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  cardOverlay: {
    // ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  // ✅ New Style for Header Row (Address + Eye)
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  eyeButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },

  // ── Wallet Address Bar ──
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

  chartArea: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChartText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 20,
    letterSpacing: 4,
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "600",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -4,
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
    paddingVertical: 10,
    paddingHorizontal: 1,
    borderRadius: 14,
    marginBottom: 4,
  },

  // Updated Styles for Icon with Badge
  assetIconContainer: {
    marginRight: 10,
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
    backgroundColor: "#fff", // Border putih
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
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  assetSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  sparklineArea: {
    width: 56,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  assetRight: {
    alignItems: "flex-end",
    minWidth: 90,
  },
  assetChangeText: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  assetFiat: {
    fontSize: 13,
    fontWeight: "600",
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
    maxHeight: "80%",
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
