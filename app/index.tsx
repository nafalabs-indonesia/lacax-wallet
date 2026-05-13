// app/index.tsx
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

export default function Index() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

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
