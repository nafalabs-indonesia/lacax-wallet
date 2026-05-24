import { ChainConfig, SUPPORTED_CHAINS } from "@/config/chains";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  RefreshCw,
  Repeat,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

const CHAIN_ICONS: Record<number, any> = {
  1: require("../../assets/chains/eth.png"),
  11155111: require("../../assets/chains/eth-sepolia.png"),
  56: require("../../assets/chains/bnb.png"),
  97: require("../../assets/chains/bnb.png"),
  137: require("../../assets/chains/polygon.png"),
  80001: require("../../assets/chains/polygon.png"),
  1404: require("../../assets/chains/bdag.png"),
  1043: require("../../assets/chains/bdag.png"),
  80002: require("../../assets/chains/polygon.png"),
  42161: require("../../assets/chains/arbitrum.png"),
  421614: require("../../assets/chains/arbitrum.png"),
  143: require("../../assets/chains/monad.png"),
  10143: require("../../assets/chains/monad.png"),
};

type TxStatus = "confirmed" | "pending" | "failed";
type TxType = "send" | "receive" | "swap";

interface TxEntity {
  hash: string;
  from: string;
  to: string;
  value: string;
  symbol: string;
  timestamp: number;
  status: TxStatus;
  type: TxType;
  blockNumber?: number;
  chainId?: number;
  chainName?: string;
  chainIcon?: string;
}

interface DisplayTransaction extends TxEntity {
  displayDate?: string;
  displayTime?: string;
}

