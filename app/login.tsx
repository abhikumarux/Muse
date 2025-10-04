import React, { useState } from "react";
import { View, Text, TextInput, ActivityIndicator, Alert, TouchableOpacity, StyleSheet, Dimensions, Image, ImageBackground } from "react-native";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { useUser } from "./UserContext";
import { useRouter } from "expo-router";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import bcrypt from "bcryptjs";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const REGION = "us-east-2";
const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUserId } = useUser();
  const router = useRouter();

  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];

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

      const scanResult = await client.send(
        new ScanCommand({
          TableName: "MuseUsers",
          ProjectionExpression: "#n, userId, passwordHash",
          ExpressionAttributeNames: {
            "#n": "name",
          },
        })
      );

      if (!scanResult.Items || scanResult.Items.length === 0) {
        throw new Error("User not found");
      }

      const user = scanResult.Items.find((item) => item.name.S === username);
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
      if (user.userId.S !== undefined) {
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

          <Text style={styles.header}>Hello there,</Text>
          <Text style={styles.subheader}>Welcome Back!</Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email address"
            style={styles.input}
            placeholderTextColor={themeColors.inputPlaceholder}
          />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" style={styles.input} placeholderTextColor={themeColors.inputPlaceholder} />

          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.rememberMeContainer} onPress={() => setRememberMe(!rememberMe)}>
              <FontAwesome name={rememberMe ? "check-square" : "square-o"} size={20} color={rememberMe ? themeColors.buttonBackground : themeColors.text} style={styles.rememberMeIcon} />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert("Forgot Password", "Functionality TBD")}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={themeColors.text} style={styles.loginButtonContainer} />
          ) : (
            <TouchableOpacity style={styles.loginButtonContainer} onPress={handleLogin}>
              <LinearGradient colors={themeColors.loginGradient} style={styles.loginGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.loginButtonText}>Login</Text>
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
            <Text style={styles.registerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/register")}>
              <Text style={styles.registerLink}>Sign up</Text>
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
      backgroundColor: themeColors.background,
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
      marginTop: 20,
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
      marginBottom: 5,
      textAlign: "left",
    },
    subheader: {
      fontSize: 30,
      fontWeight: "bold",
      color: themeColors.buttonBackground,
      marginBottom: 5,
      textAlign: "left",
    },
    input: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      padding: 15,
      borderRadius: 12,
      marginTop: 20,
      fontSize: 18,
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
    },
    optionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
      marginBottom: 30,
    },
    rememberMeContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    rememberMeIcon: {
      marginRight: 8,
    },
    rememberMeText: {
      color: themeColors.text,
      fontSize: 16,
    },
    forgotPasswordText: {
      color: themeColors.text,
      fontSize: 16,
    },
    loginButtonContainer: {
      marginTop: 10,
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
      width: 120, // wider than pencil
      height: 120, // shorter height
      transform: [{ rotate: "-20deg" }], // can rotate if needed
      bottom: -90,
      left: -100,
    },
    eraser: {
      width: 90, // wider than pencil
      height: 90, // shorter height
      transform: [{ rotate: "-90deg" }], // can rotate if needed
      bottom: -100,
      left: -140,
    },
    ruler: {
      width: 100, // wider than pencil
      height: 170, // shorter height
      transform: [{ rotate: "80deg" }], // can rotate if needed
      right: -20,
      bottom: -65,
    },
    notebook: {
      width: 220, // wider than pencil
      height: 220, // shorter height
      transform: [{ rotate: "190deg" }], // can rotate if needed
      right: 290,
      bottom: -90,
    },
    string: {
      width: 300, // wider than pencil
      height: 300, // shorter height
      transform: [{ rotate: "80deg" }], // can rotate if needed
      right: 365,
      bottom: 400,
    },
    scissors: {
      width: 90, // wider than pencil
      height: 90, // shorter height
      transform: [{ rotate: "245deg" }], // can rotate if needed
      right: 25,
      bottom: 450,
    },
  });
