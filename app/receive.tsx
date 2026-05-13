// app/receive.tsx
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, Copy, Share2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

const SUPPORTED_TOKENS = [
  { symbol: "ETH", name: "Ethereum", icon: "⟠", color: "#627EEA" },
  { symbol: "USDC", name: "USD Coin", icon: "○", color: "#2775CA" },
  { symbol: "USDT", name: "Tether", icon: "○", color: "#26A17B" },
];

export default function ReceiveScreen() {
  const router = useRouter();
  const { walletAddress, isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [copied, setCopied] = useState(false);

  if (!walletAddress) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>
          Wallet tidak tersedia
        </Text>
      </View>
    );
  }

  const handleCopy = async () => {
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Kirim ${selectedToken.symbol} ke alamat ini:\n${walletAddress}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const shortAddr = `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Terima {selectedToken.symbol}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Token Selector */}
      <View style={styles.tokenSelector}>
        {SUPPORTED_TOKENS.map((token) => (
          <TouchableOpacity
            key={token.symbol}
            style={[
              styles.tokenChip,
              {
                backgroundColor:
                  selectedToken.symbol === token.symbol
                    ? token.color + "20"
                    : theme.card,
                borderColor:
                  selectedToken.symbol === token.symbol
                    ? token.color
                    : theme.border,
              },
            ]}
            onPress={() => setSelectedToken(token)}
          >
            <Text style={[styles.tokenChipIcon, { color: token.color }]}>
              {token.icon}
            </Text>
            <Text
              style={[
                styles.tokenChipText,
                {
                  color:
                    selectedToken.symbol === token.symbol
                      ? token.color
                      : theme.text,
                },
              ]}
            >
              {token.symbol}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* QR Code Card */}
      <View
        style={[
          styles.qrCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.qrWrap}>
          <QRCode
            value={walletAddress}
            size={200}
            color={isDarkMode ? "#fff" : "#000"}
            backgroundColor="transparent"
            logo={require("../assets/lacax-light.png")}
            logoSize={40}
            logoBackgroundColor={theme.card}
            logoBorderRadius={8}
          />
        </View>

        <Text style={[styles.qrLabel, { color: theme.textSecondary }]}>
          Pindai untuk mengirim {selectedToken.symbol}
        </Text>
      </View>

      {/* Address Card */}
      <View
        style={[
          styles.addressCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.addressLabel, { color: theme.textSecondary }]}>
          Alamat Wallet Anda
        </Text>
        <Text style={[styles.addressText, { color: theme.text }]}>
          {shortAddr}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: copied ? "#10B98120" : theme.primary + "15" },
            ]}
            onPress={handleCopy}
          >
            {copied ? (
              <Check size={18} color="#10B981" />
            ) : (
              <Copy size={18} color={theme.primary} />
            )}
            <Text
              style={[
                styles.actionText,
                { color: copied ? "#10B981" : theme.primary },
              ]}
            >
              {copied ? "Tersalin!" : "Salin"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: theme.primary + "15" },
            ]}
            onPress={handleShare}
          >
            <Share2 size={18} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>
              Bagikan
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Warning */}
      <View
        style={[
          styles.warningBox,
          { backgroundColor: "#F59E0B15", borderColor: "#F59E0B30" },
        ]}
      >
        <Text style={[styles.warningText, { color: "#F59E0B" }]}>
          Pastikan pengirim menggunakan jaringan Sepolia Testnet untuk ETH.
          Salah jaringan dapat menyebabkan kehilangan dana.
        </Text>
      </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  tokenSelector: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  tokenChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  tokenChipIcon: {
    fontSize: 16,
  },
  tokenChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  qrCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 16,
  },
  qrWrap: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  qrLabel: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  addressCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  warningBox: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "center",
  },
});
