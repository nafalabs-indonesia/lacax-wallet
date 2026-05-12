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
      const publicRoutes = ["welcome", "(auth)/create", "(auth)/import"];
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
      if (!currentPath.includes("unlock")) {
        router.replace("/(auth)/unlock");
      }
      return;
    }

    // 3. Jika SUDAH UNLOCK
    const privateOnlyRoutes = ["welcome", "unlock", "create", "import"];
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </ThemeProvider>
  );
}
