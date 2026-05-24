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

import { WcConfirmationModal } from "../components/WcConfirmationModal";

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

  useEffect(() => {
    loadWalletFromStorage();
  }, []);

  useEffect(() => {
    if (!isStorageLoaded) return;

    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isStorageLoaded]);

  useEffect(() => {
    if (!isStorageLoaded || !splashDone) return;

    const currentPath = segments.join("/");

    const publicRoutes = [
      "index",
      "get-started",
      "welcome",
      "(auth)/import",
      "(auth)/backup-intro",
      "(auth)/reveal-seed",
      "(auth)/wallet-ready",
      "(auth)/import-ready",
    ];

    const isPublic = publicRoutes.some(
      (route) => currentPath === route || currentPath.startsWith(route),
    );

    if (!walletAddress) {
      if (!isPublic) {
        router.replace("/get-started");
      }
      return;
    }

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

    const privateOnlyRoutes = [
      "get-started",
      "welcome",
      "unlock",
      "import",
      "backup-intro",
      "reveal-seed",
      "wallet-ready",
      "import-ready",
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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="get-started" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />

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

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen
          name="swap"
          options={{
            presentation: "card",
            headerShown: false,
            animation: "slide_from_right",
          }}
        />

        <Stack.Screen
          name="coin-detail"
          options={{
            presentation: "card",
            headerShown: false,
            animation: "slide_from_right",
          }}
        />

        <Stack.Screen
          name="security"
          options={{
            presentation: "card",
            headerShown: false,
            animation: "slide_from_right",
          }}
        />

        <Stack.Screen
          name="wallet-address"
          options={{
            presentation: "card",
            headerShown: false,
            animation: "slide_from_right",
          }}
        />

        <Stack.Screen
          name="send"
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

      <WcConfirmationModal />
    </ThemeProvider>
  );
}
