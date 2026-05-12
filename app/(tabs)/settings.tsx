// app/(tabs)/settings.tsx
import { useRouter } from "expo-router";
import {
    ChevronRight,
    Fingerprint,
    Globe,
    Info,
    LogOut,
    Moon,
    Shield,
    Sun,
    Wallet,
} from "lucide-react-native";
import React from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  danger,
}: SettingItemProps) {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: theme.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View
        style={[
          styles.itemIcon,
          { backgroundColor: danger ? "#EF444415" : theme.primary + "12" },
        ]}
      >
        {icon}
      </View>
      <View style={styles.itemContent}>
        <Text
          style={[styles.itemTitle, { color: danger ? "#EF4444" : theme.text }]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement ||
        (onPress && <ChevronRight size={18} color={theme.textSecondary} />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const {
    isDarkMode,
    toggleTheme,
    walletAddress,
    setUnlocked,
    setWalletAddress,
  } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const handleLockWallet = () => {
    setUnlocked(false);
    router.replace("/(auth)/unlock");
  };

  const handleLogout = () => {
    Alert.alert(
      "Keluar Wallet",
      "Apakah Anda yakin ingin keluar? Pastikan mnemonic sudah tersimpan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: () => {
            setUnlocked(false);
            setWalletAddress("");
            // TODO: Wipe secure storage kalau perlu
            router.replace("/welcome");
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Pengaturan
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            AKUN
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <SettingItem
              icon={<Wallet size={18} color={theme.primary} />}
              title="Alamat Wallet"
              subtitle={
                walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : "-"
              }
              onPress={() => {
                // TODO: Copy address or show QR
              }}
            />
            <SettingItem
              icon={<Shield size={18} color={theme.primary} />}
              title="Keamanan"
              subtitle="PIN & Backup"
              onPress={() => {
                // TODO: Navigate to security settings
              }}
            />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            TAMPILAN
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <SettingItem
              icon={
                isDarkMode ? (
                  <Moon size={18} color={theme.primary} />
                ) : (
                  <Sun size={18} color={theme.primary} />
                )
              }
              title="Mode Gelap"
              subtitle={isDarkMode ? "Aktif" : "Nonaktif"}
              rightElement={
                <Switch
                  value={isDarkMode}
                  onValueChange={() => toggleTheme()} // ✅ BENAR
                />
              }
            />
            <SettingItem
              icon={<Globe size={18} color={theme.primary} />}
              title="Bahasa"
              subtitle="Bahasa Indonesia"
              onPress={() => {
                // TODO: Language selector
              }}
            />
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            TINDAKAN
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <SettingItem
              icon={<Fingerprint size={18} color={theme.primary} />}
              title="Kunci Wallet"
              subtitle="Kunci dan kembali ke layar PIN"
              onPress={handleLockWallet}
            />
            <SettingItem
              icon={<Info size={18} color={theme.primary} />}
              title="Tentang"
              subtitle="Versi 1.0.0"
              onPress={() => {
                // TODO: About page
              }}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <SettingItem
              icon={<LogOut size={18} color="#EF4444" />}
              title="Keluar Wallet"
              subtitle="Hapus sesi dan kembali ke awal"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Lacax Wallet v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Built with Expo & React Native
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemSubtitle: {
    fontSize: 13,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 40,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
});
