import { router, useLocalSearchParams } from "expo-router";
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Globe,
    Info,
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

import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

// ─────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────
const { width } = Dimensions.get("window");

const LOCAL_ICON_MAP: Record<string, any> = {
  ethereum: require("../assets/chains/eth.png"),
  blockdag: require("../assets/chains/bdag.png"),
};

// Mapping dari coinId internal ke CoinGecko ID
const COINGECKO_ID_MAP: Record<string, string> = {
  ethereum: "ethereum",
  blockdag: "blockdag", // Mungkin tidak tersedia di CoinGecko, akan pakai fallback
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

// ─────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────

// 1. Simple SVG Sparkline Chart
function SparklineChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0) return null;

  const height = 120;
  const graphWidth = width - 72; // Padding horizontal (16*2 + 20*2)

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Normalize data to fit SVG viewbox
  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * graphWidth;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  // Create area fill path
  const fillPath = `M0,${height} L${points.replace(/ /g, " L")} L${graphWidth},${height} Z`;

  return (
    <Svg.Svg width={graphWidth} height={height} style={{ marginTop: 10 }}>
      {/* Gradient Defs */}
      <Svg.Defs>
        <Svg.LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Svg.Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Svg.Stop offset="100%" stopColor={color} stopOpacity="0" />
        </Svg.LinearGradient>
      </Svg.Defs>

      {/* Area Fill */}
      <Svg.Path d={fillPath} fill="url(#grad)" stroke="none" />

      {/* Line Stroke */}
      <Svg.Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg.Svg>
  );
}

