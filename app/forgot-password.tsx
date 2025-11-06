import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  Dimensions, ImageBackground, KeyboardAvoidingView, Platform,
  ScrollView, Keyboard, Modal, Pressable, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from '@expo/vector-icons';
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  forgotPasswordRequest,
  forgotPasswordConfirm,
  isValidEmail,
  isStrongPassword,
} from "../lib/aws/auth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [codeInput, setCodeInput] = useState<string[]>(Array(6).fill(''));
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null); // State to store verified code
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"email" | "password">("email"); // Removed "code" step, handled by modal
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
      await forgotPasswordRequest(email.trim()); //
      // Change alert message and always show modal
      Alert.alert(
        "Check your email",
        "If an account exists for this email, we sent a 6-digit code. Enter it in the pop-up to reset your password."
      );
      setModalVisible(true); // Show modal regardless of whether user exists
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      // Show generic error, avoid specifics unless necessary
      Alert.alert("Error", "Could not request password reset. Please try again later.");
      console.error("Forgot password request error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Verification code input handlers
  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...codeInput];
    const digit = text.replace(/[^0-9]/g, '');
    newCode[index] = digit;
    setCodeInput(newCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace') {
      const newCode = [...codeInput];
      if (!newCode[index] && index > 0) {
        newCode[index - 1] = '';
        inputRefs.current[index - 1]?.focus();
      } else {
        newCode[index] = '';
      }
      setCodeInput(newCode);
    }
  };

  // Verify code inside the modal
  const handleVerifyCode = () => {
    const codeString = codeInput.join('');
    if (codeString.length !== 6) {
      Alert.alert("Incomplete Code", "Please enter the full 6-digit code.");
      return;
    }
    // Store the verified code and proceed
    setVerifiedCode(codeString);
    Keyboard.dismiss();
    setModalVisible(false);
    setStep("password");
    setCodeInput(Array(6).fill('')); // Reset modal input state
  };


  const confirmNewPassword = async () => {
    Keyboard.dismiss();

    // Use the stored verifiedCode
    if (!verifiedCode) {
      Alert.alert("Code Error", "Verification code seems missing. Please try sending the code again.");
      setStep("email");
      setNewPassword('');
      return;
    }

    if (!isStrongPassword(newPassword)) {
      Alert.alert(
        "Weak password",
        "Password must be at least 8 characters and include upper, lower, number, and special characters."
      );
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordConfirm(email.trim(), verifiedCode, newPassword); //
      Alert.alert("Success", "Password updated successfully. Please sign in with your new password.");
      router.replace("/login");
    } catch (e: any) {
      // Catch common errors like expired/incorrect code
      if (e.name === 'CodeMismatchException' || e.name === 'ExpiredCodeException') {
        Alert.alert("Error", "The code is incorrect or has expired. Please request a new code.");
        setStep("email"); // Go back to start
        setVerifiedCode(null);
        setNewPassword('');
      } else {
         Alert.alert("Error", e?.message || "Could not reset password.");
      }
      console.error("Confirm password error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <Pressable onPress={Keyboard.dismiss} style={styles.outerPressable}>
        <View style={styles.container}>
          <ImageBackground
            source={require("../assets/images/grid.png")}
            style={StyleSheet.absoluteFill}
            imageStyle={styles.gridImageStyle}
            resizeMode="repeat"
          />
          <BlurView intensity={4} tint={colorScheme} style={StyleSheet.absoluteFill} />

          <ScrollView
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <BlurView intensity={80} tint={colorScheme} style={styles.formContainer}>
              <Text style={styles.header}>Reset Password</Text>
              <Text style={styles.instructions}>
                {step === "email" && "Enter your email. If an account exists, we'll send a code to reset your password."}
                {step === "password" && "Enter your new password below."}
              </Text>

              {/* Email Input */}
              <TextInput
                style={[styles.input, step !== 'email' && styles.disabledInput]} // Slightly grey out if not active step
                placeholder="Email address"
                placeholderTextColor={themeColors.inputPlaceholder}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={step === "email" && !loading}
              />

              {/* New Password Input - Show only in password step */}
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

              {/* Action Button */}
              {loading && step === 'email' ? ( // Show loader only for email step async action
                 <ActivityIndicator size="large" color={themeColors.text} style={styles.buttonContainer} />
              ) : (
                <TouchableOpacity
                  style={[styles.buttonContainer, loading && styles.disabledButton]} // Dim button if loading password step
                  onPress={step === 'email' ? sendCode : confirmNewPassword}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {step === 'email' && "Send Code"}
                    {step === 'password' && (loading ? "Updating..." : "Update Password")}
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
                setCodeInput(Array(6).fill('')); // Reset code on close
            }}
          >
             <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
               <View style={styles.modalContent}>
                 <TouchableOpacity style={styles.closeModalButton} onPress={() => setModalVisible(false)}>
                   <Ionicons name="close-circle" size={28} color={themeColors.secondaryText} />
                 </TouchableOpacity>
                 <Text style={styles.modalTitle}>Verify Code</Text>
                 <Text style={styles.modalMessage}>Enter the 6-digit code sent to your email.</Text>

                 <View style={styles.codeInputContainer}>
                   {codeInput.map((digit, index) => (
                     <TextInput
                       key={index}
                       ref={(ref: TextInput | null) => { inputRefs.current[index] = ref; }}
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
                 {/* Resend code link */}
                 <TouchableOpacity onPress={sendCode} style={{ marginTop: 15 }} disabled={loading}>
                     <Text style={styles.resendText}>Didn't receive code? Resend</Text>
                 </TouchableOpacity>
               </View>
             </Pressable>
           </Modal>
           {/* End Modal */}
        </View>
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
    container: {
      flex: 1,
      backgroundColor: themeColors.loginBackground,
    },
    gridImageStyle: { opacity: 0.5 },
    scrollContentContainer: {
      flexGrow: 1,
      justifyContent: "center",
      paddingBottom: 40,
    },
    formContainer: {
      marginHorizontal: 35,
      padding: 25,
      paddingTop: 40,
      paddingBottom: 40,
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
    header: {
      fontSize: 28,
      color: themeColors.text,
      marginBottom: 15,
      textAlign: "center",
      fontFamily: "Inter-ExtraBold", // Updated
    },
    instructions: {
      fontSize: 16,
      color: themeColors.secondaryText,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 22,
      fontFamily: "Inter-ExtraBold", // Updated
    },
    input: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      padding: 15,
      borderRadius: 12,
      fontSize: 17,
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
      marginBottom: 20,
      fontFamily: "Inter-ExtraBold", // Updated
    },
    disabledInput: {
      backgroundColor: themeColors.inputBackground + "80",
      opacity: 0.7,
    },
    buttonContainer: {
      marginTop: 20,
      borderRadius: 12,
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: themeColors.buttonBackground,
    },
    disabledButton: {
      opacity: 0.7,
    },
    buttonText: {
      color: themeColors.text,
      fontSize: 18,
      fontFamily: "Inter-ExtraBold", // Updated
    },

    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    modalContent: {
      width: "90%",
      backgroundColor: themeColors.cardBackground,
      borderRadius: 20,
      padding: 25,
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
      top: 10,
      right: 10,
      padding: 5,
    },
    modalTitle: {
      fontSize: 22,
      color: themeColors.text,
      marginBottom: 10,
      textAlign: "center",
      fontFamily: "Inter-ExtraBold", // Updated
    },
    modalMessage: {
      fontSize: 15,
      color: themeColors.secondaryText,
      textAlign: "center",
      marginBottom: 25,
      lineHeight: 21,
      fontFamily: "Inter-ExtraBold", // Updated
    },
    codeInputContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: 20,
      paddingHorizontal: 5,
    },
    codeInput: {
      width: 45,
      height: 55,
      borderWidth: 1.5,
      borderColor: themeColors.inputBorder,
      borderRadius: 10,
      textAlign: "center",
      fontSize: 22,
      color: themeColors.text,
      backgroundColor: themeColors.inputBackground,
      fontFamily: "Inter-ExtraBold", // Updated
    },
    verifyButton: {
      backgroundColor: themeColors.buttonBackground,
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 12,
      width: "80%",
      alignItems: "center",
      marginTop: 10,
    },
    verifyButtonText: {
      color: themeColors.text,
      fontSize: 18,
      fontFamily: "Inter-ExtraBold", // Updated
    },
    resendText: {
      color: themeColors.tint,
      fontSize: 15,
      marginTop: 5,
      fontFamily: "Inter-ExtraBold", // Updated
    },
  });