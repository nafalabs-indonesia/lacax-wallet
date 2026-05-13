// app/(tabs)/earn.tsx
import { router } from "expo-router";
import {
    AlertCircle,
    ChevronRight,
    Lock,
    Percent,
    TrendingUp,
    Unlock,
    Zap,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface StakingPool {
  id: string;
  name: string;
  symbol: string;
  apy: string;
  apyValue: number;
  lockPeriod: string;
  minStake: string;
  tvl: string;
  isLocked: boolean;
  tag?: "Hot" | "New" | "Stable";
  tagColor?: string;
}

interface ActiveStake {
  id: string;
  name: string;
  symbol: string;
  staked: string;
  earned: string;
  apy: string;
  unlockDate: string;
  isUnlockable: boolean;
}

// ─────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────
const STAKING_POOLS: StakingPool[] = [
  {
    id: "eth-flex",
    name: "Ethereum",
    symbol: "ETH",
    apy: "4.20%",
    apyValue: 4.2,
    lockPeriod: "Fleksibel",
    minStake: "0.01 ETH",
    tvl: "$2.4M",
    isLocked: false,
    tag: "Stable",
    tagColor: "#22C55E",
  },
  {
    id: "bdag-30",
    name: "BlockDAG",
    symbol: "BDAG",
    apy: "18.50%",
    apyValue: 18.5,
    lockPeriod: "30 Hari",
    minStake: "100 BDAG",
    tvl: "$820K",
    isLocked: true,
    tag: "Hot",
    tagColor: "#EF4444",
  },
  {
    id: "bdag-90",
    name: "BlockDAG",
    symbol: "BDAG",
    apy: "34.00%",
    apyValue: 34.0,
    lockPeriod: "90 Hari",
    minStake: "500 BDAG",
    tvl: "$1.1M",
    isLocked: true,
    tag: "New",
    tagColor: "#8B5CF6",
  },
  {
    id: "eth-90",
    name: "Ethereum",
    symbol: "ETH",
    apy: "8.75%",
    apyValue: 8.75,
    lockPeriod: "90 Hari",
    minStake: "0.1 ETH",
    tvl: "$5.8M",
    isLocked: true,
  },
];

const ACTIVE_STAKES: ActiveStake[] = [
  {
    id: "s1",
    name: "BlockDAG 30D",
    symbol: "BDAG",
    staked: "500.00",
    earned: "12.45",
    apy: "18.50%",
    unlockDate: "12 Jun 2026",
    isUnlockable: false,
  },
];

// ─────────────────────────────────────────────
// Summary Card (Total Earned)
// ─────────────────────────────────────────────
function EarnSummary({ theme }: { theme: any }) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.primary + "12",
          borderColor: theme.primary + "30",
        },
      ]}
    >
      <View style={styles.summaryLeft}>
        <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
          Total Earned
        </Text>
        <Text style={[styles.summaryAmount, { color: theme.text }]}>
          $24.83
        </Text>
        <View style={styles.summaryBadge}>
          <TrendingUp size={11} color="#22C55E" strokeWidth={2.5} />
          <Text style={styles.summaryBadgeText}>+$2.14 bulan ini</Text>
        </View>
      </View>
      <View style={styles.summaryRight}>
        <View
          style={[
            styles.summaryIconWrap,
            { backgroundColor: theme.primary + "20" },
          ]}
        >
          <Percent size={28} color={theme.primary} strokeWidth={2} />
        </View>
        <Text style={[styles.summaryApy, { color: theme.primary }]}>
          Avg APY 18.5%
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Active Stake Card
// ─────────────────────────────────────────────
function ActiveStakeCard({ stake, theme }: { stake: ActiveStake; theme: any }) {
  return (
    <View
      style={[
        styles.activeCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.activeCardTop}>
        <View>
          <Text style={[styles.activeName, { color: theme.text }]}>
            {stake.name}
          </Text>
          <Text style={[styles.activeApy, { color: theme.primary }]}>
            {stake.apy} APY
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.unstakeBtn,
            {
              backgroundColor: stake.isUnlockable ? theme.primary : theme.card,
              borderColor: stake.isUnlockable ? theme.primary : theme.border,
            },
          ]}
          disabled={!stake.isUnlockable}
          activeOpacity={0.8}
        >
          {stake.isUnlockable ? (
            <Unlock size={13} color="#fff" strokeWidth={2.5} />
          ) : (
            <Lock size={13} color={theme.textSecondary} strokeWidth={2.5} />
          )}
          <Text
            style={[
              styles.unstakeBtnText,
              { color: stake.isUnlockable ? "#fff" : theme.textSecondary },
            ]}
          >
            {stake.isUnlockable ? "Unstake" : "Terkunci"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activeCardStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Staked
          </Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {stake.staked} {stake.symbol}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Earned
          </Text>
          <Text style={[styles.statValue, { color: "#22C55E" }]}>
            +{stake.earned} {stake.symbol}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Unlock
          </Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {stake.unlockDate}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Pool Card
// ─────────────────────────────────────────────
function PoolCard({ pool, theme }: { pool: StakingPool; theme: any }) {
  return (
    <TouchableOpacity
      style={[
        styles.poolCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      activeOpacity={0.75}
    >
      {/* Tag */}
      {pool.tag && (
        <View
          style={[styles.poolTag, { backgroundColor: pool.tagColor + "20" }]}
        >
          <Text style={[styles.poolTagText, { color: pool.tagColor }]}>
            {pool.tag}
          </Text>
        </View>
      )}

      <View style={styles.poolTop}>
        <View style={styles.poolTitleRow}>
          {pool.isLocked ? (
            <Lock size={14} color={theme.textSecondary} strokeWidth={2} />
          ) : (
            <Zap size={14} color="#F59E0B" strokeWidth={2} />
          )}
          <Text style={[styles.poolName, { color: theme.text }]}>
            {pool.name} · {pool.lockPeriod}
          </Text>
        </View>
        <ChevronRight size={16} color={theme.textSecondary} strokeWidth={2} />
      </View>

      <View style={styles.poolStats}>
        <View style={styles.poolStat}>
          <Text style={[styles.poolStatLabel, { color: theme.textSecondary }]}>
            APY
          </Text>
          <Text style={[styles.poolStatValue, { color: "#22C55E" }]}>
            {pool.apy}
          </Text>
        </View>
        <View style={styles.poolStat}>
          <Text style={[styles.poolStatLabel, { color: theme.textSecondary }]}>
            Min
          </Text>
          <Text style={[styles.poolStatValue, { color: theme.text }]}>
            {pool.minStake}
          </Text>
        </View>
        <View style={styles.poolStat}>
          <Text style={[styles.poolStatLabel, { color: theme.textSecondary }]}>
            TVL
          </Text>
          <Text style={[styles.poolStatValue, { color: theme.text }]}>
            {pool.tvl}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function EarnScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<"pools" | "active">("pools");

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <HomeHeader
        onSettingsPress={() => router.push("/settings")}
        onScanPress={() => router.push("/scan")}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Earn</Text>
          <View style={styles.apyBadge}>
            <TrendingUp size={13} color="#22C55E" strokeWidth={2.5} />
            <Text style={styles.apyBadgeText}>Hingga 34% APY</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View
          style={[
            styles.disclaimer,
            { backgroundColor: "#F59E0B12", borderColor: "#F59E0B30" },
          ]}
        >
          <AlertCircle size={14} color="#F59E0B" strokeWidth={2} />
          <Text style={[styles.disclaimerText, { color: "#F59E0B" }]}>
            Staking mengandung risiko. Pastikan kamu memahami syarat sebelum
            berpartisipasi.
          </Text>
        </View>

        {/* Summary */}
        <EarnSummary theme={theme} />

        {/* Sub-tab */}
        <View
          style={[
            styles.subTabRow,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {(["pools", "active"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.subTab,
                activeTab === tab && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.subTabText,
                  { color: activeTab === tab ? "#fff" : theme.textSecondary },
                  activeTab === tab && { fontWeight: "700" },
                ]}
              >
                {tab === "pools"
                  ? "Pool Tersedia"
                  : `Staking Aktif (${ACTIVE_STAKES.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === "pools" ? (
          <View style={styles.poolList}>
            {STAKING_POOLS.map((pool) => (
              <PoolCard key={pool.id} pool={pool} theme={theme} />
            ))}
          </View>
        ) : (
          <View style={styles.activeList}>
            {ACTIVE_STAKES.length === 0 ? (
              <View style={styles.emptyState}>
                <TrendingUp
                  size={40}
                  color={theme.textSecondary}
                  strokeWidth={1.5}
                />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  Belum ada staking aktif
                </Text>
                <Text
                  style={[styles.emptyDesc, { color: theme.textSecondary }]}
                >
                  Pilih pool dan mulai earn sekarang
                </Text>
              </View>
            ) : (
              ACTIVE_STAKES.map((stake) => (
                <ActiveStakeCard key={stake.id} stake={stake} theme={theme} />
              ))
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 8 },

  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  apyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#22C55E15",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  apyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22C55E",
  },

  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },

  // Summary
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  summaryLeft: { gap: 4 },
  summaryLabel: { fontSize: 12, fontWeight: "500" },
  summaryAmount: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  summaryBadgeText: { fontSize: 12, fontWeight: "600", color: "#22C55E" },
  summaryRight: { alignItems: "center", gap: 8 },
  summaryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryApy: { fontSize: 12, fontWeight: "700" },

  // Sub-tab
  subTabRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  subTab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  subTabText: { fontSize: 13 },

  // Pool card
  poolList: { gap: 12 },
  poolCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
  poolTag: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 10,
  },
  poolTagText: { fontSize: 11, fontWeight: "700" },
  poolTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  poolTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  poolName: { fontSize: 15, fontWeight: "700" },
  poolStats: { flexDirection: "row", justifyContent: "space-between" },
  poolStat: { alignItems: "center", gap: 3 },
  poolStatLabel: { fontSize: 11, fontWeight: "500" },
  poolStatValue: { fontSize: 15, fontWeight: "700" },

  // Active stake card
  activeList: { gap: 12 },
  activeCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  activeCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  activeName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  activeApy: { fontSize: 13, fontWeight: "600" },
  unstakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  unstakeBtnText: { fontSize: 13, fontWeight: "700" },
  activeCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statValue: { fontSize: 13, fontWeight: "700" },
  statDivider: { width: 1, height: 30 },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13 },
});
