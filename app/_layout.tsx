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

  // Tandai layout sudah selesai mount
  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return; // Guard: tunggu sampai Root Layout benar-benar mounted

    const currentPath = segments.join("/");

    // 1. Jika BELUM ADA WALLET
    if (!walletAddress) {
      // TAMBAHKAN route baru ke publicRoutes agar tidak kena redirect ke welcome
      const publicRoutes = [
        "welcome",
        "(auth)/import",
        "(auth)/backup-intro", // New Step 0
        "(auth)/reveal-seed", // New Step 1 (View Seed)
        "(auth)/wallet-ready", // Success screen after wallet creation
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
      // wallet-ready boleh diakses sebelum unlock (baru saja buat wallet)
      const unlockedExceptions = ["unlock", "wallet-ready"];
      const isException = unlockedExceptions.some((r) =>
        currentPath.includes(r),
      );
      if (!isException) {
        router.replace("/(auth)/unlock");
      }
      return;
    }

    // 3. Jika SUDAH UNLOCK
    // Route auth tidak boleh diakses jika sudah login & unlock
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
        {/* Register New Auth Screens */}
        <Stack.Screen name="(auth)/backup-intro" />
        <Stack.Screen name="(auth)/reveal-seed" />
        <Stack.Screen name="(auth)/wallet-ready" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </ThemeProvider>
  );
}
