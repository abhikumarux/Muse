import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity,
  StyleSheet, Dimensions, Image, ImageBackground, TouchableWithoutFeedback, Keyboard
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

      const token = await getIdTokenFromStorage();
      if (token) router.replace("/(tabs)");
    })();
  }, []);

  const handleLogin = async () => {
    if (!password) {
      Alert.alert("Missing password", "Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      if (rememberMe) await rememberEmail(email.trim());
      else await rememberEmail(null);

      await signInEmailPassword(email.trim(), password);

      const idToken = await getIdTokenFromStorage();
      if (idToken) await ensureMuseUserRow(idToken);

      // **Important**: hydrate context before rendering tabs
      await refreshUser();

      setEmail("");
      setPassword("");
      router.replace("/(tabs)");
    } catch (err: any) {
      const msg =
        err?.name === "UserNotConfirmedException"
          ? "Your email isn’t confirmed yet. Check your inbox for the code, or sign up again to resend it."
          : err?.message || "Login failed.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.header}>Hello there,</Text>
          <Text style={styles.subheader}>Welcome Back!</Text>

          <Text style={styles.label}>Enter Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email address"
            style={styles.input}
            placeholderTextColor={themeColors.inputPlaceholder}
          />

          <Text style={styles.label}>Enter Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            style={styles.input}
            placeholderTextColor={themeColors.inputPlaceholder}
          />

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <FontAwesome
                name={rememberMe ? "check-square" : "square-o"}
                size={20}
                color={rememberMe ? themeColors.buttonBackground : themeColors.text}
                style={styles.rememberMeIcon}
              />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/forgot-password")}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={themeColors.text} style={styles.loginButtonContainer} />
          ) : (
            <TouchableOpacity style={styles.loginButtonContainer} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
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
            <Text style={styles.registerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/register")}>
              <Text style={styles.registerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </View>
    </TouchableWithoutFeedback>
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
    header: { fontSize: 30, fontWeight: "bold", color: themeColors.text, marginBottom: 5, textAlign: "left" },
    subheader: { fontSize: 30, fontWeight: "bold", color: themeColors.subHeader, marginBottom: 5, textAlign: "left" },
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
    optionsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 30 },
    rememberMeContainer: { flexDirection: "row", alignItems: "center" },
    rememberMeIcon: { marginRight: 8 },
    rememberMeText: { color: themeColors.text, fontSize: 16 },
    forgotPasswordText: { color: themeColors.text, fontSize: 16 },
    loginButtonContainer: { marginTop: 10, borderRadius: 12, height: 50, justifyContent: "center", alignItems: "center", backgroundColor: themeColors.buttonBackground },
    loginButtonText: { color: themeColors.text, fontSize: 18, fontWeight: "bold" },
    orText: { color: themeColors.text, textAlign: "center", marginVertical: 20, fontSize: 16 },
    socialContainer: { flexDirection: "row", justifyContent: "space-around", marginBottom: 30 },
    socialButton: {
      flex: 1, marginHorizontal: 10, paddingVertical: 10, backgroundColor: themeColors.inputBackground,
      borderRadius: 12, alignItems: "center", height: 50, justifyContent: "center",
    },
    registerContainer: { flexDirection: "row", justifyContent: "center" },
    registerText: { color: themeColors.text, fontSize: 18 },
    registerLink: { color: themeColors.subHeader, fontSize: 18, fontWeight: "bold" },
  });
