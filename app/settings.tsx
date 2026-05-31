import { router } from "expo-router";
import {
  ChevronLeft,
  Fingerprint,
  Globe,
  Info,
  Link,
  LogOut,
  Moon,
  Shield,
  Sun,
  Wallet,
  XCircle,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import { initWalletConnect } from "../services/WalletConnectService";

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

  const [connectedApps, setConnectedApps] = useState<any[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  const [modal, setModal] = useState({
    visible: false,
    title: "",
    message: "",
    buttons: [] as AlertButton[],
  });

  useEffect(() => {
    loadConnectedApps();
  }, []);

  const loadConnectedApps = async () => {
    setIsLoadingApps(true);
    try {
      const web3Wallet = await initWalletConnect();

      const sessions = web3Wallet.getActiveSessions();
      const apps = Object.values(sessions).map((session: any) => ({
        topic: session.topic,
        name: session.peer.metadata.name || "Unknown DApp",
        url: session.peer.metadata.url || "",
        icon: session.peer.metadata.icons?.[0] || null,
      }));
      setConnectedApps(apps);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoadingApps(false);
    }
  };

  const handleDisconnect = (topic: string, name: string) => {
    showAlert(
      "Disconnect DApp",
      `Are you sure you want to disconnect from ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              const web3Wallet = await initWalletConnect();
              await web3Wallet.disconnectSession({
                topic,
                reason: { code: 6000, message: "User disconnected" },
              });
              loadConnectedApps();
              showAlert("Success", "DApp disconnected successfully.");
            } catch (error) {
              showAlert("Error", "Failed to disconnect.");
            }
          },
        },
      ],
    );
  };

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

  const handleViewWalletAddress = () => {
    router.push("/wallet-address");
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
    router.push("/security");
  };

  const handleLanguage = () => {
    showAlert(
      "Language",
      "English is currently available. Indonesian language support is coming soon.",
      [{ text: "OK" }],
    );
  };

  const handleAbout = () => {
    showAlert(
      "About LacaX Wallet",
      "Version: 1.0.1\n\nA secure and simple crypto wallet for everyone.",
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
              onPress={handleViewWalletAddress}
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
            Connections
          </Text>
          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            {isLoadingApps ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.textSecondary} />
              </View>
            ) : connectedApps.length === 0 ? (
              <View style={styles.emptyState}>
                <Link size={24} color={theme.textSecondary} opacity={0.5} />
                <Text
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  No connected dApps
                </Text>
              </View>
            ) : (
              connectedApps.map((app) => (
                <View key={app.topic} style={styles.dappRow}>
                  <View style={styles.dappInfo}>
                    {app.icon ? (
                      <View
                        style={[
                          styles.dappIconPlaceholder,
                          { backgroundColor: theme.background },
                        ]}
                      >
                        <Link size={16} color={theme.text} />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.dappIconPlaceholder,
                          { backgroundColor: theme.background },
                        ]}
                      >
                        <Link size={16} color={theme.text} />
                      </View>
                    )}
                    <View>
                      <Text style={[styles.dappName, { color: theme.text }]}>
                        {app.name}
                      </Text>
                      <Text
                        style={[styles.dappUrl, { color: theme.textSecondary }]}
                      >
                        {app.url.replace(/^https?:\/\//, "")}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDisconnect(app.topic, app.name)}
                    style={styles.disconnectBtn}
                  >
                    <XCircle size={20} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
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
                LacaX Wallet v1.0.1
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

  listContainer: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 100,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  dappRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  dappInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dappIconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dappName: {
    fontSize: 15,
    fontWeight: "600",
  },
  dappUrl: {
    fontSize: 12,
    marginTop: 2,
  },
  disconnectBtn: {
    padding: 8,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "92%",
    maxHeight: "75%",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalScroll: {
    maxHeight: 200,
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
