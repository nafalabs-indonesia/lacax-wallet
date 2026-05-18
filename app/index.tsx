// app/index.tsx
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

export default function Index() {
  const { isDarkMode, walletAddress, isStorageLoaded } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const router = useRouter();

  useEffect(() => {
    if (!isStorageLoaded) return;

    const timer = setTimeout(() => {
      if (walletAddress) {
        router.replace("/(auth)/unlock");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [walletAddress, isStorageLoaded]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Image
        source={require("../assets/logo.gif")}
        style={styles.logo}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: {
    width: 150,
    height: 150,
  },
});
