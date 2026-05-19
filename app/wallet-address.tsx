// app/wallet-address.tsx
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Copy,
  QrCode,
  Share2,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Share as RNShare,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

// --- Custom Modal Component ---
interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "info" | "error" | "success";
  onClose: () => void;
  theme: any;
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  title,
  message,
  type = "info",
  onClose,
  theme,
}) => {
  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertTriangle size={48} color="#FF453A" />;
      case "success":
        return <CheckCircle size={48} color={theme.text} />;
      default:
        return <AlertTriangle size={48} color={theme.primary} />;
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalIconContainer}>{getIcon()}</View>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {title}
          </Text>
          <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
            {message}
          </Text>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.primary }]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function WalletAddressScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showQrModal, setShowQrModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "info" | "error" | "success";
  }>({ visible: false, title: "", message: "" });

  // Ref untuk QR Code
  const qrRef = useRef<any>(null);

  useEffect(() => {
    loadAddress();
  }, []);

  const loadAddress = async () => {
    try {
      const addr = await WalletRepository.getAddress();
      setAddress(addr);
    } catch (error) {
      console.error("Failed to load address", error);
      showModal("Error", "Failed to load wallet address.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showModal = (
    title: string,
    message: string,
    type: "info" | "error" | "success" = "info",
  ) => {
    setModalConfig({ visible: true, title, message, type });
  };

  const hideModal = () => {
    setModalConfig((prev) => ({ ...prev, visible: false }));
  };

  const handleCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    showModal("Success", "Wallet address copied to clipboard", "success");
  };

  const handleShare = async () => {
    if (!address) return;

    try {
      // Menggunakan React Native Share API untuk membagikan teks
      // Ini lebih stabil daripada expo-sharing untuk kasus string/URL
      await RNShare.share({
        message: `My Wallet Address:\n${address}`,
        title: "Share Wallet Address",
      });
    } catch (error) {
      console.error("Share error:", error);
      // Error biasanya terjadi jika user membatalkan share, jadi kita abaikan atau tampilkan info
      if (String(error).includes("dismissed")) {
        return;
      }
      showModal("Error", "Failed to share address.", "error");
    }
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
              onPress={() => setShowQrModal(true)}
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

      {/* --- QR Code Modal --- */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View
            style={[styles.qrModalContent, { backgroundColor: theme.card }]}
          >
            <View style={styles.qrHeader}>
              <Text style={[styles.qrTitle, { color: theme.text }]}>
                Scan to Pay
              </Text>
              <TouchableOpacity onPress={() => setShowQrModal(false)}>
                <Text style={{ color: theme.primary, fontWeight: "600" }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.qrFrame,
                {
                  backgroundColor: "#fff",
                  borderColor: theme.border || "#ddd",
                },
              ]}
            >
              {address ? (
                <QRCode
                  value={address}
                  size={220}
                  color="#000"
                  backgroundColor="#fff"
                  getRef={(ref) => (qrRef.current = ref)}
                />
              ) : (
                <View
                  style={{
                    width: 220,
                    height: 220,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator size="large" color="#000" />
                </View>
              )}
            </View>

            <Text
              style={[styles.qrAddressLabel, { color: theme.textSecondary }]}
            >
              {shortAddress}
            </Text>

            <TouchableOpacity
              style={[styles.qrShareButton, { backgroundColor: theme.primary }]}
              onPress={handleShare}
            >
              <Share2 size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.qrShareText}>Share Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Custom Notification Modal --- */}
      <CustomModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={hideModal}
        theme={theme}
      />
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
  headerTitle: { fontSize: 18, fontWeight: "700" },
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
    borderColor: "rgba(255,255,255,0.1)",
  },
  statusBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFF",
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

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },

  // --- QR Modal Specific Styles ---
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  qrModalContent: {
    width: "100%",
    maxWidth: 350,
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  qrHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  qrFrame: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrAddressLabel: {
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 24,
    textAlign: "center",
  },
  qrShareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: "100%",
  },
  qrShareText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
