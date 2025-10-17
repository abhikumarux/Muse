import React, { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { SplashScreen } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getValidIdToken } from "../lib/aws/auth";
import Splash from "@/components/Splash";

// Keep the native splash screen visible while we figure out where to go
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  // This effect determines the user's destination
  useEffect(() => {
    async function prepare() {
      try {
        const token = await getValidIdToken();
        if (token) {
          setInitialRoute("/(tabs)");
          return;
        }
        const hasSeenLanding = await AsyncStorage.getItem("hasSeenLanding");
        if (hasSeenLanding) {
          setInitialRoute("/login");
          return;
        }
        setInitialRoute("/landing");
      } catch (e) {
        console.warn(e);
        setInitialRoute("/login"); // Default to login on any error
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    // Hide the native splash screen ONLY when we're ready to show the video
    if (initialRoute) {
      await SplashScreen.hideAsync();
    }
  }, [initialRoute]);

  // While determining the route, this component returns nothing,
  // so the native splash screen remains visible.
  if (!initialRoute) {
    return null;
  }

  // Once the route is determined, we render the video splash and hide the native one
  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Splash initialRoute={initialRoute} />
    </View>
  );
}
