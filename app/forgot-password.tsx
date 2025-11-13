import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Keyboard, Modal, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { forgotPasswordRequest, forgotPasswordConfirm, isValidEmail, isStrongPassword } from "../lib/aws/auth";
import { LinearGradient } from "expo-linear-gradient"; // Import LinearGradient
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const { width } = Dimensions.get("window");
const scale = Math.min(width / 375, 1.25);

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [codeInput, setCodeInput] = useState<string[]>(Array(6).fill(""));
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];
  const styles = createStyles(themeColors);

  const sendCode = async () => {
    Keyboard.dismiss();
    if (!isValidEmail(email)) return Alert.alert("Invalid email", "Enter a valid email address.");

    setLoading(true);
    try {
      await forgotPasswordRequest(email.trim());
      Alert.alert("Check your email", "If an account exists for this email, we sent a 6-digit code. Enter it in the pop-up to reset your password.");
      setModalVisible(true);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      Alert.alert("Error", "Could not request password reset. Please try again later.");
      console.error("Forgot password request error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...codeInput];
    const digit = text.replace(/[^0-9]/g, "");
    newCode[index] = digit;
    setCodeInput(newCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (event: any, index: number) => {
    if (event.nativeEvent.key === "Backspace") {
      const newCode = [...codeInput];
      if (!newCode[index] && index > 0) {
        newCode[index - 1] = "";
        inputRefs.current[index - 1]?.focus();
      } else {
        newCode[index] = "";
      }
      setCodeInput(newCode);
    }
  };

  const handleVerifyCode = () => {
    const codeString = codeInput.join("");
    if (codeString.length !== 6) {
      Alert.alert("Incomplete Code", "Please enter the full 6-digit code.");
      return;
    }
    setVerifiedCode(codeString);
    Keyboard.dismiss();
    setModalVisible(false);
    setStep("password");
    setCodeInput(Array(6).fill(""));
  };

  const confirmNewPassword = async () => {
    Keyboard.dismiss();

    if (!verifiedCode) {
      Alert.alert("Code Error", "Verification code seems missing. Please try sending the code again.");
      setStep("email");
      setNewPassword("");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      Alert.alert("Weak password", "Password must be at least 8 characters and include upper, lower, number, and special characters.");
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordConfirm(email.trim(), verifiedCode, newPassword);
      Alert.alert("Success", "Password updated successfully. Please sign in with your new password.");
      router.replace("/login");
    } catch (e: any) {
      if (e.name === "CodeMismatchException" || e.name === "ExpiredCodeException") {
        Alert.alert("Error", "The code is incorrect or has expired. Please request a new code.");
        setStep("email");
        setVerifiedCode(null);
        setNewPassword("");
      } else {
        Alert.alert("Error", e?.message || "Could not reset password.");
      }
      console.error("Confirm password error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
      <Pressable onPress={Keyboard.dismiss} style={styles.outerPressable}>
        {/* Replace ImageBackground with LinearGradient */}
        <LinearGradient colors={themeColors.authGradient} style={styles.gradientContainer}>
          <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContentContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <BlurView intensity={80} tint={colorScheme} style={styles.formContainer}>
                <Text style={styles.header}>Reset Password</Text>
                <Text style={styles.instructions}>
                  {step === "email" && "Enter your email. If an account exists, we'll send a code to reset your password."}
                  {step === "password" && "Enter your new password below."}
                </Text>

                <TextInput
                  style={[styles.input, step !== "email" && styles.disabledInput]}
                  placeholder="Email address"
                  placeholderTextColor={themeColors.inputPlaceholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={step === "email" && !loading}
                />

                {step === "password" && (
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor={themeColors.inputPlaceholder}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                  />
                )}

                {loading && step === "email" ? (
                  <ActivityIndicator size="large" color={themeColors.text} style={styles.buttonContainer} />
                ) : (
                  <TouchableOpacity style={[styles.buttonContainer, loading && styles.disabledButton]} onPress={step === "email" ? sendCode : confirmNewPassword} disabled={loading}>
                    <Text style={styles.buttonText}>
                      {step === "email" && "Send Code"}
                      {step === "password" && (loading ? "Updating..." : "Update Password")}
                    </Text>
                  </TouchableOpacity>
                )}
              </BlurView>
            </ScrollView>

            {/* Verification code modal */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={modalVisible}
              onRequestClose={() => {
                setModalVisible(false);
                setCodeInput(Array(6).fill(""));
              }}
            >
              <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
                <View style={styles.modalContent}>
                  <TouchableOpacity style={styles.closeModalButton} onPress={() => setModalVisible(false)}>
                    <Ionicons name="close-circle" size={wp("7%") * scale} color={themeColors.secondaryText} />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Verify Code</Text>
                  <Text style={styles.modalMessage}>Enter the 6-digit code sent to your email.</Text>

                  <View style={styles.codeInputContainer}>
                    {codeInput.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref: TextInput | null) => {
                          inputRefs.current[index] = ref;
                        }}
                        style={styles.codeInput}
                        keyboardType="number-pad"
                        maxLength={1}
                        onChangeText={(text) => handleCodeChange(text, index)}
                        onKeyPress={(e) => handleBackspace(e, index)}
                        value={digit}
                        selectionColor={themeColors.tint}
                        editable={!loading}
                        textContentType="oneTimeCode"
                      />
                    ))}
                  </View>

                  <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyCode} disabled={loading}>
                    <Text style={styles.verifyButtonText}>Verify Code</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={sendCode} style={{ marginTop: 15 }} disabled={loading}>
                    <Text style={styles.resendText}>Didn't receive code? Resend</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          </View>
        </LinearGradient>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const createStyles = (themeColors: (typeof Colors)[keyof typeof Colors]) =>
  StyleSheet.create({
    keyboardAvoidingContainer: {
      flex: 1,
    },
    outerPressable: {
      flex: 1,
    },
    // Add gradient container
    gradientContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
      // Remove background color
      backgroundColor: "transparent",
    },
    // Remove gridImageStyle
    scrollContentContainer: {
      flexGrow: 1,
      justifyContent: "center",
      paddingBottom: 40,
    },
    formContainer: {
      marginHorizontal: wp("5%"),
      padding: wp("4%") * scale,
      paddingTop: hp("3.5%"),
      paddingBottom: hp("3.5%"),
      overflow: "hidden",
      borderRadius: wp("8%"),
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 9,
      backgroundColor: themeColors.background,
    },
    header: {
      fontSize: wp("6%") * scale,
      color: "#f44747ff",
      marginBottom: hp("1.5%"),
      textAlign: "center",
      fontFamily: "Inter-ExtraBold",
    },
    instructions: {
      fontSize: wp("3.9") ,
      color: themeColors.secondaryText,
      textAlign: "center",
      marginBottom: hp("3%"),
      lineHeight: hp("2.5%"),
      fontFamily: "Inter-ExtraBold",
    },
    input: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      padding: hp("1.7%"),
      borderRadius: wp("3%"),
      fontSize: wp("4%"),
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
      marginBottom: hp("2%"),
      fontFamily: "Inter-medium",
    },
    disabledInput: {
      opacity: 0.6,
    },
    buttonContainer: {
      marginTop: hp("1%"),
      borderRadius: wp("4%"),
      height: hp("6%"),
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: themeColors.buttonBackground,
    },
    disabledButton: {
      opacity: 0.7,
    },
    buttonText: {
      color: themeColors.buttonText,
      fontSize: wp("4.5%"),
      fontFamily: "Inter-ExtraBold",
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(85, 83, 83, 0.14)",
    },
    modalContent: {
      width: "90%",
      backgroundColor: themeColors.background,
      borderRadius: wp("8%"),
      padding: wp("5%"),
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
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
      fontSize: wp("5.5%") * scale,
      color: themeColors.text,
      marginBottom: hp("1%"),
      textAlign: "center",
      fontFamily: "Inter-ExtraBold",
    },
    modalMessage: {
      fontSize: wp("3.4%") * scale,
      color: themeColors.secondaryText,
      textAlign: "center",
      marginBottom: hp("2.5%"),
      lineHeight: hp("2.5%"),
      fontFamily: "Inter-ExtraBold",
    },
    codeInputContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: hp("2%"),
      paddingHorizontal: wp("0.25%"),
    },
    codeInput: {
      width: wp("10%"),
      height: wp("12%"),
      borderWidth: 2,
      borderColor: themeColors.inputBorder,
      borderRadius: wp("2.5%"),
      textAlign: "center",
      fontSize: wp("4.3%") * scale,
      color: themeColors.text,
      backgroundColor: themeColors.inputBackground,
      fontFamily: "Inter-ExtraBold",
      textAlignVertical: "center",
    },
    verifyButton: {
      backgroundColor: themeColors.buttonBackground,
      paddingVertical: hp("1.8%"),
      paddingHorizontal: 40,
      borderRadius: wp("4%"),
      width: "80%",
      alignItems: "center",
      marginTop: hp("1%"),
    },
    verifyButtonText: {
      color: themeColors.buttonText,
      fontSize: wp("4.5%"),
      fontFamily: "Inter-ExtraBold",
    },
    resendText: {
      color: "#f44747ff",
      textDecorationLine: "underline",
      fontSize: wp("4%"),
      marginTop: hp("1.5%"),
      fontFamily: "Inter-ExtraBold",
    },
  });