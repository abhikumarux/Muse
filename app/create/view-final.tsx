import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, useColorScheme as useDeviceColorScheme, ActivityIndicator, Animated, TextInput, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import ImageZoom from "react-native-image-pan-zoom";
import { v4 as uuidv4 } from "uuid";
import { Colors } from "@/constants/Colors";
import { useUser } from "../../lib/UserContext";
import { useCreateDesign } from "../../lib/CreateDesignContext";
import { saveDesign } from "../../lib/aws/saveDesign";
import { Ionicons } from "@expo/vector-icons";
import { MuseCoin } from "@/assets/svg/MuseCoin";
import { LoadingModal } from "@/components/ui/LoadingModal";
import { GEMINI_API_KEY } from "@/lib/config/constants";
import * as Haptics from "expo-haptics"; // Import Haptics

const { width } = Dimensions.get("window");

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollView: { flex: 1 },

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

    // Final Design Screen Specific Styles
    finalDesignContent: {
      alignItems: "center",
      padding: 20,
      paddingBottom: 120,
    },
    finalDesignProductText: { fontSize: 16, color: theme.secondaryText, marginBottom: 10, textAlign: "center", fontFamily: "Inter-ExtraBold" },
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
    finalDesignButtonRow: { flexDirection: "row", width: "100%", justifyContent: "space-between", marginBottom: 15 },
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
    mockupContainer: { marginBottom: 20, width: "100%" },
    mockupTitle: { fontSize: 18, color: theme.text, textAlign: "center", marginBottom: 15, fontFamily: "Inter-ExtraBold" },
    mockupScrollView: { maxHeight: 300 },
    mockupScrollContent: { paddingHorizontal: 10, alignItems: "center" },
    mockupImageContainer: {
      marginRight: 15,
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 10,
      shadowColor: theme.text,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      minWidth: 200,
    },
    mockupImage: { width: 180, height: 200, borderRadius: 8, backgroundColor: theme.background },
    mockupImageLabel: { fontSize: 12, color: theme.secondaryText, marginTop: 8, textAlign: "center", fontFamily: "Inter-ExtraBold" },
    noMockupContainer: { alignItems: "center", padding: 20, backgroundColor: theme.card, borderRadius: 12, marginBottom: 20 },
    noMockupText: { fontSize: 16, color: theme.secondaryText, textAlign: "center", fontFamily: "Inter-ExtraBold" },

    // Start Over Button
    startOverContainer: {
      position: "absolute",
      bottom: 105,
      left: 20,
      right: 20,
      paddingTop: 10,
      backgroundColor: "transparent",
    },
    startOverButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: theme.background,
      borderWidth: 1.5,
      borderColor: theme.text,
      minHeight: 50,
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    startOverButtonText: {
      color: theme.text,
      fontSize: 14,
      fontFamily: "Inter-ExtraBold",
    },

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

  // This is now hardcoded to step 3
  const currentStep = 3;
  const progress = useRef(new Animated.Value(0)).current; // <-- Import useRef from React

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

