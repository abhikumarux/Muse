import React, { useState, useRef } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, Alert, TouchableOpacity, Animated, Easing } from "react-native";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { app } from "../../constants/firebaseConfig";

const API_URL = "http://ec2-3-134-106-64.us-east-2.compute.amazonaws.com:3000";

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [animValue] = useState(new Animated.Value(0));

  const toggleMode = () => {
    Animated.timing(animValue, {
      toValue: mode === 'login' ? 1 : 0,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      setMode(mode === 'login' ? 'register' : 'login');
    });
  };

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
    } catch (err: any) {
      Alert.alert("Error", err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

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
        // Optionally, switch to login mode after registration
        setTimeout(() => toggleMode(), 500);
      } else {
        Alert.alert("Error", "Failed to register user in backend");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const loginOpacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const registerOpacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Animated.View style={{ opacity: loginOpacity, position: mode === 'login' ? 'relative' : 'absolute', width: '100%' }} pointerEvents={mode === 'login' ? 'auto' : 'none'}>
        <Text style={{ marginBottom: 10, fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>Login</Text>
        <Text style={{ marginBottom: 10 }}>Username (Email)</Text>
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
          }}
        />
        <Text style={{ marginBottom: 10 }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            borderWidth: 1,
            padding: 10,
            marginBottom: 20,
            borderRadius: 8,
          }}
        />
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Button title="Login" onPress={handleLogin} />
        )}
        <TouchableOpacity onPress={toggleMode} style={{ marginTop: 20 }}>
          <Text style={{ color: '#007AFF', textAlign: 'center' }}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ opacity: registerOpacity, position: mode === 'register' ? 'relative' : 'absolute', width: '100%' }} pointerEvents={mode === 'register' ? 'auto' : 'none'}>
        <Text style={{ marginBottom: 10, fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>Register</Text>
        <Text style={{ marginBottom: 10 }}>Username (Email)</Text>
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
          }}
        />
        <Text style={{ marginBottom: 10 }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            borderWidth: 1,
            padding: 10,
            marginBottom: 20,
            borderRadius: 8,
          }}
        />
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Button title="Register" onPress={handleRegister} />
        )}
        <TouchableOpacity onPress={toggleMode} style={{ marginTop: 20 }}>
          <Text style={{ color: '#007AFF', textAlign: 'center' }}>Already have an account? Login</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
