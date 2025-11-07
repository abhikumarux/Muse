import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";

export default function PhotoshootTabPlaceholder() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: theme.text }]}>Create Photoshoot</Text>
      </View>
      <View style={styles.content}>
        <Ionicons name="camera-outline" size={80} color={theme.tabIconDefault} />
        <Text style={[styles.placeholderText, { color: theme.secondaryText }]}>This is where you will create new photoshoots.</Text>
        <Text style={[styles.placeholderSubText, { color: theme.tabIconDefault }]}>(Coming Soon)</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    fontSize: 28,
    fontFamily: "Inter-ExtraBold",
    textAlign: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginBottom: 60,
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: "Inter-ExtraBold",
    textAlign: "center",
    marginTop: 20,
  },
  placeholderSubText: {
    fontSize: 14,
    fontFamily: "Inter-ExtraBold",
    textAlign: "center",
    marginTop: 8,
  },
});
