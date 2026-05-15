// app/(tabs)/index.tsx
import { SUPPORTED_CHAINS } from "@/config/chains";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Copy,
  Repeat2
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

const { width: W } = Dimensions.get("window");

const COLOR_UP = "#7ed957";
const COLOR_DOWN = "#ff3131";

// ─────────────────────────────────────────────
// Helper: Mapping Icon Lokal
// ─────────────────────────────────────────────
const LOCAL_ICON_MAP: Record<string, any> = {
  "ethereum-mainnet": require("../../assets/chains/eth.png"),
  "blockdag-mainnet": require("../../assets/chains/bdag.png"),
};

// ─────────────────────────────────────────────
// CoinGecko ID Mapping
// ─────────────────────────────────────────────
const COINGECKO_IDS: Record<string, string> = {
  "ethereum-mainnet": "ethereum",
  "blockdag-mainnet": "blockdag",
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
// Komponen Icon Chain
// ─────────────────────────────────────────────
function ChainIcon({ chainId, symbol }: { chainId: string; symbol: string }) {
  const source = LOCAL_ICON_MAP[chainId];
  if (source) {
    return (
      <View style={styles.assetIcon}>
        <Image
          source={source}
          style={{
            width: 40,
            height: 40,
            resizeMode: "contain",
            borderRadius: 20,
          }}
        />
      </View>
    );
  }
  let bgColor = "#627EEA18";
  let textColor = "#627EEA";
  let initial = symbol.charAt(0);
  if (symbol.includes("BDAG")) {
    bgColor = "#F59E0B18";
    textColor = "#F59E0B";
    initial = "BD";
  }
  return (
    <View style={[styles.assetIcon, { backgroundColor: bgColor }]}>
      <Text style={{ fontSize: 12, fontWeight: "800", color: textColor }}>
        {initial}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Mini Sparkline Chart
// ─────────────────────────────────────────────
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const W = 56;
  const H = 26;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Svg width={W} height={H} style={{ overflow: "visible" }}>
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

  const [balances, setBalances] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [chartData, setChartData] = useState<number[]>([]);
  const [activeChainId, setActiveChainId] =
    useState<ChainId>("ethereum-mainnet");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  const activeChainConfig =
    SUPPORTED_CHAINS.find((c) => c.id === activeChainId) || SUPPORTED_CHAINS[0];

  const currentBalanceRaw = parseFloat(balances[activeChainId] || "0");
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
      Object.entries(COINGECKO_IDS).forEach(([chainId, cgId]) => {
        if (data[cgId]) {
          newPrices[chainId] = {
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
    const newBalances: Record<string, string> = { ...balances };
    try {
      await Promise.all(
        SUPPORTED_CHAINS.map(async (chain) => {
          try {
            const bal = await BlockchainService.getBalance(
              chain.id as ChainId,
              walletAddress,
            );
            newBalances[chain.id] = bal;
          } catch {
            if (!newBalances[chain.id]) newBalances[chain.id] = "0.0000";
          }
        }),
      );
      setBalances(newBalances);
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

  if (!walletAddress) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>
          Wallet belum di-setup.
        </Text>
      </View>
    );
  }

  const portfolioChange = prices[activeChainId]?.change24h || 0;
  const isPortfolioUp = portfolioChange >= 0;
  const chartColor = isPortfolioUp ? COLOR_UP : COLOR_DOWN;

  // Formatted change values for display under balance
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
            {/* Soft dark overlay */}
            <View style={styles.cardOverlay} />

            <View style={styles.cardContent}>
              {/* Wallet Address Bar — top center (REPLACED Network Selector) */}
              <WalletAddressBar address={walletAddress} />

              {/* Chart */}
              <View style={styles.chartArea}>
                {chartData.length > 1 ? (
                  <BalanceChart data={chartData} color="#fff" />
                ) : (
                  <Text style={styles.emptyChartText}>~ ~ ~</Text>
                )}
              </View>

              {/* Balance Amount */}
              <Text style={styles.balanceAmount}>
                {isLoading && !refreshing ? "..." : formatIDRCompact(totalFiat)}
              </Text>

              {/* Change Row */}
              <View style={styles.changeRow}>
                <Text
                  style={[
                    styles.changeAbsolute,
                    { color: "rgba(255,255,255,0.85)" },
                  ]}
                >
                  {isPortfolioUp ? "+" : ""}
                  {new Intl.NumberFormat("id-ID", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(totalFiatChange)}
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

              {/* Quick Actions Row — bottom of card */}
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
                  Icon={ArrowDownToLine}
                  onPress={() => router.push("/receive")}
                />
                <QuickActionCard Icon={Repeat2} onPress={() => {}} />
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* ── Assets Section Header ── */}
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

        {/* ── Token List ── */}
        {SUPPORTED_CHAINS.map((chain) => {
          const bal = balances[chain.id] || "0.0000";
          const isActive = chain.id === activeChainId;
          const priceData = prices[chain.id];
          const isUp = priceData ? priceData.change24h >= 0 : true;
          const clr = isUp ? COLOR_UP : COLOR_DOWN;
          const assetFiatVal = parseFloat(bal) * (priceData?.price || 0);

          // Sparkline data (reuse chartData only for active chain, else empty placeholder)
          const sparkData = chain.id === activeChainId ? chartData : [];

          return (
            <TouchableOpacity
              key={chain.id}
              activeOpacity={0.7}
              onPress={() => {
                const cgId = COINGECKO_IDS[chain.id];
                if (cgId) {
                  router.push({
                    pathname: "/coin-detail",
                    params: { coinId: cgId },
                  });
                } else {
                  setActiveChainId(chain.id as ChainId);
                }
              }}
              style={[styles.assetRow]}
            >
              {/* Icon */}
              <ChainIcon chainId={chain.id} symbol={chain.symbol} />

              {/* Name & Balance */}
              <View style={styles.assetInfo}>
                <Text style={[styles.assetName, { color: theme.text }]}>
                  {chain.name.split(" ")[0]}
                </Text>
                <Text style={[styles.assetSub, { color: theme.textSecondary }]}>
                  {bal} {chain.symbol}
                </Text>
              </View>

              {/* Sparkline */}
              <View style={styles.sparklineArea}>
                {sparkData.length > 1 ? (
                  <MiniSparkline data={sparkData} color={clr} />
                ) : (
                  <View style={{ width: 56, height: 26 }} />
                )}
              </View>

              {/* Price & Change */}
              <View style={styles.assetRight}>
                {priceData ? (
                  <Text style={[styles.assetChangeText, { color: clr }]}>
                    {isUp ? "+" : ""}
                    {priceData.change24h.toFixed(0)}%
                  </Text>
                ) : (
                  <ActivityIndicator size="small" color={theme.primary} />
                )}
                <Text style={[styles.assetFiat, { color: theme.text }]}>
                  {formatIDRCompact(assetFiatVal)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Network Selection Modal ── */}
      <Modal
        visible={showNetworkModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNetworkModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNetworkModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Pilih Jaringan
            </Text>
            {SUPPORTED_CHAINS.map((chain) => {
              const isSelected = chain.id === activeChainId;
              return (
                <TouchableOpacity
                  key={chain.id}
                  style={[
                    styles.networkOption,
                    isSelected && { backgroundColor: theme.primary + "10" },
                  ]}
                  onPress={() => {
                    setActiveChainId(chain.id as ChainId);
                    setShowNetworkModal(false);
                  }}
                >
                  <ChainIcon chainId={chain.id} symbol={chain.symbol} />
                  <View style={styles.networkInfo}>
                    <Text style={[styles.networkName, { color: theme.text }]}>
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
                  {isSelected && (
                    <Check size={20} color={theme.primary} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
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
    // backgroundColor: "rgba(0,0,0,0.25)",
    // borderRadius: 24,
  },
  cardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  // ── Wallet Address Bar (REPLACES networkSelector) ──
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
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
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

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: W * 0.85,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  networkOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  networkInfo: {
    flex: 1,
    marginLeft: 12,
  },
  networkName: {
    fontSize: 15,
    fontWeight: "600",
  },
  networkSymbol: {
    fontSize: 13,
    marginTop: 2,
  },
});
