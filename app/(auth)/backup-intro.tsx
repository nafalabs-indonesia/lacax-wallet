import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function BackupIntroScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>
          Back Up Your Wallet
        </Text>

        {/* Description */}
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your{" "}
          <Text style={{ fontWeight: "600", color: theme.text }}>
            secret recovery phrase
          </Text>{" "}
          is required to restore access to your crypto if you lose your device
          or move to another wallet.
          {"\n"}
          <Text style={{ fontWeight: "600", color: theme.text }}>
            Keep it private and never share it with anyone.
          </Text>
        </Text>

        {/* Illustration */}
        <View style={styles.illustration}>
          <Image
            source={require("../../assets/secure.png")}
            style={styles.welcomeImage}
            resizeMode="contain"
          />
        </View>

        {/* Single CTA Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => router.push("/(auth)/reveal-seed")}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Reveal Recovery Phrase</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  illustration: {
    alignItems: "center",
    marginVertical: 20,
  },
  welcomeImage: {
    width: 260,
    height: 260,
  },
  button: {
    width: "100%",
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
