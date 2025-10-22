import React from "react";
import { StyleSheet, Text, View, ScrollView, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const { width } = Dimensions.get("window");
const salesData = [
  { day: "S", profit: 60 },
  { day: "M", profit: 75 },
  { day: "T", profit: 65 },
  { day: "W", profit: 50 },
  { day: "T", profit: 85 },
  { day: "F", profit: 40 },
  { day: "S", profit: 70 },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require("@/assets/images/logo.png")} style={styles.logo} />
        <View style={[styles.coinsContainer, { backgroundColor: theme.headerChip }]}>
          <Image source={require("@/assets/images/coin-icon.png")} style={styles.coinIcon} />
          <Text style={styles.coinText}>325</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Sales Card */}
        <View style={styles.bottomCardContainer}>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.salesHeader}>
              <Text style={[styles.salesTitle, { color: theme.text }]}>Total Sales</Text>
              <Text style={[styles.salesSubtitle, { color: theme.secondaryText }]}>Last 30 days</Text>
            </View>
            <View style={styles.chartContainer}>
              {salesData.map((data, index) => (
                <View key={index} style={styles.barWrapper}>
                  <View style={[styles.bar, { height: `${data.profit}%` }]} />
                  <Text style={[styles.barLabel, { color: theme.secondaryText }]}>{data.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

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

  // --- All Muse Carousel styles REMOVED ---
  // (museCarouselContainer, carouselScrollView, loadingCard, largeCard, museImageCard, etc.)

  bottomCardContainer: {
    paddingHorizontal: 16,
    marginTop: 24, // Added a margin-top to replace the space the carousel took
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  salesHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  salesTitle: { fontSize: 24, fontWeight: "bold" },
  salesSubtitle: { fontSize: 16 },

  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 150,
    marginTop: 24,
    width: "100%",
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
  },
  bar: {
    width: 18,
    backgroundColor: "#00E676",
    borderRadius: 9,
  },
  barLabel: {
    fontSize: 14,
    marginTop: 8,
  },
});
