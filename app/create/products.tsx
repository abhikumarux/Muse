import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, useColorScheme as useDeviceColorScheme, ActivityIndicator, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { Colors } from "@/constants/Colors";
import { useUser } from "../../lib/UserContext";
import { useCreateDesign } from "../../lib/CreateDesignContext";
import { Product, ProductsResponse, ProductDetailsResponse, Variant } from "@/lib/types/printful";
import { Ionicons } from "@expo/vector-icons";
import { MuseCoin } from "@/assets/svg/MuseCoin";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;

// Define the type for our new detailed product state
type ProductColor = { name: string; code: string | null };

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 10, paddingBottom: 80 },
    gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    productCard: {
      width: CARD_WIDTH,
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.text,
      paddingBottom: 12,
    },
    productImage: { width: "100%", height: CARD_WIDTH * 0.8, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: theme.tabIconDefault },
    productTitle: { fontSize: 14, color: theme.text, paddingHorizontal: 12, paddingTop: 12, fontFamily: "Inter-ExtraBold" },
    productBrand: { fontSize: 12, color: theme.secondaryText, paddingHorizontal: 12, paddingTop: 4, fontFamily: "Inter-ExtraBold" },
    productVariants: {
      fontSize: 11,
      color: theme.secondaryText,
      paddingHorizontal: 12,
      paddingTop: 6,
      minHeight: 20, // Ensures height consistency
      fontFamily: "Inter-ExtraBold",
    },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background },
    loadingText: { marginTop: 10, fontSize: 16, color: theme.secondaryText, fontFamily: "Inter-ExtraBold" },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background, paddingHorizontal: 20 },
    errorText: { fontSize: 16, color: "#F44336", textAlign: "center", marginBottom: 20, fontFamily: "Inter-ExtraBold" },
    retryButton: { backgroundColor: theme.text, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryButtonText: { color: theme.background, fontSize: 16, fontFamily: "Inter-ExtraBold" },

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
    colorSwatchContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingTop: 6,
      minHeight: 20, // To prevent layout jump
    },
    colorSwatch: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1,
      marginRight: 4,
    },
    colorSwatchMore: {
      fontSize: 11,
      fontFamily: "Inter-ExtraBold",
      marginLeft: 2,
    },
    skeletonLoader: {
      width: 100, // Approx 5 swatches + margins
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.tabIconDefault, // Use a neutral color
    },
  });

