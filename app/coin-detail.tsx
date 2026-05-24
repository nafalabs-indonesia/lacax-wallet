import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  Info,
  RefreshCw,
  Repeat2,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import * as Svg from "react-native-svg";
import { Path } from "react-native-svg";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

const { width } = Dimensions.get("window");
const CHART_HEIGHT = 250;
const PRICE_LABEL_WIDTH = 55;
const CHART_LEFT_PADDING = 20;
const COLOR_BLUE = "#3b82f6";
const COLOR_GREEN = "#7ed957";
const COLOR_RED = "#ff3131";

const LOCAL_ICON_MAP: Record<string, any> = {
  ethereum: require("../assets/chains/eth.png"),
  blockdag: require("../assets/chains/bdag.png"),
  usdt: require("../assets/coins/usdt.png"),
  usdc: require("../assets/coins/usdc.png"),
  bnb: require("../assets/chains/bnb.png"),
  polygon: require("../assets/chains/polygon.png"),
  arbitrum: require("../assets/chains/arbitrum.png"),
  monad: require("../assets/chains/monad.png"),
};

const COINGECKO_ID_MAP: Record<string, string> = {
  ethereum: "ethereum",
  blockdag: "blockdag",
  usdt: "tether",
  usdc: "usd-coin",
  bnb: "binancecoin",
  polygon: "polygon-ecosystem-token",
  arbitrum: "arbitrum",
  monad: "monad",
};

const TF_DAYS: Record<string, string> = {
  "15m": "1",
  "30m": "1",
  "1h": "1",
  "1d": "7",
};

const TF_SAMPLE: Record<string, number> = {
  "15m": 24,
  "30m": 36,
  "1h": 48,
  "1d": 60,
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

interface ChartPoint {
  timestamp: number;
  price: number;
}

type TabType = "chart" | "info" | "market";

function PriceLabels({ data, theme }: { data: number[]; theme: any }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const levels = 5;

  const formatPrice = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    if (val >= 1) return `$${val.toFixed(2)}`;
    return `$${val.toFixed(4)}`;
  };

  return (
    <View
      style={{
        width: PRICE_LABEL_WIDTH,
        height: CHART_HEIGHT,
        position: "relative",
      }}
    >
      {Array.from({ length: levels }).map((_, i) => {
        const ratio = i / (levels - 1);
        const price = max - ratio * range;
        const y = ratio * CHART_HEIGHT - 8;
        return (
          <Text
            key={i}
            style={{
              position: "absolute",
              top: y,
              right: 0,
              fontSize: 9,
              color: theme.textSecondary,
              textAlign: "left",
              width: PRICE_LABEL_WIDTH - 5,
            }}
          >
            {formatPrice(price)}
          </Text>
        );
      })}
    </View>
  );
}

function DateLabels({ points, theme }: { points: ChartPoint[]; theme: any }) {
  if (!points || points.length < 2) return null;

  const chartWidth = width - 40 - PRICE_LABEL_WIDTH - 8 - CHART_LEFT_PADDING;
  const count = 5;

  const formatLabel = (ts: number) => {
    const d = new Date(ts);
    const day = d.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear().toString().slice(2);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");

    const spanMs = points[points.length - 1].timestamp - points[0].timestamp;
    if (spanMs < 2 * 24 * 60 * 60 * 1000) {
      return `${h}:${m}`;
    }
    return `${day} ${month} '${year}`;
  };

  return (
    <View
      style={{
        width: chartWidth,
        flexDirection: "row",
        marginTop: 20,
        position: "relative",
        height: 16,
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const ratio = i / (count - 1);
        const idx = Math.round(ratio * (points.length - 1));
        const point = points[idx];
        const x = ratio * chartWidth;
        return (
          <Text
            key={i}
            style={{
              position: "absolute",
              left: x,
              transform: [
                { translateX: i === count - 1 ? -30 : i === 0 ? 0 : -15 },
              ],
              fontSize: 9,
              color: theme.textSecondary,
            }}
          >
            {formatLabel(point.timestamp)}
          </Text>
        );
      })}
    </View>
  );
}

