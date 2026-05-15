// app/(tabs)/discover.tsx
import {
    Bell,
    ExternalLink,
    ScanLine,
    Search,
    Star,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

const { width } = Dimensions.get("window");

// Data Dummy untuk DApps
const CATEGORIES = ["All", "DeFi", "NFT", "Games", "Social", "Tools"];

const FEATURED_DAPPS = [
  {
    id: 1,
    name: "Uniswap",
    category: "DeFi",
    description: "Swap tokens instantly with low fees.",
    color: "#FF007A",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Uniswap_Logo.png/640px-Uniswap_Logo.png", // Placeholder URL
  },
  {
    id: 2,
    name: "OpenSea",
    category: "NFT",
    description: "Discover and collect rare digital items.",
    color: "#2081E2",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/OpenSea_logo.svg/640px-OpenSea_logo.svg.png",
  },
];

const TRENDING_DAPPS = [
  { id: 3, name: "Aave", category: "DeFi", users: "1.2M", rating: 4.8 },
  {
    id: 4,
    name: "Axie Infinity",
    category: "Games",
    users: "800K",
    rating: 4.5,
  },
  {
    id: 5,
    name: "Lens Protocol",
    category: "Social",
    users: "500K",
    rating: 4.7,
  },
  { id: 6, name: "MetaMask", category: "Tools", users: "5M+", rating: 4.9 },
  { id: 7, name: "Compound", category: "DeFi", users: "600K", rating: 4.6 },
];

export default function DiscoverScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            Explore
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>
            Discover DApps
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.card }]}
          >
            <ScanLine size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.card }]}
          >
            <Bell size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
          <Search
            size={20}
            color={theme.textSecondary}
            style={{ marginRight: 10 }}
          />
          <TextInput
            placeholder="Search for apps or games..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Featured Section */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Featured
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
        >
          {FEATURED_DAPPS.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.9}>
              <View
                style={[
                  styles.featuredCard,
                  { backgroundColor: item.color }, // Menggunakan warna brand sebagai bg
                ]}
              >
                <View style={styles.featuredContent}>
                  <Text style={styles.featuredName}>{item.name}</Text>
                  <Text style={styles.featuredDesc}>{item.description}</Text>
                  <TouchableOpacity style={styles.visitBtn}>
                    <Text style={styles.visitBtnText}>Visit App</Text>
                    <ExternalLink
                      size={14}
                      color="#fff"
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                </View>
                {/* Placeholder Icon/Image di kanan card */}
                <View style={styles.featuredIconPlaceholder}>
                  <Star size={40} color="rgba(255,255,255,0.3)" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Categories */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Categories
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    activeCategory === cat ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: activeCategory === cat ? "#fff" : theme.text },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trending List */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Trending Now
        </Text>
        <View style={styles.listContainer}>
          {TRENDING_DAPPS.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={[styles.appRow, { borderBottomColor: theme.border }]}
              activeOpacity={0.7}
            >
              {/* Icon Placeholder */}
              <View style={[styles.appIcon, { backgroundColor: theme.card }]}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: theme.primary,
                  }}
                >
                  {app.name.charAt(0)}
                </Text>
              </View>

              <View style={styles.appInfo}>
                <Text style={[styles.appName, { color: theme.text }]}>
                  {app.name}
                </Text>
                <Text
                  style={[styles.appCategory, { color: theme.textSecondary }]}
                >
                  {app.category} • {app.users} users
                </Text>
              </View>

              <View style={styles.appRating}>
                <Star size={14} color="#FBBF24" fill="#FBBF24" />
                <Text style={[styles.ratingText, { color: theme.text }]}>
                  {app.rating}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 55 : 45,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "500",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  featuredScroll: {
    paddingRight: 20,
    marginBottom: 24,
  },
  featuredCard: {
    width: width - 80,
    height: 160,
    borderRadius: 24,
    marginRight: 16,
    padding: 20,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  featuredContent: {
    zIndex: 1,
  },
  featuredName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  featuredDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
    maxWidth: "80%",
  },
  visitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  visitBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  featuredIconPlaceholder: {
    position: "absolute",
    right: 20,
    bottom: 20,
    opacity: 0.5,
  },
  categoryScroll: {
    marginBottom: 24,
    paddingRight: 20,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  appCategory: {
    fontSize: 13,
    fontWeight: "500",
  },
  appRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
