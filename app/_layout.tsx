// app/_layout.tsx
import "../polyfills";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { useAppStore } from "../store/appStore";

export default function RootLayout() {
  const { isDarkMode, walletAddress, isUnlocked } = useAppStore();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  const navTheme = isDarkMode ? DarkTheme : DefaultTheme;

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const currentPath = segments.join("/");

    // 1. Jika BELUM ADA WALLET
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

    // 2. Jika SUDAH PUNYA WALLET tapi BELUM UNLOCK
    if (!isUnlocked) {
      const unlockedExceptions = [
        "unlock",
        "wallet-ready",
        "send",
        "notifications",
      ]; // ✅ Tambah send & notifications ke exception (bisa diakses sebelum unlock kalau perlu, atau hapus kalau mau tetap protected)
      const isException = unlockedExceptions.some((r) =>
        currentPath.includes(r),
      );
      if (!isException) {
        router.replace("/(auth)/unlock");
      }
      return;
    }

    // 3. Jika SUDAH UNLOCK
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
  }, [isReady, walletAddress, isUnlocked, segments, router]);

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(auth)/backup-intro" />
        <Stack.Screen name="(auth)/reveal-seed" />
        <Stack.Screen name="(auth)/wallet-ready" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* ✅ TAMBAH: Register page baru */}
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
