// app/notifications.tsx
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    Bell,
    CheckCheck,
    Clock,
    ExternalLink,
    Trash2,
    Wallet,
    XCircle,
} from "lucide-react-native";
import React from "react";
import {
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

interface Notification {
  id: string;
  type: "transaction" | "walletconnect" | "system" | "security";
  title: string;
  message: string;
  time: string;
  read: boolean;
  data?: any;
}

// Dummy data
const DUMMY_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "transaction",
    title: "Transaksi Berhasil",
    message: "Anda menerima 0.5 ETH dari 0x1234...5678",
    time: "2 menit yang lalu",
    read: false,
    data: { txHash: "0xabc..." },
  },
  {
    id: "2",
    type: "walletconnect",
    title: "WalletConnect",
    message: "Uniswap meminta persetujuan transaksi",
    time: "15 menit yang lalu",
    read: false,
    data: { dappName: "Uniswap", sessionId: "wc-123" },
  },
  {
    id: "3",
    type: "security",
    title: "Peringatan Keamanan",
    message: "Login dari perangkat baru terdeteksi",
    time: "1 jam yang lalu",
    read: true,
  },
  {
    id: "4",
    type: "system",
    title: "Update Tersedia",
    message: "Versi baru Lacax Wallet telah tersedia",
    time: "3 jam yang lalu",
    read: true,
  },
  {
    id: "5",
    type: "transaction",
    title: "Transaksi Gagal",
    message: "Gas fee tidak cukup untuk transaksi",
    time: "Kemarin",
    read: true,
    data: { error: "INSUFFICIENT_GAS" },
  },
];

function getIcon(type: Notification["type"]) {
  switch (type) {
    case "transaction":
      return <Wallet size={18} color="#10B981" />;
    case "walletconnect":
      return <ExternalLink size={18} color="#8B5CF6" />;
    case "security":
      return <XCircle size={18} color="#EF4444" />;
    case "system":
      return <Bell size={18} color="#3B82F6" />;
  }
}

function getIconBg(type: Notification["type"]) {
  switch (type) {
    case "transaction":
      return "#10B98115";
    case "walletconnect":
      return "#8B5CF615";
    case "security":
      return "#EF444415";
    case "system":
      return "#3B82F615";
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [notifications, setNotifications] = React.useState(DUMMY_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotif = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notifItem,
        {
          backgroundColor: item.read ? "transparent" : theme.card,
          borderColor: theme.border,
        },
      ]}
      onPress={() => {
        // Mark as read
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
        );

        // Handle navigation based on type
        if (item.type === "transaction" && item.data?.txHash) {
          // router.push({ pathname: "/tx-detail", params: { hash: item.data.txHash } });
        } else if (item.type === "walletconnect") {
          // Handle WC approval
        }
      }}
      activeOpacity={0.7}
    >
      {/* Unread indicator */}
      {!item.read && (
        <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
      )}

      {/* Icon */}
      <View
        style={[styles.iconWrap, { backgroundColor: getIconBg(item.type) }]}
      >
        {getIcon(item.type)}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontWeight: item.read ? "500" : "700",
              },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <TouchableOpacity
            onPress={() => deleteNotif(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={14} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text
          style={[styles.message, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {item.message}
        </Text>
        <View style={styles.timeRow}>
          <Clock size={12} color={theme.textSecondary} />
          <Text style={[styles.time, { color: theme.textSecondary }]}>
            {item.time}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Bell size={48} color={theme.textSecondary} strokeWidth={1.5} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Belum Ada Notifikasi
      </Text>
      <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
        Notifikasi transaksi dan keamanan akan muncul di sini
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Notifikasi
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <CheckCheck size={22} color={theme.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          notifications.length === 0 ? { flex: 1 } : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 15,
    flex: 1,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
