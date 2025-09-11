import { Tabs } from "expo-router";
import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur"; // 1. Import BlurView

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];
  // This is the background for the button on Android
  const androidButtonBackground = colorScheme === "dark" ? "rgba(21, 23, 24, 0.95)" : "rgba(250, 250, 250, 0.95)";
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors.tint,
        tabBarInactiveTintColor: themeColors.tabIconDefault,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,

        // Add this style to push the icons down
        tabBarIconStyle: {
          alignContent: "center",
          marginVertical: 13,
        },

        tabBarStyle: {
          position: "absolute",
          bottom: 30,
          height: 70,
          borderRadius: 35,
          backgroundColor: "transparent",
          borderColor: "rgba(0,0,0,0.2)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 5,
          marginHorizontal: 20,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="hanger" color={color} />,
        }}
      />
      <Tabs.Screen
        name="CreateNewDesign"
        options={{
          title: "Create",
          tabBarIcon: (
            { color } // The color prop is passed here
          ) => (
            <View style={styles.createButton}>
              {Platform.OS === "ios" ? (
                <BlurView tint="systemMaterial" intensity={80} style={styles.buttonBackground}>
                  <IconSymbol
                    size={32}
                    name="plus"
                    color={color} // Use the color prop here
                  />
                </BlurView>
              ) : (
                <View style={[styles.buttonBackground, { backgroundColor: androidButtonBackground }]}>
                  <IconSymbol
                    size={32}
                    name="plus"
                    color={color} // And also use it here
                  />
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bag.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#353434ff",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    borderWidth: 0.1,
    elevation: 5,
    overflow: "hidden", // 3. Add overflow to clip the blur effect
  },
  // 4. Add a new style for the BlurView
  blurView: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonBackground: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
