// app/(tabs)/discover.tsx
import { router } from "expo-router";
import { Construction } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { HomeHeader } from "../../components/HomeHeader";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function DiscoverScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header using Shared Component */}
      <HomeHeader
        onSettingsPress={() => router.push("/settings")}
        onScanPress={() => router.push("/scan")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Coming Soon Content */}
        <View style={styles.comingSoonContainer}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Construction size={48} color={theme.primary} strokeWidth={1.5} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            Discover DApps
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            We are building a secure browser for you to explore the
            decentralized web.
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
    flexGrow: 1, // Penting agar ScrollView mengisi ruang kosong
    justifyContent: "center", // Menengahkan konten secara vertikal
    alignItems: "center", // Menengahkan konten secara horizontal
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
