import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { signInWithSso, getIdTokenFromStorage } from "@/lib/aws/auth";
import { ensureMuseUserRow } from "@/lib/aws/userProfile";
import { useUser } from "@/lib/UserContext";

type Provider = "Google" | "Apple";

export function SocialButtons() {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const router = useRouter();
  const { refreshUser } = useUser();
  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];
  const styles = createStyles(themeColors);

  const handleSignIn = async (provider: Provider) => {
    console.log(`[SOCIAL BTN LOG] handleSignIn called for provider: ${provider}`);
    setLoadingProvider(provider);
    try {
      if (provider === "Apple") {
        console.log("[SOCIAL BTN LOG] Apple Sign In not implemented.");
        Alert.alert("Coming Soon", "Sign in with Apple is not yet available.");
        setLoadingProvider(null);
        return;
      }

      console.log("[SOCIAL BTN LOG] Calling signInWithSso...");
      await signInWithSso(provider); // This handles the browser flow & token exchange
      console.log("[SOCIAL BTN LOG] signInWithSso completed.");

      console.log("[SOCIAL BTN LOG] Attempting to get ID token from storage...");
      const idToken = await getIdTokenFromStorage();
      if (!idToken) {
        console.error("[SOCIAL BTN LOG] ID token not found after successful sign in!");
        throw new Error("Sign in completed, but failed to retrieve session token.");
      }
      console.log("[SOCIAL BTN LOG] ID token retrieved.");

      console.log("[SOCIAL BTN LOG] Calling ensureMuseUserRow...");
      await ensureMuseUserRow(idToken);
      console.log("[SOCIAL BTN LOG] ensureMuseUserRow completed.");

      console.log("[SOCIAL BTN LOG] Calling refreshUser...");
      await refreshUser();
      console.log("[SOCIAL BTN LOG] refreshUser completed.");

      console.log("[SOCIAL BTN LOG] Navigating to /(tabs)...");
      router.replace("/(tabs)");
      console.log("[SOCIAL BTN LOG] Navigation complete.");

    } catch (error: any) {
      // Handle cancellation or other errors
      if (error.message?.includes("cancel")) {
        console.log("[SOCIAL BTN LOG] SSO Sign in cancelled by user.");
      } else {
        console.error("[SOCIAL BTN LOG] SSO Sign in error:", error);
        Alert.alert("Sign In Error", error.message || "An unexpected error occurred during sign in.");
      }
    } finally {
      console.log("[SOCIAL BTN LOG] Resetting loading state.");
      setLoadingProvider(null);
    }
  };

  return (
    <>
      <Text style={styles.orText}>Or Continue with</Text>
      <View style={styles.socialContainer}>
        {/* Google Button */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSignIn("Google")}
          disabled={!!loadingProvider}
        >
          {loadingProvider === "Google" ? (
            <ActivityIndicator color="#fc6e6eff" />
          ) : (
            <FontAwesome name="google" size={24} color="#fc6e6eff" />
          )}
        </TouchableOpacity>

        {/* Apple Button */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSignIn("Apple")}
          disabled={!!loadingProvider}
        >
          {loadingProvider === "Apple" ? (
            <ActivityIndicator color={themeColors.text} />
          ) : (
            <FontAwesome name="apple" size={24} color={themeColors.text} />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

// Styles adapted from login/register screens
const createStyles = (themeColors: (typeof Colors)[keyof typeof Colors]) =>
  StyleSheet.create({
    orText: {
      color: themeColors.text,
      textAlign: "center",
      marginVertical: 15,
      fontSize: 15,
    },
    socialContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 25,
      gap: 15,
    },
    socialButton: {
      flex: 1,
      paddingVertical: 10,
      backgroundColor: themeColors.inputBackground,
      borderRadius: 10,
      alignItems: "center",
      height: 50,
      justifyContent: "center",
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
    },
  });