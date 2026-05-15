// app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import "../polyfills";
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
  const [splashDone, setSplashDone] = useState(false);

  const navTheme = isDarkMode ? DarkTheme : DefaultTheme;

  // 1. Load wallet dari storage SEKALI
  useEffect(() => {
    loadWalletFromStorage();
  }, []);

  // 2. Splash screen delay (1.5 detik)
  useEffect(() => {
    if (!isStorageLoaded) return;

    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isStorageLoaded]);

  // 3. Routing guard (jalan setelah splash selesai)
  useEffect(() => {
    if (!isStorageLoaded || !splashDone) return;

    const currentPath = segments.join("/");

    // Route publik yang boleh diakses tanpa wallet
    const publicRoutes = [
      "index",
      "get-started",
      "welcome",
      "(auth)/import",
      "(auth)/backup-intro",
      "(auth)/reveal-seed",
      "(auth)/wallet-ready",
    ];

    const isPublic = publicRoutes.some(
      (route) => currentPath === route || currentPath.startsWith(route),
    );

    // CASE 1: Belum ada wallet
    if (!walletAddress) {
      if (!isPublic) {
        router.replace("/get-started");
      }
      return;
    }

    // CASE 2: Ada wallet tapi belum unlock
    if (!isUnlocked) {
      const unlockExceptions = ["unlock", "wallet-ready", "index", ""];
      const isException = unlockExceptions.some(
        (r) => currentPath.includes(r) || currentPath === r,
      );
      if (!isException) {
        router.replace("/(auth)/unlock");
      }
      return;
    }

    // CASE 3: Sudah unlock → blokir halaman onboarding
    const privateOnlyRoutes = [
      "get-started",
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
  }, [
    isStorageLoaded,
    splashDone,
    walletAddress,
    isUnlocked,
    segments,
    router,
  ]);

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Public & Auth Screens */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="get-started" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />

        {/* Auth Group */}
        <Stack.Screen
          name="(auth)/backup-intro"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(auth)/reveal-seed"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(auth)/wallet-ready"
          options={{ headerShown: false }}
        />

        {/* Main Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Feature Screens (Registered Here) */}

        {/* Swap Screen */}
        <Stack.Screen
          name="swap"
          options={{
            presentation: "card", // Atau "modal" jika ingin efek slide up
            headerShown: false, // Kita handle header di dalam swap.tsx
            animation: "slide_from_right",
          }}
        />

        {/* Coin Detail Screen */}
        <Stack.Screen
          name="coin-detail"
          options={{
            presentation: "card",
            headerShown: false,
            animation: "slide_from_right",
          }}
        />

        {/* Other Modals */}
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
