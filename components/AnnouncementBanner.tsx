// components/AnnouncementBanner.tsx
import { useAppStore } from "@/store/appStore";
import { Colors } from "@/theme/colors";
import { BlurView } from "expo-blur";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const HORIZONTAL_MARGIN = 16;
const CARD_WIDTH = width - HORIZONTAL_MARGIN * 2;

interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  type: "info" | "warning" | "update";
}

interface AnnouncementBannerProps {
  dismissedIds: string[];
  onDismiss: (id: string) => void;
}

export function AnnouncementBanner({
  dismissedIds,
  onDismiss,
}: AnnouncementBannerProps) {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [cardHeight, setCardHeight] = useState(90);

  const [topCardAnim] = useState(new Animated.Value(0));
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch("https://lacax-admin.vercel.app/api/v1/announcements")
      .then((r) => r.json())
      .then((data: Announcement[]) => {
        if (!mounted) return;

        const filtered = data.filter((item) => !dismissedIds.includes(item.id));

        setAnnouncements(filtered);
      })
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, [dismissedIds]);

  const handleDismiss = () => {
    if (isDismissing || announcements.length === 0) return;

    const currentId = announcements[0].id;

    setIsDismissing(true);

    Animated.parallel([
      Animated.timing(topCardAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),

      Animated.timing(topCardAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(currentId);

      topCardAnim.setValue(0);
      setIsDismissing(false);
    });
  };

  // SILENT LOAD
  // Tidak render apa-apa saat fetch
  if (!announcements.length) return null;

  const topItem = announcements[0];
  const secondItem = announcements[1];

  const hasSecondItem = !!secondItem;

  const translateY = topCardAnim.interpolate({
    inputRange: [-100, 0],
    outputRange: [-100, 0],
  });

  const opacity = topCardAnim.interpolate({
    inputRange: [-50, 0],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            height: cardHeight + 8,
            paddingHorizontal: HORIZONTAL_MARGIN,
          },
        ]}
      >
        {/* BACK CARD */}
        {hasSecondItem && (
          <BlurView
            intensity={isDarkMode ? 15 : 30}
            tint={isDarkMode ? "dark" : "light"}
            experimentalBlurMethod="dimezisBlurView"
            style={[
              styles.blurLayer,
              {
                borderColor: theme.border,
                height: cardHeight,
                width: CARD_WIDTH,
                transform: [{ translateY: 8 }, { scale: 0.96 }],
              },
            ]}
          >
            <View style={styles.blurContent}>
              <View
                style={[
                  styles.blurLine1,
                  {
                    backgroundColor: theme.textSecondary,
                  },
                ]}
              />

              <View
                style={[
                  styles.blurLine2,
                  {
                    backgroundColor: theme.textSecondary,
                  },
                ]}
              />
            </View>
          </BlurView>
        )}

        {/* FRONT CARD */}
        <Animated.View
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;

            if (height && height !== cardHeight) {
              setCardHeight(height);
            }
          }}
          style={[
            styles.card,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              width: CARD_WIDTH,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={topItem.link_url ? 0.85 : 1}
            onPress={() =>
              topItem.link_url && Linking.openURL(topItem.link_url)
            }
            style={styles.cardContent}
            disabled={isDismissing}
          >
            {/* IMAGE */}
            {topItem.image_url && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: topItem.image_url }}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* TEXT */}
            <View style={styles.textSide}>
              <Text
                style={[styles.title, { color: theme.text }]}
                numberOfLines={2}
              >
                {topItem.title}
              </Text>

              <Text
                style={[styles.body, { color: theme.textSecondary }]}
                numberOfLines={2}
              >
                {topItem.body}
              </Text>

              {topItem.link_url && (
                <Text style={[styles.link, { color: theme.text }]}>
                  View details →
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* CLOSE BUTTON */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isDismissing}
          >
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    marginTop: 8,
    width: "100%",
  },

  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  blurLayer: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 0,
  },

  blurContent: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 80,
    paddingRight: 40,
  },

  blurLine1: {
    height: 10,
    width: "60%",
    borderRadius: 4,
    opacity: 0.2,
    marginBottom: 8,
  },

  blurLine2: {
    height: 8,
    width: "40%",
    borderRadius: 4,
    opacity: 0.1,
  },

  card: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",

    alignSelf: "center",

    position: "absolute",
    top: 0,

    zIndex: 1,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },

  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",

    minHeight: 100,

    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: 40,
  },

  imageContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },

  illustration: {
    width: "100%",
    height: "100%",
  },

  textSide: {
    flex: 1,
    justifyContent: "center",
    alignSelf: "center",
    gap: 4,
  },

  title: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },

  body: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.9,
  },

  link: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 4,
  },
});
