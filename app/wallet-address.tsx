// app/wallet-address.tsx
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { ChevronLeft, Copy, QrCode, Share2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

export default function WalletAddressScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAddress();
  }, []);

  const loadAddress = async () => {
    try {
      const addr = await WalletRepository.getAddress();
      setAddress(addr);
    } catch (error) {
      console.error("Failed to load address", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    Alert.alert("Success", "Wallet address copied to clipboard");
  };

  const handleShare = () => {
    // Logic share bisa ditambahkan disini jika perlu
    Alert.alert("Share", "Share functionality coming soon");
  };

  // Format address untuk tampilan tengah (misal: 0x1234...5678)
  const shortAddress = address
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : "";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          My Wallet
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
          <Share2 size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar & Address Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <Image
              source={require("../assets/avatar.png")}
              style={styles.avatar}
              resizeMode="cover"
            />
            {/* Status Indicator (Optional) */}
            <View
              style={[styles.statusBadge, { backgroundColor: "#4CAF50" }]}
            />
          </View>

          {/* Address Text */}
          <View style={styles.addressSection}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Your Public Address
            </Text>

            {loading ? (
              <ActivityIndicator
                color={theme.primary}
                style={{ marginTop: 10 }}
              />
            ) : (
              <>
                <Text
                  style={[styles.addressText, { color: theme.text }]}
                  selectable
                >
                  {address || "No wallet found"}
                </Text>

                <Text
                  style={[styles.shortAddress, { color: theme.textSecondary }]}
                >
                  {shortAddress}
                </Text>
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.primary + "15" },
              ]}
              onPress={handleCopy}
            >
              <Copy size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                Copy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.primary + "15" },
              ]}
              onPress={() =>
                Alert.alert("QR Code", "QR Code feature coming soon")
              }
            >
              <QrCode size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                QR Code
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            How to receive funds?
          </Text>
          <Text style={[styles.infoDesc, { color: theme.textSecondary }]}>
            Share your public address or show the QR code to receive crypto
            assets from others. Only share this address with trusted sources.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  actionBtn: { padding: 8 },

  scrollContent: { padding: 16, alignItems: "center" },

  card: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },

  avatarContainer: {
    position: "relative",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.1)", // Border halus
  },
  statusBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFF", // Atau warna card background
  },

  addressSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    fontFamily: "monospace",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
    // Word break untuk address panjang
    flexWrap: "wrap",
  },
  shortAddress: {
    fontSize: 16,
    fontWeight: "600",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  actionButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },

  infoBox: {
    width: "100%",
    paddingHorizontal: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  infoDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
});
