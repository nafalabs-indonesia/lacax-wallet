// app/(tabs)/index.tsx
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../../components/ui/Button";
import { EthereumService } from "../../services/blockchain/EthereumService";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function HomeScreen() {
  const { walletAddress, isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [balance, setBalance] = useState<string>("0.0000");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch saldo
  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      const ethBalance = await EthereumService.getBalance(walletAddress);
      setBalance(ethBalance);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      // Alert hanya jika bukan saat refresh
      if (!refreshing) {
        Alert.alert(
          "Gagal",
          "Tidak dapat mengambil saldo. Periksa koneksi Anda.",
        );
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [walletAddress, refreshing]);

  // Refresh otomatis saat tab aktif
  useFocusEffect(
    useCallback(() => {
      fetchBalance();
    }, [fetchBalance]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBalance();
  };

  const copyToClipboard = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Alert.alert("Disalin", "Alamat wallet telah disalin ke clipboard");
    }
  };

  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!walletAddress) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, textAlign: "center" }}>
          Wallet belum di-setup atau di-unlock.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
      style={{ backgroundColor: theme.background }}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Network Info */}
        <View style={styles.networkBadge}>
          <Text style={styles.networkText}>Sepolia Testnet • Alchemy</Text>
        </View>

        {/* Balance Card */}
        <View
          style={[
            styles.balanceCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {isLoading && !refreshing ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <>
              <Text
                style={[styles.balanceLabel, { color: theme.textSecondary }]}
              >
                Total Balance
              </Text>
              <Text style={[styles.balanceAmount, { color: theme.text }]}>
                {balance} ETH
              </Text>
              <Text style={[styles.fiatAmount, { color: theme.textSecondary }]}>
                ≈ $0.00 USD
              </Text>
            </>
          )}
        </View>

        {/* Wallet Address */}
        <View
          style={[
            styles.addressCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.addressLabel, { color: theme.textSecondary }]}>
            Alamat Wallet
          </Text>

          <View style={styles.addressRow}>
            <Text
              style={[styles.addressText, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {walletAddress}
            </Text>

            <Button
              title="Salin"
              variant="ghost"
              onPress={copyToClipboard}
              style={{ paddingHorizontal: 12 }}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionGrid}>
          <ActionButton title="Kirim" icon="↑" color="#FF3B30" theme={theme} />
          <ActionButton title="Terima" icon="↓" color="#34C759" theme={theme} />
          <ActionButton title="Swap" icon="⇄" color="#007AFF" theme={theme} />
          <ActionButton
            title="Riwayat"
            icon="🕒"
            color="#8E8E93"
            theme={theme}
          />
        </View>
      </View>
    </ScrollView>
  );
}

// Action Button Component
const ActionButton = ({ title, icon, color, theme }: any) => (
  <View style={styles.actionItem}>
    <View
      style={[
        styles.actionBtn,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.actionIcon, { color }]}>{icon}</Text>
    </View>
    <Text style={[styles.actionText, { color: theme.text }]}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, padding: 20 },

  networkBadge: {
    alignSelf: "center",
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  networkText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "500",
  },

  balanceCard: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: "700",
    marginVertical: 8,
  },
  fiatAmount: {
    fontSize: 15,
  },

  addressCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addressText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },

  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  actionItem: {
    alignItems: "center",
    width: "23%",
  },
  actionBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
});
