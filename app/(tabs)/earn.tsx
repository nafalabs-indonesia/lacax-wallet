import { router } from "expo-router";
import { Coins } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function EarnScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

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
        <View style={styles.comingSoonContainer}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Coins size={48} color={theme.primary} strokeWidth={1.5} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            Earn & Staking
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Grow your crypto assets with high-yield staking pools and flexible
            earning options.
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
            Coming Soon
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
  comingSoonContainer: {
    alignItems: "center",
    maxWidth: 320,
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
    lineHeight: 22,
    fontWeight: "400",
  },
  badge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
