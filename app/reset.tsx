// app/reset.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";

export default function ResetScreen() {
  const router = useRouter();

  const handleReset = async () => {
    await WalletRepository.wipeWallet();
    alert("Wallet berhasil dihapus!");
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Wallet</Text>
      <Text style={styles.desc}>Gunakan ini jika aplikasi stuck.</Text>
      <Button
        title="Hapus Semua Data Wallet"
        onPress={handleReset}
        color="red"
      />
      <Button title="Kembali" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  desc: { marginBottom: 20, textAlign: "center" },
});
