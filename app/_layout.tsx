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
  const { isDarkMode, walletAddress, isUnlocked } = useAppStore();
  const router = useRouter();
  const segments = useSegments();

  const navTheme = isDarkMode ? DarkTheme : DefaultTheme;

  useEffect(() => {
    // HAPUS: if (segments.length === 0) return;
    // TypeScript menjamin segments selalu ada isinya minimal 1.

    // Gabungkan segments jadi string path, misal: "(auth)/create"
    const currentPath = segments.join("/");

    // 1. Jika BELUM ADA WALLET (State kosong)
    if (!walletAddress) {
      // Izinkan akses ke halaman publik: welcome, create, import
      const publicRoutes = ["welcome", "(auth)/create", "(auth)/import"];
      const isPublic = publicRoutes.some((route) =>
        currentPath.startsWith(route),
      );

      if (!isPublic) {
        // Jika user coba masuk home/unlock padahal belum punya wallet -> lempar ke welcome
        router.replace("/welcome");
      }
      return;
    }

    // 2. Jika SUDAH PUNYA WALLET tapi BELUM UNLOCK
    if (!isUnlocked) {
      // Hanya izinkan akses ke unlock
      if (!currentPath.includes("unlock")) {
        router.replace("/(auth)/unlock");
      }
      return;
    }

    // 3. Jika SUDAH UNLOCK
    // Jangan biarkan user stay di halaman login/welcome
    const privateOnlyRoutes = ["welcome", "unlock", "create", "import"];
    const isPrivateRoute = privateOnlyRoutes.some((route) =>
      currentPath.includes(route),
    );

    if (isPrivateRoute) {
      router.replace("/(tabs)");
    }
  }, [walletAddress, isUnlocked, segments, router]);

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