const getRelativeDate = (ts: number) => {
  const now = new Date();
  const txDate = new Date(ts);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const transactionDay = new Date(
    txDate.getFullYear(),
    txDate.getMonth(),
    txDate.getDate(),
  );

  const diffTime = today.getTime() - transactionDay.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return txDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const truncate = (str: string, s = 6, e = 4) =>
  str ? `${str.slice(0, s)}…${str.slice(-e)}` : "";

const shortChainName = (name: string) =>
  name.replace(" Mainnet", "").replace(" Testnet", "");

function TxRow({ tx, theme }: { tx: DisplayTransaction; theme: any }) {
  let displayValue = tx.value;
  let isIncoming = false;

  if (tx.type === "receive") {
    isIncoming = true;
  } else if (tx.type === "send") {
    isIncoming = false;
  } else {
    const rawVal = tx.value.trim();
    if (rawVal.startsWith("+")) {
      isIncoming = true;
    } else if (rawVal.startsWith("-")) {
      isIncoming = false;
    } else {
      if (tx.type === "swap") {
        isIncoming = false;
      }
    }
  }

  const cleanValue = displayValue.replace(/^[-+]/, "").trim();

  const spaceIndex = cleanValue.indexOf(" ");
  let amountPart = cleanValue;
  let symbolPart = "";

  if (spaceIndex !== -1) {
    amountPart = cleanValue.substring(0, spaceIndex);
    symbolPart = cleanValue.substring(spaceIndex + 1);
  } else {
    symbolPart = tx.symbol || "";
  }

  const signedAmount = isIncoming ? `+${amountPart}` : `-${amountPart}`;

  let iconBgColor = "";
  let iconTintColor = "";
  let valueTextColor = "";

  if (isIncoming) {
    iconBgColor = theme.isDarkMode ? "#064E3B" : "#DCFCE7";
    iconTintColor = "#7ed957";
    valueTextColor = "#7ed957";
  } else {
    iconBgColor = theme.isDarkMode ? "#451A03" : "#FFEDD5";
    iconTintColor = "#F97316";
    valueTextColor = theme.isDarkMode ? "#FFFFFF" : "#1F2937";
  }

  let IconComponent = ArrowDownLeft;
  let BadgeComponent: React.ElementType | null = null;

  if (tx.type === "send") {
    IconComponent = ArrowUpRight;
    BadgeComponent = ArrowUpRight;
  } else if (tx.type === "swap") {
    IconComponent = Repeat;
    BadgeComponent = null;
  } else if (tx.type === "receive") {
    IconComponent = ArrowDownLeft;
    BadgeComponent = ArrowDownLeft;
  }

  let title = "Transaction";
  let subtitle = "";

  if (tx.type === "swap") {
    title = "Swapped";
    subtitle = tx.chainName ? shortChainName(tx.chainName) : "Uniswap";
  } else if (tx.type === "send") {
    title = "Sent";
    subtitle = `To ${truncate(tx.to)}`;
  } else {
    title = "Received";
    subtitle = `From ${truncate(tx.from)}`;
  }

  let BadgeContent = null;
  if (tx.type === "swap") {
    if (tx.chainId && CHAIN_ICONS[tx.chainId]) {
      BadgeContent = (
        <Image
          source={CHAIN_ICONS[tx.chainId]}
          style={{ width: 10, height: 10 }}
          resizeMode="contain"
        />
      );
    }
  } else if (BadgeComponent) {
    BadgeContent = (
      <BadgeComponent size={8} color={theme.text} strokeWidth={3} />
    );
  }

  return (
    <View style={styles.txRow}>
      <View style={[styles.iconWrapper]}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          {tx.chainId && CHAIN_ICONS[tx.chainId] ? (
            <Image
              source={CHAIN_ICONS[tx.chainId]}
              style={styles.chainIconInside}
              resizeMode="contain"
            />
          ) : (
            <IconComponent size={20} color={iconTintColor} strokeWidth={2.5} />
          )}
        </View>

        {BadgeContent && (
          <View
            style={[
              styles.badgeContainer,
              { backgroundColor: theme.card, borderColor: theme.text },
            ]}
          >
            {BadgeContent}
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.txTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.txSubtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.valueContainer}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <Text
            style={[styles.txValue, { color: valueTextColor }]}
            numberOfLines={1}
          >
            {signedAmount}
          </Text>
          {symbolPart ? (
            <Text
              style={[styles.txSymbol, { color: valueTextColor }]}
              numberOfLines={1}
            >
              {" "}
              {symbolPart}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { walletAddress, isDarkMode } = useAppStore();
  const theme = {
    ...(isDarkMode ? Colors.dark : Colors.light),
    isDarkMode: isDarkMode,
  };

  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [filteredTx, setFilteredTx] = useState<DisplayTransaction[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").height),
  ).current;

  const fetchHistory = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoading(true);
    try {
      let allTxs: DisplayTransaction[] = [];
      const chains = selectedChain
        ? [selectedChain]
        : SUPPORTED_CHAINS.filter((c) => !c.disabled);

      for (const chain of chains) {
        try {
          const rawTxs = await BlockchainService.getTransactionHistory(
            chain.id as ChainId,
            walletAddress,
          );

          if (rawTxs.length) {
            const normalizedTxs = rawTxs.map((tx: any) => {
              const isSend =
                tx.from.toLowerCase() === walletAddress.toLowerCase();
              const type: TxType = isSend ? "send" : "receive";

              let valNum = parseFloat(tx.value);
              if (isNaN(valNum)) valNum = 0;

              const sign = isSend ? "-" : "+";
              const formattedValue = `${sign}${valNum.toFixed(4)}`;

              return {
                ...tx,
                hash: tx.hash || tx.txnHash,
                type,
                value: formattedValue,
                symbol: chain.symbol,
                chainId: chain.chainId,
                chainName: chain.name,
                chainIcon: chain.icon,

                timestamp: tx.timestamp,
                displayDate: getRelativeDate(tx.timestamp),
                displayTime: formatTime(tx.timestamp),
              };
            });

            allTxs.push(...normalizedTxs);
          }
        } catch (e) {
          console.warn(`Failed to fetch ${chain.name}:`, e);
        }

        await new Promise((r) => setTimeout(r, 300));
      }

      allTxs.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(allTxs);
    } catch (e) {
      console.error("History fetch failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, selectedChain]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  useEffect(() => {
    setFilteredTx(transactions);
  }, [transactions]);

  const openModal = () => {
    setIsModalVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").height,
      duration: 260,
      useNativeDriver: true,
    }).start(() => setIsModalVisible(false));
  };

  const selectChain = (c: ChainConfig | null) => {
    setSelectedChain(c);
    closeModal();
  };

  const grouped = filteredTx.reduce(
    (acc, tx) => {
      const key = tx.displayDate ?? "Unknown";
      (acc[key] = acc[key] ?? []).push(tx);
      return acc;
    },
    {} as Record<string, DisplayTransaction[]>,
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <HomeHeader
        onSettingsPress={() => router.push("/settings")}
        onScanPress={() => router.push("/scan")}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={openModal}
            activeOpacity={0.75}
          >
            {selectedChain ? (
              <>
                <Image
                  source={
                    CHAIN_ICONS[selectedChain.chainId] ?? {
                      uri: selectedChain.icon,
                    }
                  }
                  style={styles.pillIcon}
                  resizeMode="contain"
                />
                <Text style={[styles.pillLabel, { color: theme.text }]}>
                  {shortChainName(selectedChain.name)}
                </Text>
              </>
            ) : (
              <Text style={[styles.pillLabel, { color: theme.text }]}>
                All Chains
              </Text>
            )}
            <ChevronDown size={14} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={fetchHistory}
            activeOpacity={0.75}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <RefreshCw size={15} color={theme.text} strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        </View>

        {isLoading && transactions.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.text} />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Loading history…
            </Text>
          </View>
        ) : filteredTx.length === 0 ? (
          <View style={styles.centered}>
            <View style={[styles.emptyCircle, { backgroundColor: theme.card }]}>
              <Clock size={28} color={theme.textSecondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No transactions yet
            </Text>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              {selectedChain
                ? `No history on ${shortChainName(selectedChain.name)}.`
                : "Transactions across supported networks will appear here."}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {Object.entries(grouped).map(([date, txs]) => (
              <View key={date}>
                <Text
                  style={[styles.dateLabel, { color: theme.textSecondary }]}
                >
                  {date}
                </Text>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  {txs.map((tx, i) => (
                    <React.Fragment key={tx.hash + i}>
                      <TxRow tx={tx} theme={theme} />
                      {i < txs.length - 1 && (
                        <View
                          style={[
                            styles.sep,
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

      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.overlay}>
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.card,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View
                style={[styles.sheetHead, { borderBottomColor: theme.border }]}
              >
                <Text style={[styles.sheetTitle, { color: theme.text }]}>
                  Filter by Chain
                </Text>
                <TouchableOpacity onPress={closeModal} hitSlop={8}>
                  <X size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView bounces={false}>
                <ChainRow
                  label="All Chains"
                  subLabel={`${SUPPORTED_CHAINS.filter((c) => !c.disabled).length} networks`}
                  isSelected={!selectedChain}
                  onPress={() => selectChain(null)}
                  theme={theme}
                />

                {SUPPORTED_CHAINS.filter((c) => !c.disabled).map((chain) => {
                  const isBnb = chain.chainId === 56 || chain.chainId === 97;
                  return (
                    <ChainRow
                      key={chain.id}
                      label={chain.name}
                      subLabel={isBnb ? "History not supported yet" : undefined}
                      icon={CHAIN_ICONS[chain.chainId] ?? { uri: chain.icon }}
                      isSelected={selectedChain?.id === chain.id}
                      onPress={() => selectChain(chain)}
                      theme={theme}
                    />
                  );
                })}
                <View style={{ height: 20 }} />
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

function ChainRow({
  label,
  subLabel,
  icon,
  isSelected,
  onPress,
  theme,
}: {
  label: string;
  subLabel?: string;
  icon?: any;
  isSelected: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chainRow,
        { borderBottomColor: theme.border },
        isSelected && { backgroundColor: (theme.primary ?? "#6366F1") + "10" },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.chainIconWrap, { backgroundColor: theme.background }]}
      >
        {icon ? (
          <Image
            source={icon}
            style={styles.chainIconMd}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[
              styles.chainIconMd,
              { borderRadius: 12, backgroundColor: theme.border },
            ]}
          />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.chainLabel, { color: theme.text }]}>{label}</Text>
        {subLabel && (
          <Text style={[styles.chainSub, { color: theme.textSecondary }]}>
            {subLabel}
          </Text>
        )}
      </View>

      {isSelected && (
        <Check size={18} color={theme.primary ?? "#6366F1"} strokeWidth={2.5} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingTop: 8 },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillIcon: { width: 16, height: 16, overflow: "hidden", borderRadius: 8 },
  pillLabel: { fontSize: 14, fontWeight: "600" },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  dateLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
    marginBottom: 10,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },

  iconWrapper: {
    position: "relative",
    width: 44,
    height: 44,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },

  chainIconInside: {
    width: 50,
    height: 50,
    overflow: "hidden",
  },

  badgeContainer: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    zIndex: 10,
  },

  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },

  txTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },

  txSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 2,
  },

  valueContainer: {
    alignItems: "flex-end",
    flexShrink: 0,
  },

  txValue: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "right",
  },

  txSymbol: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "right",
    marginLeft: 4,
  },

  sep: {
    height: 1,
    marginLeft: 74,
    marginRight: 16,
    opacity: 0.5,
  },

  centered: {
    paddingVertical: 64,
    alignItems: "center",
    gap: 10,
  },
  emptyCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  hint: { fontSize: 13, textAlign: "center", maxWidth: 240, lineHeight: 19 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "95%",
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700" },

  chainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
  },
  chainIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chainIconMd: { width: 35, height: 35, overflow: "hidden", borderRadius: 33 },
  chainLabel: { fontSize: 15, fontWeight: "600" },
  chainSub: { fontSize: 11, marginTop: 1 },
});
