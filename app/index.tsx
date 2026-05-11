// app/index.tsx
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

export default function Index() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [isLoading, setIsLoading] = useState(true);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    try {
      console.log("🔍 Mengecek status wallet...");

      // 1. Cek apakah sudah diinisialisasi
      const initialized = await WalletRepository.isInitialized();
      console.log("✅ Status Initialized:", initialized);

      // Delay sedikit untuk UX Splash Screen
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (initialized) {
        console.log("➡️ Redirect ke Unlock");
        setTargetRoute("/(auth)/unlock");
      } else {
        console.log("➡️ Redirect ke Welcome");
        setTargetRoute("/welcome");
      }
    } catch (error) {
      console.error("❌ Error checking wallet:", error);
      // Jika error, anggap belum ada wallet agar user bisa reset
      setTargetRoute("/welcome");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: theme.primary,
            marginBottom: 20,
          }}
        >
          LacaX
        </Text>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (targetRoute) {
    return <Redirect href={targetRoute as any} />;
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
