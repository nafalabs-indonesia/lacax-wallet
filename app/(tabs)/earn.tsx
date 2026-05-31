import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Coins, ExternalLink } from "lucide-react-native";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function EarnScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const openStaking = async () => {
    await Linking.openURL("https://lacax.nafalabs.com/staking");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <HomeHeader
        onSettingsPress={() => router.push("/settings")}
        onScanPress={() => router.push("/scan")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentContainer}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Coins size={48} color={theme.primary} strokeWidth={1.5} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            LXW Staking Testnet
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            LacaX Wallet is currently running a public staking testnet for the
            LXW utility token. Help us test staking features, explore the user
            experience, and share your feedback before the official launch.
          </Text>

          <Text
            style={[
              styles.badge,
              {
                backgroundColor: theme.primary + "20",
                color: theme.primary,
              },
            ]}
          >
            Public Testnet Live
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openStaking}
            style={[styles.stakingButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.stakingButtonText}>Open Staking Testnet</Text>
            <ExternalLink size={18} color="#fff" strokeWidth={2} />
          </TouchableOpacity>

          <Text style={[styles.linkText, { color: theme.textSecondary }]}>
            lacax.nafalabs.com/staking
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    paddingTop: 0,
    paddingBottom: 100,
  },
  contentContainer: {
    alignItems: "center",
    maxWidth: 340,
    gap: 16,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "400",
  },
  badge: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  stakingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  stakingButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
});
