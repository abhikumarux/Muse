import React, { useEffect, useState, useMemo, useRef } from "react";
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
  Alert, // Import Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useUser } from "../../lib/UserContext";
import { useCreateDesign } from "../../lib/CreateDesignContext";
import { PrintFilesResponse } from "@/lib/types/printful";
import { Ionicons } from "@expo/vector-icons";
import { MuseCoin } from "@/assets/svg/MuseCoin";
import * as Haptics from "expo-haptics"; // Import Haptics

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;

// This screen needs its own styles
const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 10, paddingBottom: 80 },
    gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background },
    loadingText: { marginTop: 10, fontSize: 16, color: theme.secondaryText, fontFamily: "Inter-ExtraBold" },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background, paddingHorizontal: 20 },
    errorText: { fontSize: 16, color: "#F44336", textAlign: "center", marginBottom: 20, fontFamily: "Inter-ExtraBold" },
    retryButton: { backgroundColor: theme.text, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryButtonText: { color: theme.background, fontSize: 16, fontFamily: "Inter-ExtraBold" },

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

    // Placements Screen Specific Styles
    placementImageContainer: {
      alignItems: "center",
      marginBottom: 30,
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
    },
    placementProductTitle: {
      fontSize: 16,
      color: theme.text,
      textAlign: "center",
      marginTop: 15,
      fontFamily: "Inter-ExtraBold",
    },
    placementProductDescription: {
      fontSize: 18,
      color: theme.text,
      textAlign: "center",
      marginTop: 15,
      fontFamily: "Inter-ExtraBold",
    },
    placementProductImage: {
      width: width * 0.7,
      height: width * 0.7,
      backgroundColor: "#FFFFFF",
      borderRadius: 8,
    },
    placementButton: {
      width: CARD_WIDTH,
      paddingVertical: 18,
      borderWidth: 2,
      borderColor: theme.text,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 15,
      backgroundColor: theme.background,
    },
    placementButtonSelected: {
      backgroundColor: theme.text,
    },
    placementButtonText: {
      color: theme.text,
      fontSize: 13,
      fontFamily: "Inter-ExtraBold",
    },
    placementButtonTextSelected: {
      color: theme.background,
      fontFamily: "Inter-ExtraBold",
    },
    noPlacementsText: { fontSize: 16, color: theme.secondaryText, textAlign: "center", marginTop: 40, fontFamily: "Inter-ExtraBold" },

    // Bottom Bar
    bottomBar: { position: "absolute", bottom: 50, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: "transparent" },
    selectionTextPill: {
      backgroundColor: "#000000aa",
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignSelf: "center",
      marginBottom: 12,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    selectionSummaryText: { color: "#FFFF", fontSize: 16, textAlign: "center", marginBottom: 0, fontFamily: "Inter-ExtraBold" },
    confirmButton: { backgroundColor: theme.text, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
    confirmButtonText: { color: theme.background, fontSize: 18, fontFamily: "Inter-ExtraBold" },
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

  // This is now hardcoded to step 2
  const currentStep = 2;
  const progress = useRef(new Animated.Value(0)).current; // <-- Use ref

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

  // Animate the progress bar fill
  useEffect(() => {
    Animated.timing(progress, {
      toValue: currentStep - 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStep, progress]); // Add progress to dependency array

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

export default function PlacementsScreen() {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);
  const router = useRouter();

  // Get shared state from context
  const { selectedProduct, selectedColor, selectedVariant, placementFiles, setPlacementFiles, selectedPlacements, setSelectedPlacements, placementScrollViewRef, preloadedDesignUri } =
    useCreateDesign();

  const { printfulApiKey, currentStoreId } = useUser();

  // Local state for this screen
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prevPlacementsLength = useRef(0);

  // Fetch placement files function
  const fetchPlacementFiles = async (productId: number) => {
    if (!printfulApiKey || !currentStoreId) {
      setError("Please connect your Printful account in settings.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`https://api.printful.com/mockup-generator/printfiles/${productId}?store_id=${currentStoreId}`, {
        headers: { Authorization: `Bearer ${printfulApiKey}` },
      });
      const data: PrintFilesResponse = await response.json();
      if (data.code === 200) {
        setPlacementFiles(data.result.available_placements);
      } else {
        setError("Failed to fetch placement options");
      }
    } catch (err) {
      setError("Network error occurred");
      console.error("Error fetching placement files:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch placement files when this screen loads
  useEffect(() => {
    if (selectedVariant) {
      fetchPlacementFiles(selectedVariant.product_id);
    } else {
      // This might happen on a full app refresh/reload
      setError("No variant selected. Please go back.");
      setLoading(false);
    }

    // Clear selections when this screen loads
    setSelectedPlacements([]);
  }, [selectedVariant, printfulApiKey, currentStoreId, setPlacementFiles, setSelectedPlacements]);

  // Scroll animation effect
  useEffect(() => {
    if (selectedPlacements.length === 1 && prevPlacementsLength.current === 0) {
      setTimeout(() => {
        placementScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevPlacementsLength.current = selectedPlacements.length;
  }, [selectedPlacements, placementScrollViewRef]);

  // Event Handlers
  const handlePlacementToggle = (placementId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
    setSelectedPlacements((prev) => (prev.includes(placementId) ? prev.filter((id) => id !== placementId) : [...prev, placementId]));
  };

  const handleGoToDesign = () => {
    if (selectedPlacements.length === 0) {
      Alert.alert("No Placements Selected", "Please select at least one placement.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Haptic feedback

    // PUSH the next screen
    router.push("/create/design");
  };

  // Render logic
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={styles.loadingText}>Loading Placements...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
              if (selectedVariant) {
                fetchPlacementFiles(selectedVariant.product_id);
              }
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const productImageUri = selectedColor?.image || selectedProduct?.image;

    return (
      <>
        <ScrollView ref={placementScrollViewRef} style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 }]} showsVerticalScrollIndicator={false}>
          {productImageUri && (
            <View style={styles.placementImageContainer}>
              <Image source={{ uri: productImageUri }} style={styles.placementProductImage} resizeMode="contain" />
              <Text style={styles.placementProductTitle}>your product</Text>
              <Text style={styles.placementProductDescription}>Please Select Your Placements</Text>
            </View>
          )}
          <View style={styles.gridContainer}>
            {placementFiles && Object.keys(placementFiles).length > 0 ? (
              Object.entries(placementFiles).map(([key, value]) => {
                const isSelected = selectedPlacements.includes(key);

                return (
                  <TouchableOpacity key={key} style={[styles.placementButton, isSelected && styles.placementButtonSelected]} onPress={() => handlePlacementToggle(key)}>
                    <Text style={[styles.placementButtonText, isSelected && styles.placementButtonTextSelected]} numberOfLines={1}>
                      {value.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noPlacementsText}>No placement options available</Text>
            )}
          </View>
        </ScrollView>

        {/* Bottom confirmation bar */}
        {selectedPlacements.length > 0 && (
          <View style={styles.bottomBar}>
            <View style={styles.selectionTextPill}>
              <Text style={styles.selectionSummaryText}>
                {selectedPlacements.length} placement
                {selectedPlacements.length !== 1 ? "s" : ""} selected
              </Text>
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={handleGoToDesign}>
              <Text style={styles.confirmButtonText}>Go to Design</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ProductFlowHeader
        title={"Select Placements"}
        onBackPress={() => router.back()} // Native back functionality
      />
      <ProgressBar />
      {renderContent()}
    </SafeAreaView>
  );
}
