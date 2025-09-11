import React, { useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

// --- Mock Data (remains the same) ---
const salesData = [
  { day: "S", profit: 60, cost: 40 },
  { day: "M", profit: 75, cost: 25 },
  { day: "T", profit: 65, cost: 35 },
  { day: "W", profit: 50, cost: 50 },
  { day: "T", profit: 85, cost: 15 },
  { day: "F", profit: 40, cost: 60 },
  { day: "S", profit: 70, cost: 30 },
];

const bestSellers = [
  { id: 1, image: require("../../assets/images/hoodie-placeholder.png") },
  { id: 2, image: require("../../assets/images/tshirt-placeholder.png") },
  { id: 3, image: require("../../assets/images/pants-placeholder.png") },
  { id: 4, image: require("../../assets/images/tshirt-placeholder.png") },
];

const vipOrders = [
  { name: "Rick Ross", role: "Rapper, Entrepreneur", followers: "18.2M Instagram", order: "#47433" },
  { name: "Zach Zeiner", role: "Super smart and cool Entrepreneur", followers: "Has @zach Instagram", order: "#47323" },
];

const transactions = [
  { type: "Etsy sale", status: "incoming", amount: "+ $80", time: "Today at 1:55 PM", icon: require("../../assets/images/etsy-logo.png") },
  { type: "Etsy Sale", status: "Deposited", amount: "+ $50", time: "Wednesday at 2:215 pm", icon: require("../../assets/images/etsy-logo.png") },
  { type: "Shopify Sale", status: "Deposited", amount: "+ $40", time: "yesterday at 5:25 pm", icon: require("../../assets/images/shopify-logo.png") },
];
// --- End of Mock Data ---

export default function SettingsTab() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const scrollRef = useRef<ScrollView>(null);

  // Reset scroll position when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* --- Header (Moved Outside ScrollView) --- */}
      <View style={styles.header}>
        <Image source={colorScheme === "dark" ? require("../../assets/images/logo.png") : require("../../assets/images/logo.png")} style={styles.logo} />
        <View style={[styles.coinsContainer, { backgroundColor: theme.headerChip }]}>
          <Image source={require("../../assets/images/coin-icon.png")} style={styles.coinIcon} />
          <Text style={styles.coinText}>325</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* --- Total Sales Card --- */}
        <View style={[styles.salesCard, { backgroundColor: theme.card }]}>
          <View style={styles.salesHeader}>
            <ThemedText type="subtitle">Total Sales</ThemedText>
            <ThemedText style={{ color: theme.secondaryText }}>Calculated in last 30 days</ThemedText>
          </View>
          <View style={styles.salesBody}>
            <View style={styles.chartContainer}>
              {salesData.map((data, index) => (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.bar}>
                    <View style={{ height: `${data.profit}%`, backgroundColor: "#F44336" }} />
                    <View style={{ height: `${data.cost}%`, backgroundColor: "#4CAF50" }} />
                  </View>
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
                <View style={[styles.summaryIndicator, { backgroundColor: "#4CAF50" }]} />
                <View>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>$34,280</Text>
                  <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>TOTAL PROFIT</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* --- Best Sellers --- */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Best Sellers
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {bestSellers.map((item) => (
              <View key={item.id} style={[styles.bestSellerItem, { backgroundColor: theme.card }]}>
                <Image source={item.image} style={styles.bestSellerImage} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* --- VIP Orders --- */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            VIP Orders
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {vipOrders.map((order, index) => (
              <View key={index} style={[styles.vipCard, { backgroundColor: theme.card, borderColor: theme.headerChip }]}>
                <Text style={[styles.vipName, { color: theme.text }]}>{order.name}</Text>
                <Text style={[styles.vipRole, { color: theme.secondaryText }]}>{order.role}</Text>
                <Text style={[styles.vipFollowers, { color: theme.tint }]}>{order.followers}</Text>
                <Text style={[styles.vipOrder, { color: theme.secondaryText }]}>{order.order}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* --- Transactions --- */}
        <View style={styles.section}>
          {transactions.map((tx, index) => (
            <View key={index} style={[styles.txRow, { backgroundColor: theme.card }]}>
              <View style={styles.txLeft}>
                <View style={[styles.txIconContainer, { backgroundColor: theme.background }]}>
                  <Image source={tx.icon} style={styles.txIcon} />
                </View>
                <View>
                  <Text style={[styles.txType, { color: theme.text }]}>{tx.type}</Text>
                  <Text style={[styles.txStatus, { color: theme.secondaryText }]}>{tx.status}</Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>{tx.amount}</Text>
                <Text style={[styles.txTime, { color: theme.secondaryText }]}>{tx.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 16,
    
  },
  logo: { width: 200, height: 80, resizeMode: "contain", marginTop: -20, marginLeft: -20 },
  coinsContainer: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  coinIcon: { width: 24, height: 24, marginRight: 8 },
  coinText: { fontSize: 16, fontWeight: "bold", color: "#F57F17" },
  salesCard: { borderRadius: 20, padding: 16, marginBottom: 24 },
  salesHeader: { marginBottom: 16 },
  salesBody: { flexDirection: "row", alignItems: "flex-end" },
  chartContainer: { flex: 1, flexDirection: "row", justifyContent: "space-around", height: 100 },
  barWrapper: { alignItems: "center", justifyContent: "flex-end" },
  bar: { width: 12, height: "100%", borderRadius: 6, overflow: "hidden", flexDirection: "column-reverse" },
  barLabel: { fontSize: 12, marginTop: 4 },
  salesSummary: { marginLeft: 16 },
  summaryItem: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  summaryIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  summaryValue: { fontSize: 18, fontWeight: "bold" },
  summaryLabel: { fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { marginBottom: 12 },
  bestSellerItem: { width: 100, height: 100, borderRadius: 16, marginRight: 12, justifyContent: "center", alignItems: "center" },
  bestSellerImage: { width: "80%", height: "80%", resizeMode: "contain" },
  vipCard: { borderRadius: 16, padding: 16, marginRight: 12, width: 250, borderWidth: 1 },
  vipName: { fontWeight: "bold", fontSize: 16, marginBottom: 4 },
  vipRole: { fontSize: 12, marginBottom: 8 },
  vipFollowers: { fontSize: 12, marginBottom: 8 },
  vipOrder: { fontSize: 12, alignSelf: "flex-end" },
  txRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 16, padding: 12, marginBottom: 12 },
  txLeft: { flexDirection: "row", alignItems: "center" },
  txIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  txIcon: { width: 24, height: 24, resizeMode: "contain" },
  txType: { fontWeight: "bold" },
  txStatus: { fontSize: 12 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontWeight: "bold", color: "#4CAF50" },
  txTime: { fontSize: 12 },
});
