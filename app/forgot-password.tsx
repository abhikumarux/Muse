import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  forgotPasswordRequest,
  forgotPasswordConfirm,
  isValidEmail,
  isStrongPassword,
} from "../lib/aws/auth";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const router = useRouter();

  const sendCode = async () => {
    if (!isValidEmail(email)) return Alert.alert("Invalid email", "Enter a valid email.");
    try {
      await forgotPasswordRequest(email.trim());
      setSent(true);
      Alert.alert("Check your email", "Enter the 6-digit code we sent you.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not start reset.");
    }
  };

  const confirm = async () => {
    if (!code) return Alert.alert("Missing code", "Enter the 6-digit code.");
    if (!isStrongPassword(newPassword))
      return Alert.alert(
        "Weak password",
        "Password must be at least 8 characters and include upper, lower, number, and special."
      );
    try {
      await forgotPasswordConfirm(email.trim(), code.trim(), newPassword);
      Alert.alert("Success", "Password updated. Please sign in.");
      router.replace("/login");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not reset password.");
    }
  };

  return (
    <View style={styles.c}>
      <Text style={styles.h}>Reset your password</Text>
      <TextInput style={styles.i} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      {!sent ? (
        <TouchableOpacity style={styles.b} onPress={sendCode}>
          <Text style={styles.bt}>Send code</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TextInput style={styles.i} placeholder="6-digit code" keyboardType="number-pad" value={code} onChangeText={setCode} />
          <TextInput style={styles.i} placeholder="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
          <TouchableOpacity style={styles.b} onPress={confirm}>
            <Text style={styles.bt}>Update password</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: "#000" },
  h: { color: "#fff", fontSize: 22, marginBottom: 16, fontWeight: "700" },
  i: { backgroundColor: "#1b1b1b", borderRadius: 10, color: "#fff", padding: 14, marginVertical: 8, borderWidth: 1, borderColor: "#2c2c2c" },
  b: { backgroundColor: "#1ed760", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 10 },
  bt: { color: "#000", fontWeight: "700" },
});