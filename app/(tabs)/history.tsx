// app/(tabs)/history.tsx
import { SUPPORTED_CHAINS } from "@/config/chains";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Search,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
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
// Types & Interfaces
// ─────────────────────────────────────────────
type FilterType = "all" | "send" | "receive";
type TxStatus = "confirmed" | "pending" | "failed";
type TxType = "send" | "receive";

interface TxEntity {
  hash: string;
  from: string;
  to: string;
  value: string; // Formatted value (e.g., "0.5")
  symbol: string; // e.g., "ETH"
  timestamp: number; // Unix timestamp
  status: TxStatus;
  type: TxType;
  blockNumber?: number;
}

interface DisplayTransaction extends TxEntity {
  displayDate?: string; // e.g., "Today", "Yesterday"
  displayTime?: string; // e.g., "14:30"
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// Helper: Format Relative Date (English)
const getRelativeDate = (timestamp: number) => {
  const now = new Date();
  const txDate = new Date(timestamp * 1000);

  const nowDateOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const txDateOnly = new Date(
    txDate.getFullYear(),
    txDate.getMonth(),
    txDate.getDate(),
  );

  const diffTime = nowDateOnly.getTime() - txDateOnly.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return txDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// Helper: Truncate Address/Hash
const truncate = (str: string, start = 6, end = 4) => {
  if (!str) return "";
  return `${str.substring(0, start)}...${str.substring(str.length - end)}`;
};

// ─────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────
function StatusBadge({ status }: { status: TxStatus }) {
  let config = { label: "Success", color: "#22C55E", bg: "#22C55E15" };

  if (status === "pending") {
    config = { label: "Pending", color: "#F59E0B", bg: "#F59E0B15" };
  } else if (status === "failed") {
    config = { label: "Failed", color: "#EF4444", bg: "#EF444415" };
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Transaction Row Component
// ─────────────────────────────────────────────
function TxRow({ tx, theme }: { tx: DisplayTransaction; theme: any }) {
  const isSend = tx.type === "send";
  const isFailed = tx.status === "failed";

  return (
    <TouchableOpacity
      style={[styles.txRow, { borderBottomColor: theme.border }]}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        style={[
          styles.txIcon,
          {
            backgroundColor: isFailed
              ? "#EF444410"
              : isSend
                ? "#EF444415"
                : "#22C55E15",
          },
        ]}
      >
        {isFailed ? (
          <Clock size={20} color="#EF4444" strokeWidth={2} />
        ) : isSend ? (
          <ArrowUpRight size={20} color="#EF4444" strokeWidth={2.5} />
        ) : (
          <ArrowDownLeft size={20} color="#22C55E" strokeWidth={2.5} />
        )}
      </View>

      {/* Info Content */}
      <View style={styles.txInfo}>
        {/* Top: Type/Token & Amount */}
        <View style={styles.txTopRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.txTitle, { color: theme.text }]}>
              {isSend ? "Sent" : "Received"}
            </Text>
            <Text style={[styles.txSymbol, { color: theme.textSecondary }]}>
              {tx.symbol}
            </Text>
          </View>

          <Text
            style={[
              styles.txAmount,
              {
                color: isFailed
                  ? theme.textSecondary
                  : isSend
                    ? theme.text
                    : "#22C55E",
              },
            ]}
          >
            {isSend ? "-" : "+"}
            {tx.value}
          </Text>
        </View>

        {/* Middle: Address */}
        <View style={styles.txMiddleRow}>
          <Text style={[styles.txAddress, { color: theme.textSecondary }]}>
            {isSend ? "To" : "From"} {truncate(isSend ? tx.to : tx.from)}
          </Text>
        </View>

        {/* Bottom: Date & Status */}
        <View style={styles.txBottomRow}>
          <Text style={[styles.txDate, { color: theme.textSecondary }]}>
            {tx.displayTime} • {tx.displayDate}
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
  const { walletAddress, isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [filteredTx, setFilteredTx] = useState<DisplayTransaction[]>([]);

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoading(true);

    try {
      // ✅ Use the fast API-based method from BlockchainService
      const primaryChain = SUPPORTED_CHAINS[0].id as ChainId;
      const txs = await BlockchainService.getTransactionHistory(
        primaryChain,
        walletAddress,
      );

      // Enrich with display data
      const enriched = txs.map((tx) => ({
        ...tx,
        displayDate: getRelativeDate(tx.timestamp),
        displayTime: formatTime(tx.timestamp),
      }));

      setTransactions(enriched);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  // Filter Logic
  React.useEffect(() => {
    let result = transactions;

    // 1. Filter by Type
    if (filter !== "all") {
      result = result.filter((tx) => tx.type === filter);
    }

    // 2. Filter by Search
    if (search.trim() !== "") {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.symbol.toLowerCase().includes(lowerSearch) ||
          tx.hash.toLowerCase().includes(lowerSearch) ||
          tx.from.toLowerCase().includes(lowerSearch) ||
          tx.to.toLowerCase().includes(lowerSearch),
      );
    }

    setFilteredTx(result);
  }, [transactions, filter, search]);

  const handleRefresh = () => {
    fetchHistory();
  };

  // Grouping transactions by Date Header
  const groupedTransactions = filteredTx.reduce(
    (acc, tx) => {
      const date = tx.displayDate || "Unknown";
      if (!acc[date]) acc[date] = [];
      acc[date].push(tx);
      return acc;
    },
    {} as Record<string, DisplayTransaction[]>,
  );

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
          <Text style={[styles.pageTitle, { color: theme.text }]}>History</Text>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: theme.card }]}
            onPress={handleRefresh}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <RefreshCw size={18} color={theme.text} strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Search size={18} color={theme.textSecondary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search hash, address, or token..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { key: "all", label: "All" },
            { key: "receive", label: "Incoming" },
            { key: "send", label: "Outgoing" },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    filter === f.key ? theme.primary + "20" : theme.card,
                  borderColor: filter === f.key ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setFilter(f.key as FilterType)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterLabel,
                  {
                    color:
                      filter === f.key ? theme.primary : theme.textSecondary,
                    fontWeight: filter === f.key ? "700" : "500",
                  },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transaction List */}
        {isLoading && transactions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.text} />
            <Text style={{ color: theme.textSecondary, marginTop: 10 }}>
              Loading history...
            </Text>
          </View>
        ) : filteredTx.length === 0 ? (
          <View style={styles.emptyState}>
            <View
              style={[styles.emptyIconBox, { backgroundColor: theme.card }]}
            >
              <Clock size={32} color={theme.textSecondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No transactions yet
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Your transaction history will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {Object.entries(groupedTransactions).map(([date, txs]) => (
              <View key={date} style={styles.dateGroup}>
                <Text
                  style={[styles.dateHeader, { color: theme.textSecondary }]}
                >
                  {date}
                </Text>
                <View
                  style={[
                    styles.txListCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  {txs.map((tx, index) => (
                    <React.Fragment key={tx.hash + index}>
                      <TxRow tx={tx} theme={theme} />
                      {index < txs.length - 1 && (
                        <View
                          style={[
                            styles.divider,
                            { backgroundColor: theme.border },
                          ]}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
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
    marginBottom: 20,
    marginTop: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    color: "#ffffff",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
  },

  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  filterPill: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  filterLabel: {
    fontSize: 13,
  },

  listContainer: {
    gap: 20,
  },
  dateGroup: {
    gap: 8,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  txListCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  divider: {
    height: 1,
    marginLeft: 54,
    marginRight: 0,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  txInfo: { flex: 1, gap: 6 },
  txTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  txSymbol: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  txMiddleRow: {
    flexDirection: "row",
  },
  txAddress: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.8,
  },
  txBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  txDate: {
    fontSize: 12,
    fontWeight: "400",
    opacity: 0.6,
  },

  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    maxWidth: 250,
    lineHeight: 20,
  },
});
