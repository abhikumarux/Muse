import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

export default function PhotoshootScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={styles.content}>
        <Text style={[styles.header, { color: theme.text }]}>Photoshoot</Text>
        <Text style={[styles.placeholder, { color: theme.secondaryText }]}>This is a placeholder for the new Photoshoot screen. Content will be added later.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  placeholder: { fontSize: 16, textAlign: "center" },
});
