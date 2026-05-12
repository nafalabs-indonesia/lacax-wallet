// app/(auth)/reveal-seed.tsx
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, ClipboardCopy } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useCreateWallet } from "../../hooks/useCreateWallet";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function RevealSeedScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const { mnemonic, generateNewWallet, startVerification } = useCreateWallet();

  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!mnemonic) generateNewWallet();
  }, []);

  const words = mnemonic ? mnemonic.split(" ") : [];

  const handleCopy = async () => {
    if (mnemonic) {
      await Clipboard.setStringAsync(mnemonic);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    }
  };

  const handleGoToVerify = () => {
    startVerification();
    router.push("/(auth)/verify-seed");
  };

  if (!mnemonic) return null;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { borderColor: theme.border }]}
        >
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Cadangkan Wallet
        </Text>

        <View style={{ width: 44 }} />
      </View>

      {!showSeed ? (
        <View style={styles.content}>
          {/* TOP */}
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              Amankan Aset Anda
            </Text>

            <Text style={[styles.desc, { color: theme.textSecondary }]}>
              Ketuk{" "}
              <Text style={{ fontWeight: "700", color: theme.primary }}>
                Lihat Frasa
              </Text>{" "}
              untuk melihat 12 kata pemulihan rahasia Anda.
            </Text>
          </View>

          {/* CENTER IMAGE */}
          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/secure-wallet.png")}
              style={styles.seedImage}
              resizeMode="contain"
            />
          </View>

          {/* BOTTOM BUTTON */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonOutline,
                { borderColor: theme.border },
              ]}
              onPress={handleGoToVerify}
            >
              <Text style={[styles.buttonText, { color: theme.textSecondary }]}>
                Lewati
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSolid,
                { backgroundColor: theme.primary },
              ]}
              onPress={() => setShowSeed(true)}
            >
              <Text style={[styles.buttonText, { color: "#fff" }]}>
                Lihat Frasa
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View>
            <Text
              style={[
                styles.desc,
                {
                  color: theme.textSecondary,
                  marginBottom: 20,
                },
              ]}
            >
              Salin atau tulis 12 kata ini. Ini adalah satu-satunya cara
              memulihkan wallet Anda.
            </Text>

            <View
              style={[
                styles.seedCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.seedGrid}>
                {words.map((word, index) => (
                  <View
                    key={index}
                    style={[
                      styles.seedItem,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.seedNum, { color: theme.primary }]}>
                      {index + 1}
                    </Text>

                    <Text style={[styles.seedWord, { color: theme.text }]}>
                      {word}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.copyBtn,
                  {
                    backgroundColor: copied
                      ? theme.primary + "18"
                      : theme.background,
                    borderColor: copied ? theme.primary : theme.border,
                  },
                ]}
                onPress={handleCopy}
              >
                {copied ? (
                  <Check size={15} color={theme.primary} />
                ) : (
                  <ClipboardCopy size={15} color={theme.textSecondary} />
                )}

                <Text
                  style={[
                    styles.copyText,
                    {
                      color: copied ? theme.primary : theme.textSecondary,
                    },
                  ]}
                >
                  {copied ? "Tersalin!" : "Salin Frasa"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={handleGoToVerify}
          >
            <Text style={styles.primaryBtnText}>Saya Sudah Menyimpannya</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  content: {
    flex: 1,
    justifyContent: "space-between",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 12,
    lineHeight: 38,
  },

  desc: {
    fontSize: 15.5,
    lineHeight: 24,
  },

  imageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 10,
  },

  seedImage: {
    width: "85%",
    maxWidth: 340,
    height: 340,
  },

  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    paddingBottom: 55,
  },

  button: {
    flex: 1,
    borderRadius: 9999,
    paddingVertical: 15,
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

  seedCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },

  seedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  seedItem: {
    width: "47.5%",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
  },

  seedNum: {
    fontSize: 11,
    fontWeight: "800",
    width: 18,
    textAlign: "right",
  },

  seedWord: {
    fontSize: 14,
    fontWeight: "600",
  },

  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
  },

  copyText: {
    fontSize: 13.5,
    fontWeight: "700",
  },

  primaryBtn: {
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 50,
  },

  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