// 2. Stat Card Component
function StatCard({ label, value, subValue, icon: Icon, theme }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
      <View style={styles.statHeader}>
        <Icon size={16} color={theme.textSecondary} />
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      {subValue && (
        <Text style={[styles.statSub, { color: theme.textSecondary }]}>
          {subValue}
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function CoinDetailScreen() {
  const { coinId } = useLocalSearchParams();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const id = typeof coinId === "string" ? coinId : "ethereum";
  const geckoId = COINGECKO_ID_MAP[id] || id;

  const change24h = coinData?.price_change_percentage_24h ?? 0;
  const isPositive = change24h >= 0;
  const chartColor = isPositive ? "#22C55E" : "#EF4444";

  // Generate mock chart data untuk fallback
  const generateMockChartData = useCallback((basePrice: number) => {
    const data: number[] = [];
    let current = basePrice;
    for (let i = 0; i < 50; i++) {
      const change = (Math.random() - 0.5) * (basePrice * 0.05);
      current += change;
      data.push(Math.max(current, basePrice * 0.5));
    }
    return data;
  }, []);

  // Generate mock coin data untuk BlockDAG atau coin yang tidak ada di CoinGecko
  const generateMockCoinData = useCallback((): CoinData => {
    const basePrice = id === "blockdag" ? 0.15 : 100;
    return {
      id: id,
      symbol: id === "blockdag" ? "BDAG" : id.toUpperCase().slice(0, 4),
      name:
        id === "blockdag"
          ? "BlockDAG"
          : id.charAt(0).toUpperCase() + id.slice(1),
      image: "",
      current_price: basePrice,
      market_cap: basePrice * 1000000000,
      market_cap_rank: 999,
      total_volume: basePrice * 50000000,
      high_24h: basePrice * 1.05,
      low_24h: basePrice * 0.95,
      price_change_percentage_24h: (Math.random() - 0.5) * 10,
      description: `${id === "blockdag" ? "BlockDAG" : id} adalah aset kripto yang saat ini belum tersedia di database CoinGecko. Data yang ditampilkan adalah simulasi untuk keperluan demo aplikasi.`,
      isMockData: true,
    };
  }, [id]);

  const fetchCoinData = useCallback(async () => {
    try {
      setError(null);

      // 1. Fetch Current Data dari CoinGecko
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      // Jika coin tidak ditemukan di CoinGecko (404), gunakan mock data
      if (res.status === 404) {
        console.warn(
          `Coin ${geckoId} tidak ditemukan di CoinGecko, menggunakan mock data`,
        );
        const mockData = generateMockCoinData();
        setCoinData(mockData);
        setChartData(generateMockChartData(mockData.current_price));
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // 2. Fetch Chart Data (7 hari)
      const chartRes = await fetch(
        `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=7`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      let sampledPrices: number[] = [];

      if (chartRes.ok) {
        const chartJson = await chartRes.json();
        const prices = chartJson.prices.map((p: any[]) => p[1]);
        // Sample setiap 6th point untuk density yang pas (7 hari = ~168 data points)
        sampledPrices = prices.filter((_: any, i: number) => i % 6 === 0);
      } else {
        // Fallback chart data
        sampledPrices = generateMockChartData(
          data.market_data?.current_price?.usd || 100,
        );
      }

      const formattedData: CoinData = {
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
          : `Tidak ada deskripsi tersedia untuk ${data.name || id}.`,
      };

      setCoinData(formattedData);
      setChartData(sampledPrices);
    } catch (error) {
      console.error("Error fetching coin detail:", error);
      setError("Gagal memuat data. Silakan coba lagi.");

      // Fallback ke mock data jika error
      const mockData = generateMockCoinData();
      setCoinData(mockData);
      setChartData(generateMockChartData(mockData.current_price));
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

  const formatCurrency = (val: number) => {
    if (!val || val === 0) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: val < 1 ? 6 : 2,
    }).format(val);
  };

  const formatCompactNumber = (number: number) => {
    if (!number || number === 0) return "0";
    return Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(number);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Memuat data market...
        </Text>
      </View>
    );
  }

  if (!coinData) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Data tidak ditemukan</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: theme.primary }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const localIconSource = LOCAL_ICON_MAP[id];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Detail Aset
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
            colors={[theme.primary]}
          />
        }
      >
        {/* Warning Banner untuk Mock Data */}
        {coinData.isMockData && (
          <View
            style={[
              styles.warningBanner,
              { backgroundColor: isDarkMode ? "#451a03" : "#fef3c7" },
            ]}
          >
            <AlertTriangle
              size={16}
              color={isDarkMode ? "#fbbf24" : "#d97706"}
            />
            <Text
              style={[
                styles.warningText,
                { color: isDarkMode ? "#fbbf24" : "#92400e" },
              ]}
            >
              Data simulasi - Coin belum terdaftar di CoinGecko
            </Text>
          </View>
        )}

        {/* Error Banner */}
        {error && !coinData.isMockData && (
          <View
            style={[
              styles.warningBanner,
              { backgroundColor: isDarkMode ? "#450a0a" : "#fee2e2" },
            ]}
          >
            <AlertTriangle
              size={16}
              color={isDarkMode ? "#f87171" : "#dc2626"}
            />
            <Text
              style={[
                styles.warningText,
                { color: isDarkMode ? "#f87171" : "#991b1b" },
              ]}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Top Section: Icon, Name, Price */}
        <View style={styles.topSection}>
          <View style={styles.coinHeader}>
            {localIconSource ? (
              <Image source={localIconSource} style={styles.coinIcon} />
            ) : (
              <Image
                source={{ uri: coinData.image }}
                style={styles.coinIcon}
                defaultSource={require("../assets/chains/eth.png")}
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
                {Math.abs(change24h).toFixed(2)}% (24h)
              </Text>
            </View>
          </View>
        </View>

        {/* Chart Section */}
        <View style={[styles.chartContainer, { backgroundColor: theme.card }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Grafik Harga (7 Hari)
            </Text>
            <BarChart3 size={20} color={theme.primary} />
          </View>
          <SparklineChart data={chartData} color={chartColor} />
          <View style={styles.chartFooter}>
            <Text
              style={[styles.chartFooterText, { color: theme.textSecondary }]}
            >
              {chartData.length > 0
                ? `${chartData.length} data points`
                : "No data"}
            </Text>
          </View>
        </View>

        {/* Market Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            theme={theme}
            icon={Globe}
            label="Kapitalisasi Pasar"
            value={`$${formatCompactNumber(coinData.market_cap)}`}
            subValue={
              coinData.market_cap_rank
                ? `Rank #${coinData.market_cap_rank}`
                : "Unranked"
            }
          />
          <StatCard
            theme={theme}
            icon={BarChart3}
            label="Volume (24h)"
            value={`$${formatCompactNumber(coinData.total_volume)}`}
          />
          <StatCard
            theme={theme}
            icon={TrendingUp}
            label="Tertinggi (24h)"
            value={formatCurrency(coinData.high_24h)}
          />
          <StatCard
            theme={theme}
            icon={TrendingDown}
            label="Terendah (24h)"
            value={formatCurrency(coinData.low_24h)}
          />
        </View>

        {/* About Section */}
        <View style={[styles.aboutCard, { backgroundColor: theme.card }]}>
          <View style={styles.aboutHeader}>
            <Info size={20} color={theme.primary} />
            <Text style={[styles.aboutTitle, { color: theme.text }]}>
              Tentang {coinData.name}
            </Text>
          </View>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            {coinData.description || "Tidak ada deskripsi tersedia."}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "transparent",
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  topSection: {
    marginBottom: 24,
  },
  coinHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  coinIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#fff",
  },
  coinInfo: {
    justifyContent: "center",
  },
  coinName: {
    fontSize: 24,
    fontWeight: "700",
  },
  coinSymbol: {
    fontSize: 16,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  priceText: {
    fontSize: 32,
    fontWeight: "700",
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  chartFooter: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  chartFooterText: {
    fontSize: 11,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  statSub: {
    fontSize: 11,
  },
  aboutCard: {
    borderRadius: 16,
    padding: 16,
  },
  aboutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
