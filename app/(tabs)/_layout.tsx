// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Clock, Coins } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { WalletRepository } from "../../modules/wallet/infrastructure/WalletRepository";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          bottom: Platform.OS === "ios" ? 40 : 30,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 10,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let icon;

        if (route.name === "index") {
          icon = (
            <Ionicons
              name={isFocused ? "wallet" : "wallet-outline"}
              size={22}
              color={isFocused ? theme.primary : theme.textSecondary}
            />
          );
        } else if (route.name === "history") {
          icon = (
            <Clock
              size={22}
              color={isFocused ? theme.primary : theme.textSecondary}
              strokeWidth={isFocused ? 2.5 : 2}
            />
          );
        } else if (route.name === "earn") {
          icon = (
            <Coins
              size={22}
              color={isFocused ? theme.primary : theme.textSecondary}
              strokeWidth={isFocused ? 2.5 : 2}
            />
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            {icon}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { walletAddress } = useAppStore();

  const [status, setStatus] = React.useState<
    "checking" | "locked" | "new" | "ready"
  >("checking");

  React.useEffect(() => {
    const checkAuth = async () => {
      if (walletAddress) {
        setStatus("ready");
        return;
      }

      const initialized = await WalletRepository.isInitialized();

      if (initialized) {
        setStatus("locked");
      } else {
        setStatus("new");
      }
    };

    checkAuth();
  }, [walletAddress]);

  if (status === "checking") return null;
  if (status === "locked") return <Redirect href="/(auth)/unlock" />;
  if (status === "new") return <Redirect href="/welcome" />;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="history" options={{ title: "Riwayat" }} />
      <Tabs.Screen name="earn" options={{ title: "Earn" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    position: "absolute",
    alignSelf: "center", // bikin center
    width: 220, // lebih pendek
    height: 56,
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderRadius: 9999,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
