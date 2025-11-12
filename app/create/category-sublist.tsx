import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, useColorScheme as useDeviceColorScheme, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { Colors } from "@/constants/Colors";
import { useCreateDesign } from "../../lib/CreateDesignContext";
import { Ionicons } from "@expo/vector-icons";
import { MuseCoin } from "@/assets/svg/MuseCoin";
import tshirtPlaceholder from "@/assets/images/All-Shirts.png";
import hoodiePlaceholder from "@/assets/images/Hoodies-&-Sweatshirt.png";
import jacketsPlaceholder from "@/assets/images/Jackets-&-Vests-Category.png";
import bottomsPlaceholder from "@/assets/images/All-Bottoms.png";
import swimwearPlaceholder from "@/assets/images/Swimwear.png";
import knitwearPlaceholder from "@/assets/images/Knitwear.png";
import accessoriesPlaceholder from "@/assets/images/Accessories.png";
import homeLivingPlaceholder from "@/assets/images/Home-&-Living-Category.png";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 10, paddingBottom: 80 },
    gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    categoryCard: {
      width: CARD_WIDTH,
      height: CARD_WIDTH * 1.4,
      backgroundColor: theme.background,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: theme.text,
      paddingBottom: 12,
    },
    imageContainer: {
      width: "100%",
      height: CARD_WIDTH * 1, // Fixed height for image display area
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: theme.background,
      justifyContent: "center", // Center vertically
      alignItems: "center", // Center horizontally
    },
    categoryImage: { // just made the width and height from 100% to 80% to better fit the container 
      width: "80%", // Take up full width/height of container by default
      height: "80%",
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: theme.background,
    },
    customSwimwearImage: {
      width: "70%", //changed from 80% to 70%
      height: "70%",
    },
    customKnitwearImage: {
      width: "70%", //changed from 80% to 70%
      height: "70%",
    },
    customAccessoriesImage: {
      width: "80%",
      height: "80%",
    },
    customHomeLivingImage: {
      width: "80%",
      height: "80%",
    },
    customAllShirtsImage: {
      transform: [{ translateY: 10 }],
    },
    customHoodiesImage: {
      // NEW STYLE
      transform: [{ translateY: 10 }],
    },
    categoryTitle: {
      fontSize: 16,
      color: theme.text,
      textAlign: "center",
      paddingTop: 16, // MODIFIED from 20 to 40, then changed from 32 to 16
      fontFamily: "Inter-ExtraBold",
    },
    productFlowHeaderContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 5,
      backgroundColor: theme.background,
    },
    backButtonNew: { alignItems: "center", justifyContent: "center", width: 50, height: 50, backgroundColor: "transparent" },
    backIconCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, justifyContent: "center", alignItems: "center", borderColor: theme.text },
    backText: { fontSize: 12, marginTop: 2, color: theme.text, fontFamily: "Inter-ExtraBold" },
    productFlowTitle: { flex: 1, fontSize: 28, textAlign: "center", color: theme.text, marginHorizontal: 10, fontFamily: "Inter-ExtraBold" },
    coinsContainerFlow: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, minWidth: 70, backgroundColor: theme.text },
    coinIcon: { width: 24, height: 24, marginRight: 8 },
    coinTextFlow: { fontSize: 18, color: theme.background, fontFamily: "Inter-ExtraBold" },
    clothesSwitchContainer: {
      flexDirection: "row",
      height: 38,
      backgroundColor: theme.card,
      borderRadius: 19,
      borderWidth: 1.5,
      borderColor: theme.tabIconDefault,
      marginHorizontal: 40,
      marginTop: 10,
      marginBottom: 15,
      position: "relative",
    },
    clothesSwitchThumb: {
      position: "absolute",
      top: 0,
      bottom: 0,
      height: "100%",
      borderRadius: 19,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    gradientThumb: {
      flex: 1,
    },
    clothesSwitchButton: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 1, backgroundColor: "transparent", height: "100%" },
    clothesSwitchText: { color: theme.text, fontSize: 13, fontFamily: "Inter-ExtraBold" },
    clothesSwitchTextActive: { color: theme.background, fontFamily: "Inter-ExtraBold" },
    allProductsButton: {
      backgroundColor: theme.card,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: theme.tabIconDefault,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      marginTop: 0,
      marginBottom: 0,
    },
    allProductsButtonText: { color: theme.text, fontSize: 16, fontFamily: "Inter-ExtraBold" },
    allProductsButtonContainer: {
      paddingHorizontal: 0,
      marginTop: 0,
      paddingBottom: 0,
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
  return null;
};

