import { Redirect, Tabs } from "expo-router";
import { Clock, Compass, Home, TrendingUp } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { WalletRepository } from "../../modules/wallet/infrastructure/WalletRepository";
import { useAppStore } from "../../store/appStore";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { isDarkMode } = useAppStore();

  const activeColor = isDarkMode ? "#FFFFFF" : "#000000";
  const inactiveColor = isDarkMode
    ? "rgba(255, 255, 255, 0.4)"
    : "rgba(0, 0, 0, 0.35)";

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          bottom: 0,
          shadowColor: "transparent",
          elevation: 0,
          width: "100%",
          paddingHorizontal: 10,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 10,
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

        let IconComponent;

        if (route.name === "index") {
          IconComponent = Home;
        } else if (route.name === "discover") {
          IconComponent = Compass;
        } else if (route.name === "history") {
          IconComponent = Clock;
        } else if (route.name === "earn") {
          IconComponent = TrendingUp;
        } else {
          IconComponent = Home;
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <IconComponent
              size={25}
              color={isFocused ? activeColor : inactiveColor}
              strokeWidth={2}
            />
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
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="earn" options={{ title: "Earn" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    position: "absolute",
    alignSelf: "center",
    height: 150,
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 10,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
});