const ProductFlowHeader = ({ title, onBackPress }: { title: string; onBackPress?: () => void }) => {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);

  return (
    <View style={styles.productFlowHeaderContainer}>
      <TouchableOpacity
        style={styles.backButtonNew}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

const ProgressBar = () => {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);

  const currentStep = 1;
  const progress = new Animated.Value(currentStep - 1);

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

const ProductCard = ({
  product,
  onSelect,
  motiDelay,
  theme,
  styles,
}: {
  product: Product;
  onSelect: (product: Product) => void;
  motiDelay: number;
  theme: typeof Colors.light | typeof Colors.dark;
  styles: ReturnType<typeof getStyles>;
}) => {
  const { printfulApiKey } = useUser();
  const [uniqueColors, setUniqueColors] = useState<ProductColor[]>([]);
  const [isLoadingColors, setIsLoadingColors] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!printfulApiKey || !product.id) {
        setIsLoadingColors(false);
        return;
      }

      try {
        const detailResponse = await fetch(`https://api.printful.com/products/${product.id}`, {
          headers: { Authorization: `Bearer ${printfulApiKey}` },
        });
        if (!detailResponse.ok) throw new Error("Failed detail fetch");

        const detailData: ProductDetailsResponse = await detailResponse.json();

        if (detailData.code === 200 && detailData.result.variants.length > 0) {
          const colors: ProductColor[] = [];
          const seenColors = new Set<string>();

          for (const variant of detailData.result.variants) {
            if (!seenColors.has(variant.color)) {
              seenColors.add(variant.color);
              // Use variant.color_code if available, otherwise null
              colors.push({ name: variant.color, code: (variant as any).color_code || null });
            }
          }
          setUniqueColors(colors);
        }
      } catch (e) {
        console.error(`Failed to fetch details for ${product.id}`, e);
        // Don't show an error, just fall back to variant count
      } finally {
        setIsLoadingColors(false);
      }
    };

    // Add a small delay so the card animation can finish
    setTimeout(fetchDetails, 300);
  }, [product.id, printfulApiKey]);

  return (
    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "timing", duration: 300, delay: motiDelay }}>
      <TouchableOpacity style={styles.productCard} onPress={() => onSelect(product)}>
        <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.title.replace(/All-?Over ?Print/gi, "AOP")}
        </Text>
        <Text style={styles.productBrand}>{product.brand}</Text>

        {isLoadingColors ? (
          // Show skeleton loading animation
          <View style={styles.colorSwatchContainer}>
            <MotiView
              from={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{
                loop: true,
                type: "timing",
                duration: 700,
              }}
            >
              <View style={styles.skeletonLoader} />
            </MotiView>
          </View>
        ) : uniqueColors.length > 0 ? (
          // Show colors once loaded with an animation
          <MotiView
            style={styles.colorSwatchContainer}
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 500 }}
          >
            {uniqueColors.slice(0, 5).map((color, index) => (
              <View
                key={index}
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: color.code || "#E0E0E0", // Use color code or grey fallback
                    borderColor: theme.tabIconDefault,
                  },
                ]}
                title={color.name}
              />
            ))}
            {uniqueColors.length > 5 && <Text style={[styles.colorSwatchMore, { color: theme.secondaryText }]}>+{uniqueColors.length - 5}</Text>}
          </MotiView>
        ) : (
          // Fallback to variant count if no colors found or fetch failed
          <Text style={styles.productVariants}>{product.variant_count} variants</Text>
        )}
      </TouchableOpacity>
    </MotiView>
  );
};

export default function ProductsScreen() {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId: string; categoryName: string }>();

  // products from context is now our *master list*
  const { products, setProducts, setSelectedProduct } = useCreateDesign();
  const { printfulApiKey } = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProducts = async (categoryId: number) => {
    if (!printfulApiKey) {
      setError("Please connect your Printful account in settings.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`https://api.printful.com/products?category_id=${categoryId}`, {
        headers: { Authorization: `Bearer ${printfulApiKey}` },
      });
      const data: ProductsResponse = await response.json();

      if (data.code === 200) {
        setProducts(data.result); // Set base products in context
      } else {
        setError("Failed to fetch products");
        setProducts([]); // Clear products on error
      }
    } catch (err) {
      setError("Network error occurred");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.categoryId) {
      fetchProducts(Number(params.categoryId));
    } else {
      setError("No category ID was provided.");
      setLoading(false);
    }
  }, [params.categoryId, printfulApiKey]); // `setProducts` removed as it's from context and stable

  const handleProductSelect = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProduct(product);

    router.push({
      pathname: "/create/variants",
      params: { productId: product.id },
    });
  };

  const filteredProducts = useMemo(() => {
    // Base filtering on the `products` from context
    return products.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

  const renderContent = () => {
    if (loading) {
      return (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.productCard}>
                <View style={[styles.productImage, { backgroundColor: theme.tabIconDefault }]} />
                <View style={{ padding: 12, gap: 8 }}>
                  <View style={{ height: 16, width: "80%", backgroundColor: theme.tabIconDefault, borderRadius: 4 }} />
                  <View style={{ height: 12, width: "50%", backgroundColor: theme.tabIconDefault, borderRadius: 4 }} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (params.categoryId) {
                fetchProducts(Number(params.categoryId));
              }
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={handleProductSelect}
              motiDelay={index * 50}
              theme={theme}
              styles={styles}
            />
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ProductFlowHeader title={params.categoryName || "Products"} onBackPress={() => router.back()} />
      <ProgressBar />
      {renderContent()}
    </SafeAreaView>
  );
}