export default function CategorySublistScreen() {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams<{ parentCategoryId: string; parentCategoryName: string; isClothesParent?: string; initialFilter?: "men" | "women" | "kids" }>();
  const { categories, clothesFilter, setClothesFilter, clothesCategoryIds } = useCreateDesign();
  const isClothesParent = params.isClothesParent === "true";
  const [switchLayout, setSwitchLayout] = useState({ width: 0, height: 0 });
  const switchTranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (params.initialFilter) {
      setClothesFilter(params.initialFilter);
    }
  }, [params.initialFilter, setClothesFilter]);

  useEffect(() => {
    if (switchLayout.width > 0) {
      let toValue = 0;
      const filters: ("men" | "women" | "kids")[] = [];
      if (clothesCategoryIds.men) filters.push("men");
      if (clothesCategoryIds.women) filters.push("women");
      if (clothesCategoryIds.kids) filters.push("kids");

      const filterIndex = filters.indexOf(clothesFilter);
      const segmentWidth = filters.length > 0 ? switchLayout.width / filters.length : 0;

      if (filterIndex !== -1) {
        toValue = segmentWidth * filterIndex;
      }

      Animated.spring(switchTranslateX, {
        toValue,
        stiffness: 180,
        damping: 20,
        mass: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [clothesFilter, switchLayout.width, clothesCategoryIds]);

  const currentParentId = isClothesParent
    ? clothesFilter === "men"
      ? clothesCategoryIds.men
      : clothesFilter === "women"
      ? clothesCategoryIds.women
      : clothesCategoryIds.kids
    : Number(params.parentCategoryId);

  const { displayedCategories, allClothingCategories, gridCategories } = useMemo(() => {
    let allCategories = categories;
    let displayed: typeof categories = [];

    if (currentParentId) {
      displayed = allCategories.filter((c) => c.parent_id === currentParentId);
    }

    const specificTitles = new Set(["all men's clothing", "all women’s clothing", "all kids & youth clothing"]);
    const allClothing = displayed.filter((c) => specificTitles.has(c.title.toLowerCase()));
    const grid = displayed.filter((c) => !specificTitles.has(c.title.toLowerCase()));

    return {
      displayedCategories: displayed,
      allClothingCategories: allClothing,
      gridCategories: grid,
    };
  }, [categories, currentParentId, clothesFilter]);

  const handleCategorySelect = (category: (typeof categories)[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const subcategories = categories.filter((c) => c.parent_id === category.id);

    if (subcategories.length > 0) {
      router.push({
        pathname: "/create/category-sublist",
        params: {
          parentCategoryId: category.id,
          parentCategoryName: category.title,
        },
      });
    } else {
      router.push({
        pathname: "/create/products",
        params: { categoryId: category.id, categoryName: category.title },
      });
    }
  };

  const handleClothesFilterChange = (filter: "men" | "women" | "kids") => {
    if (filter === clothesFilter) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setClothesFilter(filter);
  };

  const renderClothesSwitch = () => {
    const filters: { key: "men" | "women" | "kids"; label: string }[] = [];
    if (clothesCategoryIds.men) filters.push({ key: "men", label: "Men's" });
    if (clothesCategoryIds.women) filters.push({ key: "women", label: "Women's" });
    if (clothesCategoryIds.kids) filters.push({ key: "kids", label: "Kids'" });
    if (filters.length <= 1) return null;

    const thumbWidth = `${100 / filters.length}%`;
    let currentGradient: string[];
    if (clothesFilter === "men") {
      currentGradient = ["#007AFF", "#00C6FF"];
    } else if (clothesFilter === "women") {
      currentGradient = ["#E91E63", "#F48FB1"];
    } else {
      currentGradient = ["#4CAF50", "#81C784"];
    }

    return (
      <View style={styles.clothesSwitchContainer} onLayout={(e) => setSwitchLayout(e.nativeEvent.layout)}>
        {switchLayout.width > 0 && (
          <Animated.View
            style={[
              styles.clothesSwitchThumb,
              {
                width: thumbWidth,
                transform: [{ translateX: switchTranslateX }],
              },
            ]}
          >
            <LinearGradient colors={currentGradient} style={styles.gradientThumb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          </Animated.View>
        )}
        {filters.map((filter) => (
          <TouchableOpacity key={filter.key} style={styles.clothesSwitchButton} onPress={() => handleClothesFilterChange(filter.key)}>
            <Text style={[styles.clothesSwitchText, clothesFilter === filter.key && styles.clothesSwitchTextActive]}>{filter.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ProductFlowHeader title={params.parentCategoryName || "Select Category"} onBackPress={() => router.back()} />
      {isClothesParent && renderClothesSwitch()}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {allClothingCategories.length > 0 && (
          <View style={[styles.allProductsButtonContainer, gridCategories.length > 0 && { marginBottom: 20 }]}>
            {allClothingCategories.map((category, index) => (
              <TouchableOpacity key={category.id} style={[styles.allProductsButton, index < allClothingCategories.length - 1 && { marginBottom: 15 }]} onPress={() => handleCategorySelect(category)}>
                <Text style={styles.allProductsButtonText}>{category.title.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.gridContainer}>
          {gridCategories.map((category, index) => (
            <MotiView key={category.id} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "timing", duration: 300, delay: index * 50 }}>
              <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategorySelect(category)}>
                <View style={styles.imageContainer}>
                  <Image
                    source={
                      category.title.toLowerCase().includes("all shirts")
                        ? tshirtPlaceholder
                        : category.title.toLowerCase().includes("all hoodies")
                        ? hoodiePlaceholder
                        : category.title.toLowerCase().includes("jackets & vests")
                        ? jacketsPlaceholder
                        : category.title.toLowerCase().includes("all bottoms")
                        ? bottomsPlaceholder
                        : category.title.toLowerCase().includes("swimwear")
                        ? swimwearPlaceholder
                        : category.title.toLowerCase().includes("knitwear")
                        ? knitwearPlaceholder
                        : category.title.toLowerCase().includes("accessories")
                        ? accessoriesPlaceholder
                        : category.title.toLowerCase().includes("home & living")
                        ? homeLivingPlaceholder
                        : { uri: category.image_url }
                    }
                    style={[
                      styles.categoryImage,
                      { opacity: 0.95 },
                      category.title.toLowerCase().includes("swimwear") && styles.customSwimwearImage,
                      category.title.toLowerCase().includes("knitwear") && styles.customKnitwearImage,
                      category.title.toLowerCase().includes("accessories") && styles.customAccessoriesImage,
                      category.title.toLowerCase().includes("home & living") && styles.customHomeLivingImage,
                      category.title.toLowerCase().includes("all shirts") && styles.customAllShirtsImage,
                      category.title.toLowerCase().includes("all hoodies") && styles.customHoodiesImage, // NEW CONDITION
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.categoryTitle} numberOfLines={2}>
                  {category.title.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
