// app/_layout.tsx
import "../polyfills";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { useAppStore } from "../store/appStore";

export default function RootLayout() {
  const {
    isDarkMode,
    walletAddress,
    isUnlocked,
    isStorageLoaded,
    loadWalletFromStorage,
  } = useAppStore();
  const router = useRouter();
  const segments = useSegments();

  const navTheme = isDarkMode ? DarkTheme : DefaultTheme;

  // ✅ FIX: Panggil loadWalletFromStorage SEKALI saat app pertama kali mount
  // Ini yang sebelumnya hilang — tanpanya, walletAddress selalu null setiap buka app
  useEffect(() => {
    loadWalletFromStorage();
  }, []);

  // ✅ FIX: Routing guard sekarang nunggu isStorageLoaded = true dulu
  // Sebelumnya: guard langsung jalan sebelum SecureStore selesai dibaca → redirect ke /welcome
  useEffect(() => {
    if (!isStorageLoaded) return; // ← kunci utama, jangan route sebelum storage siap

    const currentPath = segments.join("/");

    // 1. Belum ada wallet → arahkan ke welcome, kecuali sudah di public route
    if (!walletAddress) {
      const publicRoutes = [
        "welcome",
        "(auth)/import",
        "(auth)/backup-intro",
        "(auth)/reveal-seed",
        "(auth)/wallet-ready",
      ];

      const isPublic = publicRoutes.some((route) =>
        currentPath.startsWith(route),
      );

      if (!isPublic) {
        router.replace("/welcome");
      }
      return;
    }

    // 2. Punya wallet tapi belum unlock → arahkan ke halaman unlock
    if (!isUnlocked) {
      const unlockedExceptions = ["unlock", "wallet-ready"];
      const isException = unlockedExceptions.some((r) =>
        currentPath.includes(r),
      );
      if (!isException) {
        router.replace("/(auth)/unlock");
      }
      return;
    }

    // 3. Sudah unlock → jangan biarkan akses halaman onboarding/auth
    const privateOnlyRoutes = [
      "welcome",
      "unlock",
      "create",
      "import",
      "backup-intro",
      "reveal-seed",
      "verify-seed",
      "create-pin",
      "wallet-ready",
    ];

    const isPrivateRoute = privateOnlyRoutes.some((route) =>
      currentPath.includes(route),
    );

    if (isPrivateRoute) {
      router.replace("/(tabs)");
    }
  }, [isStorageLoaded, walletAddress, isUnlocked, segments, router]);

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(auth)/backup-intro" />
        <Stack.Screen name="(auth)/reveal-seed" />
        <Stack.Screen name="(auth)/wallet-ready" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="send"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="notifications"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="scan"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="receive"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </ThemeProvider>
  );
}
