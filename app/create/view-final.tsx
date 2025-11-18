// app/create/view-final.tsx

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  useColorScheme as useDeviceColorScheme,
  ActivityIndicator,
  Animated,
  TextInput,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView, // Added
  Platform, // Added
} from "react-native";
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

// --- NEW ICON IMPORTS ---
import { RemixIcon } from "../../assets/svg/RemixIcon";
import { SaveIcon } from "../../assets/svg/SaveIcon";
import { ContentIcon } from "../../components/icons/ContentIcon";
// -------------------------

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;

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
      backgroundColor: "transparent",
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
      paddingBottom: 40, // <-- MODIFIED from 120
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
      paddingVertical: 10,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
      marginHorizontal: 5,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      minHeight: 50,
    },
    designControlButtonText: { color: theme.text, fontSize: 14, fontFamily: "Inter-ExtraBold" },
    designButtonIcon: {
      marginRight: 12,
    },
    mockupContainer: { marginBottom: 20, width: "100%" },
    mockupTitle: { fontSize: 18, color: theme.text, textAlign: "center", marginBottom: 15, fontFamily: "Inter-ExtraBold" },
    mockupScrollView: { maxHeight: 300 },
    mockupScrollContent: { paddingHorizontal: 20, alignItems: "center" },

    mockupWrapper: {
      marginRight: 45,
      alignItems: "center",
      minWidth: CARD_WIDTH,
    },
    mockupImageContainer: {
      backgroundColor: theme.card,
      borderRadius: 20,
      shadowColor: theme.text,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      width: "120%",
      height: CARD_WIDTH * 1.25,
      overflow: "hidden",
    },
    mockupImage: {
      width: "100%",
      height: "100%",
    },

    mockupImageLabel: {
      fontSize: 16,
      color: theme.text,
      marginTop: 8,
      textAlign: "center",
      fontFamily: "Inter-ExtraBold",
      textTransform: "uppercase",
    },
    noMockupContainer: { alignItems: "center", padding: 20, backgroundColor: theme.card, borderRadius: 12, marginBottom: 20 },
    noMockupText: { fontSize: 16, color: theme.secondaryText, textAlign: "center", fontFamily: "Inter-ExtraBold" },

    startOverContainer: {
      backgroundColor: "transparent",
      width: "100%",
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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const handleImageZoom = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
    setSelectedImageIndex(index);
  };

  // --- API Logic ---

  const handleSaveDesign = async () => {
    if (!generatedImage) {
      Alert.alert("Error", "No generated image to save.");
      return;
    }

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
      // NOTE: Remix logic here
      Alert.alert("Remix", "Remix logic is being processed.");
      router.back(); // Simulate navigation back to design screen to show result
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
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
        title={"RESULTS"}
        onBackPress={() => router.back()} // Native back functionality
      />
      <ProgressBar />

      {/* --- MODIFIED JSX STRUCTURE --- */}
      {/* --- ADD KEYBOARD AVOIDING VIEW --- */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }} // Make it take up the remaining space
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.finalDesignContent}>
          <Text style={styles.finalDesignProductText}>
            Selected: {selectedProduct?.title} ({selectedColor?.color}, {selectedSize})
          </Text>
          {mockupImages.length > 0 ? (
            <View style={styles.mockupContainer}>
              <Text style={styles.mockupTitle}>Your Design on Product</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mockupScrollView} contentContainerStyle={styles.mockupScrollContent}>
                {mockupImages.map((mockupUrl, index) => (
                  <TouchableOpacity key={index} onPress={() => handleImageZoom(index)} style={styles.mockupWrapper}>
                    <View style={styles.mockupImageContainer}>
                      <Image source={{ uri: mockupUrl }} style={styles.mockupImage} resizeMode="cover" />
                    </View>
                    <Text style={styles.mockupImageLabel}>View {index + 1}</Text>
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
            {/* ADD TO STORE Button with Icon */}
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
              {/* Using fill={theme.text} */}
              <Ionicons name="storefront-outline" size={32} color={theme.text} style={styles.designButtonIcon} />
              <Text style={styles.designControlButtonText}>ADD TO STORE</Text>
            </TouchableOpacity>
            {/* REMIX Button with Icon */}
            <TouchableOpacity style={[styles.designControlButton, isProcessing && { opacity: 0.7 }]} onPress={handleRemix} disabled={isProcessing}>
              {/* Using fill={theme.text} */}
              <RemixIcon fill={theme.text} style={styles.designButtonIcon} width={32} height={32} />
              <Text style={styles.designControlButtonText}>REMIX</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.finalDesignButtonRow}>
            {/* SAVE DESIGN Button with Icon */}
            <TouchableOpacity style={styles.designControlButton} onPress={handleSaveDesign} disabled={isSaving || isProcessing}>
              {isSaving ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <>
                  {/* Using fill={theme.text} */}
                  <SaveIcon fill={theme.text} style={styles.designButtonIcon} width={32} height={32} />
                  <Text style={styles.designControlButtonText}>SAVE DESIGN</Text>
                </>
              )}
            </TouchableOpacity>
            {/* PHOTOSHOOT Button with Icon */}
            <TouchableOpacity style={styles.designControlButton} onPress={handlePhotoshootPress} disabled={isProcessing}>
              {/* Using fill={theme.text} */}
              <ContentIcon fill={theme.text} style={styles.designButtonIcon} width={34} height={34} />
              <Text style={styles.designControlButtonText}>PHOTOSHOOT</Text>
            </TouchableOpacity>
          </View>

          {/* Floating "Start Over" Button -- MOVED INSIDE SCROLLVIEW */}
          <View style={styles.startOverContainer}>
            <TouchableOpacity style={styles.startOverButton} onPress={handleStartNewDesign}>
              <Text style={styles.startOverButtonText}>START NEW DESIGN</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* --- END KEYBOARD AVOIDING VIEW --- */}

      <Modal transparent={true} visible={selectedImageIndex !== null} onRequestClose={() => setSelectedImageIndex(null)}>
        <View style={styles.modalContainer}>
          {selectedImageIndex !== null && (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "timing", duration: 250 }}
              style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
            >
              <FlatList
                data={mockupImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={selectedImageIndex ?? 0}
                getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={{ width: width, height: Dimensions.get("window").height, justifyContent: "center", alignItems: "center" }}>
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
                      <Image source={{ uri: item }} style={{ width: width, height: Dimensions.get("window").height * 0.9, resizeMode: "contain" }} />
                    </ImageZoom>
                  </View>
                )}
              />
            </MotiView>
          )}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
              setSelectedImageIndex(null);
            }}
          >
            <Text style={styles.modalCloseButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
