import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../lib/UserContext";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const ONBOARDING_KEY = "@Muse:hasCompletedOnboarding";

export default function AppEntry() {
  const router = useRouter();
  const { initializing, userId } = useUser();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  // Check if the user has seen the onboarding tutorial before
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        // --- FOR DEVELOPMENT: Uncomment the line below to reset the onboarding status ---
        // await AsyncStorage.removeItem(ONBOARDING_KEY);
        // -------------------------------------------------------------------------
        
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasOnboarded(value === "true");
      } catch (e) {
        console.error("Failed to read onboarding status from storage", e);
        setHasOnboarded(false); // Default to showing onboarding if storage fails
      }
    };
    checkOnboarding();
  }, []);

  // Once we know their onboarding status AND their auth status, decide where to go
  useEffect(() => {
    // Wait until we have a definitive answer from both storage and the user context
    if (initializing || hasOnboarded === null) {
      return;
    }

    // Logic:
    if (hasOnboarded === false) {
      // First-time user (or new key), send to tutorial
      router.replace("/onboarding");
    } else if (userId) {
      // Returning user who is logged in, send to main app
      router.replace("/(tabs)");
    } else {
      // Returning user who is logged out, send to landing page
      router.replace("/landing");
    }
  }, [initializing, userId, hasOnboarded, router]);

  // Show a loading spinner while we figure out where to go
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});