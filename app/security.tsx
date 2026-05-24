import { ethers } from "ethers";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  Key,
  Lock,
  ShieldAlert,
  Unlock,
  XCircle,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

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
        return <XCircle size={48} color="#FF453A" />;
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

export default function SecurityScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [password, setPassword] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "info" | "error" | "success";
  }>({ visible: false, title: "", message: "" });

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

  const handleVerify = async () => {
    if (!password) {
      showModal("Error", "Please enter your wallet password.", "error");
      return;
    }

    setLoading(true);
    try {
      const decryptedMnemonic =
        await WalletRepository.getMnemonicIfValid(password);

      if (decryptedMnemonic) {
        setMnemonic(decryptedMnemonic);

        const wallet = ethers.Wallet.fromPhrase(decryptedMnemonic);
        setPrivateKey(wallet.privateKey);

        setIsVerified(true);
        setShowPasswordInput(false);
      } else {
        showModal(
          "Access Denied",
          "Incorrect password. Please try again.",
          "error",
        );
        setPassword("");
      }
    } catch (error: any) {
      console.error(error);
      if (error.message?.startsWith("RATE_LIMITED")) {
        const seconds = error.message.split(":")[1];
        showModal(
          "Too Many Attempts",
          `Please wait ${seconds} seconds before trying again.`,
          "error",
        );
      } else {
        showModal("Error", "Failed to decrypt wallet data.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showModal("Copied", `${label} copied to clipboard`, "success");
  };

  if (!isVerified) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={28} color={theme.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Security
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.centerContent}>
          <View style={[styles.lockCard, { backgroundColor: theme.card }]}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <Fingerprint size={40} color={theme.primary} />
            </View>

            <Text style={[styles.lockTitle, { color: theme.text }]}>
              Verify Your Identity
            </Text>
            <Text style={[styles.lockDesc, { color: theme.textSecondary }]}>
              Enter your password to reveal your Secret Recovery Phrase and
              Private Key.
            </Text>

            {showPasswordInput && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.card,
                      color: theme.text,
                      borderColor:
                        theme.border || (isDarkMode ? "#333" : "#ddd"),
                    },
                  ]}
                  placeholder="Enter Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.verifyBtn, { backgroundColor: theme.primary }]}
                  onPress={handleVerify}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Unlock size={18} color="#FFF" />
                      <Text style={styles.verifyBtnText}>Unlock</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {!showPasswordInput && (
              <TouchableOpacity
                style={[
                  styles.unlockBtnLarge,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => setShowPasswordInput(true)}
              >
                <Text style={styles.unlockBtnText}>Tap to Reveal Secrets</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.warningBox}></View>
        </ScrollView>

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Secrets</Text>
        <TouchableOpacity
          onPress={() => {
            setIsVerified(false);
            setMnemonic(null);
            setPrivateKey(null);
            setPassword("");
            setShowMnemonic(false);
            setShowPrivateKey(false);
          }}
        >
          <Lock size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Key size={20} color={theme.text} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Recovery Phrase
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => copyToClipboard(mnemonic || "", "Seed Phrase")}
            >
              <Copy size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View
            style={[styles.secretBox, { backgroundColor: theme.background }]}
          >
            <Text style={[styles.secretText, { color: theme.text }]}>
              {showMnemonic ? mnemonic : "••••••••••••••••••••••••"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: theme.background }]}
            onPress={() => setShowMnemonic(!showMnemonic)}
          >
            {showMnemonic ? (
              <EyeOff size={16} color={theme.textSecondary} />
            ) : (
              <Eye size={16} color={theme.primary} />
            )}
            <Text
              style={[
                styles.toggleText,
                { color: showMnemonic ? theme.textSecondary : theme.primary },
              ]}
            >
              {showMnemonic ? "Hide Phrase" : "Reveal Phrase"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.card, { backgroundColor: theme.card, marginTop: 16 }]}
        >
          <View style={styles.cardHeader}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <ShieldAlert size={20} color={theme.text} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                Private Key
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => copyToClipboard(privateKey || "", "Private Key")}
            >
              <Copy size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View
            style={[styles.secretBox, { backgroundColor: theme.background }]}
          >
            {/* 
               PERBAIKAN: 
               1. Menghapus numberOfLines dan ellipsizeMode agar teks tampil penuh.
               2. Menambahkan flexWrap agar teks panjang turun ke baris baru.
            */}
            <Text
              style={[
                styles.secretText,
                styles.fullText,
                { color: theme.text, fontFamily: "monospace" },
              ]}
            >
              {showPrivateKey ? privateKey : "••••••••••••••••••••••••"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: theme.background }]}
            onPress={() => setShowPrivateKey(!showPrivateKey)}
          >
            {showPrivateKey ? (
              <EyeOff size={16} color={theme.textSecondary} />
            ) : (
              <Eye size={16} color={theme.primary} />
            )}
            <Text
              style={[
                styles.toggleText,
                { color: showPrivateKey ? theme.textSecondary : theme.primary },
              ]}
            >
              {showPrivateKey ? "Hide Key" : "Reveal Key"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerWarning}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Warning: Never share these details. Anyone with this information has
            full control over your funds.
          </Text>
        </View>
      </ScrollView>

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
  headerTitle: { fontSize: 20, fontWeight: "700" },

  centerContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    alignItems: "center",
  },
  lockCard: {
    width: "100%",
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  lockTitle: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  lockDesc: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },

  inputContainer: { width: "100%", gap: 12 },
  input: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  verifyBtn: {
    height: 50,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  verifyBtnText: { color: "#FFF", fontWeight: "600", fontSize: 16 },

  unlockBtnLarge: {
    width: "100%",
    height: 54,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  unlockBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },

  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
    paddingHorizontal: 10,
  },
  warningText: { flex: 1, fontSize: 12, color: "#FF453A", textAlign: "center" },

  scrollContent: { padding: 16 },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },

  secretBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    minHeight: 50,
    justifyContent: "center",
  },
  secretText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.5,
  },

  fullText: {
    flexWrap: "wrap",
    textAlign: "left",
  },

  toggleBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  toggleText: { fontSize: 13, fontWeight: "600" },

  footerWarning: { marginTop: 24, paddingHorizontal: 8 },
  footerText: { fontSize: 12, textAlign: "center", lineHeight: 18 },

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
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
