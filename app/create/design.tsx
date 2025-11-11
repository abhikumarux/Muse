import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, useColorScheme as useDeviceColorScheme, ActivityIndicator, Animated, TextInput, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import ImageZoom from "react-native-image-pan-zoom";
import { Buffer } from "buffer";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { v4 as uuidv4 } from "uuid";
import { Colors } from "@/constants/Colors";
import { useUser } from "../../lib/UserContext";
import { useCreateDesign } from "../../lib/CreateDesignContext";
import { Ionicons } from "@expo/vector-icons";
import { MuseCoin } from "@/assets/svg/MuseCoin";
import { LoadingModal } from "@/components/ui/LoadingModal";
import { GEMINI_API_KEY, AWS_REGION, AWS_S3_BUCKET as BUCKET, AWS_IDENTITY_POOL_ID } from "@/lib/config/constants";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import * as Haptics from "expo-haptics"; // Import Haptics
import DesignLoader from "@/assets/lottie/design-creation-loader.json";
const { width } = Dimensions.get("window");

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollView: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background },
    loadingText: { marginTop: 10, fontSize: 16, color: theme.secondaryText, fontFamily: "Inter-ExtraBold" },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background, paddingHorizontal: 20 },
    errorText: { fontSize: 16, color: "#F44336", textAlign: "center", marginBottom: 20, fontFamily: "Inter-ExtraBold" },

    // Header Styles
    productFlowHeaderContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 5,
      backgroundColor: theme.background,
    },
    backButtonNew: {
      alignItems: "center",
      justifyContent: "center",
      width: 50,
      height: 50,
      backgroundColor: "transparent",
    },
    backIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      justifyContent: "center",
      alignItems: "center",
      borderColor: theme.text,
    },
    backText: {
      fontSize: 12,
      marginTop: 2,
      color: theme.text,
      fontFamily: "Inter-ExtraBold",
    },
    productFlowTitle: {
      flex: 1,
      fontSize: 28,
      textAlign: "center",
      color: theme.text,
      marginHorizontal: 10,
      fontFamily: "Inter-ExtraBold",
    },
    coinsContainerFlow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      minWidth: 70,
      backgroundColor: theme.text,
    },
    coinIcon: { width: 24, height: 24, marginRight: 8 },
    coinTextFlow: { fontSize: 18, color: theme.background, fontFamily: "Inter-ExtraBold" },

    // Progress Bar Styles
    progressWrapperNew: {
      marginHorizontal: 5,
      marginVertical: 15,
      height: 50,
      justifyContent: "flex-start",
      position: "relative",
      paddingHorizontal: 19,
    },
    progressTrackNew: {
      position: "absolute",
      top: 18,
      height: 6,
      width: "100%",
      backgroundColor: theme.tabIconDefault,
      borderRadius: 3,
      left: 19,
      right: 19,
    },
    progressFillNew: {
      position: "absolute",
      top: 18,
      height: 6,
      borderRadius: 3,
      left: 19,
    },
    stepsRowNew: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    },
    stepContainerNew: {
      alignItems: "center",
      zIndex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: 2,
      marginHorizontal: -2,
    },
    stepCircleNew: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 2,
      justifyContent: "center",
      alignItems: "center",
    },
    stepCircleActiveNew: {
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 5,
      elevation: 5,
    },
    stepTextNew: {
      fontSize: 16,
      color: theme.text,
      fontFamily: "Inter-ExtraBold",
    },
    stepLabelNew: {
      marginTop: 8,
      fontSize: 14,
      textAlign: "center",
      color: theme.secondaryText,
      fontFamily: "Inter-ExtraBold",
    },
    stepLabelActiveNew: {
      color: theme.text,
      fontFamily: "Inter-ExtraBold",
    },

    // Design Screen Specific Styles
    designContent: { paddingHorizontal: 20, paddingBottom: 100 },
    designUploadTitle: {
      fontSize: 18,
      color: theme.text,
      textAlign: "center",
      textTransform: "lowercase",
      marginBottom: 8,
      fontFamily: "Inter-ExtraBold",
    },
    designUploadPrompt: {
      fontSize: 14,
      color: theme.secondaryText,
      textAlign: "center",
      textTransform: "lowercase",
      marginBottom: 20,
      fontFamily: "Inter-ExtraBold",
    },
    imagePreviewContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30, gap: 15, alignItems: "flex-start" },
    imagePreviewWrapper: {
      flex: 1,
      alignItems: "center",
      gap: 12,
    },
    imagePreviewBox: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: "transparent",
      borderRadius: 16,
      borderWidth: 3,
      borderColor: theme.text,
      borderStyle: "solid",
      position: "relative",
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },
    imageWithDelete: { width: "100%", height: "100%" },
    previewImage: { width: "100%", height: "100%", borderRadius: 13 },
    deleteButton: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: "rgba(45, 55, 72, 0.7)",
      borderRadius: 15,
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    },
    deleteButtonText: { color: "#FFFFFF", fontSize: 18, lineHeight: 20, fontFamily: "Inter-ExtraBold" },
    emptyImageBox: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 0 },
    imagePreviewLabel: {
      fontSize: 16,
      color: theme.text,
      textTransform: "lowercase",
      fontFamily: "Inter-ExtraBold",
    },
    imagePreviewLabelDisabled: {
      color: theme.tabIconDefault,
    },
    finalGenerateButton: {
      backgroundColor: theme.text,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
      minHeight: 50,
      justifyContent: "center",
    },
    finalGenerateButtonText: { color: theme.background, fontSize: 18, fontFamily: "Inter-ExtraBold" },
    disabledButton: { backgroundColor: theme.tabIconDefault },

    // Generated Design Styles
    generatedDesignContainer: {
      marginTop: 30,
      marginBottom: 30,
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 24,
      shadowColor: theme.text,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      width: "100%",
      maxWidth: 400,
      alignSelf: "center",
      position: "relative",
    },
    deleteGeneratedButton: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "rgba(45, 55, 72, 0.7)",
      borderRadius: 15,
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    deleteGeneratedButtonText: { color: "#fff", fontSize: 18, lineHeight: 20, fontFamily: "Inter-ExtraBold" },
    generatedDesignTitle: { fontSize: 18, color: theme.text, marginBottom: 16, textAlign: "center", fontFamily: "Inter-ExtraBold" },
    generatedDesignImage: { width: 260, height: 260, borderRadius: 14, marginBottom: 18, backgroundColor: theme.background, resizeMode: "contain", alignSelf: "center" },
    input: {
      backgroundColor: theme.card,
      width: "100%",
      padding: 15,
      borderRadius: 12,
      marginBottom: 15,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
      fontFamily: "Inter-ExtraBold",
    },
    designActionRow: { flexDirection: "row", width: "100%", justifyContent: "space-between", marginTop: 10 },
    designControlButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
      marginHorizontal: 5,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      minHeight: 50,
      justifyContent: "center",
    },
    designControlButtonText: { color: theme.text, fontSize: 14, fontFamily: "Inter-ExtraBold" },
    designControlButtonPrimary: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: theme.text,
      marginHorizontal: 5,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    designControlButtonPrimaryText: { color: theme.background, fontSize: 14, fontFamily: "Inter-ExtraBold" },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.9)", justifyContent: "center", alignItems: "center" },
    modalCloseButton: {
      position: "absolute",
      top: 50,
      right: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    modalCloseButtonText: { color: "white", fontSize: 28, lineHeight: 30, fontFamily: "Inter-ExtraBold" },
  });

