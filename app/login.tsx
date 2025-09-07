import React, { useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "../constants/firebaseConfig";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }
    setLoading(true);
    const auth = getAuth(app);
    try {
      await signInWithEmailAndPassword(auth, username, password);
      Alert.alert("Success", `Logged in as ${username}`);
      setUsername("");
      setPassword("");
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" }}>
      <Text style={{ marginBottom: 10, fontSize: 24, fontWeight: "bold", textAlign: "center", color: "#111" }}>Login</Text>
      <Text style={{ marginBottom: 10, color: "#111" }}>Username (Email)</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          padding: 10,
          marginBottom: 20,
          borderRadius: 8,
          backgroundColor: "#fff",
          color: "#111",
        }}
        placeholderTextColor="#888"
      />
      <Text style={{ marginBottom: 10, color: "#111" }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          padding: 10,
          marginBottom: 20,
          borderRadius: 8,
          backgroundColor: "#fff",
          color: "#111",
        }}
        placeholderTextColor="#888"
      />
      {loading ? <ActivityIndicator size="large" color="#007AFF" /> : <Button title="Login" onPress={handleLogin} />}
      <TouchableOpacity onPress={() => router.replace("/register")} style={{ marginTop: 20 }}>
        <Text style={{ color: "#007AFF", textAlign: "center" }}>Don&apos;t have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}
