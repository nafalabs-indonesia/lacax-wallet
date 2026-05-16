// app/coin-detail.tsx
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Repeat2,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Svg from "react-native-svg";
import { G } from "react-native-svg";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

// ─────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────
const { width } = Dimensions.get("window");
const CHART_HEIGHT = 250;
const CANDLE_WIDTH = 6;
const CANDLE_GAP = 4;

// Mapping Icon Lokal
const LOCAL_ICON_MAP: Record<string, any> = {
  ethereum: require("../assets/chains/eth.png"),
  blockdag: require("../assets/chains/bdag.png"),
  usdt: require("../assets/coins/usdt.png"),
  usdc: require("../assets/coins/usdc.png"),
};

const COINGECKO_ID_MAP: Record<string, string> = {
  ethereum: "ethereum",
  blockdag: "blockdag",
  usdt: "tether",
  usdc: "usd-coin",
};

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  description: string;
  isMockData?: boolean;
}

type TabType = "chart" | "info" | "market";

// ─────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────

// 1. Candlestick Chart Component
function CandleChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;

  // Simulasi data OHLC dari data harga linear (karena CoinGecko free tier hanya kasih 'prices')
  // Dalam produksi nyata, gunakan endpoint 'ohlc' jika tersedia atau library charting khusus
  const candles = [];
  for (let i = 0; i < data.length - 1; i++) {
    const open = data[i];
    const close = data[i + 1];
    const high = Math.max(open, close) * 1.002; // Simulasi high sedikit lebih tinggi
    const low = Math.min(open, close) * 0.998; // Simulasi low sedikit lebih rendah
    candles.push({ open, close, high, low });
  }

  const allValues = candles.flatMap((c) => [c.high, c.low]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const chartWidth = width - 40; // Padding horizontal container
  const totalCandleWidth = CANDLE_WIDTH + CANDLE_GAP;
  const numCandles = Math.floor(chartWidth / totalCandleWidth);

  // Ambil subset data terakhir agar pas di layar
  const visibleCandles = candles.slice(-numCandles);

  return (
    <Svg.Svg width={chartWidth} height={CHART_HEIGHT}>
      {/* Grid Lines (Optional) */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
        <Svg.Line
          key={i}
          x1="0"
          y1={CHART_HEIGHT * ratio}
          x2={chartWidth}
          y2={CHART_HEIGHT * ratio}
          stroke="rgba(128,128,128,0.1)"
          strokeWidth="1"
        />
      ))}

      {visibleCandles.map((candle, index) => {
        const x = index * totalCandleWidth + CANDLE_GAP / 2;

        // Normalize Y coordinates (SVG Y starts from top)
        const yHigh =
          CHART_HEIGHT - ((candle.high - min) / range) * CHART_HEIGHT;
        const yLow = CHART_HEIGHT - ((candle.low - min) / range) * CHART_HEIGHT;
        const yOpen =
          CHART_HEIGHT - ((candle.open - min) / range) * CHART_HEIGHT;
        const yClose =
          CHART_HEIGHT - ((candle.close - min) / range) * CHART_HEIGHT;

        const isGreen = candle.close >= candle.open;
        const candleColor = isGreen ? "#22C55E" : "#EF4444";

        return (
          <G key={index}>
            {/* Wick (Garis High-Low) */}
            <Svg.Line
              x1={x + CANDLE_WIDTH / 2}
              y1={yHigh}
              x2={x + CANDLE_WIDTH / 2}
              y2={yLow}
              stroke={candleColor}
              strokeWidth="1.5"
            />
            {/* Body (Kotak Open-Close) */}
            <Svg.Rect
              x={x}
              y={Math.min(yOpen, yClose)}
              width={CANDLE_WIDTH}
              height={Math.abs(yClose - yOpen) || 1} // Min height 1px
              fill={candleColor}
              rx="1"
            />
          </G>
        );
      })}
    </Svg.Svg>
  );
}

