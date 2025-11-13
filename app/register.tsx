import React, { useState } from "react";
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
  signUpEmailPassword,
  confirmSignUp,
} from "../lib/aws/auth";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { MuseLogo } from "../assets/svg/MuseLogo"; 

const { width } = Dimensions.get("window");
const scale = Math.min(width / 375, 1.25);

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];
  const styles = createStyles(themeColors);

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUpEmailPassword(email.trim(), password, name);
      Alert.alert("Success", "Please verify your email before logging in.");
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Registration failed.");
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
                  height={hp("7") * scale}
                  style={{ alignSelf: 'center' }}
                />

                <View style={styles.headerRow}>
                  <Text style={styles.greeting}>Create Account, </Text>
                  <Text style={styles.subheader}>Let’s Get Started!</Text>
                </View>

                {/* Name */}
                <View style={styles.labelContainer}>
                  <FontAwesome name="user" size={18} color={themeColors.text} style={styles.labelIcon} />
                  <Text style={styles.label}>Enter Full Name</Text>
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  autoCapitalize="words"
                  style={styles.input}
                  placeholderTextColor={themeColors.inputPlaceholder}
                />

                {/* Email */}
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

                {/* Password */}
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

                {/* Confirm Password */}
                <View style={styles.labelContainer}>
                  <FontAwesome name="lock" size={18} color={themeColors.text} style={styles.labelIcon} />
                  <Text style={styles.label}>Confirm Password</Text>
                </View>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  secureTextEntry
                  style={styles.input}
                  placeholderTextColor={themeColors.inputPlaceholder}
                />

                {loading ? (
                  <ActivityIndicator
                    size="large"
                    color={themeColors.text}
                    style={{ marginTop: hp("2%") }}
                  />
                ) : (
                  <TouchableOpacity style={styles.button} onPress={handleRegister}>
                    <Text style={styles.buttonText}>Register</Text>
                  </TouchableOpacity>
                )}

                <SocialButtons />

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => router.replace("/login")}>
                    <Text style={styles.linkText}>Login</Text>
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
      paddingVertical: hp("5%"),
    },
    formContainer: {
      marginHorizontal: wp("5%") * scale,
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    greeting: {
      fontSize: wp("4.8"),
      fontFamily: "Inter-ExtraBold",
      color: themeColors.text,
    },
    subheader: {
      fontSize: wp("4.8") ,
      fontFamily: "Inter-ExtraBold",
      color: "#1ce6a6ff",
    },
    labelContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: hp("1.4%"),
      marginBottom: hp("0.5%"),
    },
    labelIcon: { marginRight: wp("2%") },
    label: {
      color: themeColors.text,
      fontSize: wp("3.5%") * scale,
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
    button: {
      backgroundColor: themeColors.buttonBackground,
      paddingVertical: hp("1.8%"),
      borderRadius: wp("4%"),
      alignItems: "center",
      width: "100%",
      marginTop: hp("2.5%"),
    },
    buttonText: {
      color: themeColors.background,
      fontSize: wp("4.5%"),
      fontFamily: "Inter-ExtraBold",
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: hp("0%"),
    },
    footerText: {
      color: themeColors.text,
      fontSize: wp("4%"),
    },
    linkText: {
      color: "#1ce6a6ff",
      fontSize: wp("4%"),
      fontFamily: "Inter-ExtraBold",
      marginLeft: wp("2%"),
    },
  });