// Header Component
const ProductFlowHeader = ({ title, onBackPress }: { title: string; onBackPress?: () => void }) => {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);

  return (
    <View style={styles.productFlowHeaderContainer}>
      <TouchableOpacity
        style={styles.backButtonNew}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
          if (onBackPress) {
            onBackPress();
          }
        }}
      >
        <View style={[styles.backIconCircle, { borderColor: theme.text }]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </View>
        <Text style={[styles.backText, { color: theme.text }]}>back</Text>
      </TouchableOpacity>

      <Text style={[styles.productFlowTitle, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.coinsContainerFlow, { backgroundColor: theme.text }]}>
        <MuseCoin width={24} height={24} style={styles.coinIcon} />
        <Text style={[styles.coinTextFlow, { color: theme.background }]}>325</Text>
      </View>
    </View>
  );
};

// Progress Bar Component
const ProgressBar = () => {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);

  const currentStep = 2;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: currentStep - 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStep, progress]); // Add progress

  const steps = ["product", "design", "final"];
  const activeFill = theme.text;
  const defaultFill = theme.background;
  const activeText = theme.background;
  const defaultText = theme.text;

  const maxStepValue = steps.length - 1;
  const progressWidth = progress.interpolate({
    inputRange: [0, maxStepValue],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.progressWrapperNew}>
      <View style={styles.progressTrackNew} />
      <Animated.View style={[styles.progressFillNew, { width: progressWidth, backgroundColor: activeFill }]} />
      <View style={styles.stepsRowNew}>
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;

          return (
            <View key={index} style={styles.stepContainerNew}>
              <View
                style={[
                  styles.stepCircleNew,
                  { borderColor: activeFill, backgroundColor: defaultFill },
                  (isCompleted || isActive) && { backgroundColor: activeFill },
                  isActive && styles.stepCircleActiveNew,
                ]}
              >
                <Text style={[styles.stepTextNew, { color: defaultText }, (isCompleted || isActive) && { color: activeText }]}>{stepNumber}</Text>
              </View>
              <Text style={[styles.stepLabelNew, { color: defaultText }, (isCompleted || isActive) && styles.stepLabelActiveNew]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// This is your new Design screen component
export default function DesignScreen() {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);
  const router = useRouter();

  // Get shared state from context
  const {
    selectedProduct,
    selectedVariant,
    selectedPlacements,
    uploadedImages,
    setUploadedImages,
    generatedImage,
    setGeneratedImage,
    setMockupUrls,
    setMockupImages,
    prompt,
    setPrompt,
    preloadedDesignUri,
    setPreloadedDesignUri,
    designScrollViewRef,
  } = useCreateDesign();

  const { userId, printfulApiKey, currentStoreId, selectedMuseId } = useUser();

  // Local state for this screen
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalLoadingText, setModalLoadingText] = useState("Loading...");
  const [selectedImageUrlForZoom, setSelectedImageUrlForZoom] = useState<string | null>(null);

  // Handle preloaded design
  useEffect(() => {
    if (preloadedDesignUri) {
      setUploadedImages({ left: preloadedDesignUri, right: null });
      setGeneratedImage(preloadedDesignUri);
      setPreloadedDesignUri(null);
    }
  }, [preloadedDesignUri, setGeneratedImage, setUploadedImages, setPreloadedDesignUri]);

  // Scroll to bottom when generated image appears
  useEffect(() => {
    if (generatedImage) {
      setTimeout(() => {
        designScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [generatedImage, designScrollViewRef]);

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed to take photos.");
      }
    };
    requestPermissions();
  }, []);

  const handleImageZoom = (imageUrl: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
    setSelectedImageUrlForZoom(imageUrl);
  };

  const handleImageAdd = (position: "left" | "right") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
    Alert.alert(
      "Add Image",
      "Choose a source for your image:",
      [
        { text: "Take Photo", onPress: () => takePhoto(position) },
        { text: "Choose from Library", onPress: () => pickImage(position) },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const pickImage = async (position: "left" | "right") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadedImages((prev) => ({
          ...prev,
          [position]: result.assets[0].uri,
        }));
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to open photo library.");
    }
  };

  const takePhoto = async (position: "left" | "right") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploadedImages((prev) => ({
          ...prev,
          [position]: result.assets[0].uri,
        }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open camera.");
    }
  };

  const deleteImage = (position: "left" | "right") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
    setUploadedImages((prev) => ({ ...prev, [position]: null }));
  };

  const deleteGeneratedImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
    setGeneratedImage(null);
  };

  // --- API Logic ---

  const GenerateFinalDesign = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Haptic feedback
    if (!GEMINI_API_KEY) {
      Alert.alert("Error", "Missing API Key. Please configure your .env file.");
      return;
    }
    setModalLoadingText("Generating Design...");
    setIsProcessing(true);
    if (!uploadedImages.left) {
      Alert.alert("Missing Images", "Please upload at least one image first.");
      setIsProcessing(false);
      return;
    }

    const getLocalUri = async (uri: string | null): Promise<string | null> => {
      if (!uri) return null;
      if (uri.startsWith("http")) {
        const tempUri = FileSystem.cacheDirectory + uuidv4() + ".png";
        await FileSystem.downloadAsync(uri, tempUri);
        return tempUri;
      }
      return uri;
    };

    const localUri1 = await getLocalUri(uploadedImages.left);
    const localUri2 = await getLocalUri(uploadedImages.right);

    if (!localUri1) {
      Alert.alert("Error", "First image is missing or could not be processed.");
      setIsProcessing(false);
      return;
    }

    const usingSecond = !!localUri2;
    const client = new DynamoDBClient({
      region: AWS_REGION,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: AWS_REGION },
        identityPoolId: AWS_IDENTITY_POOL_ID,
      }),
    });

    try {
      let museString = "";
      if (selectedMuseId) {
        const museResult = await client.send(
          new GetItemCommand({
            TableName: "Muse",
            Key: { museID: { S: selectedMuseId } },
          })
        );
        museString = museResult.Item?.Description?.S || "";
        console.log("Using Muse String: ", museString);
      } else {
        console.log("No Muse selected, using generic prompt.");
      }

      const tempMuseString = usingSecond
        ? `Take the first image and the second image, merge them into one cohesive image that makes sense. ${
            museString ? `I want you to make the whole image theme based off of this description: ${museString}` : ""
          }`
        : `Use the first image to generate an appealing, well-composed design based on the image provided. ${
            museString ? `I want you to make the whole image theme based off of this description: ${museString}` : ""
          }`;

      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";

      const img1Base64 = await FileSystem.readAsStringAsync(localUri1, {
        encoding: "base64",
      });
      let img2Base64: string | null = null;
      if (localUri2) {
        img2Base64 = await FileSystem.readAsStringAsync(localUri2, {
          encoding: "base64",
        });
      }

      const parts: any[] = [{ inline_data: { mime_type: "image/png", data: img1Base64 } }];
      if (img2Base64) {
        parts.push({
          inline_data: { mime_type: "image/png", data: img2Base64 },
        });
      }
      parts.push({ text: tempMuseString });

      const body = JSON.stringify({ contents: [{ parts }] });

      let success = false;
      let attempt = 0;
      const maxAttempts = 10;

      while (!success && attempt < maxAttempts) {
        try {
          attempt++;
          console.log(`Attempt ${attempt} to generate design...`);

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "x-goog-api-key": GEMINI_API_KEY,
              "Content-Type": "application/json",
            },
            body,
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API HTTP error:", response.status, errorText);
            throw new Error(`Gemini API request failed: ${response.status}`);
          }

          const data = await response.json();

          console.log("Gemini raw response:", JSON.stringify(data, null, 2));

          const base64Image = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

          if (!base64Image) {
            const textResponse = data?.candidates?.[0]?.content?.parts
              ?.map((p) => p.text)
              ?.filter(Boolean)
              ?.join("\n");

            console.warn("⚠️ No image data returned. Gemini said:", textResponse || "No text explanation found.");
            throw new Error("No image data returned.");
          }

          const combinedImageUri = `data:image/png;base64,${base64Image}`;
          setGeneratedImage(combinedImageUri);
          success = true;
          console.log("✅ Image generation successful!");
        } catch (error) {
          console.error(`❌ Attempt ${attempt} failed:`, error);
          await new Promise((res) => setTimeout(res, 2000));
        }
      }

      if (!success) {
        Alert.alert("Error", "Failed to generate image after multiple attempts.");
      }
    } catch (err: any) {
      console.error("Error generating combined image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemix = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Haptic feedback
    if (!GEMINI_API_KEY) {
      Alert.alert("Error", "Missing API Key. Please configure your .env file.");
      return;
    }
    if (!generatedImage) {
      Alert.alert("No Design", "Please generate an initial design first.");
      return;
    }
    if (!prompt) {
      Alert.alert("No Prompt", "Please enter a prompt to remix the image.");
      return;
    }
    setModalLoadingText("Remixing Design...");
    setIsProcessing(true);

    try {
      const base64Image = generatedImage.replace(/^data:image\/\w+;base64,/, "");
      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";
      const parts: any[] = [{ inline_data: { mime_type: "image/png", data: base64Image } }, { text: prompt }];
      const body = JSON.stringify({ contents: [{ parts }] });
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json" },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API HTTP error:", response.status, errorText);
        Alert.alert("Error", `Gemini API request failed: ${response.status}`);
        setIsProcessing(false);
        return;
      }

      const data = await response.json();
      const remixedBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const remixedImageUri = `data:image/png;base64,${remixedBase64}`;
      setGeneratedImage(remixedImageUri);
      setPrompt("");
    } catch (err: any) {
      console.error("Error remixing image:", err);
      Alert.alert("Error", "Failed to remix image. " + (err?.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const putImageOnItem = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // Haptic feedback
    if (!userId || !generatedImage) {
      console.error("Missing userId or generatedImage");
      return;
    }
    if (!selectedProduct?.id || !selectedVariant?.id || !selectedPlacements.length) {
      Alert.alert("Missing Data", "Please select a product, variant, and placement.");
      return;
    }

    setModalLoadingText("Applying to Product...");
    setIsProcessing(true);
    try {
      let base64Data;
      if (generatedImage.startsWith("data:")) {
        base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
      } else if (generatedImage.startsWith("http")) {
        const tempLocalUri = FileSystem.cacheDirectory + uuidv4() + ".png";
        await FileSystem.downloadAsync(generatedImage, tempLocalUri);
        base64Data = await FileSystem.readAsStringAsync(tempLocalUri, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.deleteAsync(tempLocalUri);
      } else {
        base64Data = await FileSystem.readAsStringAsync(generatedImage, { encoding: FileSystem.EncodingType.Base64 });
      }

      const buffer = Buffer.from(base64Data, "base64");
      const s3Client = new S3Client({
        region: AWS_REGION,
        credentials: fromCognitoIdentityPool({
          client: new CognitoIdentityClient({ region: AWS_REGION }),
          identityPoolId: AWS_IDENTITY_POOL_ID,
        }),
      });

      const timestamp = Date.now();
      const key = `${userId}/tempUpload/tempImage_${timestamp}.png`;
      await s3Client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: "image/png" }));
      const imageUrl = `https://${BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}?t=${timestamp}`;

      const headCheck = await fetch(imageUrl, { method: "HEAD" });
      if (!headCheck.ok) {
        throw new Error("Uploaded image not accessible to Printful.");
      }

      if (!currentStoreId) {
        throw new Error("No Printful Store ID found. Please connect your store in settings.");
      }

      const mockupPayload = {
        variant_ids: [selectedVariant.id],
        format: "jpg",
        files: selectedPlacements.map((placement) => ({
          placement,
          image_url: imageUrl,
          position: { area_width: 1800, area_height: 2400, width: 1800, height: 1800, top: 300, left: 0 },
        })),
      };

      const mockupResponse = await fetch(`https://api.printful.com/mockup-generator/create-task/${selectedProduct.id}?store_id=${currentStoreId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${printfulApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(mockupPayload),
      });

      if (!mockupResponse.ok) {
        const errorData = await mockupResponse.json();
        throw new Error(errorData.error?.message || "Failed to create mockup.");
      }

      const mockupData = await mockupResponse.json();
      const taskKey = mockupData?.result?.task_key;
      if (!taskKey) throw new Error("No task_key returned from Printful.");

      let attempts = 0;
      const maxAttempts = 30;
      while (attempts < maxAttempts) {
        await new Promise((res) => setTimeout(res, 1000));
        attempts++;
        const statusResponse = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${taskKey}&store_id=${currentStoreId}`, { headers: { Authorization: `Bearer ${printfulApiKey}` } });
        if (!statusResponse.ok) continue;

        const statusData = await statusResponse.json();
        const status = statusData?.result?.status;

        if (status === "completed") {
          const mockups = statusData?.result?.mockups || [];
          const seenUrls = new Set<string>();
          const urls: string[] = [];
          mockups.forEach((mockup: any) => {
            if (mockup.mockup_url && !seenUrls.has(mockup.mockup_url)) {
              urls.push(mockup.mockup_url);
              seenUrls.add(mockup.mockup_url);
            }
            mockup.extra?.forEach((extra: any) => {
              if (extra.url && !seenUrls.has(extra.url)) {
                urls.push(extra.url);
                seenUrls.add(extra.url);
              }
            });
          });

          if (!urls.length) throw new Error("No mockup URLs found in Printful response.");
          setMockupUrls(urls);
          setMockupImages(urls);

          // *** NAVIGATION CHANGE ***
          router.push("/create/view-final"); // Go to the final screen

          setIsProcessing(false);
          return;
        }

        if (status === "failed") {
          throw new Error("Mockup generation failed.");
        }
      }
      throw new Error("Mockup generation timed out.");
    } catch (err: any) {
      console.error("Error in putImageOnItem:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
      setIsProcessing(false);
    }
  };

  // Render logic
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <LoadingModal visible={isProcessing} text={modalLoadingText} lottieSource={DesignLoader} />

      <ProductFlowHeader
        title={"Add Your Inspo"}
        onBackPress={() => router.back()} // Native back functionality
      />
      <ProgressBar />

      <ScrollView ref={designScrollViewRef} style={styles.scrollView} contentContainerStyle={styles.designContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.designUploadTitle}>upload up to 2 inspo images</Text>
        <Text style={styles.designUploadPrompt}>Tap the first box to add an image</Text>
        <View style={styles.imagePreviewContainer}>
          <View style={styles.imagePreviewWrapper}>
            <View style={styles.imagePreviewBox}>
              {uploadedImages.left ? (
                <View style={styles.imageWithDelete}>
                  <Image source={{ uri: uploadedImages.left }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteImage("left")}>
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.emptyImageBox} onPress={() => handleImageAdd("left")}>
                  <Ionicons name="add-circle-outline" size={width * 0.28} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.imagePreviewLabel}>image #1</Text>
          </View>

          <View style={styles.imagePreviewWrapper}>
            <View style={styles.imagePreviewBox}>
              {uploadedImages.right ? (
                <View style={styles.imageWithDelete}>
                  <Image source={{ uri: uploadedImages.right }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteImage("right")}>
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.emptyImageBox} onPress={() => handleImageAdd("right")} disabled={!uploadedImages.left}>
                  <Ionicons name="add-circle-outline" size={width * 0.28} color={!uploadedImages.left ? theme.tabIconDefault : theme.text} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.imagePreviewLabel, !uploadedImages.left && styles.imagePreviewLabelDisabled]}>image #2</Text>
          </View>
        </View>
        {generatedImage && (
          <MotiView from={{ opacity: 0, scale: 0.9, translateY: 20 }} animate={{ opacity: 1, scale: 1, translateY: 0 }} transition={{ type: "timing", duration: 400 }}>
            <View style={styles.generatedDesignContainer}>
              <TouchableOpacity style={styles.deleteGeneratedButton} onPress={deleteGeneratedImage}>
                <Text style={styles.deleteGeneratedButtonText}>×</Text>
              </TouchableOpacity>
              <Text style={styles.generatedDesignTitle}>Generated Design</Text>
              <TouchableOpacity onPress={() => handleImageZoom(generatedImage)}>
                <Image source={{ uri: generatedImage }} style={styles.generatedDesignImage} />
              </TouchableOpacity>
              <TextInput style={styles.input} placeholder="Type adjustments for a remix..." placeholderTextColor={theme.secondaryText} value={prompt} onChangeText={setPrompt} />
              <View style={styles.designActionRow}>
                <TouchableOpacity style={[styles.designControlButton, isProcessing && { opacity: 0.7 }]} onPress={handleRemix} disabled={isProcessing}>
                  <Text style={styles.designControlButtonText}>Remix</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.designControlButtonPrimary, isProcessing && { opacity: 0.7 }]} onPress={putImageOnItem} disabled={isProcessing}>
                  <Text style={styles.designControlButtonPrimaryText}>Apply to Item</Text>
                </TouchableOpacity>
              </View>
            </View>
          </MotiView>
        )}
        {!generatedImage && (
          <TouchableOpacity
            onPress={GenerateFinalDesign}
            style={[styles.finalGenerateButton, isProcessing && { opacity: 0.7 }, !uploadedImages.left && styles.disabledButton]}
            disabled={isProcessing || !uploadedImages.left}
          >
            <Text style={styles.finalGenerateButtonText}>Generate Design</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Image Zoom Modal */}
      <Modal transparent={true} visible={!!selectedImageUrlForZoom} onRequestClose={() => setSelectedImageUrlForZoom(null)}>
        <View style={styles.modalContainer}>
          {selectedImageUrlForZoom && (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "timing", duration: 250 }}
              style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
            >
              {/* @ts-ignore */}
              <ImageZoom
                cropWidth={width}
                cropHeight={Dimensions.get("window").height}
                imageWidth={width}
                imageHeight={Dimensions.get("window").height * 0.9}
                minScale={1}
                maxScale={4}
                enableCenterFocus
                useNativeDriver
                doubleClickInterval={250}
              >
                <Image source={{ uri: selectedImageUrlForZoom }} style={{ width: width, height: Dimensions.get("window").height * 0.9, resizeMode: "contain" }} />
              </ImageZoom>
            </MotiView>
          )}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
              setSelectedImageUrlForZoom(null);
            }}
          >
            <Text style={styles.modalCloseButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
