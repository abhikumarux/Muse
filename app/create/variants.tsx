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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolate } from "react-native-reanimated";
import { Colors } from "@/constants/Colors";
import { useUser } from "../../lib/UserContext";
import { useCreateDesign } from "../../lib/CreateDesignContext";
import { Variant, ProductDetailsResponse } from "@/lib/types/printful";
import { Ionicons } from "@expo/vector-icons";
import { MuseCoin } from "@/assets/svg/MuseCoin";

const { width } = Dimensions.get("window");

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollView: { flex: 1 },
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

    // Variant Screen Specific Styles
    imageContainerForAnimation: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: "#FFFFFF",
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      overflow: "hidden",
    },
    mainProductImageNew: {
      width: "100%",
      height: "100%",
      resizeMode: "contain",
    },
    detailsContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
    productTitleNew: { fontSize: 24, color: theme.text, marginBottom: 4, fontFamily: "Inter-ExtraBold" },
    productPriceNew: { fontSize: 20, color: theme.text, marginBottom: 20, fontFamily: "Inter-ExtraBold" },
    colorScrollView: { marginBottom: 25 },
    colorThumbnail: { width: 64, height: 64, borderRadius: 8, borderWidth: 2, borderColor: "transparent", overflow: "hidden" },
    colorThumbnailSelected: { borderColor: theme.tint },
    colorThumbnailImage: { width: "100%", height: "100%" },
    colorSelectorContainer: { alignItems: "center", marginRight: 12 },
    colorNameText: { marginTop: 6, fontSize: 12, color: theme.secondaryText, maxWidth: 64, textAlign: "center", fontFamily: "Inter-ExtraBold" },
    sizeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
    selectionTitle: { fontSize: 18, color: theme.text, marginBottom: 12, fontFamily: "Inter-ExtraBold" },
    sizeGuideLink: { fontSize: 16, color: theme.secondaryText, fontFamily: "Inter-ExtraBold" },
    sizeButtonContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    sizeButtonNew: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.background,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.tabIconDefault,
      minWidth: 60,
      alignItems: "center",
      marginBottom: 10,
    },
    sizeButtonNewSelected: { backgroundColor: theme.text, borderColor: theme.text },
    sizeButtonTextNew: { fontSize: 16, color: theme.text, fontFamily: "Inter-ExtraBold" },
    sizeButtonTextNewSelected: { color: theme.background, fontFamily: "Inter-ExtraBold" },

    // Bottom Bar
    bottomBar: { position: "absolute", bottom: 50, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: "transparent" },
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
      <TouchableOpacity style={styles.backButtonNew} onPress={onBackPress}>
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

  // This is hardcoded to step 1 for now.
  const currentStep = 1;
  const progress = new Animated.Value(currentStep - 1); // Step 1 means progress is 0

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

