import React, { useState, useEffect, useRef } from "react";
import {
  useColorScheme as useDeviceColorScheme,
  Animated,
  Alert,
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import { MotiView } from "moti";
import { Colors } from "@/constants/Colors";
import { useUser } from "../../lib/UserContext";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { LinearGradient } from "expo-linear-gradient";
import { DynamoDBClient, GetItemCommand, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { LogBox } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LoadingModal } from "@/components/ui/LoadingModal";
import { AWS_REGION, AWS_S3_BUCKET as BUCKET, AWS_IDENTITY_POOL_ID } from "@/lib/config/constants";
import { Category, CategoriesResponse, Muse } from "@/lib/types/printful";
import { DesignText } from "@/assets/svg/DesignText";
import { MuseCoin } from "@/assets/svg/MuseCoin";
import tshirtPlaceholder from "@/assets/images/Clothes-Category/All-Shirts.png";
import hoodiePlaceholder from "@/assets/images/Clothes-Category/Hoodies-&-Sweatshirt.png";
import jacketsPlaceholder from "@/assets/images/Clothes-Category/Jackets-&-Vests-Category.png";
import bottomsPlaceholder from "@/assets/images/Clothes-Category/All-Bottoms.png";
import swimwearPlaceholder from "@/assets/images/Clothes-Category/Swimwear.png";
import knitwearPlaceholder from "@/assets/images/Clothes-Category/Knitwear.png";
import accessoriesPlaceholder from "@/assets/images/Accessories-Category/Accessories.png";
import homeLivingPlaceholder from "@/assets/images/Home-&-Living-Category/Home-&-Living-Category.png";
import collectionsPlaceholder from "@/assets/images/Collections-Category/Collections.png";
import { Asset } from "expo-asset";
import { useCreateDesign } from "@/lib/CreateDesignContext";
import * as Haptics from "expo-haptics";

LogBox.ignoreLogs(["Warning: ..."]);
LogBox.ignoreAllLogs();

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;
const MUSE_ITEM_WIDTH = width * 0.7;
const MUSE_ITEM_SPACING = (width - MUSE_ITEM_WIDTH) / 2;
const MUSE_CARD_ASPECT_RATIO = 1.25;

export default function CreateNewDesignTab() {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams<{ savedDesignUri?: string }>();
  const {
    categories,
    setCategories,
    selectedCategory,
    setSelectedCategory,
    preloadedDesignUri,
    setPreloadedDesignUri,
    clothesFilter,
    setClothesFilter,
    clothesCategoryIds,
    setClothesCategoryIds,
    categoryScrollViewRef,
    resetFlow,
  } = useCreateDesign();

  const { userId, printfulApiKey, selectedMuseId, setSelectedMuseId, muses, setMuses } = useUser();

  const [loading, setLoading] = useState(categories.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalLoadingText, setModalLoadingText] = useState("Loading...");

  const [switchLayout, setSwitchLayout] = useState({ width: 0, height: 0 });
  const switchTranslateX = useRef(new Animated.Value(0)).current;

 
  const [loadingMuses, setLoadingMuses] = useState(true);
  const [museSelectorVisible, setMuseSelectorVisible] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const ProductFlowHeader = ({ title, onBackPress }: { title: string; onBackPress?: () => void }) => (
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
        <MuseCoin width={2} height={20} style={styles.coinIcon} />
        <Text style={[styles.coinTextFlow, { color: theme.background }]}>325</Text>
      </View>
    </View>
  );

  useEffect(() => {
    const preloadAssets = async () => {
      try {
        loadMusesAndSelection();
        await Asset.loadAsync([
          require("@/assets/images/Clothes-Category/All-Shirts.png"),
          require("@/assets/images/Clothes-Category/Hoodies-&-Sweatshirt.png"),
          require("@/assets/images/Clothes-Category/Jackets-&-Vests-Category.png"),
          require("@/assets/images/Clothes-Category/All-Bottoms.png"),
          require("@/assets/images/Clothes-Category/Swimwear.png"),
          require("@/assets/images/Clothes-Category/Knitwear.png"),
          require("@/assets/images/Accessories-Category/Accessories.png"),
          require("@/assets/images/Home-&-Living-Category/Home-&-Living-Category.png"),
          require("@/assets/images/Collections-Category/Collections.png"),
          require("@/assets/images/Accessories-Category/Bags.png"),
          require("@/assets/images/Accessories-Category/Face-Masks.png"),
          require("@/assets/images/Accessories-Category/Footwear.png"),
          require("@/assets/images/Accessories-Category/Patches.png"),
          require("@/assets/images/Accessories-Category/Hair-Accessories.png"),
          require("@/assets/images/Accessories-Category/Tech.png"),
          require("@/assets/images/Accessories-Category/Pins.png"),
          require("@/assets/images/Accessories-Category/Sports-Accessories.png"),
          require("@/assets/images/Home-&-Living-Category/Home-&-Living-Category.png"),
          require("@/assets/images/Home-&-Living-Category/Wall-Art.png"),
          require("@/assets/images/Home-&-Living-Category/Towels.png"),
          require("@/assets/images/Home-&-Living-Category/Aprons.png"),
          require("@/assets/images/Home-&-Living-Category/Drinkware-&-Coasters.png"),
          require("@/assets/images/Home-&-Living-Category/Pet-Products.png"),
          require("@/assets/images/Home-&-Living-Category/Stationery.png"),
          require("@/assets/images/Home-&-Living-Category/Home-Decor.png"),
          require("@/assets/images/Home-&-Living-Category/Beauty.png"),
          require("@/assets/images/Collections-Category/Sportswear.png"),
          require("@/assets/images/Collections-Category/Streetwear.png"),
          require("@/assets/images/Collections-Category/Beachwear.png"),
          require("@/assets/images/Collections-Category/Eco-Friendly.png"),
          require("@/assets/images/Collections-Category/Gifts.png"),
          require("@/assets/images/Collections-Category/New-Products.png"),
          require("@/assets/images/Collections-Category/Back-To-School.png"),
          require("@/assets/images/Collections-Category/Collections.png"),
        ]);
        console.log("✅ Placeholder images preloaded");
      } catch (err) {
        console.warn("⚠️ Error preloading images:", err);
      }
    };
    preloadAssets();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (params.savedDesignUri) {
        resetFlow();
        setPreloadedDesignUri(params.savedDesignUri);
        router.setParams({ savedDesignUri: "" });
      }
    }, [params.savedDesignUri, resetFlow, setPreloadedDesignUri, router])
  );

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
    loadMusesAndSelection();
  }, [userId, printfulApiKey]);

  useEffect(() => {
    if (museSelectorVisible) {
      setTimeout(() => {
        if (selectedMuseId && muses.length > 0) {
          const initialIndex = muses.findIndex((muse) => muse.museID === selectedMuseId);
          if (initialIndex !== -1) {
            const initialX = initialIndex * MUSE_ITEM_WIDTH;
            scrollViewRef.current?.scrollTo({ x: initialX, animated: false });
          }
        }
      }, 0);
    }
  }, [museSelectorVisible]);

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

  const fetchSelectedMuseId = async (client: DynamoDBClient) => {
    if (!userId) return null;
    const userResult = await client.send(
      new GetItemCommand({
        TableName: "MuseUsers",
        Key: { userId: { S: userId } },
      })
    );
    return userResult.Item?.selectedMuseId?.S || null;
  };

  const directlyLoadMuses = async () => {
     const client = new DynamoDBClient({
        region: AWS_REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: AWS_REGION },
          identityPoolId: AWS_IDENTITY_POOL_ID,
        }),
      });

      const scanResult = await client.send(new ScanCommand({ TableName: "Muse" }));
      const musesData: Muse[] = (scanResult.Items || []).map((item) => ({
        museID: item.museID?.S || "",
        Name: item.Name?.S || "",
        Description: item.Description?.S || "",
        S3Location: item.S3Location?.S || "",
      }));
      musesData.forEach((muse) => {
});
      setMuses(musesData);
  }

  const loadMusesAndSelection = async () => {
    if (!userId) {
      setLoadingMuses(false);
      return;
    }
    setLoadingMuses(true);
    try {
      const client = new DynamoDBClient({
        region: AWS_REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: AWS_REGION },
          identityPoolId: AWS_IDENTITY_POOL_ID,
        }),
      });

      const scanResult = await client.send(new ScanCommand({ TableName: "Muse" }));
      const musesData: Muse[] = (scanResult.Items || []).map((item) => ({
        museID: item.museID?.S || "",
        Name: item.Name?.S || "",
        Description: item.Description?.S || "",
        S3Location: item.S3Location?.S || "",
      }));
      musesData.forEach((muse) => {
});
      setMuses(musesData);

      const currentMuseId = selectedMuseId || (await fetchSelectedMuseId(client));
      if (!selectedMuseId && currentMuseId) {
        setSelectedMuseId(currentMuseId);
      }

      if (currentMuseId && musesData.length > 0) {
        const initialIndex = musesData.findIndex((muse) => muse.museID === currentMuseId);
        if (initialIndex !== -1) {
          scrollX.setValue(initialIndex * MUSE_ITEM_WIDTH);
        }
      }
    } catch (error) {
      console.error("Error loading muses:", error);
    } finally {
      setLoadingMuses(false);
    }
  };

  const handleMuseSelection = async (newIndex: number) => {
    if (!userId || !muses[newIndex]) return;

    const newMuseId = muses[newIndex].museID;
    if (newMuseId === selectedMuseId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMuseId(newMuseId);

    try {
      const client = new DynamoDBClient({
        region: AWS_REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: AWS_REGION },
          identityPoolId: AWS_IDENTITY_POOL_ID,
        }),
      });

      await client.send(
        new UpdateItemCommand({
          TableName: "MuseUsers",
          Key: { userId: { S: userId } },
          UpdateExpression: "SET selectedMuseId = :museId",
          ExpressionAttributeValues: { ":museId": { S: newMuseId } },
        })
      );
    } catch (error) {
      console.error("Error updating selected muse:", error);
    }
  };

  const primeMuseScroll = () => {
    if (selectedMuseId && muses.length > 0) {
      const initialIndex = muses.findIndex((muse) => muse.museID === selectedMuseId);
      if (initialIndex !== -1) {
        const initialX = initialIndex * MUSE_ITEM_WIDTH;
        scrollX.setValue(initialX);
      }
    }
  };

  const openMuseSelector = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    primeMuseScroll();
    setMuseSelectorVisible(true);
  };

  const fetchCategories = async () => {
    if (!printfulApiKey) {
      setError("Please connect your Printful account in settings.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("https://api.printful.com/categories", {
        headers: { Authorization: `Bearer ${printfulApiKey}` },
      });
      const data: CategoriesResponse = await response.json();
      if (data.code === 200) {
        let allCategories = data.result.categories;
        const menCat = allCategories.find((c) => c.title.toLowerCase() === "men's clothing");
        const womenCat = allCategories.find((c) => c.title.toLowerCase() === "women's clothing");

        const kidsCat = allCategories.find((c) => {
          const title = c.title.toLowerCase();
          return c.parent_id === 0 && (title.includes("kids") || title.includes("youth"));
        });

        const hatsCat = allCategories.find((c) => c.title.toLowerCase() === "hats");
        const accessoriesCat = allCategories.find((c) => c.title.toLowerCase() === "accessories");
        const brandsCat = allCategories.find((c) => c.title.toLowerCase() === "brands");
        const collectionsCat = allCategories.find((c) => c.title.toLowerCase() === "collections");

        const allHatsCat = allCategories.find((c) => c.title.toLowerCase() === "all hats");

        let modifiedCategories = allCategories.map((cat) => {
          if (allHatsCat && accessoriesCat && cat.id === allHatsCat.id) {
            return {
              ...cat,
              parent_id: accessoriesCat.id,
              title: "Hats",
            };
          }

          if (brandsCat && collectionsCat && cat.id === brandsCat.id) {
            return { ...cat, parent_id: collectionsCat.id };
          }
          return cat;
        });

        allCategories = modifiedCategories.filter((cat) => {
          if (hatsCat && cat.id === hatsCat.id) {
            return false;
          }
          return true;
        });

        setClothesCategoryIds({
          men: menCat?.id || null,
          women: womenCat?.id || null,
          kids: kidsCat?.id || null,
        });

        setCategories(allCategories);
      } else {
        setError("Failed to fetch categories");
      }
    } catch (err) {
      setError("Network error occurred");
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const subcategories = categories.filter((c) => c.parent_id === category.id);

    if (subcategories.length === 0 && category.id !== -1) {
      router.push({
        pathname: "/create/products",
        params: { categoryId: category.id, categoryName: category.title },
      });
    } else if (category.id === -1) {
      const initialFilter = clothesCategoryIds.men ? "men" : clothesCategoryIds.women ? "women" : "kids";
      router.push({
        pathname: "/create/category-sublist",
        params: {
          parentCategoryId: category.id,
          parentCategoryName: "Clothes",
          isClothesParent: "true",
          initialFilter: initialFilter,
        },
      });
    } else {
      router.push({
        pathname: "/create/category-sublist",
        params: { parentCategoryId: category.id, parentCategoryName: category.title },
      });
    }
  };

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
  const getFakeClothesCategory = (): Category => {
    const clothesImage =
      categories.find((c) => c.id === clothesCategoryIds.men)?.image_url ||
      categories.find((c) => c.id === clothesCategoryIds.women)?.image_url ||
      categories.find((c) => c.id === clothesCategoryIds.kids)?.image_url ||
      "";

    return {
      id: -1,
      parent_id: 0,
      title: "Clothes",
      image_url: clothesImage,
      size_guides: [],
    };
  };

  const handleBackToCategories = () => {
    const clothingParentIds = [clothesCategoryIds.men, clothesCategoryIds.women, clothesCategoryIds.kids].filter(Boolean);

    if (selectedCategory && clothingParentIds.includes(selectedCategory.parent_id)) {
      setSelectedCategory(getFakeClothesCategory());
      setSearchQuery("");
      return;
    }

    if (selectedCategory && selectedCategory.parent_id !== 0) {
      const parentCategory = categories.find((c) => c.id === selectedCategory.parent_id);
      setSelectedCategory(parentCategory || null);
    } else {
      setSelectedCategory(null);
    }
    setSearchQuery("");
  };

  const handleClothesFilterChange = (filter: "men" | "women" | "kids") => {
    if (filter === clothesFilter) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    categoryScrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
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

  const renderCategoriesView = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={styles.loadingText}>Loading Categories...</Text>
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              fetchCategories();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    let displayedCategories: Category[] = [];
    const allProductsCategory = categories.find((c) => c.title === "All products");
    const clothingCatIds = [clothesCategoryIds.men, clothesCategoryIds.women, clothesCategoryIds.kids].filter(Boolean) as number[];
    const parentCategories = categories.filter((c) => c.parent_id === 0 && !clothingCatIds.includes(c.id) && c.id !== allProductsCategory?.id);
    displayedCategories = parentCategories;
    if (clothingCatIds.length > 0) {
      displayedCategories.unshift(getFakeClothesCategory());
    }
    displayedCategories = displayedCategories.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()) && c.id !== allProductsCategory?.id);
    const currentMuse = muses.find((m) => m.museID === selectedMuseId);
    return (
      <View style={styles.container}>
        {/* WRAP THE ENTIRE TOP BAR IN MOTIVIEW */}
        <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 100, type: "timing", duration: 300 }}>
          <View style={styles.topBarContainer}>
            <TouchableOpacity style={styles.museSelectorButton} onPress={openMuseSelector}>
              {currentMuse ? <Image source={{ uri: currentMuse.S3Location }} style={styles.museSelectorImage} /> : <Text style={styles.museSelectorText}>Choose Muse</Text>}
            </TouchableOpacity>
            <View style={styles.titleImageContainer}>
              <DesignText height={45} width="100%" fill={theme.text} preserveAspectRatio="xMidYMid meet" style={{ height: 55, width: "100%" }} />
            </View>
            <View style={[styles.coinsContainer, { backgroundColor: theme.text }]}>
              <MuseCoin width={20} height={20} style={styles.coinIcon} />
              <Text style={styles.coinText}>325</Text>
            </View>
          </View>
        </MotiView>
        <ScrollView ref={categoryScrollViewRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>
            {displayedCategories.map((category, index) => (
              <MotiView key={category.id} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "timing", duration: 300, delay: index * 50 }}>
                <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategorySelect(category)}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={
                        category.title.toLowerCase().includes("all shirts") || category.title.toLowerCase().includes("clothes")
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
                          : category.title.toLowerCase().includes("collections")
                          ? collectionsPlaceholder
                          : { uri: category.image_url }
                      }
                      style={[
                        styles.categoryImage,
                        { opacity: 0.95 },
                        category.title.toLowerCase().includes("swimwear") && styles.customSwimwearImage,
                        category.title.toLowerCase().includes("knitwear") && styles.customKnitwearImage,
                        category.title.toLowerCase().includes("accessories") && styles.customAccessoriesImage,
                        category.title.toLowerCase().includes("home & living") && styles.customHomeLivingImage,
                        category.title.toLowerCase().includes("collections") && styles.customCollectionsImage,
                        (category.title.toLowerCase().includes("all shirts") || category.title.toLowerCase().includes("clothes")) && styles.customAllShirtsImage,
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
          {allProductsCategory && !searchQuery && (
            <View style={styles.allProductsButtonContainer}>
              <TouchableOpacity style={styles.allProductsButton} onPress={() => handleCategorySelect(allProductsCategory)}>
                <Text style={styles.allProductsButtonText}>View all Products</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <LoadingModal visible={isProcessing} text={modalLoadingText} />
      {renderCategoriesView()}
      <Modal animationType="slide" transparent visible={museSelectorVisible} onRequestClose={() => setMuseSelectorVisible(false)}>
        <View style={styles.museModalContainer}>
          <TouchableWithoutFeedback onPress={() => setMuseSelectorVisible(false)}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
          </TouchableWithoutFeedback>
          <View style={[styles.museModalContent, { backgroundColor: theme.card, zIndex: 10, elevation: 10 }]} pointerEvents="box-none">
            <View style={styles.museModalHeader}>
              <TouchableOpacity
                style={styles.museModalSeeAllButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMuseSelectorVisible(false);
                  router.push("/muses");
                }}
              >
                <Text style={styles.museModalSeeAllText}>See All</Text>
              </TouchableOpacity>
              <Text style={[styles.museModalTitle, { color: "#FFFFFF" }]}>Select Your Muse</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  directlyLoadMuses();
                  setMuseSelectorVisible(false);
                }}
                style={styles.museModalCloseButton}
              >
                <Text style={styles.museModalCloseButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
            {loadingMuses ? (
              <View style={[styles.museLoadingCard, { height: MUSE_ITEM_WIDTH * MUSE_CARD_ASPECT_RATIO }]}>
                <ActivityIndicator size="large" color={theme.tint} />
              </View>
            ) : muses.length > 0 ? (
              <Animated.ScrollView
                ref={scrollViewRef as any}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={MUSE_ITEM_WIDTH}
                contentContainerStyle={[styles.museCarouselScrollView, { paddingHorizontal: MUSE_ITEM_SPACING }]}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / MUSE_ITEM_WIDTH);
                  handleMuseSelection(index);
                }}
                scrollEventThrottle={16}
              >
                {muses.map((muse, index) => {
                  const inputRange = [(index - 1) * MUSE_ITEM_WIDTH, index * MUSE_ITEM_WIDTH, (index + 1) * MUSE_ITEM_WIDTH];
                  const scale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.8, 1, 0.8],
                    extrapolate: "clamp",
                  });
                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.5, 1, 0.5],
                    extrapolate: "clamp",
                  });
                  return (
                    <TouchableOpacity
                      key={muse.museID}
                      activeOpacity={0.8}
                      onPress={() => {
                        handleMuseSelection(index);
                        scrollViewRef.current?.scrollTo({ x: index * MUSE_ITEM_WIDTH, animated: true });
                      }}
                    >
                      <Animated.View
                        style={[
                          styles.museImageCard,
                          {
                            width: MUSE_ITEM_WIDTH,
                            height: MUSE_ITEM_WIDTH * MUSE_CARD_ASPECT_RATIO,
                            transform: [{ scale }],
                            opacity,
                          },
                        ]}
                      >
                        <Image source={{ uri: muse.S3Location }} style={styles.museBackgroundImage} />
                        <View style={styles.museOverlay}>
                          <Text style={styles.museTitleOverlay}>{muse.Name}</Text>
                        </View>
                        {muse.museID === selectedMuseId && (
                          <View style={styles.museSelectedCheckmarkContainer}>
                            <Ionicons name="checkmark-circle" size={40} color="#FFFFFF" style={styles.museSelectedCheckmark} />
                          </View>
                        )}
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </Animated.ScrollView>
            ) : (
              <View style={[styles.museLoadingCard, { height: MUSE_ITEM_WIDTH * MUSE_CARD_ASPECT_RATIO }]}>
                <Text style={{ color: theme.text, fontSize: 16 }}>No Muses found.</Text>
                <TouchableOpacity
                  style={{ marginTop: 15, padding: 10 }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMuseSelectorVisible(false);
                    router.push("/muses");
                  }}
                >
                  <Text style={{ color: theme.tint, fontWeight: "bold" }}>Go to Muses</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 22, paddingBottom: 80 },
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
      width: "80%",
      height: "80%",
    },
    customKnitwearImage: {
      width: "80%",
      height: "80%",
    },
    customAccessoriesImage: {
      width: "80%",
      height: "80%",
    },
    customHomeLivingImage: {
      width: "70%",
      height: "70%",
    },
    customCollectionsImage: {
      width: "70%",
      height: "70%",
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
      paddingTop: 20, // changed from 40 to 20
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
    backIcon: {
      fontSize: 24,
      color: theme.text,
      fontFamily: "Inter-ExtraBold",
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
      fontFamily: "Inter-ExtraBold",
    },
    coinsContainerFlow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.text,
    },
    coinTextFlow: { fontSize: 16, color: theme.background, fontFamily: "Inter-ExtraBold" },

    museSelectorButton: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
      width: 50,
      height: 50,
      borderRadius: 35,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      overflow: "hidden",
    },
    museSelectorImage: {
      width: "100%",
      height: "100%",
      borderRadius: 35,
      resizeMode: "cover",
      backgroundColor: theme.tabIconDefault,
    },
    museSelectorText: {
      color: theme.text,
      fontSize: 12,
      textAlign: "center",
      fontFamily: "Inter-ExtraBold",
    },

    titleImageContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    topBarContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 5,
      marginTop: 5,
      backgroundColor: theme.background,
    },
    coinsContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.text,
    },
    museModalContainer: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    museModalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 40,
      paddingTop: 20,
      minHeight: "50%",
    },
    museModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    museModalTitle: {
      fontSize: 20,
      flex: 1,
      textAlign: "center",
      marginHorizontal: 10,
      fontFamily: "Inter-ExtraBold",
    },
    museModalSeeAllButton: {
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingHorizontal: 15,
      paddingVertical: 9,
      borderRadius: 20,
    },
    museModalSeeAllText: {
      color: "white",
      fontSize: 16,
      fontFamily: "Inter-ExtraBold",
    },
    museModalCloseButton: {
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingHorizontal: 15,
      paddingVertical: 9,
      borderRadius: 20,
    },
    museModalCloseButtonText: {
      color: "white",
      fontSize: 16,
      fontFamily: "Inter-ExtraBold",
    },
    museLoadingCard: {
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
    },
    museCarouselScrollView: {
      alignItems: "center",
    },
    museImageCard: {
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
      position: "relative",
    },
    museBackgroundImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      backgroundColor: theme.tabIconDefault,
    },
    museOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    museTitleOverlay: {
      fontSize: 24,
      color: "#fff",
      textAlign: "center",
      fontFamily: "Inter-ExtraBold",
    },
    museSelectedCheckmarkContainer: {
      position: "absolute",
      top: 16,
      right: 16,
      zIndex: 10,
    },
    museSelectedCheckmark: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 3,
      elevation: 5,
    },
    coinIcon: { width: 20, height: 20, marginRight: 8 },
    coinText: { fontSize: 16, color: theme.background, fontFamily: "Inter-ExtraBold" },
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
    clothesSwitchButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
      backgroundColor: "transparent",
      height: "100%",
    },
    clothesSwitchText: {
      color: theme.text,
      fontSize: 13,
      fontFamily: "Inter-ExtraBold",
    },
    clothesSwitchTextActive: {
      color: theme.background,
      fontFamily: "Inter-ExtraBold",
    },
    allProductsButtonContainer: {
      paddingHorizontal: 0,
      marginTop: 0,
      paddingBottom: 0,
    },
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
    allProductsButtonText: {
      color: theme.text,
      fontSize: 16,
      fontFamily: "Inter-ExtraBold",
    },
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
    productVariants: { fontSize: 11, color: theme.secondaryText, paddingHorizontal: 12, paddingTop: 2, fontFamily: "Inter-ExtraBold" },
  });