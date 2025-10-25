import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity,
  StyleSheet, Dimensions, Image, ImageBackground, Modal, Pressable, Keyboard,
  ScrollView, KeyboardAvoidingView, Platform
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
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
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useUser();

  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];
  const styles = createStyles(themeColors);

  // Verification
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(''));
  const [isConfirming, setIsConfirming] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleRegister = async () => {
    Keyboard.dismiss();
    
    // Name validation and make it required
    if (name.trim().length === 0) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }

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
      // Pass name.trim() directly
      await signUpEmailPassword(email.trim(), password, name.trim());
      
      console.log("Sign up successful, showing modal.");
      setVerificationModalVisible(true);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);

    } catch (err: any) {
      console.log("Sign up failed:", err.name, err.message);
      if (err.name === 'UsernameExistsException') {
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

  // Verification code input handlers
  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...verificationCode];
    const digit = text.replace(/[^0-9]/g, '');
    newCode[index] = digit;
    setVerificationCode(newCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace') {
      const newCode = [...verificationCode];
      if (!newCode[index] && index > 0) {
        newCode[index - 1] = '';
        inputRefs.current[index - 1]?.focus();
      } else {
        newCode[index] = '';
      }
      setVerificationCode(newCode);
    }
  };

  // Confirmation handler
  const handleConfirm = async () => {
    const code = verificationCode.join('');
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

      // Extract first name and personalize alert
      const fullName = name.trim();
      const firstName = fullName.split(' ')[0] || fullName; // Get first part, or full name if no space

      setVerificationModalVisible(false);
      setVerificationCode(Array(6).fill(''));
      
      Alert.alert(`Welcome, ${firstName}!`, "Your account is confirmed.");
      
      router.replace("/(tabs)");
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
              <View style={styles.logoContainer}>
                <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
              </View>

              <Text style={styles.header}>
                Create an <Text style={styles.subheader}>Account!</Text>
              </Text>

              {/* Name first */}
              <Text style={styles.label}>Enter Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholder="Full name"
                style={styles.input}
                placeholderTextColor={themeColors.inputPlaceholder}
                editable={!loading}
              />

              {/* Email second */}
              <Text style={styles.label}>Enter Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email address"
                style={styles.input}
                placeholderTextColor={themeColors.inputPlaceholder}
                editable={!loading}
              />

              {/* Password third */}
              <Text style={styles.label}>Enter Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
                style={styles.input}
                placeholderTextColor={themeColors.inputPlaceholder}
                editable={!loading}
              />

              {loading ? (
                <ActivityIndicator size="large" color={themeColors.text} style={styles.loginButtonContainer} />
              ) : (
                <TouchableOpacity style={styles.loginButtonContainer} onPress={handleRegister}>
                  <LinearGradient colors={themeColors.loginGradient} style={styles.loginGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.loginButtonText}>Sign Up</Text>
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
          </ScrollView>

          {/* Verification */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={verificationModalVisible}
            onRequestClose={() => {
              setVerificationModalVisible(false);
              setVerificationCode(Array(6).fill(''));
            }}
          >
            <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <TouchableOpacity style={styles.closeModalButton} onPress={() => setVerificationModalVisible(false)}>
                   <Ionicons name="close-circle" size={28} color={themeColors.secondaryText} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Verify your email</Text>
                <Text style={styles.modalMessage}>We sent you a 6-digit code. Enter it below to confirm.</Text>

                <View style={styles.codeInputContainer}>
                  {verificationCode.map((digit, index) => (
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
                      editable={!isConfirming}
                      textContentType="oneTimeCode"
                    />
                  ))}
                </View>

                {isConfirming ? (
                  <ActivityIndicator size="large" color={themeColors.buttonBackground} style={{ marginTop: 20 }}/>
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
          {}
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
      backgroundColor: themeColors.loginBackground
    },
    gridImageStyle: { opacity: 0.5 },
    scrollContentContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingTop: 60,
      paddingBottom: 40,
    },
    logoContainer: { alignItems: "center", marginBottom: 15 },
    logo: { width: SCREEN_WIDTH * 0.45, height: SCREEN_HEIGHT * 0.09 },
    formContainer: {
      marginHorizontal: 30,
      padding: 20,
      overflow: "hidden",
      borderRadius: 25,
      borderWidth: 1,
      borderColor: themeColors.text === "#11181C" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5.46,
      elevation: 9,
    },
    header: { fontSize: 28, fontWeight: "bold", color: themeColors.text, marginBottom: 5, textAlign: "left" },
    subheader: { fontSize: 28, fontWeight: "bold", color: themeColors.buttonBackground },
    label: { color: themeColors.text, fontSize: 15, marginTop: 15, marginBottom: 6 }, // Updated style names
    input: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      padding: 14,
      borderRadius: 10,
      fontSize: 17,
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
    },
    loginButtonContainer: { marginTop: 30, marginBottom: 10, borderRadius: 12, overflow: "hidden", height: 50 },
    loginGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
    loginButtonText: { color: themeColors.text, fontSize: 18, fontWeight: "bold" },
    orText: { color: themeColors.text, textAlign: "center", marginVertical: 15, fontSize: 15 },
    socialContainer: { flexDirection: "row", justifyContent: "space-around", marginBottom: 25 },
    socialButton: {
      flex: 1, marginHorizontal: 8, paddingVertical: 10,
      backgroundColor: themeColors.inputBackground, borderRadius: 10,
      alignItems: "center", height: 50, justifyContent: "center",
    },
    registerContainer: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
    registerText: { color: themeColors.text, fontSize: 17 },
    registerLink: { color: themeColors.buttonBackground, fontSize: 17, fontWeight: "bold" },

    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
      width: '90%',
      backgroundColor: themeColors.cardBackground,
      borderRadius: 20,
      padding: 25,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      position: 'relative',
    },
    closeModalButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      padding: 5,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: themeColors.text,
      marginBottom: 10,
      textAlign: 'center',
    },
    modalMessage: {
      fontSize: 15,
      color: themeColors.secondaryText,
      textAlign: 'center',
      marginBottom: 25,
      lineHeight: 21,
    },
    codeInputContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 20,
      paddingHorizontal: 5,
    },
    codeInput: {
      width: 45,
      height: 55,
      borderWidth: 1.5,
      borderColor: themeColors.inputBorder,
      borderRadius: 10,
      textAlign: 'center',
      fontSize: 22,
      fontWeight: 'bold',
      color: themeColors.text,
      backgroundColor: themeColors.inputBackground,
    },
    verifyButton: {
      backgroundColor: themeColors.buttonBackground,
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 12,
      width: '80%',
      alignItems: 'center',
      marginTop: 10,
    },
    verifyButtonText: {
      color: themeColors.text,
      fontSize: 18,
      fontWeight: 'bold',
    },
    resendText: {
        color: themeColors.tint,
        fontSize: 15,
        marginTop: 5,
    },
  });