import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { FontAwesome } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { SocialButtons } from "@/components/ui/SocialButtons";
import {
  signInEmailPassword,
  getRememberedEmail,
  rememberEmail,
  getIdTokenFromStorage,
} from "../lib/aws/auth";
import { ensureMuseUserRow } from "../lib/aws/userProfile";
import { useUser } from "../lib/UserContext";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { MuseLogo } from "../assets/svg/MuseLogo";

const { width } = Dimensions.get("window");
const scale = Math.min(width / 375, 1.25);

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
    })();
  }, []);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (rememberMe) await rememberEmail(email.trim());
      else await rememberEmail(null);

      await signInEmailPassword(email.trim(), password);
      const idToken = await getIdTokenFromStorage();
      if (idToken) await ensureMuseUserRow(idToken);
      await refreshUser();
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={[]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <BlurView intensity={80} tint={colorScheme} style={styles.formContainer}>
                <MuseLogo
                  width={wp("35%") * scale}
                  height={hp("10%") * scale}
                  style={{ alignSelf: 'center' }}
                />

                <Text style={styles.greeting}>Hello there,</Text>
                <Text style={styles.subheader}>Welcome Back!</Text>

                {/* Email Field */}
                <View style={styles.labelContainer}>
                  <FontAwesome name="envelope-o" size={16} color={themeColors.text} style={styles.labelIcon} />
                  <Text style={styles.label}>Enter Email Address</Text>
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  placeholderTextColor={themeColors.inputPlaceholder}
                />

                {/* Password Field */}
                <View style={styles.labelContainer}>
                  <FontAwesome name="lock" size={18} color={themeColors.text} style={styles.labelIcon} />
                  <Text style={styles.label}>Enter Password</Text>
                </View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry
                  style={styles.input}
                  placeholderTextColor={themeColors.inputPlaceholder}
                />

                {/* Remember + Forgot */}
                <View style={styles.row}>
                  <TouchableOpacity
                    onPress={() => setRememberMe(!rememberMe)}
                    style={styles.rememberContainer}
                  >
                    <FontAwesome
                      name={rememberMe ? "check-square" : "square-o"}
                      size={wp("4.5%") * scale}
                      color={rememberMe ? themeColors.buttonBackground : themeColors.text}
                      style={{ marginRight: wp("0.5%") }}
                    />
                    <Text style={styles.rememberText}>Remember me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => router.push("/forgot-password")}>
                    <Text style={styles.linkText}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <ActivityIndicator
                    size="large"
                    color={themeColors.text}
                    style={{ marginTop: hp("2%") }}
                  />
                ) : (
                  <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Login</Text>
                  </TouchableOpacity>
                )}

                <SocialButtons />

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Don’t have an account? </Text>
                  <TouchableOpacity onPress={() => router.replace("/register")}>
                    <Text style={styles.linkText}>Sign up</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (themeColors) =>
  StyleSheet.create({
    keyboardAvoidingContainer: { flex: 1 },
    container: { flex: 1, backgroundColor: themeColors.loginBackground },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingVertical: hp("7%"),
    },
    formContainer: {
    marginHorizontal: wp("5%"),
    padding: wp("4%") * scale,
    borderRadius: wp("8%"),
    borderWidth: 2,
    borderColor: themeColors.inputBorder,
    backgroundColor: themeColors.background,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    overflow: "hidden", 
},
    logo: {
      width: wp("45%") * scale,
      height: hp("10%") * scale,
      alignSelf: "center",
    },
    greeting: {
      fontSize: wp("6%") * scale,
      fontFamily: "Inter-ExtraBold",
      color: themeColors.text,
    },
    subheader: {
      fontSize: wp("6%") * scale,
      fontFamily: "Inter-ExtraBold",
      color: "#1ce6a6ff",
      marginBottom: hp("1.5%"),
    },
    labelContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: hp("1.5%"),
      marginBottom: hp("0.5%"),
    },
    labelIcon: { marginRight: wp("2%") },
    label: {
      color: themeColors.text,
      fontSize: wp("4%"),
      fontFamily: "Inter-ExtraBold",
    },
    input: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      padding: hp("1.7%"),
      borderRadius: wp("3%"),
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
      fontSize: wp("4%"),
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      marginVertical: hp("1.5%"),
      paddingHorizontal: wp("1%"),
    },
    rememberContainer: {
      flexDirection: "row",
      alignItems: "center",
      maxWidth: "60%",
    },
    rememberText: {
      color: themeColors.text,
      fontSize: wp("4%"),
      flexShrink: 1,
    },
    linkText: {
      color: "#1ce6a6ff",
      fontSize: wp("4%"),
      fontFamily: "Inter-ExtraBold",
      marginLeft: wp("2%"),
    },
    button: {
      backgroundColor: themeColors.buttonBackground,
      paddingVertical: hp("1.8%"),
      borderRadius: wp("4%"),
      alignItems: "center",
      width: "100%",
      marginTop: hp("1"),
    },
    buttonText: {
      color: themeColors.background,
      fontSize: wp("4.5%"),
      fontFamily: "Inter-ExtraBold",
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: hp("0"),
    },
    footerText: {
      color: themeColors.text,
      fontSize: wp("4%"),
    },
  });