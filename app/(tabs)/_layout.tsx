// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { WalletRepository } from "../../modules/wallet/infrastructure/WalletRepository";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function TabLayout() {
  const { isDarkMode, walletAddress } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Cek apakah user sudah login (punya address di store)
  // Jika tidak, cek apakah wallet sudah dibuat di secure store
  const [status, setStatus] = React.useState<
    "checking" | "locked" | "new" | "ready"
  >("checking");

  React.useEffect(() => {
    const checkAuth = async () => {
      if (walletAddress) {
        setStatus("ready");
        return;
      }

      // Jika address tidak ada di store, cek apakah wallet ada di device
      const initialized = await WalletRepository.isInitialized();
      if (initialized) {
        setStatus("locked"); // Butuh unlock
      } else {
        setStatus("new"); // Butuh buat wallet baru
      }
    };

    checkAuth();
  }, [walletAddress]);

  if (status === "checking") {
    return null; // Atau loading screen kecil
  }

  if (status === "locked") {
    return <Redirect href="/(auth)/unlock" />;
  }

  if (status === "new") {
    return <Redirect href="/welcome" />;
  }

  // Jika ready, tampilkan Tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: Platform.OS === "ios" ? 85 : 60,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="wallet" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <Ionicons name="compass" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
