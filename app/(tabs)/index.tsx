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
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  RefreshCw,
  Repeat2,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

const { width: W } = Dimensions.get("window");

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
      <View style={[styles.assetIcon, { backgroundColor: "#fff" }]}>
        <Image
          source={source}
          style={{ width: 40, height: 40, resizeMode: "contain" }}
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
  } else if (symbol.includes("BTC")) {
    bgColor = "#F7931A18";
    textColor = "#F7931A";
  }

  return (
    <View style={[styles.assetIcon, { backgroundColor: bgColor }]}>
      <Text style={{ fontSize: 14, fontWeight: "800", color: textColor }}>
        {initial}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Quick Action Button (Lingkaran saja, tanpa container)
// ─────────────────────────────────────────────
function QuickAction({
  label,
  Icon,
  onPress,
  theme,
}: {
  label: string;
  Icon: any;
  onPress: () => void;
  theme: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={styles.qaWrap}
    >
      <Animated.View
        style={[
          styles.qaBtn,
          {
            backgroundColor: theme.primary,
            transform: [{ scale }],
          },
        ]}
      >
        <Icon size={22} color="#fff" strokeWidth={2} />
      </Animated.View>
      <Text style={[styles.qaLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Price Indicator Component
// ─────────────────────────────────────────────
function PriceIndicator({ data }: { data: PriceData }) {
  const isUp = data.change24h >= 0;
  const color = isUp ? "#22C55E" : "#EF4444";

  const formatPrice = (price: number) => {
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.priceIndicator}>
      <Text style={[styles.priceText, { color }]}>
        {formatPrice(data.price)}
      </Text>
      <View style={[styles.changeBadge, { backgroundColor: color + "15" }]}>
        {isUp ? (
          <TrendingUp size={10} color={color} strokeWidth={2.5} />
        ) : (
          <TrendingDown size={10} color={color} strokeWidth={2.5} />
        )}
        <Text style={[styles.changeText, { color }]}>
          {isUp ? "+" : ""}
          {data.change24h.toFixed(2)}%
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Balance Shimmer Animation
// ─────────────────────────────────────────────
function BalanceShimmer({ theme }: { theme: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-W, W],
  });

  return (
    <View
      style={[styles.shimmerContainer, { backgroundColor: theme.card + "40" }]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
            backgroundColor: theme.primary + "20",
          },
        ]}
      />
    </View>
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
  const [activeChainId, setActiveChainId] =
    useState<ChainId>("ethereum-mainnet");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // State untuk Dropdown Network
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  const activeChainConfig =
    SUPPORTED_CHAINS.find((c) => c.id === activeChainId) || SUPPORTED_CHAINS[0];
  const currentBalance = balances[activeChainId] || "0.0000";

  // ── Fetch Real-time Prices from CoinGecko ──
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

  // ── Fetch Balances from RPC ──
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
          } catch (err) {
            console.warn(`Gagal fetch balance untuk ${chain.name}`, err);
            if (!newBalances[chain.id]) {
              newBalances[chain.id] = "0.0000";
            }
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

  // ── Combined Fetch ──
  const fetchAllData = useCallback(async () => {
    await Promise.all([fetchPrices(), fetchAllBalances()]);
  }, [fetchPrices, fetchAllBalances]);

  // Load data saat screen fokus
  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData]),
  );

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const copyToClipboard = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  if (!walletAddress) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>
          Wallet belum di-setup.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* ── Fixed Header ── */}
      <HomeHeader
        onSettingsPress={() => router.push("/settings")}
        onScanPress={() => router.push("/scan")}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* ── Balance Section (Tanpa Container Card) ── */}
        <View style={styles.balanceSection}>
          <View style={styles.balanceTopRow}>
            <View>
              <Text style={[styles.balLabel, { color: theme.textSecondary }]}>
                Total Balance
              </Text>
              {isLoading && !refreshing ? (
                <BalanceShimmer theme={theme} />
              ) : (
                <Text style={[styles.balAmount, { color: theme.text }]}>
                  {currentBalance}
                </Text>
              )}
              <Text style={[styles.balUnit, { color: theme.textSecondary }]}>
                {activeChainConfig.symbol}
              </Text>
            </View>

            {/* Network Selector Dropdown Trigger */}
            <TouchableOpacity
              style={[
                styles.netBadge,
                { backgroundColor: theme.primary + "15" },
              ]}
              onPress={() => setShowNetworkModal(true)}
              activeOpacity={0.7}
            >
              <View
                style={[styles.netDot, { backgroundColor: theme.primary }]}
              />
              <Text style={[styles.netText, { color: theme.primary }]}>
                {activeChainConfig.name}
              </Text>
              <ChevronDown size={14} color={theme.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Address & Refresh Row */}
          <View style={styles.addrRow}>
            <TouchableOpacity
              style={[styles.addrPill, { backgroundColor: theme.card }]}
              onPress={copyToClipboard}
              activeOpacity={0.8}
            >
              {copied ? (
                <Check size={13} color={theme.primary} strokeWidth={2.5} />
              ) : (
                <Copy size={13} color={theme.textSecondary} strokeWidth={2} />
              )}
              <Text style={[styles.addrPillText, { color: theme.text }]}>
                {copied ? "Tersalin!" : shortAddr}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.refreshBtn, { backgroundColor: theme.card }]}
              onPress={fetchAllData}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color={theme.primary} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Quick Actions (Tanpa Container) ── */}
        <View style={styles.qaRow}>
          <QuickAction
            label="Kirim"
            Icon={ArrowUpRight}
            onPress={() =>
              router.push({
                pathname: "/send",
                params: { chainId: activeChainId },
              })
            }
            theme={theme}
          />
          <QuickAction
            label="Terima"
            Icon={ArrowDownLeft}
            onPress={() => router.push("/receive")}
            theme={theme}
          />
          <QuickAction
            label="Swap"
            Icon={Repeat2}
            onPress={() => {}}
            theme={theme}
          />
          <QuickAction
            label="Riwayat"
            Icon={Timer}
            onPress={() => {}}
            theme={theme}
          />
        </View>

        {/* ── Assets Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Aset</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.sectionLink, { color: theme.primary }]}>
              Lihat semua
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Token List (Tanpa Container Card) ── */}
        {SUPPORTED_CHAINS.map((chain) => {
          const bal = balances[chain.id] || "0.0000";
          const isActive = chain.id === activeChainId;
          const priceData = prices[chain.id];

          return (
            <TouchableOpacity
              key={chain.id}
              activeOpacity={0.7}
              onPress={() => {
                // Ambil ID CoinGecko dari mapping
                const cgId = COINGECKO_IDS[chain.id];
                if (cgId) {
                  router.push({
                    pathname: "/coin-detail",
                    params: { coinId: cgId },
                  });
                } else {
                  // Fallback jika tidak ada mapping, tetap ganti chain aktif
                  setActiveChainId(chain.id as ChainId);
                }
              }}
              style={[
                styles.assetRow,
                isActive && { backgroundColor: theme.primary + "08" },
              ]}
            >
              <ChainIcon chainId={chain.id} symbol={chain.symbol} />

              <View style={styles.assetInfo}>
                <Text style={[styles.assetName, { color: theme.text }]}>
                  {chain.name.split(" ")[0]}
                </Text>
                <Text style={[styles.assetSub, { color: theme.textSecondary }]}>
                  {bal} {chain.symbol}
                </Text>
              </View>

              <View style={styles.assetRight}>
                {priceData ? (
                  <PriceIndicator data={priceData} />
                ) : (
                  <ActivityIndicator size="small" color={theme.primary} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 120 }} />
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
  scroll: {
    padding: 20,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Balance Section (Tanpa Container) ──
  balanceSection: {
    marginBottom: 24,
    paddingTop: 8,
  },
  balanceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  balLabel: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balAmount: {
    fontSize: 42,
    fontWeight: "600",
    letterSpacing: -1.2,
    lineHeight: 50,
  },
  balUnit: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  netBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 8, // Sedikit diperbesar untuk tap area
  },
  netDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  netText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  addrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addrPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addrPillText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Shimmer ──
  shimmerContainer: {
    height: 50,
    width: 180,
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: 4,
  },
  shimmer: {
    width: "100%",
    height: "100%",
  },

  // ── Quick Actions (Tanpa Container) ──
  qaRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  qaWrap: {
    alignItems: "center",
    gap: 8,
  },
  qaBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  qaLabel: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Asset Row (Tanpa Container Card) ──
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 14,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  assetSub: {
    fontSize: 13,
    fontWeight: "500",
  },
  assetRight: {
    alignItems: "flex-end",
  },

  // ── Price Indicator ──
  priceIndicator: {
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Network Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: W * 0.85,
    borderRadius: 20,
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
