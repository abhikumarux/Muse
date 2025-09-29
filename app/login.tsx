import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, Alert, TouchableOpacity, StyleSheet, Dimensions, Image } from "react-native";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "../constants/firebaseConfig";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity"
import { useUser } from "./UserContext";
import { useRouter } from "expo-router";
import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import bcrypt from "bcryptjs";

const REGION = "us-east-2"; 
const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36"; 

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUserId } = useUser();
  const { userId } = useUser();
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
  
    try {
      const client = new DynamoDBClient({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: REGION },
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });
  
      const scanResult = await client.send(new ScanCommand({
        TableName: "MuseUsers",
        ProjectionExpression: "#n, userId, passwordHash",
        ExpressionAttributeNames: {
          "#n": "name", 
        },
      }));
  
      if (!scanResult.Items || scanResult.Items.length === 0) {
        throw new Error("User not found");
      }
  
      const user = scanResult.Items.find(item => item.name.S === username);
      if (!user) {
        throw new Error("User not found");
      }
  
      if (!user.passwordHash || !user.passwordHash.S) {
        throw new Error("Password not set for this user");
      }
  
      const passwordMatch = await bcrypt.compare(password, user.passwordHash.S);
      if (!passwordMatch) {
        throw new Error("Incorrect password");
      }
      if(user.userId.S != undefined) {
        console.log("SETTING USER ID: ", user.userId.S);
        setUserId(user.userId.S);
        
      
      }
    
  
      setUsername("");
      setPassword("");
      router.replace("/(tabs)");
  
    } catch (err: any) {
      Alert.alert("Error", err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };
  const gridSize = 40;
  const horizontalLines = Math.ceil(SCREEN_HEIGHT / gridSize);
  const verticalLines = Math.ceil(SCREEN_WIDTH / gridSize);

  return (
    <View style={{ flex: 1, backgroundColor: "#006837" }}>
      {/* Grid lines */}
      <View style={StyleSheet.absoluteFill}>
        {[...Array(horizontalLines)].map((_, i) => (
          <View
            key={`h-${i}`}
            style={{
              position: "absolute",
              top: i * gridSize,
              left: 0,
              width: "100%",
              height: 1,
              backgroundColor: "#3A8A64",
            }}
          />
        ))}
        {[...Array(verticalLines)].map((_, i) => (
          <View
            key={`v-${i}`}
            style={{
              position: "absolute",
              left: i * gridSize,
              top: 0,
              width: 1,
              height: "100%",
              backgroundColor: "#3A8A64",
            }}
          />
        ))}
      </View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/images/logo.png")} // make sure path is correct
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      {/* Login form */}
      <View style={styles.container}>
        <Text style={styles.label}>Username (Email)</Text>
        <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" keyboardType="email-address" placeholder="Username" style={styles.input} placeholderTextColor="#ccc" />

        <Text style={styles.label}>Password</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" style={styles.input} placeholderTextColor="#ccc" />

        {loading ? (
          <ActivityIndicator size="large" color="#00ff00" />
        ) : (
          <TouchableOpacity style={styles.loginButtonContainer} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.registerButton} onPress={() => router.replace("/register")}>
          <Text style={styles.registerButtonText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.pencilContainer}>
        <Image source={require("../assets/images/Pencil.png")} style={styles.pencil} resizeMode="contain" />
        <Image source={require("../assets/images/Eraser.png")} style={styles.eraser} resizeMode="contain" />
        <Image source={require("../assets/images/Ruler.png")} style={styles.ruler} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    marginBottom: -350,
  },
  logo: {
    width: 400,
    height: 400,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 35,
  },
  loginButtonContainer: {
    backgroundColor: "rgba(255,255,255,0.3)", // semi-transparent white
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "#fff",
    textShadowColor: "#000", // black outline
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 1,
    fontSize: 34,
    fontWeight: "bold",
  },
  registerButton: {
    marginTop: 20,
    alignItems: "center",
  },
  registerButtonText: {
    color: "#FBB03B",
    fontSize: 18,
    fontWeight: "bold",
  },
  label: {
    color: "#fff", // white letters
    backgroundColor: "rgba(255,255,255,0.3)", // semi-transparent white
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 20,
    textShadowColor: "#000", // black outline
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 1,
    fontWeight: "bold",
    alignSelf: "flex-start", // so background only wraps the text
    marginBottom: 5,
  },
  input: {
    borderWidth: 4,
    padding: 18,
    marginBottom: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
  },
  pencilContainer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  pencil: {
    width: 100, // wider than pencil
    height: 100, // shorter height
    transform: [{ rotate: "-10deg" }], // can rotate if needed
    bottom: 50,
    left: 20,
  },
  eraser: {
    width: 100, // wider than pencil
    height: 100, // shorter height
    transform: [{ rotate: "-50deg" }], // can rotate if needed
    bottom: 2,
    left: -20,
  },
  ruler: {
    width: 90, // wider than pencil
    height: 170, // shorter height
    transform: [{ rotate: "180deg" }], // can rotate if needed
    right: 20,
  },
});
