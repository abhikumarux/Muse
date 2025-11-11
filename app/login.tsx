import { SocialButtons } from "@/components/ui/SocialButtons";
import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity,
  StyleSheet, Dimensions, Image, ImageBackground, TouchableWithoutFeedback, Keyboard,
  ScrollView, KeyboardAvoidingView, Platform
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  signInEmailPassword,
  getRememberedEmail,
  rememberEmail,
  getIdTokenFromStorage,
} from "../lib/aws/auth";
import { ensureMuseUserRow } from "../lib/aws/userProfile";
import { useUser } from "../lib/UserContext";
import { LoadingModal } from "@/components/ui/LoadingModal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useUser();

  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];
  const styles = createStyles(themeColors);

  useEffect(() => {
    (async () => {
      const remembered = await getRememberedEmail();
      if (remembered) setEmail(remembered);

      // Check for token, refresh user context, THEN navigate
      const token = await getIdTokenFromStorage();
      if (token) {
        try {
          await refreshUser(); // Make sure user data is loaded
          router.replace("/(tabs)");
        } catch (e) {
          console.error("Error refreshing user on initial load:", e);
          // If refresh fails, stay on login
        }
      }
    })();
  }, [refreshUser, router]); // Keep dependencies

  const handleLogin = async () => {
    Keyboard.dismiss(); // Dismiss keyboard
    if (!password) {
      Alert.alert("Missing password", "Please enter your password.");
      return;
    }
    setLoading(true); // Show LoadingModal
    try {
      if (rememberMe) await rememberEmail(email.trim());
      else await rememberEmail(null);

      await signInEmailPassword(email.trim(), password);

      const idToken = await getIdTokenFromStorage();
      if (idToken) await ensureMuseUserRow(idToken);

      // Hydrate context before rendering tabs
      await refreshUser();

      // Only clear email if rememberMe is false
      setPassword("");
      if (!rememberMe) setEmail("");

      router.replace("/(tabs)");
    } catch (err: any) {
      const msg = err?.name === "UserNotConfirmedException" ? "Your email isn’t confirmed yet. Check your inbox for the code, or sign up again to resend it." : err?.message || "Login failed.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false); // Hide LoadingModal
    }
  };

  return (
    // Keep KeyboardAvoidingView structure
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          {/* Add the LoadingModal component */}
          <LoadingModal visible={loading} text="Logging in..." />
          <BlurView intensity={4} tint={colorScheme} style={StyleSheet.absoluteFill} />

          {/* Keep ScrollView */}
          <ScrollView contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BlurView intensity={80} tint={colorScheme} style={styles.formContainer}>
              <View style={styles.logoContainer}>
                <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
              </View>

              <Text style={styles.header}>Hello there,</Text>
              <Text style={styles.subheader}>Welcome Back!</Text>

              <View style={styles.labelContainer}>
                <FontAwesome name="envelope-o" size={16} color={themeColors.text} style={styles.labelIcon} />
                <Text style={styles.label}>Enter Email Address</Text>
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email address"
                style={styles.input}
                placeholderTextColor={themeColors.inputPlaceholder}
                editable={!loading} // Add disabled state
              />

              <View style={styles.labelContainer}>
                <FontAwesome name="lock" size={18} color={themeColors.text} style={styles.labelIcon} />
                <Text style={styles.label}>Enter Password</Text>
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
                style={styles.input}
                placeholderTextColor={themeColors.inputPlaceholder}
                editable={!loading} // Add disabled state
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  disabled={loading} // Add disabled state
                >
                  <FontAwesome name={rememberMe ? "check-square" : "square-o"} size={20} color={rememberMe ? themeColors.buttonBackground : themeColors.text} style={styles.rememberMeIcon} />
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/forgot-password")} disabled={loading}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Use TouchableOpacity with disabled style instead of ActivityIndicator */}
              <TouchableOpacity
                style={[styles.loginButtonContainer, loading && styles.disabledButton]} // Apply disabled style when loading
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>

              {}
              <SocialButtons />
              {}

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don&apos;t have an account? </Text>
                <TouchableOpacity onPress={() => router.replace("/register")} disabled={loading}>
                  <Text style={styles.registerLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </ScrollView>
          {/* End ScrollView */}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    // End KeyboardAvoidingView
  );
}

const createStyles = (themeColors: (typeof Colors)[keyof typeof Colors]) =>
  StyleSheet.create({
    keyboardAvoidingContainer: {
      flex: 1,
    },
    container: { flex: 1, backgroundColor: themeColors.loginBackground },
    scrollContentContainer: {
      flexGrow: 1,
      justifyContent: "center",
      paddingTop: 60,
      paddingBottom: 40,
    },
    logoContainer: { alignItems: "center", marginBottom: 20 },
    logo: { width: SCREEN_WIDTH * 0.5, height: SCREEN_HEIGHT * 0.1 },
    formContainer: {
      marginHorizontal: 35,
      padding: 25,
      overflow: "hidden",
      borderRadius: 30,
      borderWidth: 3,
      borderColor: themeColors.text === "#11181C" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5.46,
      elevation: 9,
    },
    header: {
      fontSize: 30,
      color: themeColors.text,
      marginBottom: 5,
      textAlign: "left",
      fontFamily: "Inter-ExtraBold", // Updated
    },
    subheader: {
      fontSize: 30,
      color: "#1ce6a6ff",
      marginBottom: 5,
      textAlign: "left",
      fontFamily: "Inter-ExtraBold", // Updated
    },

    labelContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      marginBottom: 8,
    },
    labelIcon: {
      marginRight: 10,
      width: 20,
      textAlign: "center",
    },
    label: {
      color: themeColors.text,
      fontSize: 16,
      fontFamily: "Inter-ExtraBold", // Updated
    },
    input: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      padding: 15,
      borderRadius: 12,
      fontSize: 18,
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
      fontFamily: "Inter-medium", // Updated
    },
    optionsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 30 },
    rememberMeContainer: { flexDirection: "row", alignItems: "center" },
    rememberMeIcon: { marginRight: 8 },
    rememberMeText: {
      color: themeColors.text,
      fontSize: 16,
      fontFamily: "Inter-ExtraBold", // Updated
    },
    forgotPasswordText: {
      color: "#1ce6a6ff",
      fontSize: 16,
      fontFamily: "Inter-ExtraBold", // Updated
    },
    loginButtonContainer: { marginTop: 10, borderRadius: 12, height: 50, justifyContent: "center", alignItems: "center", backgroundColor: themeColors.buttonBackground },
    loginButtonText: {
      color: themeColors.background,
      fontSize: 18,
      fontFamily: "Inter-ExtraBold", // Updated
    },

    disabledButton: {
      backgroundColor: themeColors.inputBorder,
      opacity: 0.7,
    },

    registerContainer: { flexDirection: "row", justifyContent: "center", marginTop: 15 },
    registerText: {
      color: themeColors.text,
      fontSize: 18,
      fontFamily: "Inter-ExtraBold", // Updated
    },
    registerLink: {
      color: "#1ce6a6ff",
      fontSize: 18,
      fontFamily: "Inter-ExtraBold", // Updated
    },
  });