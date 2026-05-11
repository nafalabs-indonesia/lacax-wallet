// app/(tabs)/explore.tsx
import { StyleSheet, Text, View } from "react-native";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function ExploreScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Explore</Text>
      <Text style={{ color: theme.textSecondary }}>
        Fitur DApps & Browser segera hadir.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
});
