// app/settings.tsx
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  ChevronLeft,
  Fingerprint,
  Globe,
  Info,
  LogOut,
  Moon,
  Shield,
  Sun,
  Wallet,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

// --- Komponen Item Grid ---
interface GridItemProps {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
}

function GridItem({ icon, title, onPress }: GridItemProps) {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const iconColor = theme.text;

  return (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        {React.cloneElement(icon as React.ReactElement<any>, {
          color: iconColor,
          size: 25,
          strokeWidth: 2,
        })}
      </View>
      <Text style={[styles.gridTitle, { color: theme.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

// --- Custom Modal ---
interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

function CustomAlert({
  visible,
  title,
  message,
  buttons,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  onClose: () => void;
}) {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {title}
          </Text>

          {/* FIX: scroll + batas tinggi */}
          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              {message}
            </Text>
          </ScrollView>

          <View style={styles.modalButtons}>
            {buttons.map((btn, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modalButton}
                onPress={() => {
                  onClose();
                  btn.onPress?.();
                }}
              >
                <Text
                  style={{
                    color:
                      btn.style === "destructive" ? theme.error : theme.text,
                    fontWeight: "600",
                  }}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const {
    isDarkMode,
    toggleTheme,
    walletAddress,
    setUnlocked,
    setWalletAddress,
  } = useAppStore();

  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [modal, setModal] = useState({
    visible: false,
    title: "",
    message: "",
    buttons: [] as AlertButton[],
  });

  const showAlert = (
    title: string,
    message: string,
    buttons: AlertButton[] = [{ text: "OK" }],
  ) => {
    setModal({ visible: true, title, message, buttons });
  };

  const closeAlert = () => {
    setModal((prev) => ({ ...prev, visible: false }));
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    showAlert("Success", "Wallet address copied to clipboard");
  };

  const handleLockWallet = () => {
    setUnlocked(false);
    router.replace("/(auth)/unlock");
  };

  const handleLogout = () => {
    showAlert(
      "Logout Wallet",
      "Are you sure you want to log out? Make sure you have backed up your recovery phrase.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            setUnlocked(false);
            setWalletAddress("");
            router.replace("/welcome");
          },
        },
      ],
    );
  };

  const handleSecuritySettings = () => {
    showAlert(
      "Security Settings",
      "Manage your Password, Biometrics, and Recovery Phrase.",
      [
        {
          text: "Change Password",
          onPress: () => showAlert("Info", "Navigate to Change Password"),
        },
        {
          text: "Enable Biometrics",
          onPress: () => showAlert("Info", "Toggle Biometrics"),
        },
        { text: "Close", style: "cancel" },
      ],
    );
  };

  const handleLanguage = () => {
    showAlert("Language", "Select your preferred language.", [
      {
        text: "English",
        onPress: () => showAlert("Success", "Language set to English"),
      },
      {
        text: "Indonesian",
        onPress: () => showAlert("Success", "Language set to Indonesian"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleAbout = () => {
    showAlert(
      "About Lacax Wallet",
      "Version: 1.0.0\n\nA secure and simple crypto wallet for everyone.",
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Account & Security
          </Text>
          <View style={[styles.gridContainer, { backgroundColor: theme.card }]}>
            <GridItem
              icon={<Wallet />}
              title="Wallet Address"
              onPress={handleCopyAddress}
            />
            <GridItem
              icon={<Shield />}
              title="Security"
              onPress={handleSecuritySettings}
            />
            <GridItem
              icon={<Fingerprint />}
              title="Lock Wallet"
              onPress={handleLockWallet}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Preferences
          </Text>
          <View style={[styles.gridContainer, { backgroundColor: theme.card }]}>
            <TouchableOpacity style={styles.gridItem} onPress={toggleTheme}>
              <View style={styles.iconWrapper}>
                {isDarkMode ? (
                  <Moon color={theme.text} size={25} strokeWidth={2} />
                ) : (
                  <Sun color={theme.text} size={25} strokeWidth={2} />
                )}
              </View>
              <Text style={[styles.gridTitle, { color: theme.text }]}>
                Appearance
              </Text>
            </TouchableOpacity>

            <GridItem
              icon={<Globe />}
              title="Language"
              onPress={handleLanguage}
            />
            <GridItem icon={<Info />} title="About" onPress={handleAbout} />
          </View>
        </View>

        <View style={styles.footerSection}>
          <TouchableOpacity
            style={[styles.aboutRow, { backgroundColor: theme.card }]}
            onPress={handleAbout}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Info size={20} color={theme.textSecondary} />
              <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
                Lacax Wallet v1.0.0
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              { marginTop: 16, backgroundColor: theme.error + "15" },
            ]}
            onPress={handleLogout}
          >
            <LogOut size={20} color={theme.error} />
            <Text
              style={{ color: theme.error, marginLeft: 10, fontWeight: "600" }}
            >
              Log Out
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <CustomAlert
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        buttons={modal.buttons}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: 0.5 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 4,
  },
  gridContainer: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gridItem: {
    width: "30%",
    alignItems: "center",
    marginBottom: 20,
  },
  iconWrapper: { marginBottom: 8 },
  gridTitle: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 14,
  },
  footerSection: { marginTop: 10 },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  aboutText: { fontSize: 14, fontWeight: "500" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
  },

  // --- Modal Styles (FIXED) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "92%", // diperbesar
    maxHeight: "75%", // biar tidak kepanjangan
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalScroll: {
    maxHeight: 200, // batas isi text
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
  modalButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
});
