import React, { useState, useEffect, useRef } from "react";
import {
  TextInput,
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
import { captureRef } from "react-native-view-shot";
import * as ImagePicker from "expo-image-picker";
import ImageZoom from "react-native-image-pan-zoom";
import { MotiView } from "moti";
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolate } from "react-native-reanimated";
import { Colors } from "@/constants/Colors";
import { useUser } from "../../lib/UserContext";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { Buffer } from "buffer";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { LinearGradient } from "expo-linear-gradient";
import { DynamoDBClient, GetItemCommand, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { useRouter, useLocalSearchParams } from "expo-router";
import { saveDesign } from "../../lib/aws/saveDesign";
import { v4 as uuidv4 } from "uuid";
import { LogBox } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LoadingModal } from "@/components/ui/LoadingModal";
import { GEMINI_API_KEY, AWS_REGION, AWS_S3_BUCKET as BUCKET, AWS_IDENTITY_POOL_ID } from "@/lib/config/constants";
import { Category, Product, Variant, ProductDetails, PrintFilesResponse, CategoriesResponse, ProductsResponse, ProductDetailsResponse, DesignView, Muse } from "@/lib/types/printful";
import { DesignText } from "@/assets/svg/DesignText";
import { MuseCoin } from "@/assets/svg/MuseCoin";
import tshirtPlaceholder from "@/assets/images/tshirt-placeholder.png";
import hoodiePlaceholder from "@/assets/images/hoodie-placeholder.png";
import { Asset } from "expo-asset";

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [placementFiles, setPlacementFiles] = useState<Record<string, string>>({});
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DesignView>("categories");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [mockupImages, setMockupImages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { userId, printfulApiKey, currentStoreId, selectedMuseId, setSelectedMuseId } = useUser();
  const [mockupUrls, setMockupUrls] = useState<string[]>([]);
  const API_KEY = printfulApiKey;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<Variant | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{ savedDesignUri?: string }>();
  const [preloadedDesignUri, setPreloadedDesignUri] = useState<string | null>(null);
  const prevPlacementsLength = useRef(0);
  const [selectedImageUrlForZoom, setSelectedImageUrlForZoom] = useState<string | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalLoadingText, setModalLoadingText] = useState("Loading...");
  const [clothesFilter, setClothesFilter] = useState<"men" | "women" | "kids">("men");
  const [clothesCategoryIds, setClothesCategoryIds] = useState<{
    men: number | null;
    women: number | null;
    kids: number | null;
  }>({ men: null, women: null, kids: null });

  const [switchLayout, setSwitchLayout] = useState({ width: 0, height: 0 });
  const switchTranslateX = useRef(new Animated.Value(0)).current;

  const [muses, setMuses] = useState<Muse[]>([]);
  const [loadingMuses, setLoadingMuses] = useState(true);
  const [museSelectorVisible, setMuseSelectorVisible] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const placementScrollViewRef = useRef<ScrollView>(null);
  const designScrollViewRef = useRef<ScrollView>(null);
  const variantScrollViewRef = useRef<any>(null);
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
  const currentMuse = muses.find((m) => m.museID === selectedMuseId);
  const resetFlow = () => {
    setProducts([]);
    setProductDetails(null);
    setPlacementFiles({});
    setSelectedPlacements([]);
    setCurrentView("categories");
    setSelectedCategory(null);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setUploadedImages({ left: null, right: null });
    setGeneratedImage(null);
    setMockupImages([]);
    setSearchQuery("");
    setMockupUrls([]);
    setSelectedColor(null);
    setSelectedSize(null);
    setCurrentStep(1);
    setPrompt("");
  };

  useEffect(() => {
    const preloadAssets = async () => {
      try {
        await Asset.loadAsync([require("@/assets/images/tshirt-placeholder.png"), require("@/assets/images/hoodie-placeholder.png")]);
        console.log("✅ Placeholder images preloaded");
      } catch (err) {
        console.warn("⚠️ Error preloading images:", err);
      }
    };
    preloadAssets();
  }, []);

  useEffect(() => {
    if (params.savedDesignUri) {
      resetFlow();
      setPreloadedDesignUri(params.savedDesignUri);
      router.setParams({ savedDesignUri: "" });
    }
  }, [params.savedDesignUri]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: currentStep - 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    if (currentView === "categories" || currentView === "products" || currentView === "variants") {
      setCurrentStep(1);
    } else if (["placements", "design"].includes(currentView)) {
      setCurrentStep(2);
    } else if (currentView === "viewFinalDesign") {
      setCurrentStep(3);
    }
  }, [currentView]);
  useEffect(() => {
    if (currentView === "variants") {
      variantScrollY.value = 0;
      variantScrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [currentView]);
  useEffect(() => {
    fetchCategories();
    requestPermissions();
    loadMusesAndSelection();
  }, [userId]);
  useEffect(() => {
    if (generatedImage && currentView === "design") {
      setTimeout(() => {
        designScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [generatedImage, currentView]);
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
    if (currentView === "placements" && selectedPlacements.length === 1 && prevPlacementsLength.current === 0) {
      setTimeout(() => {
        placementScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevPlacementsLength.current = selectedPlacements.length;
  }, [selectedPlacements, currentView]);

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

  const handleImageZoom = (imageUrl: string) => {
    setSelectedImageUrlForZoom(imageUrl);
    setModalKey((prevKey) => prevKey + 1);
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera permission is needed to take photos.");
    }
  };

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
    primeMuseScroll();
    setMuseSelectorVisible(true);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://api.printful.com/categories", {
        headers: { Authorization: `Bearer ${API_KEY}` },
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

  const fetchProducts = async (categoryId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.printful.com/products?category_id=${categoryId}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const data: ProductsResponse = await response.json();
      if (data.code === 200) {
        setProducts(data.result);
      } else {
        setError("Failed to fetch products");
      }
    } catch (err) {
      setError("Network error occurred");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);

    if (category.id === -1) {
      setClothesFilter("men");
      setCurrentView("categories");
      return;
    }

    const subcategories = categories.filter((c) => c.parent_id === category.id);
    if (subcategories.length > 0) {
      setCurrentView("categories");
      return;
    }
    setCurrentView("products");
    fetchProducts(category.id);
  };

  const fetchProductDetails = async (productId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.printful.com/products/${productId}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const data: ProductDetailsResponse = await response.json();
      if (data.code === 200) {
        setProductDetails(data.result);
        if (data.result && data.result.variants.length > 0) {
          const cheapestVariant = data.result.variants.reduce((cheapest, current) => (parseFloat(current.price) < parseFloat(cheapest.price) ? current : cheapest));
          setSelectedColor(cheapestVariant);
        }
        setCurrentView("variants");
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

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    fetchProductDetails(product.id);
  };

  async function getStoreId() {
    return currentStoreId;
  }

  const fetchPlacementFiles = async (productId: number) => {
    try {
      const storeId = await getStoreId();
      setLoading(true);
      const response = await fetch(`https://api.printful.com/mockup-generator/printfiles/${productId}?store_id=${storeId}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const data: PrintFilesResponse = await response.json();
      if (data.code === 200) {
        setPlacementFiles(data.result.available_placements);
        setCurrentView("placements");
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

  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);
    fetchPlacementFiles(variant.product_id);
  };

  const handlePlacementToggle = (placementId: string) => {
    setSelectedPlacements((prev) => (prev.includes(placementId) ? prev.filter((id) => id !== placementId) : [...prev, placementId]));
  };

  const GenerateFinalDesign = async () => {
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

  const handleSaveDesign = async () => {
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

  const handlePhotoshootPress = () => {
    if (!mockupImages.length) {
      Alert.alert("No Mockup", "Generate and apply your design to a product before launching a photoshoot.");
      return;
    }
    const primaryMockup = mockupImages[0];
    router.push({ pathname: "/create-photoshoot", params: { designUri: encodeURIComponent(primaryMockup) } });
  };
  const handleGenerateDesign = () => {
    if (selectedPlacements.length === 0) {
      Alert.alert("No Placements Selected", "Please select at least one placement.");
      return;
    }
    setCurrentView("design");

    if (preloadedDesignUri) {
      setUploadedImages({ left: preloadedDesignUri, right: null });
      setGeneratedImage(preloadedDesignUri);
      setPreloadedDesignUri(null);
    }
  };

  const handleImageAdd = (position: "left" | "right") => {
    Alert.alert(
      "Add Image",
      "Choose a source for your image:",
      [
        {
          text: "Take Photo",
          onPress: () => takePhoto(position),
        },
        {
          text: "Choose from Library",
          onPress: () => pickImage(position),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const pickImage = async (position: "left" | "right") => {
    try {
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
    setUploadedImages((prev) => ({ ...prev, [position]: null }));
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
      setCurrentView("categories");
      setSearchQuery("");
      return;
    }

    if (selectedCategory && selectedCategory.parent_id !== 0) {
      const parentCategory = categories.find((c) => c.id === selectedCategory.parent_id);
      setSelectedCategory(parentCategory || null);
    } else {
      setSelectedCategory(null);
    }

    setCurrentView("categories");
    setProducts([]);
    setProductDetails(null);
    setSelectedProduct(null);
    setSearchQuery("");
  };

  const handleBackToProducts = () => {
    setCurrentView("products");
    setProductDetails(null);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setSelectedColor(null);
    setSelectedSize(null);
    setPlacementFiles({});
    setSelectedPlacements([]);
  };

  const handleBackToVariants = () => {
    setCurrentView("variants");
    setPlacementFiles({});
    setSelectedPlacements([]);
  };

  const handleBackToPlacements = () => {
    setCurrentView("placements");
    setUploadedImages({ left: null, right: null });
  };

  const handleBackToDesign = () => {
    setCurrentView("design");
    setGeneratedImage(null);
  };

  const handleGlobalBack = () => {
    if (currentView === "viewFinalDesign") {
      handleBackToDesign();
    } else if (currentView === "design") {
      handleBackToPlacements();
    } else if (currentView === "placements") {
      handleBackToVariants();
    } else if (currentView === "variants") {
      handleBackToProducts();
    } else if (currentView === "products") {
      handleBackToCategories();
    } else if (currentView === "categories" && selectedCategory) {
      handleBackToCategories();
    }
  };

  const handleColorSelect = (colorVariant: Variant) => {
    setSelectedColor(colorVariant);
    setSelectedSize(null);
    setSelectedVariant(null);
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    if (productDetails && selectedColor) {
      const finalVariant = productDetails.variants.find((v) => v.color === selectedColor.color && v.size === size);
      if (finalVariant) {
        setSelectedVariant(finalVariant);
      }
    }
  };

  const deleteGeneratedImage = () => setGeneratedImage(null);

  const putImageOnItem = async () => {
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

      const storeId = await getStoreId();
      const mockupPayload = {
        variant_ids: [selectedVariant.id],
        format: "jpg",
        files: selectedPlacements.map((placement) => ({
          placement,
          image_url: imageUrl,
          position: { area_width: 1800, area_height: 2400, width: 1800, height: 1800, top: 300, left: 0 },
        })),
      };

      const mockupResponse = await fetch(`https://api.printful.com/mockup-generator/create-task/${selectedProduct.id}?store_id=${storeId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
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
        const statusResponse = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${taskKey}&store_id=${storeId}`, { headers: { Authorization: `Bearer ${API_KEY}` } });
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
          setCurrentView("viewFinalDesign");
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

  const addToStore = async (mockupUrls: string[]) => {
    if (!mockupUrls.length || !selectedVariant?.id || !selectedProduct) {
      Alert.alert("Error", "Missing product data to add to store.");
      return;
    }

    try {
      const storeId = await getStoreId();
      const files = selectedPlacements.map((placement, i) => {
        const fileObj: any = { url: mockupUrls[i] || mockupUrls[0] };
        if (placement !== "front" && placement !== "default") fileObj.type = placement;
        return fileObj;
      });

      if (!selectedProduct.title) throw new Error("Product title is required.");

      const endpoint = `https://api.printful.com/store/products?store_id=${storeId}`;
      const payload = {
        sync_product: { name: selectedProduct.title, thumbnail: mockupUrls[0] },
        sync_variants: [{ retail_price: "25.00", variant_id: selectedVariant.id, files }],
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to add product to store.");
      }

      await response.json();
      Alert.alert("Success", "Product added to your store!");
    } catch (err: any) {
      console.error("Error in addToStore:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
    }
  };
  const handleClothesFilterChange = (filter: "men" | "women" | "kids") => {
    if (filter === clothesFilter) return;
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
  const ProgressBar = () => {
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
  const ProductFlowHeader = ({ title, onBackPress }: { title: string; onBackPress?: () => void }) => (
    <View style={styles.productFlowHeaderContainer}>
      <TouchableOpacity style={styles.backButtonNew} onPress={onBackPress || handleGlobalBack}>
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

  const renderCurrentView = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (currentView === "viewFinalDesign") {
      return (
        <View style={styles.container}>
          <ProductFlowHeader title="DESIGN RESULTS" />
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
                onPress={async () => {
                  if (!mockupUrls || mockupUrls.length === 0) {
                    Alert.alert("Error", "No mockups to add.");
                    return;
                  }
                  await addToStore(mockupUrls);
                }}
              >
                <Text style={styles.designControlButtonText}>ADD TO STORE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.designControlButton, isProcessing && { opacity: 0.7 }]} onPress={handleRemix} disabled={isProcessing}>
                <Text style={styles.designControlButtonText}>REMIX</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.finalDesignButtonRow}>
              <TouchableOpacity style={styles.designControlButton} onPress={handleSaveDesign} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={theme.text} /> : <Text style={styles.designControlButtonText}>SAVE DESIGN</Text>}
              </TouchableOpacity>

              {/* --- THIS IS THE FIXED BUTTON --- */}
              <TouchableOpacity style={styles.designControlButton} onPress={handlePhotoshootPress}>
                <Text style={styles.designControlButtonText}>PHOTOSHOOT</Text>
              </TouchableOpacity>
              {/* ------------------------------- */}
            </View>

            {/* === BUTTON MOVED OUT OF SCROLLVIEW === */}
          </ScrollView>

          {/* === NEW FLOATING CONTAINER FOR THE BUTTON === */}
          <View style={styles.startOverContainer}>
            <TouchableOpacity style={styles.startOverButton} onPress={resetFlow}>
              <Text style={styles.startOverButtonText}>START NEW DESIGN</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (currentView === "design") {
      return (
        <View style={styles.container}>
          <ProductFlowHeader title="Add Your Inspo" />
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
        </View>
      );
    }

    if (currentView === "placements") {
      const productImageUri = selectedColor?.image || selectedProduct?.image;
      return (
        <View style={styles.container}>
          <ProductFlowHeader title="Select Placements" />
          <ProgressBar />
          <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 }]} showsVerticalScrollIndicator={false}>
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
          {selectedPlacements.length > 0 && (
            <View style={styles.bottomBar}>
              <View style={styles.selectionTextPill}>
                <Text style={styles.selectionSummaryText}>
                  {selectedPlacements.length} placement
                  {selectedPlacements.length !== 1 ? "s" : ""} selected
                </Text>
              </View>
              <TouchableOpacity style={styles.confirmButton} onPress={handleGenerateDesign}>
                <Text style={styles.confirmButtonText}>Go to Design</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    if (currentView === "variants") {
      if (!productDetails) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading Product Details...</Text>
          </View>
        );
      }
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
        <View style={styles.container}>
          <ProductFlowHeader title={product.title} />
          <ProgressBar />
          <AnimatedReanimated.ScrollView ref={variantScrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false} onScroll={variantScrollHandler} scrollEventThrottle={16}>
            {" "}
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
          {selectedVariant && (
            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.confirmButton} onPress={() => handleVariantSelect(selectedVariant!)}>
                <Text style={styles.confirmButtonText}>Confirm Selection</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    if (currentView === "products") {
      const filteredProducts = products.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

      return (
        <View style={styles.container}>
          <ProductFlowHeader title={selectedCategory?.title || "Products"} />
          <ProgressBar />
          {loading ? (
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
          ) : (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.gridContainer}>
                {filteredProducts.map((product, index) => (
                  <MotiView key={product.id} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "timing", duration: 300, delay: index * 50 }}>
                    <TouchableOpacity style={styles.productCard} onPress={() => handleProductSelect(product)}>
                      <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
                      <Text style={styles.productTitle} numberOfLines={2}>
                        {product.title}
                      </Text>
                      <Text style={styles.productBrand}>{product.brand}</Text>
                      <Text style={styles.productVariants}>{product.variant_count} variants</Text>
                    </TouchableOpacity>
                  </MotiView>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      );
    }
    let displayedCategories: Category[] = [];
    const isClothesCategoryView = selectedCategory?.id === -1;
    const allProductsCategory = categories.find((c) => c.title === "All products");

    if (isClothesCategoryView) {
      let activeParentId: number | null = null;
      if (clothesFilter === "men") activeParentId = clothesCategoryIds.men;
      else if (clothesFilter === "women") activeParentId = clothesCategoryIds.women;
      else if (clothesFilter === "kids") activeParentId = clothesCategoryIds.kids;

      if (activeParentId) {
        displayedCategories = categories.filter((c) => c.parent_id === activeParentId);
      }
    } else if (selectedCategory) {
      displayedCategories = categories.filter((c) => c.parent_id === selectedCategory.id);
    } else {
      const clothingCatIds = [clothesCategoryIds.men, clothesCategoryIds.women, clothesCategoryIds.kids].filter(Boolean) as number[];
      const parentCategories = categories.filter((c) => c.parent_id === 0 && !clothingCatIds.includes(c.id) && c.id !== allProductsCategory?.id);
      displayedCategories = parentCategories;
      if (clothingCatIds.length > 0) {
        displayedCategories.unshift(getFakeClothesCategory());
      }
    }
    displayedCategories = displayedCategories.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()) && c.id !== allProductsCategory?.id);
    let allClothingCategories: Category[] = [];
    let gridCategories: Category[] = [];
    const specificTitles = new Set(["all men's clothing", "all women’s clothing", "all kids & youth clothing"]);

    if (isClothesCategoryView) {
      allClothingCategories = displayedCategories.filter((c) => specificTitles.has(c.title.toLowerCase()));
      gridCategories = displayedCategories.filter((c) => !specificTitles.has(c.title.toLowerCase()));
    } else {
      gridCategories = displayedCategories;
    }
    return (
      <View style={styles.container}>
        {selectedCategory ? (
          <ProductFlowHeader title={selectedCategory.title} onBackPress={handleBackToCategories} />
        ) : (
          <View style={styles.topBarContainer}>
            <TouchableOpacity style={styles.museSelectorButton} onPress={openMuseSelector}>
              {currentMuse ? <Image source={{ uri: currentMuse.S3Location }} style={styles.museSelectorImage} /> : <Text style={styles.museSelectorText}>Choose Muse</Text>}
            </TouchableOpacity>
            <View style={styles.titleImageContainer}>
              <DesignText height={45} width="100%" fill={theme.text} preserveAspectRatio="xMidYMid meet" style={{ height: 55, width: "100%" }} />
            </View>
            <View style={[styles.coinsContainer, { backgroundColor: theme.text }]}>
              <MuseCoin width={24} height={24} style={styles.coinIcon} />
              <Text style={styles.coinText}>325</Text>
            </View>
          </View>
        )}
        {isClothesCategoryView && renderClothesSwitch()}
        <ScrollView ref={categoryScrollViewRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {allClothingCategories.length > 0 && (
            <View style={[styles.allProductsButtonContainer, gridCategories.length > 0 && { marginBottom: 20 }]}>
              {allClothingCategories.map((category, index) => (
                <TouchableOpacity key={category.id} style={[styles.allProductsButton, index < allClothingCategories.length - 1 && { marginBottom: 15 }]} onPress={() => handleCategorySelect(category)}>
                  <Text style={styles.allProductsButtonText}>{category.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.gridContainer}>
            {gridCategories.map((category, index) => (
              <MotiView key={category.id} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "timing", duration: 300, delay: index * 50 }}>
                <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategorySelect(category)}>
                  <Image
                    source={
                      category.title.toLowerCase().includes("all shirts") ? tshirtPlaceholder : category.title.toLowerCase().includes("all hoodies") ? hoodiePlaceholder : { uri: category.image_url }
                    }
                    style={[styles.categoryImage, { opacity: 0.95 }]}
                    resizeMode="cover"
                  />

                  <Text style={styles.categoryTitle} numberOfLines={2}>
                    {category.title}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
          {allProductsCategory && !searchQuery && !selectedCategory && (
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
      {renderCurrentView()}
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
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedImageUrlForZoom(null)}>
            <Text style={styles.modalCloseButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
                  setMuseSelectorVisible(false);
                  router.push("/muses");
                }}
              >
                <Text style={styles.museModalSeeAllText}>See All</Text>
              </TouchableOpacity>
              <Text style={[styles.museModalTitle, { color: "#FFFFFF" }]}>Select Your Muse</Text>
              <TouchableOpacity onPress={() => setMuseSelectorVisible(false)} style={styles.museModalCloseButton}>
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
                onMomentumScrollEnd={(event) => {}}
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
    scrollContent: { padding: 20, paddingTop: 10, paddingBottom: 80 },
    variantHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderColor: theme.tabIconDefault,
    },
    backButtonText: { fontSize: 18, color: theme.tint, fontFamily: "Inter-ExtraBold" },
    headerText: { fontSize: 22, color: theme.text, flex: 1, textAlign: "center", marginRight: 40, fontFamily: "Inter-ExtraBold" },
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
    categoryImage: { width: "100%", height: CARD_WIDTH * 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: theme.background },
    categoryTitle: { fontSize: 16, color: theme.text, textAlign: "center", paddingTop: 20, fontFamily: "Inter-ExtraBold" },
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
    placementCard: { backgroundColor: theme.card, borderRadius: 12, marginBottom: 15, padding: 16, borderWidth: 2, borderColor: theme.tabIconDefault },
    placementCardSelected: { borderColor: theme.tint, backgroundColor: theme.headerChip },
    placementHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    placementTitle: { fontSize: 16, color: theme.text, fontFamily: "Inter-ExtraBold" },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: theme.tabIconDefault, justifyContent: "center", alignItems: "center" },
    checkboxSelected: { backgroundColor: theme.tint, borderColor: theme.tint },
    checkmark: { color: theme.background, fontSize: 14, fontFamily: "Inter-ExtraBold" },
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
    selectionSummary: { padding: 16, marginTop: 10 },
    selectionSummaryText: { color: "#FFFF", fontSize: 16, textAlign: "center", marginBottom: 0, fontFamily: "Inter-ExtraBold" },
    generateButton: {
      backgroundColor: theme.text,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    generateButtonText: { color: theme.background, fontSize: 16, fontFamily: "Inter-ExtraBold" },
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
    emptyImageSubtext: {
      color: theme.tabIconDefault,
      fontSize: 12,
      marginTop: 4,
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
    emptyImageText: { color: theme.secondaryText, fontSize: 14, fontFamily: "Inter-ExtraBold" },
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
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background },
    loadingText: { marginTop: 10, fontSize: 16, color: theme.secondaryText, fontFamily: "Inter-ExtraBold" },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background, paddingHorizontal: 20 },
    errorText: { fontSize: 16, color: "#F44336", textAlign: "center", marginBottom: 20, fontFamily: "Inter-ExtraBold" },
    retryButton: { backgroundColor: theme.text, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryButtonText: { color: theme.background, fontSize: 16, fontFamily: "Inter-ExtraBold" },
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
    detailsContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 150 },
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
    bottomBar: { position: "absolute", bottom: 105, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: "transparent" },
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
    confirmButton: { backgroundColor: theme.text, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
    confirmButtonText: { color: theme.background, fontSize: 18, fontFamily: "Inter-ExtraBold" },
    disabledButton: { backgroundColor: theme.tabIconDefault },
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
    designActionRow: { flexDirection: "row", width: "100%", justifyContent: "space-between", marginTop: 10 },
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
    coinTextFlow: { fontSize: 18, color: theme.background, fontFamily: "Inter-ExtraBold" },
    coinIconPlaceholder: {
      fontSize: 18,
      color: theme.background,
      marginRight: 8,
      fontFamily: "Inter-ExtraBold",
    },
    museSelectorButton: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
      width: 70,
      height: 70,
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
    titleImagePlaceholder: {
      fontSize: 40,
      textAlign: "center",
      fontFamily: "Inter-ExtraBold",
    },
    titleImageContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    titleImage: {
      width: "100%",
      height: 55,
    },
    topBarContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 5,
      backgroundColor: theme.background,
    },
    coinsContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 12,
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
    coinIcon: { width: 24, height: 24, marginRight: 8 },
    coinText: { fontSize: 18, color: theme.background, fontFamily: "Inter-ExtraBold" },
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
  });