// New Variants screen component
export default function VariantsScreen() {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams<{ productId: string }>();

  // Get shared state from context
  const { productDetails, setProductDetails, selectedVariant, setSelectedVariant, selectedColor, setSelectedColor, selectedSize, setSelectedSize, variantScrollViewRef } = useCreateDesign();

  const { printfulApiKey } = useUser();

  // Local state for this screen
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animated scroll logic
  const variantScrollY = useSharedValue(0);
  const variantScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      variantScrollY.value = event.contentOffset.y;
    },
  });

  const animatedImageStyle = useAnimatedStyle(() => {
    const scale = interpolate(variantScrollY.value, [-100, 0, width * 0.7], [1.05, 1, 0.75], Extrapolate.CLAMP);
    const opacity = interpolate(variantScrollY.value, [0, width * 0.5], [1, 0.8], Extrapolate.CLAMP);
    const translateY = interpolate(variantScrollY.value, [0, width * 0.7], [0, width * 0.15], Extrapolate.CLAMP);

    return {
      transform: [{ scale }, { translateY }],
      opacity: opacity,
    };
  });

  // Fetch product details when this screen loads
  useEffect(() => {
    const fetchProductDetails = async (productId: number) => {
      if (!printfulApiKey) {
        setError("Please connect your Printful account in settings.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`https://api.printful.com/products/${productId}`, {
          headers: { Authorization: `Bearer ${printfulApiKey}` },
        });
        const data: ProductDetailsResponse = await response.json();
        if (data.code === 200) {
          setProductDetails(data.result);
          if (data.result && data.result.variants.length > 0) {
            // Set initial color to the cheapest variant
            const cheapestVariant = data.result.variants.reduce((cheapest, current) => (parseFloat(current.price) < parseFloat(cheapest.price) ? current : cheapest));
            setSelectedColor(cheapestVariant);
          }
        } else {
          setError("Failed to fetch product details");
        }
      } catch (err) {
        setError("Network error occurred");
        console.error("Error fetching product details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (params.productId) {
      fetchProductDetails(Number(params.productId));
    } else {
      setError("No product ID was provided.");
      setLoading(false);
    }

    // Reset selections when product changes
    return () => {
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectedVariant(null);
      setProductDetails(null);
    };
  }, [params.productId, printfulApiKey, setProductDetails, setSelectedColor, setSelectedSize, setSelectedVariant]);

  // Helper to sort sizes
  const sortSizes = (sizes: string[]): string[] => {
    const sizeOrderMap: { [key: string]: number } = { XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, XXL: 6, "3XL": 7, XXXL: 7, "4XL": 8, "5XL": 9 };
    return [...sizes].sort((a, b) => {
      const aIsNum = /^\d+$/.test(a);
      const bIsNum = /^\d+$/.test(b);
      if (aIsNum && bIsNum) return parseInt(a, 10) - parseInt(b, 10);
      const aOrder = sizeOrderMap[a.toUpperCase()];
      const bOrder = sizeOrderMap[b.toUpperCase()];
      if (aOrder && bOrder) return aOrder - bOrder;
      if (aOrder) return -1;
      if (bOrder) return 1;
      return a.localeCompare(b);
    });
  };

  // Event Handlers
  const handleColorSelect = (colorVariant: Variant) => {
    setSelectedColor(colorVariant);
    setSelectedSize(null); // Reset size
    setSelectedVariant(null); // Reset variant
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    if (productDetails && selectedColor) {
      // Find the specific variant that matches color and size
      const finalVariant = productDetails.variants.find((v) => v.color === selectedColor.color && v.size === size);
      if (finalVariant) {
        setSelectedVariant(finalVariant);
      }
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedVariant) return; // Should be disabled if no variant

    // PUSH the next screen
    router.push({
      pathname: "/create/placements",
      params: { productId: selectedVariant.product_id },
    });
  };

  // Render logic
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={styles.loadingText}>Loading Product Details...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => params.productId && fetchProductDetails(Number(params.productId))}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!productDetails) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product could not be loaded.</Text>
        </View>
      );
    }

    // Data for rendering
    const { product, variants } = productDetails;
    const colors: { [key: string]: Variant } = {};
    for (const variant of variants) {
      if (!colors[variant.color] || parseFloat(variant.price) < parseFloat(colors[variant.color].price)) {
        colors[variant.color] = variant;
      }
    }
    const uniqueColors = Object.values(colors);
    const uniqueSizes = selectedColor ? [...new Set(variants.filter((v) => v.color === selectedColor.color).map((v) => v.size))] : [];
    const availableSizes = sortSizes(uniqueSizes);

    return (
      <>
        <AnimatedReanimated.ScrollView ref={variantScrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false} onScroll={variantScrollHandler} scrollEventThrottle={16}>
          <AnimatedReanimated.View style={[styles.imageContainerForAnimation, animatedImageStyle]}>
            <Image source={{ uri: selectedColor ? selectedColor.image : product.image }} style={styles.mainProductImageNew} />
          </AnimatedReanimated.View>
          <View style={styles.detailsContainer}>
            <Text style={styles.productTitleNew}>{product.title}</Text>
            <Text style={styles.productPriceNew}>${selectedColor?.price || variants[0].price}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScrollView}>
              {uniqueColors.map((variant) => (
                <View key={variant.id} style={styles.colorSelectorContainer}>
                  <TouchableOpacity onPress={() => handleColorSelect(variant)} style={[styles.colorThumbnail, selectedColor?.color === variant.color && styles.colorThumbnailSelected]}>
                    <Image source={{ uri: variant.image }} style={styles.colorThumbnailImage} />
                  </TouchableOpacity>
                  <Text style={styles.colorNameText} numberOfLines={1}>
                    {variant.color}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.sizeHeader}>
              <Text style={styles.selectionTitle}>Select Size</Text>
              <TouchableOpacity onPress={() => Alert.alert("Size Guide", "Coming soon!")}>
                <Text style={styles.sizeGuideLink}>Size Guide</Text>
              </TouchableOpacity>
            </View>
            {selectedColor && (
              <View style={styles.sizeButtonContainer}>
                {availableSizes.map((size) => (
                  <TouchableOpacity key={size} onPress={() => handleSizeSelect(size)} style={[styles.sizeButtonNew, selectedSize === size && styles.sizeButtonNewSelected]}>
                    <Text style={[styles.sizeButtonTextNew, selectedSize === size && styles.sizeButtonTextNewSelected]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </AnimatedReanimated.ScrollView>

        {/* Bottom confirmation bar */}
        {selectedVariant && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSelection}>
              <Text style={styles.confirmButtonText}>Confirm Selection</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ProductFlowHeader
        title={productDetails?.product.title || "Select Variant"}
        onBackPress={() => router.back()} 
      />
      <ProgressBar />
      {renderContent()}
    </SafeAreaView>
  );
}
