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
  Copy,
  RefreshCw,
  Repeat2,
  Timer,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
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
// Karena React Native require() harus statis, kita map manual di sini
// ─────────────────────────────────────────────
const LOCAL_ICON_MAP: Record<string, any> = {
  "ethereum-mainnet": require("../../assets/chains/eth.png"), // Pastikan path ini benar sesuai struktur folder Anda
  // Jika Anda punya bdag.png, tambahkan di sini:
  "blockdag-mainnet": require("../../assets/chains/bdag.png"),
};

// Komponen Icon Chain yang Robust
function ChainIcon({ chainId, symbol }: { chainId: string; symbol: string }) {
  const source = LOCAL_ICON_MAP[chainId];

  // 1. Jika ada mapping file lokal (PNG/JPG), gunakan Image
  if (source) {
    return (
      <View style={[styles.assetIcon, { backgroundColor: "#fff" }]}>
        <Image
          source={source}
          style={{ width: 46, height: 46, resizeMode: "contain" }}
        />
      </View>
    );
  }

  // 2. Jika tidak ada (misal SVG atau belum di-map), gunakan Fallback UI
  // Kita buat lingkaran berwarna dengan inisial token
  let bgColor = "#627EEA18"; // Default ETH Blue
  let textColor = "#627EEA";
  let initial = symbol.charAt(0);

  if (symbol.includes("BDAG")) {
    bgColor = "#F59E0B18"; // Orange/Gold
    textColor = "#F59E0B";
    initial = "BD"; // BlockDAG
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
// Quick Action Button
// ─────────────────────────────────────────────
function QuickAction({
  label,
  Icon,
  accent,
  onPress,
  theme,
}: {
  label: string;
  Icon: any;
  accent: string;
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
      activeOpacity={1}
      style={styles.qaWrap}
    >
      <Animated.View
        style={[
          styles.qaBtn,
          {
            backgroundColor: accent + "18",
            transform: [{ scale }],
          },
        ]}
      >
        <Icon size={22} color={accent} strokeWidth={2} />
      </Animated.View>
      <Text style={[styles.qaLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const { walletAddress, isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // State untuk mengelola saldo multiple chain
  const [balances, setBalances] = useState<Record<string, string>>({});

  // Default active chain
  const [activeChainId, setActiveChainId] =
    useState<ChainId>("ethereum-mainnet");

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Ambil config chain yang aktif saat ini
  const activeChainConfig =
    SUPPORTED_CHAINS.find((c) => c.id === activeChainId) || SUPPORTED_CHAINS[0];
  const currentBalance = balances[activeChainId] || "0.0000";

  // Fungsi fetch balance untuk SEMUA chain yang didukung
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

  // Load data saat screen fokus
  useFocusEffect(
    useCallback(() => {
      fetchAllBalances();
    }, [fetchAllBalances]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllBalances();
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
        onNotifPress={() => router.push("/notifications")}
        onScanPress={() => router.push("/scan")}
        hasNotif={true}
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
        {/* ── Balance Card ── */}
        <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
          {/* Decorative circles */}
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          {/* Network badge inside card - DINAMIS */}
          <View style={styles.netBadgeInCard}>
            <View style={styles.netDot} />
            <Text style={styles.netText}>{activeChainConfig.name}</Text>
          </View>

          <Text style={styles.balCardLabel}>Total Balance</Text>

          {isLoading && !refreshing ? (
            <ActivityIndicator
              size="large"
              color="#fff"
              style={{ marginVertical: 16 }}
            />
          ) : (
            <>
              <Text style={styles.balAmount}>{currentBalance}</Text>
              <Text style={styles.balUnit}>{activeChainConfig.symbol}</Text>
              <Text style={styles.balFiat}>≈ $0.00 USD</Text>
            </>
          )}

          {/* Bottom row: address + refresh */}
          <View style={styles.cardBottomRow}>
            <TouchableOpacity
              style={styles.addrPill}
              onPress={copyToClipboard}
              activeOpacity={0.8}
            >
              {copied ? (
                <Check size={13} color="#fff" strokeWidth={2.5} />
              ) : (
                <Copy size={13} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              )}
              <Text style={styles.addrPillText}>
                {copied ? "Tersalin!" : shortAddr}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={fetchAllBalances}
              activeOpacity={0.8}
            >
              <RefreshCw
                size={14}
                color="rgba(255,255,255,0.8)"
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View
          style={[
            styles.qaCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <QuickAction
            label="Kirim"
            Icon={ArrowUpRight}
            accent="#EF4444"
            onPress={() => router.push("/send")}
            theme={theme}
          />
          <View style={[styles.qaDivider, { backgroundColor: theme.border }]} />
          <QuickAction
            label="Terima"
            Icon={ArrowDownLeft}
            accent="#22C55E"
            onPress={() => router.push("/receive")}
            theme={theme}
          />
          <View style={[styles.qaDivider, { backgroundColor: theme.border }]} />
          <QuickAction
            label="Swap"
            Icon={Repeat2}
            accent="#3B82F6"
            onPress={() => {}}
            theme={theme}
          />
          <View style={[styles.qaDivider, { backgroundColor: theme.border }]} />
          <QuickAction
            label="Riwayat"
            Icon={Timer}
            accent="#A855F7"
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

        {/* Render Asset List Dinamis berdasarkan SUPPORTED_CHAINS */}
        {SUPPORTED_CHAINS.map((chain) => {
          const bal = balances[chain.id] || "0.0000";
          const isActive = chain.id === activeChainId;

          return (
            <TouchableOpacity
              key={chain.id}
              activeOpacity={0.7}
              onPress={() => setActiveChainId(chain.id as ChainId)}
              style={[
                styles.assetCard,
                {
                  backgroundColor: theme.card,
                  borderColor: isActive ? theme.primary : theme.border,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              {/* Gunakan Komponen ChainIcon Custom */}
              <ChainIcon chainId={chain.id} symbol={chain.symbol} />

              <View style={styles.assetInfo}>
                <Text style={[styles.assetName, { color: theme.text }]}>
                  {chain.name.split(" ")[0]}
                </Text>
                <Text style={[styles.assetSub, { color: theme.textSecondary }]}>
                  {chain.symbol} •{" "}
                  {chain.name.includes("Mainnet") ? "Mainnet" : "Testnet"}
                </Text>
              </View>

              <View style={styles.assetRight}>
                <Text style={[styles.assetBal, { color: theme.text }]}>
                  {bal} {chain.symbol}
                </Text>
                <Text
                  style={[styles.assetFiat, { color: theme.textSecondary }]}
                >
                  $0.00
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ✅ Tambah padding bottom biar tidak ketutup tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
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
  // Balance card
  balanceCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  decCircle1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -70,
    right: -50,
  },
  decCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -40,
    left: -20,
  },
  // Network badge inside card
  netBadgeInCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  netDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  netText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  balCardLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  balAmount: {
    color: "#fff",
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: -1.5,
    lineHeight: 54,
  },
  balUnit: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  balFiat: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    marginBottom: 24,
  },
  // Card bottom row
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addrPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addrPillText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Quick actions
  qaCard: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginBottom: 28,
    alignItems: "center",
  },
  qaWrap: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  qaBtn: {
    width: 52,
    height: 52,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  qaLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  qaDivider: {
    width: 1,
    height: 40,
    borderRadius: 1,
  },
  // Section header
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
  // Asset card
  assetCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  assetIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  assetInfo: { flex: 1 },
  assetName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  assetSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  assetRight: { alignItems: "flex-end" },
  assetBal: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  assetFiat: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Empty hint
  emptyHint: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  emptyHintText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