// 2. Action Button Component
function ActionButton({ icon: Icon, label, onPress, theme }: any) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View
        style={[styles.actionIconBg, { backgroundColor: theme.primary + "20" }]}
      >
        <Icon size={20} color={theme.primary} />
      </View>
      <Text style={[styles.actionLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// 3. Stat Row Component
function StatRow({ label, value, theme }: any) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function CoinDetailScreen() {
  const { coinId } = useLocalSearchParams();
  const { isDarkMode, activeChainId } = useAppStore(); // Gunakan activeChainId untuk navigasi send/receive
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("chart");

  const id = typeof coinId === "string" ? coinId : "ethereum";
  const geckoId = COINGECKO_ID_MAP[id] || id;

  const change24h = coinData?.price_change_percentage_24h ?? 0;
  const isPositive = change24h >= 0;

  // Generate mock chart data
  const generateMockChartData = useCallback(
    (basePrice: number) => {
      const data: number[] = [];
      let current = basePrice;
      for (let i = 0; i < 100; i++) {
        const volatility = id.includes("usd") ? 0.0005 : 0.02;
        const change = (Math.random() - 0.5) * (basePrice * volatility);
        current += change;
        data.push(Math.max(current, basePrice * 0.5));
      }
      return data;
    },
    [id],
  );

  const generateMockCoinData = useCallback((): CoinData => {
    let basePrice = 100;
    let symbol = "UNK";
    let name = "Unknown";

    if (id === "blockdag") {
      basePrice = 0.15;
      symbol = "BDAG";
      name = "BlockDAG";
    } else if (id === "usdt") {
      basePrice = 1.0;
      symbol = "USDT";
      name = "Tether";
    } else if (id === "usdc") {
      basePrice = 1.0;
      symbol = "USDC";
      name = "USD Coin";
    }

    return {
      id,
      symbol,
      name,
      image: "",
      current_price: basePrice,
      market_cap: basePrice * 1e9,
      market_cap_rank: 999,
      total_volume: basePrice * 5e7,
      high_24h: basePrice * 1.01,
      low_24h: basePrice * 0.99,
      price_change_percentage_24h:
        (Math.random() - 0.5) * (id.includes("usd") ? 0.1 : 5),
      description: `Simulated data for ${name}.`,
      isMockData: true,
    };
  }, [id]);

  const fetchCoinData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      );

      if (res.status === 404) {
        const mockData = generateMockCoinData();
        setCoinData(mockData);
        setChartData(generateMockChartData(mockData.current_price));
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Fetch OHLC or Prices for Chart
      const chartRes = await fetch(
        `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=7`,
      );

      let sampledPrices: number[] = [];
      if (chartRes.ok) {
        const chartJson = await chartRes.json();
        sampledPrices = chartJson.prices.map((p: any[]) => p[1]);
      } else {
        sampledPrices = generateMockChartData(
          data.market_data?.current_price?.usd || 100,
        );
      }

      setCoinData({
        id: data.id,
        symbol: data.symbol?.toUpperCase() || id.toUpperCase(),
        name: data.name || id,
        image: data.image?.large || "",
        current_price: data.market_data?.current_price?.usd || 0,
        market_cap: data.market_data?.market_cap?.usd || 0,
        market_cap_rank: data.market_cap_rank || 0,
        total_volume: data.market_data?.total_volume?.usd || 0,
        high_24h: data.market_data?.high_24h?.usd || 0,
        low_24h: data.market_data?.low_24h?.usd || 0,
        price_change_percentage_24h:
          data.market_data?.price_change_percentage_24h ?? 0,
        description: data.description?.en
          ? data.description.en.split(". ").slice(0, 3).join(". ") + "."
          : "No description.",
      });
      setChartData(sampledPrices);
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
      const mock = generateMockCoinData();
      setCoinData(mock);
      setChartData(generateMockChartData(mock.current_price));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [geckoId, id, generateMockCoinData, generateMockChartData]);

  useEffect(() => {
    fetchCoinData();
  }, [fetchCoinData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCoinData();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: val < 1 ? 6 : 2,
    }).format(val);

  const formatCompact = (num: number) =>
    Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!coinData) return null;

  const localIconSource = LOCAL_ICON_MAP[id];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Asset Detail
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Top Section: Icon, Name, Price */}
        <View style={styles.topSection}>
          <View style={styles.coinHeader}>
            {localIconSource ? (
              <Image source={localIconSource} style={styles.coinIcon} />
            ) : coinData.image ? (
              <Image source={{ uri: coinData.image }} style={styles.coinIcon} />
            ) : (
              <Image
                source={require("../assets/chains/eth.png")}
                style={styles.coinIcon}
              />
            )}
            <View style={styles.coinInfo}>
              <Text style={[styles.coinName, { color: theme.text }]}>
                {coinData.name}
              </Text>
              <Text style={[styles.coinSymbol, { color: theme.textSecondary }]}>
                {coinData.symbol}
              </Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={[styles.priceText, { color: theme.text }]}>
              {formatCurrency(coinData.current_price)}
            </Text>
            <View
              style={[
                styles.changeBadge,
                { backgroundColor: isPositive ? "#22C55E20" : "#EF444420" },
              ]}
            >
              {isPositive ? (
                <TrendingUp size={16} color="#22C55E" />
              ) : (
                <TrendingDown size={16} color="#EF4444" />
              )}
              <Text
                style={[
                  styles.changeText,
                  { color: isPositive ? "#22C55E" : "#EF4444" },
                ]}
              >
                {Math.abs(change24h).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* ✅ Action Buttons: Send, Receive, Swap */}
        <View style={styles.actionsContainer}>
          <ActionButton
            icon={ArrowUpRight}
            label="Send"
            theme={theme}
            onPress={() =>
              router.push({
                pathname: "/send",
                params: { chainId: activeChainId, symbol: coinData.symbol },
              })
            }
          />
          <ActionButton
            icon={ArrowDownLeft}
            label="Receive"
            theme={theme}
            onPress={() => router.push("/receive")}
          />
          <ActionButton
            icon={Repeat2}
            label="Swap"
            theme={theme}
            onPress={() =>
              router.push({
                pathname: "/swap",
                params: { chainId: activeChainId, symbol: coinData.symbol },
              })
            }
          />
        </View>

        {/* ✅ Tabs: Chart, Info, Market */}
        <View style={styles.tabContainer}>
          {(["chart", "info", "market"] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab
                    ? styles.tabTextActive
                    : { color: theme.textSecondary },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ✅ Tab Content */}
        <View style={[styles.tabContent, { backgroundColor: theme.card }]}>
          {/* TAB: CHART */}
          {activeTab === "chart" && (
            <View style={styles.chartWrapper}>
              <CandleChart data={chartData} color={theme.primary} />
              <View style={styles.chartLegend}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#22C55E",
                    }}
                  />
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Bullish
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#EF4444",
                    }}
                  />
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Bearish
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB: INFO */}
          {activeTab === "info" && (
            <View style={styles.infoWrapper}>
              <Text style={[styles.aboutTitle, { color: theme.text }]}>
                About {coinData.name}
              </Text>
              <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
                {coinData.description || "No description available."}
              </Text>
              <View style={{ height: 20 }} />
              <StatRow
                label="Official Site"
                value="Check Explorer"
                theme={theme}
              />
              <StatRow
                label="Blockchain"
                value={id.includes("eth") ? "Ethereum" : "BlockDAG"}
                theme={theme}
              />
            </View>
          )}

          {/* TAB: MARKET CAP */}
          {activeTab === "market" && (
            <View style={styles.marketWrapper}>
              <StatRow
                label="Market Cap"
                value={`$${formatCompact(coinData.market_cap)}`}
                theme={theme}
              />
              <StatRow
                label="Market Cap Rank"
                value={`#${coinData.market_cap_rank}`}
                theme={theme}
              />
              <StatRow
                label="Total Volume (24h)"
                value={`$${formatCompact(coinData.total_volume)}`}
                theme={theme}
              />
              <StatRow
                label="High 24h"
                value={formatCurrency(coinData.high_24h)}
                theme={theme}
              />
              <StatRow
                label="Low 24h"
                value={formatCurrency(coinData.low_24h)}
                theme={theme}
              />
              <StatRow label="Circulating Supply" value="N/A" theme={theme} />
            </View>
          )}
        </View>

        {/* Warning Banner */}
        {coinData.isMockData && (
          <View
            style={[
              styles.warningBanner,
              { backgroundColor: "#F59E0B15", borderColor: "#F59E0B30" },
            ]}
          >
            <AlertTriangle size={16} color="#F59E0B" />
            <Text style={[styles.warningText, { color: "#F59E0B" }]}>
              Simulated Data: This asset is not fully supported on CoinGecko
              yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scrollContent: { padding: 20, paddingTop: 10 },

  topSection: { marginBottom: 24 },
  coinHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  coinIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    backgroundColor: "#fff",
  },
  coinInfo: { justifyContent: "center" },
  coinName: { fontSize: 24, fontWeight: "700" },
  coinSymbol: {
    fontSize: 16,
    fontWeight: "500",
    textTransform: "uppercase",
    color: "#888",
  },

  priceContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  priceText: { fontSize: 36, fontWeight: "700" },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeText: { fontSize: 14, fontWeight: "600" },

  // Actions
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    paddingVertical: 10,
  },
  actionBtn: {
    alignItems: "center",
    gap: 8,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#5573ef", // Primary Color
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#5573ef",
  },

  // Tab Content Container
  tabContent: {
    borderRadius: 20,
    padding: 20,
    minHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Chart Specific
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: CHART_HEIGHT + 40,
  },
  chartLegend: {
    flexDirection: "row",
    gap: 20,
    marginTop: 10,
  },

  // Info & Market Specific
  infoWrapper: {},
  marketWrapper: {},
  aboutTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  aboutText: { fontSize: 14, lineHeight: 22 },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  statLabel: { fontSize: 14, fontWeight: "500" },
  statValue: { fontSize: 14, fontWeight: "600" },

  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
});
