// app/(tabs)/history.tsx
import { router } from "expo-router";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Clock,
    Filter,
    RefreshCw,
    Search,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type TxType = "send" | "receive";
type FilterType = "all" | "send" | "receive";

interface Transaction {
  id: string;
  type: TxType;
  amount: string;
  symbol: string;
  address: string;
  hash: string;
  date: string;
  status: "confirmed" | "pending" | "failed";
  usdValue?: string;
}

// ─────────────────────────────────────────────
// Mock data — ganti dengan data real dari RPC/indexer
// ─────────────────────────────────────────────
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    type: "receive",
    amount: "0.5420",
    symbol: "ETH",
    address: "0x1a2b...3c4d",
    hash: "0xabc123",
    date: "Hari ini, 14:32",
    status: "confirmed",
    usdValue: "$1,284.50",
  },
  {
    id: "2",
    type: "send",
    amount: "0.1000",
    symbol: "ETH",
    address: "0x9f8e...7d6c",
    hash: "0xdef456",
    date: "Hari ini, 09:15",
    status: "confirmed",
    usdValue: "$237.20",
  },
  {
    id: "3",
    type: "send",
    amount: "125.00",
    symbol: "BDAG",
    address: "0x5e4f...3a2b",
    hash: "0xghi789",
    date: "Kemarin, 18:44",
    status: "pending",
    usdValue: "$62.50",
  },
  {
    id: "4",
    type: "receive",
    amount: "0.2800",
    symbol: "ETH",
    address: "0xc1d2...e3f4",
    hash: "0xjkl012",
    date: "Kemarin, 11:20",
    status: "confirmed",
    usdValue: "$664.16",
  },
  {
    id: "5",
    type: "send",
    amount: "50.00",
    symbol: "BDAG",
    address: "0xa5b6...c7d8",
    hash: "0xmno345",
    date: "12 Mei 2026",
    status: "failed",
    usdValue: "$25.00",
  },
  {
    id: "6",
    type: "receive",
    amount: "1.0000",
    symbol: "ETH",
    address: "0xe9f0...a1b2",
    hash: "0xpqr678",
    date: "10 Mei 2026",
    status: "confirmed",
    usdValue: "$2,371.00",
  },
];

// ─────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────
function StatusBadge({ status }: { status: Transaction["status"] }) {
  const config = {
    confirmed: { label: "Sukses", color: "#22C55E", bg: "#22C55E15" },
    pending: { label: "Pending", color: "#F59E0B", bg: "#F59E0B15" },
    failed: { label: "Gagal", color: "#EF4444", bg: "#EF444415" },
  }[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Transaction Row
// ─────────────────────────────────────────────
function TxRow({ tx, theme }: { tx: Transaction; theme: any }) {
  const isSend = tx.type === "send";

  return (
    <TouchableOpacity
      style={[styles.txRow, { borderBottomColor: theme.border }]}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        style={[
          styles.txIcon,
          { backgroundColor: isSend ? "#EF444415" : "#22C55E15" },
        ]}
      >
        {isSend ? (
          <ArrowUpRight size={20} color="#EF4444" strokeWidth={2.5} />
        ) : (
          <ArrowDownLeft size={20} color="#22C55E" strokeWidth={2.5} />
        )}
      </View>

      {/* Info */}
      <View style={styles.txInfo}>
        <View style={styles.txTopRow}>
          <Text style={[styles.txTitle, { color: theme.text }]}>
            {isSend ? "Kirim" : "Terima"} {tx.symbol}
          </Text>
          <Text
            style={[styles.txAmount, { color: isSend ? "#EF4444" : "#22C55E" }]}
          >
            {isSend ? "-" : "+"}
            {tx.amount} {tx.symbol}
          </Text>
        </View>

        <View style={styles.txBottomRow}>
          <Text style={[styles.txAddress, { color: theme.textSecondary }]}>
            {isSend ? "Ke" : "Dari"} {tx.address}
          </Text>
          <Text style={[styles.txUsd, { color: theme.textSecondary }]}>
            {tx.usdValue}
          </Text>
        </View>

        <View style={styles.txMetaRow}>
          <Text style={[styles.txDate, { color: theme.textSecondary }]}>
            {tx.date}
          </Text>
          <StatusBadge status={tx.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function HistoryScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "receive", label: "Masuk" },
    { key: "send", label: "Keluar" },
  ];

  const filtered = MOCK_TRANSACTIONS.filter((tx) => {
    const matchFilter = filter === "all" || tx.type === filter;
    const matchSearch =
      search === "" ||
      tx.symbol.toLowerCase().includes(search.toLowerCase()) ||
      tx.address.toLowerCase().includes(search.toLowerCase()) ||
      tx.hash.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1200);
  };

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
          <Text style={[styles.pageTitle, { color: theme.text }]}>Riwayat</Text>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: theme.card }]}
            onPress={handleRefresh}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <RefreshCw size={15} color={theme.primary} strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Search size={16} color={theme.textSecondary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Cari transaksi, alamat, hash..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Filter size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    filter === f.key ? theme.primary : theme.card,
                  borderColor: filter === f.key ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterLabel,
                  {
                    color: filter === f.key ? "#fff" : theme.textSecondary,
                    fontWeight: filter === f.key ? "700" : "500",
                  },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={40} color={theme.textSecondary} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Belum ada transaksi
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Transaksi kamu akan muncul di sini
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.txList,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {filtered.map((tx) => (
              <TxRow key={tx.id} tx={tx} theme={theme} />
            ))}
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
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  filterLabel: {
    fontSize: 13,
  },

  txList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  txInfo: { flex: 1, gap: 4 },
  txTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  txBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  txAddress: { fontSize: 12, fontWeight: "500" },
  txUsd: { fontSize: 12, fontWeight: "500" },
  txMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  txDate: { fontSize: 11, fontWeight: "400" },

  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13, fontWeight: "400" },
});
