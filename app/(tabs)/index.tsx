import React from "react";
import { View, Text } from "react-native";

export default function HomeTab() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Welcome to Muse!</Text>
      <Text style={{ marginTop: 16 }}>This is your Home tab. Add your app content here.</Text>
    </View>
  );
}