export default function ViewFinalDesignScreen() {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);
  const router = useRouter();

  // Get shared state from context
  const { selectedProduct, selectedVariant, selectedColor, selectedSize, selectedPlacements, generatedImage, setGeneratedImage, mockupImages, mockupUrls, prompt, setPrompt, resetFlow } =
    useCreateDesign();

  const { printfulApiKey, currentStoreId } = useUser();

  // Local state for this screen
  const [isProcessing, setIsProcessing] = useState(false); // For remixing
  const [isSaving, setIsSaving] = useState(false); // For saving
  const [modalLoadingText, setModalLoadingText] = useState("Loading...");
  const [selectedImageUrlForZoom, setSelectedImageUrlForZoom] = useState<string | null>(null);

  const handleImageZoom = (imageUrl: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
    setSelectedImageUrlForZoom(imageUrl);
  };

  // --- API Logic ---

  const handleSaveDesign = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Haptic feedback
    if (!generatedImage) {
      Alert.alert("Error", "No generated image to save.");
      return;
    }

    setIsSaving(true);
    try {
      await saveDesign({
        imageUri: generatedImage,
        productName: selectedProduct?.title,
        productId: selectedProduct?.id?.toString(),
        variantId: selectedVariant?.id?.toString(),
        size: selectedSize ?? undefined,
        color: selectedColor?.color,
        title: `${selectedProduct?.title || "Custom Design"}`,
        prompt: prompt,
      });

      Alert.alert("Success", "Design saved successfully!");
    } catch (err: any) {
      console.error("Error saving design:", err);
      Alert.alert("Error", "Failed to save design. " + (err?.message || ""));
    } finally {
      setIsSaving(false);
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
      if (!remixedBase64) {
        throw new Error("Remix returned no image.");
      }
      const remixedImageUri = `data:image/png;base64,${remixedBase64}`;
      setGeneratedImage(remixedImageUri); // Update the image in context
      setPrompt(""); // Clear the prompt

      router.back();
    } catch (err: any) {
      console.error("Error remixing image:", err);
      Alert.alert("Error", "Failed to remix image. " + (err?.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotoshootPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
    if (!mockupImages.length) {
      Alert.alert("No Mockup", "Generate and apply your design to a product before launching a photoshoot.");
      return;
    }
    const primaryMockup = mockupImages[0];

    router.push({ pathname: "/create-photoshoot", params: { designUri: encodeURIComponent(primaryMockup) } });
  };

  const addToStore = async (mockupUrls: string[]) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // Haptic feedback
    if (!mockupUrls.length || !selectedVariant?.id || !selectedProduct) {
      Alert.alert("Error", "Missing product data to add to store.");
      return;
    }
    if (!printfulApiKey || !currentStoreId) {
      Alert.alert("Error", "Please connect your Printful account in settings first.");
      return;
    }

    setModalLoadingText("Adding to Store...");
    setIsProcessing(true);

    try {
      const files = selectedPlacements.map((placement, i) => {
        const fileObj: any = { url: mockupUrls[i] || mockupUrls[0] };

        if (placement !== "front" && placement !== "default") {
          fileObj.type = placement;
        } else {
          fileObj.type = "default";
        }
        return fileObj;
      });

      if (!files.length) {
        throw new Error("No placements were selected to create files.");
      }

      if (!selectedProduct.title) throw new Error("Product title is required.");

      const endpoint = `https://api.printful.com/store/products?store_id=${currentStoreId}`;

      const payload = {
        sync_product: {
          name: `${selectedProduct.title} - Custom Design`,
          thumbnail: mockupUrls[0],
        },
        sync_variants: [
          {
            retail_price: selectedVariant.price, // Use original variant price
            variant_id: selectedVariant.id,
            files: files, // Pass the array of file objects we just built
          },
        ],
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${printfulApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Printful API Error:", errorData);
        throw new Error(errorData.error?.message || "Failed to add product to store.");
      }

      await response.json();
      Alert.alert("Success", "Product added to your store!");
    } catch (err: any) {
      console.error("Error in addToStore:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNewDesign = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // Haptic feedback
    resetFlow(); // Clear all data from context
    router.dismissAll();
  };

  // Render logic
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <LoadingModal visible={isProcessing} text={modalLoadingText} />

      <ProductFlowHeader
        title={"DESIGN RESULTS"}
        onBackPress={() => router.back()} // Native back functionality
      />
      <ProgressBar />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.finalDesignContent}>
        <Text style={styles.finalDesignProductText}>
          Selected: {selectedProduct?.title} ({selectedColor?.color}, {selectedSize})
        </Text>
        {mockupImages.length > 0 ? (
          <View style={styles.mockupContainer}>
            <Text style={styles.mockupTitle}>Your Design on Product</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mockupScrollView} contentContainerStyle={styles.mockupScrollContent}>
              {mockupImages.map((mockupUrl, index) => (
                <TouchableOpacity key={index} onPress={() => handleImageZoom(mockupUrl)}>
                  <View style={styles.mockupImageContainer}>
                    <Image source={{ uri: mockupUrl }} style={styles.mockupImage} resizeMode="contain" />
                    <Text style={styles.mockupImageLabel}>View {index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.noMockupContainer}>
            <Text style={styles.noMockupText}>No mockups available</Text>
          </View>
        )}
        <TextInput style={styles.input} placeholder="Type adjustments for a remix..." placeholderTextColor={theme.secondaryText} value={prompt} onChangeText={setPrompt} />
        <View style={styles.finalDesignButtonRow}>
          <TouchableOpacity
            style={styles.designControlButton}
            onPress={() => {
              if (!mockupUrls || mockupUrls.length === 0) {
                Alert.alert("Error", "No mockups to add.");
                return;
              }
              addToStore(mockupUrls);
            }}
            disabled={isProcessing}
          >
            <Text style={styles.designControlButtonText}>ADD TO STORE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.designControlButton, isProcessing && { opacity: 0.7 }]} onPress={handleRemix} disabled={isProcessing}>
            <Text style={styles.designControlButtonText}>REMIX</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.finalDesignButtonRow}>
          <TouchableOpacity style={styles.designControlButton} onPress={handleSaveDesign} disabled={isSaving || isProcessing}>
            {isSaving ? <ActivityIndicator color={theme.text} /> : <Text style={styles.designControlButtonText}>SAVE DESIGN</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.designControlButton} onPress={handlePhotoshootPress} disabled={isProcessing}>
            <Text style={styles.designControlButtonText}>PHOTOSHOOT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating "Start Over" Button */}
      <View style={styles.startOverContainer}>
        <TouchableOpacity style={styles.startOverButton} onPress={handleStartNewDesign}>
          <Text style={styles.startOverButtonText}>START NEW DESIGN</Text>
        </TouchableOpacity>
      </View>

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
