import React, { useState } from "react";
import {
  View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity,
  StyleSheet, Dimensions, Image, ImageBackground
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  signUpEmailPassword,
  confirmSignUp,
  resendConfirmationCode,
  isValidEmail,
  isStrongPassword,
  signInEmailPassword,
  getIdTokenFromStorage,
} from "../lib/aws/auth";
import { ensureMuseUserRow } from "../lib/aws/userProfile";
import { useUser } from "../lib/UserContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useUser();

  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];
  const styles = createStyles(themeColors);

  const handleRegister = async () => {
    if (!isValidEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (!isStrongPassword(password)) {
      Alert.alert(
        "Weak password",
        "Password must be at least 8 characters and include upper, lower, number, and special."
      );
      return;
    }

    setLoading(true);
    try {
      await signUpEmailPassword(email.trim(), password, name.trim() || undefined);
      setNeedsConfirm(true);
      Alert.alert("Verify your email", "We sent you a 6-digit code. Enter it below to confirm.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!code) {
      Alert.alert("Enter code", "Please enter the 6-digit code we emailed you.");
      return;
    }
    setLoading(true);
    try {
      await confirmSignUp(email.trim(), code.trim());
      await signInEmailPassword(email.trim(), password);

      const idToken = await getIdTokenFromStorage();
      if (idToken) await ensureMuseUserRow(idToken);

      // hydrate context before navigating
      await refreshUser();

      Alert.alert("Welcome!", "Your account is confirmed.");
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Confirmation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendConfirmationCode(email.trim());
      Alert.alert("Sent", "We’ve re-sent the verification code.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not resend code");
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../assets/images/grid.png")}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.gridImageStyle}
        resizeMode="repeat"
      />
      <BlurView intensity={4} tint={colorScheme} style={StyleSheet.absoluteFill} />

      <View style={styles.contentWrapper}>
        <BlurView intensity={80} tint={colorScheme} style={styles.formContainer}>
          <View style={styles.logoContainer}>
            <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.header}>
            Create an <Text style={styles.subheader}>Account!</Text>
          </Text>

          <Text style={styles.label}>Enter an email address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email address"
            style={styles.input}
            placeholderTextColor={themeColors.inputPlaceholder}
          />

          <Text style={styles.label}>Name (optional)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder="Your name"
            style={styles.input}
            placeholderTextColor={themeColors.inputPlaceholder}
          />

          <Text style={styles.label}>Enter a password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            style={styles.input}
            placeholderTextColor={themeColors.inputPlaceholder}
          />

          {needsConfirm && (
            <>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="6-digit code"
                style={styles.input}
                placeholderTextColor={themeColors.inputPlaceholder}
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
                <TouchableOpacity onPress={handleResend}>
                  <Text style={{ color: themeColors.subHeader }}>Resend code</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {loading ? (
            <ActivityIndicator size="large" color={themeColors.text} style={styles.loginButtonContainer} />
          ) : (
            <TouchableOpacity style={styles.loginButtonContainer} onPress={needsConfirm ? handleConfirm : handleRegister}>
              <LinearGradient colors={themeColors.loginGradient} style={styles.loginGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.loginButtonText}>{needsConfirm ? "Confirm Email" : "Sign Up"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <Text style={styles.orText}>Or Continue with</Text>

          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton}>
              <FontAwesome name="google" size={24} color="#fc6e6eff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <FontAwesome name="apple" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.registerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const createStyles = (themeColors: (typeof Colors)[keyof typeof Colors]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.loginBackground },
    gridImageStyle: { opacity: 0.5 },
    contentWrapper: { flex: 1, paddingTop: 80, justifyContent: "flex-start" },
    logoContainer: { alignItems: "center", marginBottom: 20 },
    logo: { width: SCREEN_WIDTH * 0.5, height: SCREEN_HEIGHT * 0.1 },
    formContainer: {
      marginHorizontal: 35,
      padding: 25,
      overflow: "hidden",
      borderRadius: 30,
      borderWidth: 1,
      borderColor: themeColors.text === "#11181C" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5.46,
      elevation: 9,
    },
    header: { fontSize: 30, fontWeight: "bold", color: themeColors.text, marginBottom: 10, textAlign: "left" },
    subheader: { fontSize: 30, fontWeight: "bold", color: themeColors.buttonBackground },
    label: { color: themeColors.text, fontSize: 16, marginTop: 20, marginBottom: 8 },
    input: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      padding: 15,
      borderRadius: 12,
      fontSize: 18,
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
    },
    loginButtonContainer: { marginTop: 40, marginBottom: 10, borderRadius: 12, overflow: "hidden", height: 50 },
    loginGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
    loginButtonText: { color: themeColors.text, fontSize: 18, fontWeight: "bold" },
    orText: { color: themeColors.text, textAlign: "center", marginVertical: 20, fontSize: 16 },
    socialContainer: { flexDirection: "row", justifyContent: "space-around", marginBottom: 30 },
    socialButton: {
      flex: 1, marginHorizontal: 10, paddingVertical: 10,
      backgroundColor: themeColors.inputBackground, borderRadius: 12,
      alignItems: "center", height: 50, justifyContent: "center",
    },
    registerContainer: { flexDirection: "row", justifyContent: "center" },
    registerText: { color: themeColors.text, fontSize: 18 },
    registerLink: { color: themeColors.buttonBackground, fontSize: 18, fontWeight: "bold" },
  });
