// app/welcome.tsx
import { useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

export default function WelcomeScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Logo */}
        <Image
          source={
            isDarkMode
              ? require("../assets/lacax-dark.png")
              : require("../assets/lacax-light.png")
          }
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={[styles.title, { color: theme.text }]}>
          Selamat Datang di LacaX
        </Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Dompet kripto terdesentralisasi yang aman dan mudah digunakan.
        </Text>

        {/* Icon */}
        <View style={styles.illustration}>
          <ShieldCheck size={80} color={theme.primary} strokeWidth={1.5} />
        </View>

        {/* Button Group */}
        <View style={styles.buttonGroup}>
          <Button
            title="Buat Wallet Baru"
            onPress={() => router.push("/(auth)/create")}
            variant="primary"
            style={styles.button}
          />

          <Button
            title="Saya Sudah Punya Wallet"
            onPress={() => router.push("/(auth)/import")}
            variant="ghost"
            style={styles.button}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  logo: {
    width: 180,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  illustration: {
    marginBottom: 50,
    alignItems: "center",
  },

  // container only layout
  buttonGroup: {
    width: "100%",
    gap: 12,
  },

  // IMPORTANT: rounded full ada di button, bukan group
  button: {
    width: "100%",
    borderRadius: 9999,
    paddingVertical: 14,
  },
});
