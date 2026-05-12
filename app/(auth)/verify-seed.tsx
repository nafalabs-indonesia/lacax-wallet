// app/(auth)/verify-seed.tsx
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Eye } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useCreateWallet } from "../../hooks/useCreateWallet";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function VerifySeedScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const {
    mnemonic,
    verifyIndices,
    selectedWords,
    handleWordSelect,
    verifySeedPhrase,
    error,
  } = useCreateWallet();
  const [showHint, setShowHint] = useState(false);

  const words = mnemonic ? mnemonic.split(" ") : [];

  // Pastikan indices terisi saat mount
  useEffect(() => {
    // Logika inisialisasi verifikasi harus ada di hook atau di sini
    // Asumsi hook sudah menyiapkan verifyIndices
  }, []);

  const isComplete = selectedWords.length === verifyIndices.length;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.iconBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <ArrowLeft size={20} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Verifikasi Frasa
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>
        Konfirmasi Penyimpanan
      </Text>
      <Text style={[styles.desc, { color: theme.textSecondary }]}>
        Pilih kata ke-{verifyIndices.map((i) => i + 1).join(", ")} dari frasa
        pemulihan Anda untuk memastikan Anda telah menyimpannya dengan benar.
      </Text>

      {!showHint && (
        <TouchableOpacity
          onPress={() => setShowHint(true)}
          style={[
            styles.hintBtn,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <Eye size={16} color={theme.textSecondary} />
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>
            Lihat frasa lagi
          </Text>
        </TouchableOpacity>
      )}

      {/* Slots Kosong */}
      <View style={styles.slotRow}>
        {verifyIndices.map((idx, i) => {
          const word = selectedWords[i];
          return (
            <View
              key={i}
              style={[
                styles.slot,
                {
                  backgroundColor: word ? theme.primary : theme.card,
                  borderColor: word ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.slotLabel,
                  {
                    color: word ? "rgba(255,255,255,0.7)" : theme.textSecondary,
                  },
                ]}
              >
                #{idx + 1}
              </Text>
              <Text
                style={[
                  styles.slotWord,
                  { color: word ? "#fff" : theme.textSecondary },
                ]}
              >
                {word || "..."}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Pilihan Kata */}
      <View style={styles.wordGrid}>
        {words.map((word, idx) => {
          const isSelected = selectedWords.includes(word);
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => !isSelected && handleWordSelect(word)}
              disabled={isSelected}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.border + "40"
                    : theme.card,
                  borderColor: theme.border,
                  opacity: isSelected ? 0.5 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? theme.textSecondary : theme.text },
                ]}
              >
                {word}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && (
        <Text style={[styles.errorText, { color: "#FF3B30" }]}>{error}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          {
            backgroundColor: isComplete ? theme.primary : theme.border,
            opacity: isComplete ? 1 : 0.5,
          },
        ]}
        onPress={verifySeedPhrase} // Fungsi ini harus mengarah ke Create PIN
        disabled={!isComplete}
      >
        <CheckCircle2
          size={20}
          color={isComplete ? "#fff" : theme.textSecondary}
        />
        <Text
          style={[
            styles.primaryBtnText,
            { color: isComplete ? "#fff" : theme.textSecondary },
          ]}
        >
          Verifikasi
        </Text>
      </TouchableOpacity>

      {/* Hint View Overlay could be implemented here similar to previous code if needed */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, flexGrow: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  desc: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  hintBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  hintText: { fontSize: 14, fontWeight: "500" },
  slotRow: { flexDirection: "row", gap: 10, marginBottom: 30 },
  slot: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  slotLabel: { fontSize: 10, fontWeight: "700" },
  slotWord: { fontSize: 14, fontWeight: "700" },
  wordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 30,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: "500" },
  errorText: { textAlign: "center", marginBottom: 10, fontWeight: "600" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 9999,
    paddingVertical: 16,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
});
