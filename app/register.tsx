import React, { useState, useRef } from "react";
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
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { SocialButtons } from "@/components/ui/SocialButtons";
import { signUpEmailPassword, confirmSignUp, resendConfirmationCode, isValidEmail, isStrongPassword, signInEmailPassword, getIdTokenFromStorage } from "../lib/aws/auth";
import { ensureMuseUserRow } from "../lib/aws/userProfile";
import { useUser } from "../lib/UserContext";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
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
  const { refreshUser } = useUser();

  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];
  const styles = createStyles(themeColors);

  // --- Verification Modal State ---
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(""));
  const [isConfirming, setIsConfirming] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  // --- End Verification Modal State ---

  const handleRegister = async () => {
    Keyboard.dismiss();

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (!isStrongPassword(password)) {
      Alert.alert("Weak password", "Password must be at least 8 characters and include upper, lower, number, and special.");
      return;
    }

    setLoading(true);
    try {
      await signUpEmailPassword(email.trim(), password, name.trim());
      console.log("Sign up successful, showing modal.");
      setVerificationModalVisible(true);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      console.log("Sign up failed:", err.name, err.message);
      if (err.name === "UsernameExistsException") {
        console.log("User exists. Attempting to resend code.");
        try {
          await resendConfirmationCode(email.trim());
          setVerificationModalVisible(true);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
          Alert.alert("Verification Needed", "This email is already registered but unconfirmed. We've resent the verification code.");
        } catch (resendErr: any) {
          console.error("Resend code failed:", resendErr);
          Alert.alert("Error", resendErr?.message || "Could not resend code. Please try signing in.");
        }
      } else {
        Alert.alert("Error", err?.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- PASTE-FIX FUNCTION ---
  const handleCodeChange = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, "");

    if (index === 0 && cleanText.length > 1) {
      // This is a paste operation in the first box
      const newCode = cleanText.substring(0, 6).split(""); // Get up to 6 digits

      // Pad with empty strings if the paste is less than 6 digits
      while (newCode.length < 6) {
        newCode.push("");
      }

      setVerificationCode(newCode);

      // Focus the last box
      inputRefs.current[5]?.focus();
      Keyboard.dismiss(); // Dismiss keyboard
    } else if (cleanText.length === 1) {
      // This is a single digit input
      const newCode = [...verificationCode];
      newCode[index] = cleanText;
      setVerificationCode(newCode);

      // Move focus to the next box
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleBackspace = (event: any, index: number) => {
    if (event.nativeEvent.key === "Backspace") {
      const newCode = [...verificationCode];
      if (!newCode[index] && index > 0) {
        // If current box is empty, clear the previous box and focus it
        newCode[index - 1] = "";
        inputRefs.current[index - 1]?.focus();
      } else {
        // If current box has a value, just clear it
        newCode[index] = "";
      }
      setVerificationCode(newCode);
    }
  };

  const handleConfirm = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6) {
      Alert.alert("Incomplete Code", "Please enter the full 6-digit code.");
      return;
    }
    setIsConfirming(true);
    Keyboard.dismiss();
    try {
      await confirmSignUp(email.trim(), code);
      await signInEmailPassword(email.trim(), password);

      const idToken = await getIdTokenFromStorage();
      if (idToken) await ensureMuseUserRow(idToken);

      await refreshUser();

      const fullName = name.trim();
      const firstName = fullName.split(" ")[0] || fullName;

      setVerificationModalVisible(false);
      setVerificationCode(Array(6).fill(""));

      Alert.alert(`Welcome, ${firstName}!`, "Your account is confirmed.");

      router.replace("/(tabs)"); // Go to main app
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Confirmation failed");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendConfirmationCode(email.trim());
      Alert.alert("Code Sent", "We’ve re-sent the verification code to your email.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not resend code");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={[]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <BlurView intensity={80} tint={colorScheme} style={styles.formContainer}>
                <MuseLogo width={wp("35%") * scale} height={hp("7") * scale} style={{ alignSelf: "center" }} />

                <View style={styles.headerRow}>
                  <Text style={styles.greeting}>Let’s Get You </Text>
                  <Text style={styles.subheader}>Started!</Text>
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
                  editable={!loading}
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
                  editable={!loading}
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
                  editable={!loading}
                />

                {/* Confirm Password (Re-added) */}
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
                  editable={!loading}
                />

                {loading ? (
                  <ActivityIndicator size="large" color={themeColors.text} style={{ marginTop: hp("2%") }} />
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

              {/* --- Verification Modal --- */}
              <Modal
                animationType="fade"
                transparent={true}
                visible={verificationModalVisible}
                onRequestClose={() => {
                  setVerificationModalVisible(false);
                  setVerificationCode(Array(6).fill(""));
                }}
              >
                <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
                  <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeModalButton} onPress={() => setVerificationModalVisible(false)}>
                      <Ionicons name="close-circle" size={wp("7%") * scale} color={themeColors.secondaryText} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Verify your email</Text>
                    <Text style={styles.modalMessage}>We sent you a 6-digit code. Enter it below to confirm.</Text>

                    <View style={styles.codeInputContainer}>
                      {verificationCode.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={(ref: TextInput | null) => {
                            inputRefs.current[index] = ref;
                          }}
                          style={styles.codeInput}
                          keyboardType="number-pad"
                          // --- UPDATED PROP ---
                          maxLength={index === 0 ? 6 : 1}
                          // --- END UPDATED PROP ---
                          onChangeText={(text) => handleCodeChange(text, index)}
                          onKeyPress={(e) => handleBackspace(e, index)}
                          value={digit}
                          selectionColor={themeColors.tint}
                          editable={!isConfirming}
                          textContentType="oneTimeCode"
                        />
                      ))}
                    </View>

                    {isConfirming ? (
                      <ActivityIndicator size="large" color={themeColors.buttonBackground} style={{ marginTop: 20 }} />
                    ) : (
                      <TouchableOpacity style={styles.verifyButton} onPress={handleConfirm}>
                        <Text style={styles.verifyButtonText}>Verify</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={handleResend} style={{ marginTop: 15 }}>
                      <Text style={styles.resendText}>Didn't receive code? Resend</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Modal>
              {/* --- End Verification Modal --- */}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (themeColors: any) =>
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
      flexDirection: "row",
      alignItems: "baseline",
    },
    greeting: {
      fontSize: wp("4.8"),
      fontFamily: "Inter-ExtraBold",
      color: themeColors.text,
    },
    subheader: {
      fontSize: wp("4.8"),
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

    // --- Modal Styles ---
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    modalContent: {
      width: wp("90%"),
      backgroundColor: themeColors.background, // Match form background
      borderRadius: wp("5%"),
      padding: wp("6%"),
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      position: "relative",
    },
    closeModalButton: {
      position: "absolute",
      top: hp("1%"),
      right: wp("2%"),
      padding: 5,
    },
    modalTitle: {
      fontSize: wp("6%") * scale,
      fontFamily: "Inter-ExtraBold",
      color: themeColors.text,
      marginBottom: hp("1%"),
      textAlign: "center",
    },
    modalMessage: {
      fontSize: wp("4%"),
      color: themeColors.secondaryText,
      textAlign: "center",
      marginBottom: hp("3%"),
      lineHeight: hp("3%"),
    },
    codeInputContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: hp("2.5%"),
      paddingHorizontal: wp("1%"),
    },
    codeInput: {
      width: wp("11%"),
      height: hp("7%"),
      borderWidth: 1.5,
      borderColor: themeColors.inputBorder,
      borderRadius: wp("2.5%"),
      textAlign: "center",
      fontSize: wp("5.5%"),
      fontFamily: "Inter-ExtraBold",
      color: themeColors.text,
      backgroundColor: themeColors.inputBackground,
    },
    verifyButton: {
      backgroundColor: themeColors.buttonBackground,
      paddingVertical: hp("1.8%"),
      paddingHorizontal: wp("10%"),
      borderRadius: wp("3%"),
      width: "80%",
      alignItems: "center",
      marginTop: hp("1%"),
    },
    verifyButtonText: {
      color: themeColors.background, // Match button text color
      fontSize: wp("4.5%"),
      fontFamily: "Inter-ExtraBold",
    },
    resendText: {
      color: themeColors.tint, // Use tint color for links
      fontSize: wp("4%"),
      marginTop: hp("1%"),
    },
  });
