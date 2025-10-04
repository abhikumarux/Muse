import React, { useState } from "react";
import "react-native-get-random-values";
import bcrypt from "bcryptjs";
import { View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity, StyleSheet, Dimensions, Image, ImageBackground } from "react-native";
import { DynamoDBClient, ScanCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { useRouter } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const REGION = "us-east-2";
const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }
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
            "#n": "name",
          },
        })
      );

      if (scanResult && scanResult.Items) {
        const existingUsernames = scanResult.Items.map((item) => item.name.S);

        if (existingUsernames.includes(username)) {
          throw new Error("Username already taken!");
        }
      }

      const userId = uuidv4();
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      await client.send(
        new PutItemCommand({
          TableName: "MuseUsers",
          Item: {
            userId: { S: userId },
            name: { S: username },
            passwordHash: { S: hashedPassword },
          },
        })
      );

      Alert.alert("Success", "Registration successful! Please log in.");
      router.replace("/login");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Registration failed");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };
  const styles = createStyles(themeColors);

  return (
    <View style={styles.container}>
      {/* Background elements are now inside the main container */}
      <ImageBackground source={require("../assets/images/grid.png")} style={StyleSheet.absoluteFill} imageStyle={styles.gridImageStyle} resizeMode="repeat" />
      <View style={styles.pencilContainer}>
        <Image source={require("../assets/images/Scissors.png")} style={styles.scissors} resizeMode="contain" />
        <Image source={require("../assets/images/Pencil.png")} style={styles.pencil} resizeMode="contain" />
        <Image source={require("../assets/images/Eraser.png")} style={styles.eraser} resizeMode="contain" />
        <Image source={require("../assets/images/Ruler.png")} style={styles.ruler} resizeMode="contain" />
        <Image source={require("../assets/images/Notebook.png")} style={styles.notebook} resizeMode="contain" />
        <Image source={require("../assets/images/String.png")} style={styles.string} resizeMode="contain" />
      </View>
      {/* This BlurView now covers and blurs everything behind the form */}
      <BlurView intensity={4} tint={colorScheme} style={StyleSheet.absoluteFill} />

      <View style={styles.contentWrapper}>
        <BlurView intensity={80} tint={colorScheme} style={styles.formContainer}>
          <View style={styles.logoContainer}>
            <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.header}>
            Create an <Text style={styles.subheader}>Account!</Text>
          </Text>

          <Text style={styles.label}>Enter an email address</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email address"
            style={styles.input}
            placeholderTextColor={themeColors.inputPlaceholder}
          />

          <Text style={styles.label}>Enter a password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" style={styles.input} placeholderTextColor={themeColors.inputPlaceholder} />

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
      </View>
    </View>
  );
}

const createStyles = (themeColors: (typeof Colors)[keyof typeof Colors]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.loginBackground,
    },
    gridImageStyle: {
      opacity: 0.5,
    },
    contentWrapper: {
      flex: 1,
      paddingTop: 80,
      justifyContent: "flex-start",
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 20,
    },
    logo: {
      width: SCREEN_WIDTH * 0.5,
      height: SCREEN_HEIGHT * 0.1,
    },
    formContainer: {
      marginHorizontal: 35,
      padding: 25,
      overflow: "hidden",
      borderRadius: 30,
      borderWidth: 1,
      borderColor: themeColors.text === "#11181C" ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 0.1)",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 5.46,
      elevation: 9,
    },
    header: {
      fontSize: 30,
      fontWeight: "bold",
      color: themeColors.text,
      marginBottom: 10,
      textAlign: "left",
    },
    subheader: {
      fontSize: 30,
      fontWeight: "bold",
      color: themeColors.buttonBackground,
    },
    label: {
      color: themeColors.text,
      fontSize: 16,
      marginTop: 20,
      marginBottom: 8,
    },
    input: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      padding: 15,
      borderRadius: 12,
      fontSize: 18,
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
    },
    loginButtonContainer: {
      marginTop: 40,
      marginBottom: 10,
      borderRadius: 12,
      overflow: "hidden",
      height: 50,
    },
    loginGradient: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loginButtonText: {
      color: themeColors.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    orText: {
      color: themeColors.text,
      textAlign: "center",
      marginVertical: 20,
      fontSize: 16,
    },
    socialContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 30,
    },
    socialButton: {
      flex: 1,
      marginHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: themeColors.inputBackground,
      borderRadius: 12,
      alignItems: "center",
      height: 50,
      justifyContent: "center",
    },
    registerContainer: {
      flexDirection: "row",
      justifyContent: "center",
    },
    registerText: {
      color: themeColors.text,
      fontSize: 18,
    },
    registerLink: {
      color: themeColors.buttonBackground,
      fontSize: 18,
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
      width: 120,
      height: 120,
      transform: [{ rotate: "-20deg" }],
      bottom: -90,
      left: -100,
    },
    eraser: {
      width: 90,
      height: 90,
      transform: [{ rotate: "-90deg" }],
      bottom: -100,
      left: -140,
    },
    ruler: {
      width: 100,
      height: 170,
      transform: [{ rotate: "80deg" }],
      right: -20,
      bottom: -65,
    },
    notebook: {
      width: 220,
      height: 220,
      transform: [{ rotate: "190deg" }],
      right: 290,
      bottom: -90,
    },
    string: {
      width: 300,
      height: 300,
      transform: [{ rotate: "80deg" }],
      right: 365,
      bottom: 400,
    },
    scissors: {
      width: 90,
      height: 90,
      transform: [{ rotate: "245deg" }],
      right: 25,
      bottom: 450,
    },
  });