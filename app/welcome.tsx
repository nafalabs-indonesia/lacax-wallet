// app/welcome.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
              ? require("../assets/logo/lacax-dark.png")
              : require("../assets/logo/lacax-light.png")
          }
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={[styles.title, { color: theme.text }]}>
          Own Your Crypto.
        </Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Full control of your digital assets.
        </Text>

        {/* Welcome Illustration */}
        <View style={styles.illustration}>
          <Image
            source={require("../assets/welcome.png")}
            style={styles.welcomeImage}
            resizeMode="contain"
          />
        </View>

        {/* Button Group: Import (kiri) | Create Wallet (kanan) */}
        <View style={styles.buttonGroup}>
          {/* Import - ghost/outline */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonOutline,
              { borderColor: theme.primary },
            ]}
            onPress={() => router.push("/(auth)/import")}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: theme.primary }]}>
              Import
            </Text>
          </TouchableOpacity>

          {/* Create Wallet - solid */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSolid,
              { backgroundColor: theme.primary },
            ]}
            onPress={() => router.push("/(auth)/backup-intro")}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: "#fff" }]}>
              Create Wallet
            </Text>
          </TouchableOpacity>
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
  welcomeImage: {
    width: 220,
    height: 220,
  },
  buttonGroup: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOutline: {
    borderWidth: 1.5,
  },
  buttonSolid: {},
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