function SimpleLineChart({ data, theme }: { data: ChartPoint[]; theme: any }) {
  if (!data || data.length < 2) return null;

  const prices = data.map((d) => d.price);
  const chartWidth = width - 40 - PRICE_LABEL_WIDTH - 8 - CHART_LEFT_PADDING;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  let pathD = "";
  const stepX = chartWidth / (prices.length - 1);

  prices.forEach((val, index) => {
    const x = index * stepX;
    const y = CHART_HEIGHT - ((val - min) / range) * CHART_HEIGHT;
    pathD += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  const lastY =
    CHART_HEIGHT - ((prices[prices.length - 1] - min) / range) * CHART_HEIGHT;
  const fillPath = `${pathD} L ${chartWidth} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  return (
    <View style={{ flexDirection: "row", paddingLeft: CHART_LEFT_PADDING }}>
      <View>
        <Svg.Svg width={chartWidth} height={CHART_HEIGHT}>
          <Svg.Defs>
            <Svg.LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <Svg.Stop offset="0" stopColor={COLOR_BLUE} stopOpacity="0.25" />
              <Svg.Stop offset="1" stopColor={COLOR_BLUE} stopOpacity="0.01" />
            </Svg.LinearGradient>
          </Svg.Defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <Svg.Line
              key={i}
              x1="0"
              y1={CHART_HEIGHT * ratio}
              x2={chartWidth}
              y2={CHART_HEIGHT * ratio}
              stroke="rgba(128,128,128,0.12)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}

          <Path d={fillPath} fill="url(#chartGrad)" />

          <Path
            d={pathD}
            fill="none"
            stroke={COLOR_BLUE}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <Svg.Circle
            cx={chartWidth}
            cy={lastY}
            r="4"
            fill={COLOR_BLUE}
            stroke="#fff"
            strokeWidth="1.5"
          />
        </Svg.Svg>
        <DateLabels points={data} theme={theme} />
      </View>
      <View style={{ marginLeft: 8 }}>
        <PriceLabels data={prices} theme={theme} />
      </View>
    </View>
  );
}

function DisclaimerSheet({
  visible,
  onClose,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  theme: any;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.sheetOverlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: theme.background,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>
            ⚠️ Investment Disclaimer
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
            <X size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sheetBody, { color: theme.textSecondary }]}>
          {`Cryptocurrency is a highly volatile and speculative asset class. Prices can rise and fall dramatically within short periods of time.\n\n⚠️  You may lose all of your invested capital. Past performance is not indicative of future results.\n\nDYOR — Do Your Own Research before making any investment decisions. This application does not constitute financial advice. Always consult with a qualified financial advisor before investing.\n\nNever invest more than you can afford to lose.`}
        </Text>

        <TouchableOpacity
          style={[styles.sheetBtn, { backgroundColor: theme.primary }]}
          onPress={onClose}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            I Understand
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

export default function CoinDetailScreen() {
  const { coinId } = useLocalSearchParams();
  const { isDarkMode, activeChainId } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("chart");
  const [timeFrame, setTimeFrame] = useState("1h");
  const [chartLoading, setChartLoading] = useState(false);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);

  const [usdToIdr, setUsdToIdr] = useState<number>(15500);

  const id = typeof coinId === "string" ? coinId : "ethereum";
  const geckoId = COINGECKO_ID_MAP[id] || id;

  const change24h = coinData?.price_change_percentage_24h ?? 0;
  const isPositive = change24h >= 0;

  const fetchUsdToIdr = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr",
      );
      if (!res.ok) throw new Error("rate fetch failed");
      const data = await res.json();
      const rate = data?.tether?.idr;
      if (rate && rate > 1000) {
        setUsdToIdr(rate);
      }
    } catch {}
  }, []);

  const fetchChartForTimeframe = useCallback(
    async (tf: string, isMock: boolean, basePrice: number) => {
      setChartLoading(true);
      try {
        const days = TF_DAYS[tf] || "1";
        const chartRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`,
        );
        if (!chartRes.ok) throw new Error("chart fetch failed");
        const chartJson = await chartRes.json();
        const allPoints: ChartPoint[] = chartJson.prices.map((p: any[]) => ({
          timestamp: p[0],
          price: p[1],
        }));

        const sampleSize = TF_SAMPLE[tf] || 48;
        const step = Math.max(1, Math.floor(allPoints.length / sampleSize));
        const sampled = allPoints.filter((_, i) => i % step === 0);
        setChartPoints(sampled);
      } catch {
        const now = Date.now();
        const spanMs =
          tf === "1d" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const count = TF_SAMPLE[tf] || 48;
        const mock = Array.from({ length: count }, (_, i) => ({
          timestamp: now - spanMs + (i / count) * spanMs,
          price: basePrice + (Math.random() - 0.5) * basePrice * 0.08,
        }));
        setChartPoints(mock);
      } finally {
        setChartLoading(false);
      }
    },
    [geckoId],
  );

  const fetchCoinData = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      );
      if (res.status === 404 || !res.ok) throw new Error("API Error");

      const data = await res.json();
      const basePrice = data.market_data?.current_price?.usd || 100;

      setCoinData({
        id: data.id,
        symbol: data.symbol?.toUpperCase() || id.toUpperCase(),
        name: data.name || id,
        image: data.image?.large || "",
        current_price: basePrice,
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

      await fetchChartForTimeframe(timeFrame, false, basePrice);
    } catch (err) {
      let basePrice = 100;
      if (id === "usdt") basePrice = 1.0;
      if (id === "blockdag") basePrice = 0.15;

      setCoinData({
        id,
        symbol: id.toUpperCase(),
        name: id,
        image: "",
        current_price: basePrice,
        market_cap: basePrice * 1e9,
        market_cap_rank: 999,
        total_volume: basePrice * 5e7,
        high_24h: basePrice * 1.01,
        low_24h: basePrice * 0.99,
        price_change_percentage_24h: (Math.random() - 0.5) * 5,
        description: "Simulated data.",
        isMockData: true,
      });

      await fetchChartForTimeframe(timeFrame, true, basePrice);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [geckoId, id, timeFrame, fetchChartForTimeframe]);

  useEffect(() => {
    fetchUsdToIdr();
    fetchCoinData();
  }, [fetchCoinData, fetchUsdToIdr]);

  useEffect(() => {
    const interval = setInterval(fetchUsdToIdr, 60_000);
    return () => clearInterval(interval);
  }, [fetchUsdToIdr]);

  const handleTimeFrameChange = (tf: string) => {
    setTimeFrame(tf);
    const basePrice = coinData?.current_price || 100;
    fetchChartForTimeframe(tf, coinData?.isMockData ?? false, basePrice);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsdToIdr();
    fetchCoinData();
  };

  const formatIDR = (usdValue: number) => {
    const idrValue = usdValue * usdToIdr;
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(idrValue);
    return `IDR ${formatted}`;
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
      <DisclaimerSheet
        visible={disclaimerVisible}
        onClose={() => setDisclaimerVisible(false)}
        theme={theme}
      />

      <View style={styles.topHeaderContainer}>
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Asset Detail
          </Text>
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => setDisclaimerVisible(true)}
          >
            <Info size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          {(["chart", "info", "market"] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={styles.tabButton}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive
                      ? { color: theme.text, fontWeight: "700" }
                      : { color: theme.textSecondary, fontWeight: "500" },
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {isActive && (
                  <View
                    style={[
                      styles.activeTabIndicator,
                      { backgroundColor: theme.text },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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
        <View style={[styles.priceCard, { borderColor: theme.border }]}>
          <View style={styles.priceInfo}>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
              Current Price
            </Text>

            <Text style={[styles.priceValue, { color: theme.text }]}>
              {formatIDR(coinData.current_price)}
            </Text>
            <View style={styles.changeRow}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                USD {formatCurrency(coinData.current_price)}
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isPositive
                      ? `${COLOR_GREEN}20`
                      : `${COLOR_RED}20`,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isPositive ? COLOR_GREEN : COLOR_RED,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {isPositive ? "+" : ""}
                  {change24h.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.logoContainer}>
            {localIconSource ? (
              <Image source={localIconSource} style={styles.coinLogo} />
            ) : coinData.image ? (
              <Image source={{ uri: coinData.image }} style={styles.coinLogo} />
            ) : (
              <Image
                source={require("../assets/chains/eth.png")}
                style={styles.coinLogo}
              />
            )}
          </View>
        </View>

        {activeTab === "chart" && (
          <View style={[styles.chartCard, { borderColor: theme.border }]}>
            <View style={styles.chartHeader}>
              <View style={styles.timeframeSelector}>
                {["15m", "30m", "1h", "1d"].map((tf) => (
                  <TouchableOpacity
                    key={tf}
                    onPress={() => handleTimeFrameChange(tf)}
                    style={{ marginRight: 12 }}
                  >
                    <Text
                      style={{
                        color:
                          timeFrame === tf ? theme.text : theme.textSecondary,
                        fontWeight: timeFrame === tf ? "700" : "500",
                        fontSize: 13,
                      }}
                    >
                      {tf}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text
                style={{ color: theme.text, fontWeight: "600", fontSize: 14 }}
              >
                {coinData.name}
              </Text>
              <TouchableOpacity onPress={onRefresh}>
                <RefreshCw size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.chartGraphArea}>
              {chartLoading ? (
                <ActivityIndicator size="small" color={COLOR_BLUE} />
              ) : (
                <SimpleLineChart data={chartPoints} theme={theme} />
              )}
            </View>
          </View>
        )}

        {activeTab === "info" && (
          <View style={[styles.genericCard, { borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              About {coinData.name}
            </Text>
            <Text
              style={[styles.descriptionText, { color: theme.textSecondary }]}
            >
              {coinData.description || "No description available."}
            </Text>
          </View>
        )}

        {activeTab === "market" && (
          <View style={[styles.genericCard, { borderColor: theme.border }]}>
            <StatRow
              label="Market Cap"
              value={`$${formatCompact(coinData.market_cap)}`}
              theme={theme}
            />
            <StatRow
              label="Rank"
              value={`#${coinData.market_cap_rank}`}
              theme={theme}
            />
            <StatRow
              label="Volume (24h)"
              value={`$${formatCompact(coinData.total_volume)}`}
              theme={theme}
            />
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.swapBtnContainer}
          onPress={() =>
            router.push({
              pathname: "/swap",
              params: { symbol: coinData.symbol },
            })
          }
        >
          <View style={[styles.swapCircle, { borderColor: theme.border }]}>
            <Repeat2 size={24} color={theme.text} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnPrimary, { backgroundColor: theme.primary }]}
          onPress={() => router.push("/receive")}
        >
          <ArrowDownLeft size={20} color="#FFF" />
          <Text style={{ color: "#FFF", fontWeight: "700", marginLeft: 8 }}>
            Receive
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtnPrimary,
            { backgroundColor: theme.primary, marginLeft: 10 },
          ]}
          onPress={() =>
            router.push({
              pathname: "/send",
              params: { symbol: coinData.symbol },
            })
          }
        >
          <ArrowUpRight size={20} color="#FFF" />
          <Text style={{ color: "#FFF", fontWeight: "700", marginLeft: 8 }}>
            Send
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatRow({ label, value, theme }: any) {
  return (
    <View style={styles.statRow}>
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  topHeaderContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 0,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  infoBtn: { padding: 8 },

  tabContainer: {
    flexDirection: "row",
    gap: 20,
  },
  tabButton: {
    paddingBottom: 0,
  },
  tabText: { fontSize: 14 },
  activeTabIndicator: {},

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  priceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 10,
  },
  priceInfo: { flex: 1 },
  priceLabel: { fontSize: 12, marginBottom: 4 },
  priceValue: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  logoContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  coinLogo: { width: 50, height: 50, borderRadius: 28 },

  chartCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  timeframeSelector: { flexDirection: "row", alignItems: "center" },
  chartGraphArea: {
    alignItems: "center",
    justifyContent: "center",
    height: CHART_HEIGHT + 75,
  },

  genericCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  descriptionText: { fontSize: 14, lineHeight: 22 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 60 : 50,
    alignItems: "center",
  },
  swapBtnContainer: {
    flex: 0.2,
    alignItems: "center",
    justifyContent: "center",
  },
  swapCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnPrimary: {
    flex: 0.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 25,
  },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
    opacity: 0.4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  sheetClose: { padding: 4 },
  sheetBody: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  sheetBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
});
