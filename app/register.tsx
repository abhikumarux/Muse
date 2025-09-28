import React, { useState } from "react";
import "react-native-get-random-values";
import bcrypt from "bcryptjs";
import { View, Text, TextInput, Button, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { DynamoDBClient, GetItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity"
import { useRouter } from "expo-router";
import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const API_URL = "http://ec2-3-134-106-64.us-east-2.compute.amazonaws.com:3000";
const REGION = "us-east-2"; 
const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36"; // from Cognito

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
    console.log("hi");
    setLoading(true);
    try {

      const client = new DynamoDBClient({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: REGION },
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });


      const scanResult = await client.send(
        new ScanCommand({
          TableName: "MuseUsers",
          ProjectionExpression: "#n",
          ExpressionAttributeNames: {
            "#n": "name", // alias for reserved keyword
          },
        })
      );
      
      // Check if any existing name matches the new username
      if (scanResult && scanResult.Items) {
        const existingUsernames = scanResult.Items.map(item => item.name.S);
      
        if (existingUsernames.includes(username)) {
          throw new Error("Username already taken!");
        }
      }
     
    
      // 2. Check if the username already exists
     

      const userId = uuidv4();

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      await client.send(new PutItemCommand({
        TableName: "MuseUsers",
        Item: {
          userId: { S: userId }, 
          name: { S: username },
          passwordHash: { S: hashedPassword },
        },
      }));
      //






     //await createUserWithEmailAndPassword(auth, username, password);

      // const res = await fetch(`${API_URL}/users`);
      // const users = await res.json();
      // const maxId = users.length ? Math.max(...users.map((u: any) => u.UserId), 10) : 0;
      // const newId = maxId + 1;
      // const postRes = await fetch(`${API_URL}/user`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     UserId: newId,
      //     Email: username,
      //   }),
      // });

      // if (postRes.ok) {
      //   Alert.alert("Success", `Registered as ${username} (ID: ${newId})`);
      //   setUsername("");
      //   setPassword("");
      //   setTimeout(() => router.replace('/login'), 500);
      // } else {
      //   Alert.alert("Error", "Failed to register user in backend");
      // }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Registration failed");
      console.log(err);
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
