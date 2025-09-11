import React, { useRef } from "react";
import { StyleSheet, Text, View, ScrollView, Image, Dimensions, TouchableOpacity } from "react-native";
// Import SafeAreaView from 'react-native-safe-area-context' for consistency
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const salesData = [
  { day: "S", profit: 60 },
  { day: "M", profit: 75 },
  { day: "T", profit: 65 },
  { day: "W", profit: 50 },
  { day: "T", profit: 85 },
  { day: "F", profit: 40 },
  { day: "S", profit: 70 },
];

const carouselImages = [require("@/assets/images/hoodie-design.png"), require("@/assets/images/tshirt-placeholder.png")];

export default function IndexScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const scrollRef = useRef<ScrollView>(null);

  return (
    // Use the same SafeAreaView component and props as settings.tsx
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* --- Settings-style Header --- */}
      <View style={styles.header}>
        <Image source={colorScheme === "dark" ? require("@/assets/images/logo.png") : require("@/assets/images/logo.png")} style={styles.logo} />
        <View style={[styles.coinsContainer, { backgroundColor: theme.headerChip }]}>
          <Image source={require("@/assets/images/coin-icon.png")} style={styles.coinIcon} />
          <Text style={styles.coinText}>325</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}>
        {/* --- Top Cards Row --- */}
        <View style={styles.topCardsContainer}>
          {/* Maher Card */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.maherTitle, { color: theme.text }]}>Maher.</Text>
            <Image source={require("@/assets/images/muse-placeholder.png")} style={styles.maherAvatar} />
            <Text style={[styles.maherSubtitle, { color: theme.text }]}>Streetwear</Text>
          </View>

          {/* Sales Card */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View>
              <Text style={[styles.salesTitle, { color: theme.text }]}>Total Sales</Text>
              <Text style={[styles.salesSubtitle, { color: theme.secondaryText }]}>Calculated in last 30 days</Text>
            </View>
            <View style={styles.chartContainer}>
              {salesData.map((data, index) => (
                <View key={index} style={styles.barWrapper}>
                  <View style={[styles.bar, { height: `${data.profit}%` }]} />
                  <Text style={[styles.barLabel, { color: theme.secondaryText }]}>{data.day}</Text>
                </View>
              ))}
            </View>
            <View style={styles.salesSummary}>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryIndicator, { backgroundColor: "#F44336" }]} />
                <View>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>$21,345</Text>
                  <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>TOTAL COST</Text>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryIndicator, { backgroundColor: "#00E676" }]} />
                <View>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>$34,280</Text>
                  <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>TOTAL PROFIT</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* --- Carousel Section --- */}
        <View style={[styles.carouselContainer, { backgroundColor: theme.card }]}>
          <TouchableOpacity style={styles.addImageButton}>
            <Image source={require("@/assets/images/photos-icon.png")} style={styles.addImageIcon} />
          </TouchableOpacity>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselScrollView}>
            {carouselImages.map((image, index) => (
              <Image key={index} source={image} style={styles.carouselImage} />
            ))}
          </ScrollView>
          <View style={styles.pagination}>
            {carouselImages.map((_, index) => (
              <View key={index} style={[styles.dot, { backgroundColor: index === 0 ? theme.tint : theme.tabIconDefault }]} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // --- Header styles copied exactly from settings.tsx ---
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 16,
  },
  logo: {
    width: 200,
    height: 80,
    resizeMode: "contain",
    marginTop: -20,
    marginLeft: -20,
  },
  coinsContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coinIcon: { width: 24, height: 24, marginRight: 8 },
  coinText: { fontSize: 16, fontWeight: "bold", color: "#F57F17" },

  topCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
  maherTitle: { fontSize: 28, fontWeight: "bold" },
  maherAvatar: {
    width: CARD_WIDTH * 0.8,
    height: CARD_WIDTH * 1.2,
    resizeMode: "contain",
    marginVertical: 8,
  },
  maherSubtitle: { fontSize: 20 },
  salesTitle: { fontSize: 28, fontWeight: "bold" },
  salesSubtitle: { fontSize: 18 },
  // --- 👇 CHART STYLE CHANGES BELOW ---
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    alignSelf: "stretch", // Ensure it takes full width of the card
    height: 120, // Increased height
    marginVertical: 24, // Increased vertical margin for spacing
  },
  barWrapper: {
    alignItems: "center",
    flex: 1, // Allow wrappers to space out evenly
  },
  bar: {
    width: 12, // Increased bar width
    backgroundColor: "#00E676",
    borderRadius: 6, // Adjusted for new width
  },
  barLabel: {
    fontSize: 12, // Increased font size
    marginTop: 8, // Increased margin for spacing
  },
  // --- 👆 CHART STYLE CHANGES ABOVE ---
  salesSummary: { marginTop: 12 },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryIndicator: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  summaryValue: { fontSize: 22, fontWeight: "bold" },
  summaryLabel: { fontSize: 22 },
  carouselContainer: {
    borderRadius: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  addImageButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  addImageIcon: { width: 32, height: 32 },
  carouselScrollView: { alignItems: "center" },
  carouselImage: { width: width - 32, height: 350, resizeMode: "contain" },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
});
