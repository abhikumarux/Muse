import React, { useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, Alert, TouchableOpacity } from "react-native";

import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { app } from "../constants/firebaseConfig";
import { useRouter } from "expo-router";

const API_URL = "http://ec2-3-134-106-64.us-east-2.compute.amazonaws.com:3000";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }
    setLoading(true);
    const auth = getAuth(app);
    try {
      await createUserWithEmailAndPassword(auth, username, password);

      const res = await fetch(`${API_URL}/users`);
      const users = await res.json();
      const maxId = users.length ? Math.max(...users.map((u: any) => u.UserId), 10) : 0;
      const newId = maxId + 1;
      const postRes = await fetch(`${API_URL}/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UserId: newId,
          Email: username,
        }),
      });

      if (postRes.ok) {
        Alert.alert("Success", `Registered as ${username} (ID: ${newId})`);
        setUsername("");
        setPassword("");
        setTimeout(() => router.replace('/login'), 500);
      } else {
        Alert.alert("Error", "Failed to register user in backend");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ marginBottom: 10, fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#111' }}>Register</Text>
      <Text style={{ marginBottom: 10, color: '#111' }}>Username (Email)</Text>
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
          backgroundColor: '#fff',
          color: '#111',
        }}
        placeholderTextColor="#888"
      />
      <Text style={{ marginBottom: 10, color: '#111' }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          padding: 10,
          marginBottom: 20,
          borderRadius: 8,
          backgroundColor: '#fff',
          color: '#111',
        }}
        placeholderTextColor="#888"
      />
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Button title="Register" onPress={handleRegister} />
      )}
      <TouchableOpacity onPress={() => router.replace('/login')} style={{ marginTop: 20 }}>
        <Text style={{ color: '#007AFF', textAlign: 'center' }}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}
