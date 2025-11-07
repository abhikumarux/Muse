import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import { Tabs } from "expo-router";
import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { CreateIcon } from "@/components/icons/CreateIcon";
import { ContentIcon } from "@/components/icons/ContentIcon";
import { ProfileIcon } from "@/components/icons/ProfileIcon";

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors.tint,
        tabBarInactiveTintColor: themeColors.tabIconDefault,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,

        // Push the icons down styles
        tabBarIconStyle: {
          alignContent: "center",
          marginVertical: 17,
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
          marginHorizontal: 30,
          paddingHorizontal: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Create",
          tabBarIcon: ({ color }) => <CreateIcon width={36} height={36} fill={color} />,
        }}
      />

      <Tabs.Screen
        name="content"
        options={{
          title: "content",
          tabBarIcon: ({ color }) => <ContentIcon width={38} height={38} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <IconSymbol size={34} name="bag.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <ProfileIcon width={34} height={34} fill={color} />,
        }}
      />
    </Tabs>
  );
}
