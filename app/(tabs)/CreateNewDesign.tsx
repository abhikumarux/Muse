import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  Button,
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
} from "react-native";
import * as FileSystem from "expo-file-system";
import { captureRef } from "react-native-view-shot";
import * as ImagePicker from "expo-image-picker";
import ImageZoom from "react-native-image-pan-zoom";
import { MotiView } from "moti";
import { Colors } from "@/constants/Colors";
import { useUser } from "../../lib/UserContext";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { Buffer } from "buffer";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { LinearGradient } from "expo-linear-gradient";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { useRouter, useLocalSearchParams } from "expo-router";
import { saveDesign } from "../../lib/aws/saveDesign";
import { v4 as uuidv4 } from 'uuid'; // Import uuid

// Interfaces (no changes needed)
interface Category {
  id: number;
  parent_id: number;
  image_url: string;
  size: string;
  title: string;
}
interface Product {
  id: number;
  main_category_id: number;
  type: string;
  type_name: string;
  title: string;
  brand: string;
  model: string;
  image: string;
  variant_count: number;
  currency: string;
  files: any[];
  options: any[];
  is_discontinued: boolean;
  avg_fulfillment_time: number;
  description: string;
  techniques: any[];
  origin_country: string;
}
interface Variant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  color_code2?: string;
  image: string;
  price: string;
  in_stock: boolean;
  availability_regions: Record<string, string>;
  availability_status: Array<{ region: string; status: string }>;
  material: Array<{ name: string; percentage: number }>;
}
interface ProductDetails {
  product: Product;
  variants: Variant[];
}
interface PrintFilesResponse {
  code: number;
  result: {
    available_placements: Record<string, string>;
    option_groups: string[];
    options: string[];
    printfiles: any[];
    product_id: number;
    variant_printfiles: any[];
  };
}
interface CategoriesResponse {
  code: number;
  result: { categories: Category[] };
}
interface ProductsResponse {
  code: number;
  result: Product[];
}
interface ProductDetailsResponse {
  code: number;
  result: ProductDetails;
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;

export default function CreateNewDesignTab() {
  const colorScheme = useDeviceColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);

  const REGION = "us-east-2";
  const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36";
  const BUCKET = "muse-app-uploads";

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [placementFiles, setPlacementFiles] = useState<Record<string, string>>({});
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"categories" | "products" | "variants" | "viewFinalDesign" | "placements" | "design">("categories");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [mockupImages, setMockupImages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { userId, printfulApiKey, currentStoreId } = useUser();
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
  const [selectedImageUrlForZoom, setSelectedImageUrlForZoom] = useState<string | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

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
    if (params.savedDesignUri) {
      resetFlow();
      setPreloadedDesignUri(params.savedDesignUri);
      router.setParams({ savedDesignUri: '' });
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
    if (["categories", "products", "variants"].includes(currentView)) {
      setCurrentStep(1);
    } else if (["placements", "design"].includes(currentView)) {
      setCurrentStep(2);
    } else if (currentView === "viewFinalDesign") {
      setCurrentStep(3);
    }
  }, [currentView]);

  useEffect(() => {
    fetchCategories();
    requestPermissions();
  }, []);

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

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://api.printful.com/categories", {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const data: CategoriesResponse = await response.json();
      if (data.code === 200) {
        setCategories(data.result.categories);
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
        setCurrentView("products");
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
    const subcategories = categories.filter((c) => c.parent_id === category.id);
    if (subcategories.length > 0) return;
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
          const cheapestVariant = data.result.variants.reduce((cheapest, current) =>
            parseFloat(current.price) < parseFloat(cheapest.price) ? current : cheapest
          );
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
    setLoading(true);
    if (!uploadedImages.left) {
      Alert.alert("Missing Images", "Please upload at least one image first.");
      setLoading(false);
      return;
    }

    try {
      const getLocalUri = async (uri: string | null): Promise<string | null> => {
        if (!uri) return null;
        if (uri.startsWith('http')) {
          const tempUri = FileSystem.cacheDirectory + uuidv4() + '.png';
          await FileSystem.downloadAsync(uri, tempUri);
          return tempUri;
        }
        return uri;
      };

      const localUri1 = await getLocalUri(uploadedImages.left);
      const localUri2 = await getLocalUri(uploadedImages.right);

      if (!localUri1) {
        throw new Error("First image is missing or could not be processed.");
      }
      
      const usingSecond = !!localUri2;
      const client = new DynamoDBClient({
        region: REGION,
        credentials: fromCognitoIdentityPool({ clientConfig: { region: REGION }, identityPoolId: IDENTITY_POOL_ID }),
      });
      
      const userResult = await client.send(
        new GetItemCommand({ TableName: "MuseUsers", Key: { userId: { S: userId ?? "" } } })
      );
      const selectedMuseId = userResult.Item?.selectedMuseId?.S;
      
      let museString = "";
      if (selectedMuseId) {
        const museResult = await client.send(
          new GetItemCommand({ TableName: "Muse", Key: { museID: { S: selectedMuseId } } })
        );
        museString = museResult.Item?.Description?.S || "";
        console.log("Muse String: ", museString);
      }
      
      const tempMuseString = usingSecond
        ? `Take the first image and the second image, merge them into one cohesive image that makes sense. I want you to make the whole image theme based off of this description: ${museString}`
        : `Use the first image to generate an appealing, well-composed design based on the image provided. I want you to make the whole image theme based off of this description: ${museString}`;

      const Gemini_API_KEY = "AIzaSyBNbBd8yqnOTSM5C3bt56hgN_5X8OmMorY";
      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";

      const img1Base64 = await FileSystem.readAsStringAsync(localUri1, { encoding: "base64" });
      let img2Base64: string | null = null;
      if (localUri2) {
        img2Base64 = await FileSystem.readAsStringAsync(localUri2, { encoding: "base64" });
      }

      const parts: any[] = [{ inline_data: { mime_type: "image/png", data: img1Base64 } }];
      if (img2Base64) {
        parts.push({ inline_data: { mime_type: "image/png", data: img2Base64 } });
      }
      parts.push({ text: tempMuseString });

      const body = JSON.stringify({ contents: [{ parts }] });
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "x-goog-api-key": Gemini_API_KEY, "Content-Type": "application/json" },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API HTTP error:", response.status, errorText);
        throw new Error(`Gemini API request failed: ${response.status}`);
      }

      const data = await response.json();
      const base64Image = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Image) {
        throw new Error("No image data returned from Gemini API.");
      }

      const combinedImageUri = `data:image/png;base64,${base64Image}`;
      setGeneratedImage(combinedImageUri);

    } catch (err: any) {
      console.error("Error generating combined image:", err);
      Alert.alert("Error", "Failed to generate combined image. " + (err?.message || ""));
    } finally {
      setLoading(false);
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
        title: `${selectedProduct?.title || 'Custom Design'}`, 
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
    if (!generatedImage) {
      Alert.alert("No Design", "Please generate an initial design first.");
      return;
    }
    if (!prompt) {
      Alert.alert("No Prompt", "Please enter a prompt to remix the image.");
      return;
    }
    setLoading(true);

    try {
      const base64Image = generatedImage.replace(/^data:image\/\w+;base64,/, "");
      const Gemini_API_KEY = "AIzaSyBNbBd8yqnOTSM5C3bt56hgN_5X8OmMorY";
      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";
      const parts: any[] = [{ inline_data: { mime_type: "image/png", data: base64Image } }, { text: prompt }];
      const body = JSON.stringify({ contents: [{ parts }] });
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "x-goog-api-key": Gemini_API_KEY, "Content-Type": "application/json" },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API HTTP error:", response.status, errorText);
        Alert.alert("Error", `Gemini API request failed: ${response.status}`);
        setLoading(false);
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
      setLoading(false);
    }
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadedImages((prev) => {
          if (!prev.left) return { ...prev, left: result.assets[0].uri };
          if (!prev.right) return { ...prev, right: result.assets[0].uri };
          return prev;
        });
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to open photo library.");
    }
  };

  const takePhoto = async () => {
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadedImages((prev) => {
          if (!prev.left) return { ...prev, left: result.assets[0].uri };
          if (!prev.right) return { ...prev, right: result.assets[0].uri };
          return prev;
        });
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

  const handleBackToCategories = () => {
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

    setLoading(true);
    try {
      let base64Data;
      if (generatedImage.startsWith('data:')) {
        base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
      } else if (generatedImage.startsWith('http')) {
        const tempLocalUri = FileSystem.cacheDirectory + uuidv4() + '.png';
        await FileSystem.downloadAsync(generatedImage, tempLocalUri);
        base64Data = await FileSystem.readAsStringAsync(tempLocalUri, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.deleteAsync(tempLocalUri);
      } else {
        base64Data = await FileSystem.readAsStringAsync(generatedImage, { encoding: FileSystem.EncodingType.Base64 });
      }
      
      const buffer = Buffer.from(base64Data, "base64");
      const s3Client = new S3Client({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          client: new CognitoIdentityClient({ region: REGION }),
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });

      const timestamp = Date.now();
      const key = `${userId}/tempUpload/tempImage_${timestamp}.png`;
      await s3Client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: "image/png" }));
      const imageUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}?t=${timestamp}`;

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
          setLoading(false);
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
      setLoading(false);
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

  const ProgressBar = () => {
    const steps = ["Product", "Design", "Final"];
    return (
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack} />
        <Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 2], outputRange: ["0%", "100%"] }) }]}>
          <LinearGradient colors={[theme.progressLine, "#29e668ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 4 }} />
        </Animated.View>
        <View style={styles.stepsRow}>
          {steps.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            const isCompleted = currentStep > stepNumber;
            return (
              <View key={index} style={styles.stepContainer}>
                <View style={[styles.stepCircle, isActive && styles.stepCircleActive, isCompleted && styles.stepCircleCompleted]}>
                  <Text style={styles.stepText}>{isCompleted ? "✓" : stepNumber}</Text>
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCurrentView = () => {
    if (loading && currentView === 'categories') {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategories}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentView === "viewFinalDesign") {
      return (
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToDesign} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>DESIGN RESULTS</Text>
          </View>
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
            ) : <View style={styles.noMockupContainer}><Text style={styles.noMockupText}>No mockups available</Text></View>}
            <TextInput style={styles.input} placeholder="Type adjustments for a remix..." placeholderTextColor={theme.secondaryText} value={prompt} onChangeText={setPrompt} />
            <View style={styles.finalDesignButtonRow}>
              <TouchableOpacity style={styles.designControlButton} onPress={async () => { if (!mockupUrls || mockupUrls.length === 0) { Alert.alert("Error", "No mockups to add."); return; } await addToStore(mockupUrls); }}>
                <Text style={styles.designControlButtonText}>ADD TO STORE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.designControlButton} onPress={handleRemix}>
                <Text style={styles.designControlButtonText}>REMIX</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.finalDesignButtonRow}>
              <TouchableOpacity style={styles.designControlButton} onPress={handleSaveDesign} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={theme.text} /> : <Text style={styles.designControlButtonText}>SAVE DESIGN</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.designControlButton} onPress={() => Alert.alert("Action", "Photoshoot coming soon...")}>
                <Text style={styles.designControlButtonText}>PHOTOSHOOT</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.tint} /><Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </View>
      );
    }

    if (currentView === "design") {
      return (
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToPlacements} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>Add Your Inspo</Text>
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.designContent} showsVerticalScrollIndicator={false}>
            <View style={styles.uploadButtonsContainer}>
              <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                <Text style={styles.uploadButtonText}>📷 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Text style={styles.uploadButtonText}>📁 Choose Photo</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.imagePreviewContainer}>
              <View style={styles.imagePreviewBox}>
                {uploadedImages.left ? (
                  <View style={styles.imageWithDelete}>
                    <Image source={{ uri: uploadedImages.left }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteImage("left")}>
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ) : <View style={styles.emptyImageBox}><Text style={styles.emptyImageText}>Image 1</Text></View>}
              </View>
              <View style={styles.imagePreviewBox}>
                {uploadedImages.right ? (
                  <View style={styles.imageWithDelete}>
                    <Image source={{ uri: uploadedImages.right }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteImage("right")}>
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ) : <View style={styles.emptyImageBox}><Text style={styles.emptyImageText}>Image 2</Text></View>}
              </View>
            </View>
            {generatedImage && (
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
                  <TouchableOpacity style={styles.designControlButton} onPress={handleRemix}>
                    <Text style={styles.designControlButtonText}>Remix</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.designControlButtonPrimary} onPress={putImageOnItem}>
                    <Text style={styles.designControlButtonPrimaryText}>Apply to Item</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {!generatedImage && (
              <TouchableOpacity onPress={GenerateFinalDesign} style={styles.finalGenerateButton}>
                <Text style={styles.finalGenerateButtonText}>Generate Design</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      );
    }

    if (currentView === "placements") {
      return (
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToVariants} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>Select Placements</Text>
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.placementsContainer}>
              {placementFiles && Object.keys(placementFiles).length > 0 ? (
                Object.entries(placementFiles).map(([key, value]) => (
                    <TouchableOpacity key={key} style={[styles.placementCard, selectedPlacements.includes(key) && styles.placementCardSelected]} onPress={() => handlePlacementToggle(key)}>
                        <View style={styles.placementHeader}>
                            <Text style={styles.placementTitle}>{value}</Text>
                            <View style={[styles.checkbox, selectedPlacements.includes(key) && styles.checkboxSelected]}>
                                {selectedPlacements.includes(key) && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
              ) : <Text style={styles.noPlacementsText}>No placement options available</Text>}
            </View>
            {selectedPlacements.length > 0 && (
              <View style={styles.selectionSummary}>
                <Text style={styles.selectionSummaryText}>{selectedPlacements.length} placement{selectedPlacements.length !== 1 ? "s" : ""} selected</Text>
                <TouchableOpacity style={styles.generateButton} onPress={handleGenerateDesign}>
                  <Text style={styles.generateButtonText}>Go to Design</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
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
          <View style={styles.variantHeader}>
            <TouchableOpacity onPress={handleBackToProducts} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerText} numberOfLines={1}>{product.title}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Image source={{ uri: selectedColor ? selectedColor.image : product.image }} style={styles.mainProductImageNew} />
            <View style={styles.detailsContainer}>
              <Text style={styles.productTitleNew}>{product.title}</Text>
              <Text style={styles.productPriceNew}>${selectedColor?.price || variants[0].price}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScrollView}>
                {uniqueColors.map((variant) => (
                  <View key={variant.id} style={styles.colorSelectorContainer}>
                    <TouchableOpacity onPress={() => handleColorSelect(variant)} style={[styles.colorThumbnail, selectedColor?.color === variant.color && styles.colorThumbnailSelected]}>
                      <Image source={{ uri: variant.image }} style={styles.colorThumbnailImage} />
                    </TouchableOpacity>
                    <Text style={styles.colorNameText} numberOfLines={1}>{variant.color}</Text>
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
          </ScrollView>
          <View style={styles.bottomBar}>
            <TouchableOpacity style={[styles.confirmButton, !selectedVariant && styles.disabledButton]} onPress={() => handleVariantSelect(selectedVariant!)} disabled={!selectedVariant}>
              <Text style={styles.confirmButtonText}>Confirm Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (currentView === "products") {
      const filteredProducts = products.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
      return (
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToCategories} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>{selectedCategory?.title}</Text>
          </View>
          <View style={styles.searchContainer}>
            <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={theme.secondaryText} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.gridContainer}>{filteredProducts.map((product) => (
                <TouchableOpacity key={product.id} style={styles.productCard} onPress={() => handleProductSelect(product)}>
                    <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
                    <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
                    <Text style={styles.productBrand}>{product.brand}</Text>
                    <Text style={styles.productVariants}>{product.variant_count} variants</Text>
                </TouchableOpacity>
            ))}</View>
          </ScrollView>
        </View>
      );
    }

    // Default: Categories view
    const parentCategories = categories.filter((c) => c.parent_id === 0);
    const subcategories = selectedCategory ? categories.filter((c) => c.parent_id === selectedCategory.id) : [];
    const displayedCategories = (subcategories.length > 0 ? subcategories : parentCategories).filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          {selectedCategory && (
            <TouchableOpacity onPress={handleBackToCategories} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerText}>{selectedCategory ? selectedCategory.title : "Choose a Category"}</Text>
        </View>
        <View style={styles.searchContainer}>
          <TextInput style={styles.searchInput} placeholder="Search categories..." placeholderTextColor={theme.secondaryText} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>{displayedCategories.map((category) => (
            <TouchableOpacity key={category.id} style={styles.categoryCard} onPress={() => handleCategorySelect(category)}>
                <Image source={{ uri: category.image_url }} style={styles.categoryImage} resizeMode="cover" />
                <Text style={styles.categoryTitle} numberOfLines={2}>{category.title}</Text>
            </TouchableOpacity>
          ))}</View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ProgressBar />
      {renderCurrentView()}
      <Modal transparent={true} visible={!!selectedImageUrlForZoom} onRequestClose={() => setSelectedImageUrlForZoom(null)}>
        <View style={styles.modalContainer}>
          {selectedImageUrlForZoom && (
            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "timing", duration: 250 }} style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
              {/* @ts-ignore */}
              <ImageZoom cropWidth={width} cropHeight={Dimensions.get("window").height} imageWidth={width} imageHeight={Dimensions.get("window").height * 0.9} minScale={1} maxScale={4} enableCenterFocus useNativeDriver doubleClickInterval={250}>
                <Image source={{ uri: selectedImageUrlForZoom }} style={{ width: width, height: Dimensions.get("window").height * 0.9, resizeMode: "contain" }} />
              </ImageZoom>
            </MotiView>
          )}
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedImageUrlForZoom(null)}>
            <Text style={styles.modalCloseButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 0, paddingBottom: 40 },
    headerContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: theme.background },
    variantHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.background, borderBottomWidth: 1, borderColor: theme.tabIconDefault },
    backButton: { padding: 5, marginRight: 15 },
    backButtonText: { fontSize: 18, color: theme.tint, fontWeight: "600" },
    headerText: { fontSize: 22, fontWeight: "bold", color: theme.text, flex: 1, textAlign: "center", marginRight: 40 },
    searchContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    searchInput: { height: 44, backgroundColor: theme.card, borderRadius: 8, paddingHorizontal: 15, fontSize: 16, borderWidth: 1, borderColor: theme.tabIconDefault, color: theme.text },
    gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    categoryCard: { width: CARD_WIDTH, backgroundColor: theme.card, borderRadius: 16, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: theme.tabIconDefault },
    categoryImage: { width: "100%", height: CARD_WIDTH * 0.8, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: theme.tabIconDefault },
    categoryTitle: { fontSize: 14, fontWeight: "600", color: theme.text, textAlign: "center", padding: 12 },
    productCard: { width: CARD_WIDTH, backgroundColor: theme.card, borderRadius: 16, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: theme.tabIconDefault, paddingBottom: 12 },
    productImage: { width: "100%", height: CARD_WIDTH * 0.8, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: theme.tabIconDefault },
    productTitle: { fontSize: 14, fontWeight: "600", color: theme.text, paddingHorizontal: 12, paddingTop: 12 },
    productBrand: { fontSize: 12, color: theme.secondaryText, paddingHorizontal: 12, paddingTop: 4 },
    productVariants: { fontSize: 11, color: theme.secondaryText, paddingHorizontal: 12, paddingTop: 2 },
    placementCard: { backgroundColor: theme.card, borderRadius: 12, marginBottom: 15, padding: 16, borderWidth: 2, borderColor: theme.tabIconDefault },
    placementCardSelected: { borderColor: theme.tint, backgroundColor: theme.headerChip },
    placementHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    placementTitle: { fontSize: 16, fontWeight: "600", color: theme.text },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: theme.tabIconDefault, justifyContent: "center", alignItems: "center" },
    checkboxSelected: { backgroundColor: theme.tint, borderColor: theme.tint },
    checkmark: { color: theme.background, fontSize: 14, fontWeight: "bold" },
    noPlacementsText: { fontSize: 16, color: theme.secondaryText, textAlign: "center", marginTop: 40 },
    selectionSummary: { padding: 16, marginTop: 10 },
    selectionSummaryText: { color: theme.text, fontSize: 16, fontWeight: "600", textAlign: "center", marginBottom: 16 },
    generateButton: { backgroundColor: theme.tint, paddingVertical: 16, borderRadius: 12, alignItems: "center", shadowColor: theme.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    generateButtonText: { color: theme.background, fontSize: 16, fontWeight: "bold" },
    designContent: { paddingHorizontal: 20, paddingBottom: 20 },
    uploadButtonsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30, gap: 15 },
    uploadButton: { flex: 1, backgroundColor: theme.card, paddingVertical: 20, paddingHorizontal: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 80, borderWidth: 1, borderColor: theme.tabIconDefault },
    uploadButtonText: { color: theme.tint, fontSize: 16, fontWeight: "600", textAlign: "center" },
    imagePreviewContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30, gap: 15 },
    imagePreviewBox: { flex: 1, aspectRatio: 1, backgroundColor: theme.card, borderRadius: 12, borderWidth: 2, borderColor: theme.tabIconDefault, borderStyle: "dashed", position: "relative" },
    imageWithDelete: { width: "100%", height: "100%" },
    previewImage: { width: "100%", height: "100%", borderRadius: 10 },
    deleteButton: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(45, 55, 72, 0.7)", borderRadius: 15, width: 30, height: 30, alignItems: "center", justifyContent: "center" },
    deleteButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold", lineHeight: 20 },
    emptyImageBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyImageText: { color: theme.secondaryText, fontSize: 14 },
    finalGenerateButton: { backgroundColor: theme.tint, paddingVertical: 16, borderRadius: 12, alignItems: "center", shadowColor: theme.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    finalGenerateButtonText: { color: theme.background, fontSize: 18, fontWeight: "bold" },
    progressWrapper: { marginHorizontal: 25, marginVertical: Platform.OS === "android" ? 15 : -15, height: 80, justifyContent: "flex-start", paddingTop: Platform.OS === "android" ? 40 : 10 },
    progressTrack: { position: "absolute", top: Platform.OS === "android" ? 65 : 35, height: 6, width: "100%", backgroundColor: theme.tabIconDefault, borderRadius: 3 },
    progressFill: { position: "absolute", top: Platform.OS === "android" ? 65 : 35, height: 6, borderRadius: 3, overflow: "hidden" },
    stepsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    stepContainer: { alignItems: "center", width: 70 },
    stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.card, borderWidth: 2, borderColor: theme.tabIconDefault, justifyContent: "center", alignItems: "center" },
    stepCircleActive: { borderColor: theme.activebar, backgroundColor: theme.activebar },
    stepCircleCompleted: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
    stepText: { color: theme.text, fontWeight: "600" },
    stepLabel: { marginTop: 2, fontSize: 12, fontWeight: "500", color: theme.tabIconDefault, textAlign: "center" },
    stepLabelActive: { color: theme.text, fontWeight: "bold" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background },
    loadingText: { marginTop: 10, fontSize: 16, color: theme.secondaryText },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background, paddingHorizontal: 20 },
    errorText: { fontSize: 16, color: "#F44336", textAlign: "center", marginBottom: 20 },
    retryButton: { backgroundColor: theme.tint, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryButtonText: { color: theme.background, fontSize: 16, fontWeight: "600" },
    finalDesignContent: { alignItems: "center", padding: 20, paddingBottom: 40 },
    finalDesignProductText: { fontSize: 16, color: theme.secondaryText, marginBottom: 20, textAlign: "center" },
    input: { backgroundColor: theme.card, width: "100%", padding: 15, borderRadius: 12, marginBottom: 20, color: theme.text, borderWidth: 1, borderColor: theme.tabIconDefault },
    finalDesignButtonRow: { flexDirection: "row", width: "100%", justifyContent: "space-between", marginBottom: 15 },
    designControlButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center", backgroundColor: theme.card, borderWidth: 1, borderColor: theme.tabIconDefault, marginHorizontal: 5, shadowColor: theme.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    designControlButtonText: { color: theme.text, fontSize: 14, fontWeight: "bold" },
    loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: "center", alignItems: "center" },
    mockupContainer: { marginBottom: 30, width: "100%" },
    mockupTitle: { fontSize: 18, fontWeight: "600", color: theme.text, textAlign: "center", marginBottom: 15 },
    mockupScrollView: { maxHeight: 300 },
    mockupScrollContent: { paddingHorizontal: 10, alignItems: 'center' },
    mockupImageContainer: { marginRight: 15, alignItems: "center", backgroundColor: theme.card, borderRadius: 12, padding: 10, shadowColor: theme.text, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, minWidth: 200 },
    mockupImage: { width: 180, height: 200, borderRadius: 8, backgroundColor: theme.background },
    mockupImageLabel: { fontSize: 12, color: theme.secondaryText, marginTop: 8, textAlign: "center" },
    noMockupContainer: { alignItems: "center", padding: 20, backgroundColor: theme.card, borderRadius: 12, marginBottom: 20 },
    noMockupText: { fontSize: 16, color: theme.secondaryText, textAlign: "center" },
    generatedDesignContainer: { marginTop: 30, marginBottom: 30, alignItems: "center", backgroundColor: theme.card, borderRadius: 16, padding: 24, shadowColor: theme.text, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, width: "100%", maxWidth: 400, alignSelf: "center", position: "relative" },
    deleteGeneratedButton: { position: "absolute", top: 10, right: 10, backgroundColor: "rgba(45, 55, 72, 0.7)", borderRadius: 15, width: 30, height: 30, alignItems: "center", justifyContent: "center", zIndex: 2 },
    deleteGeneratedButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold", lineHeight: 20 },
    generatedDesignTitle: { fontSize: 18, fontWeight: "600", color: theme.text, marginBottom: 16, textAlign: "center" },
    generatedDesignImage: { width: 260, height: 260, borderRadius: 14, marginBottom: 18, backgroundColor: theme.background, resizeMode: "contain", alignSelf: "center" },
    mainProductImageNew: { width: "100%", aspectRatio: 1, resizeMode: "contain", backgroundColor: "#FFFFFF" },
    detailsContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 150 },
    productTitleNew: { fontSize: 24, fontWeight: "bold", color: theme.text, marginBottom: 4 },
    productPriceNew: { fontSize: 20, fontWeight: "600", color: theme.text, marginBottom: 20 },
    colorScrollView: { marginBottom: 25 },
    colorThumbnail: { width: 64, height: 64, borderRadius: 8, borderWidth: 2, borderColor: "transparent", overflow: "hidden" },
    colorThumbnailSelected: { borderColor: theme.tint },
    colorThumbnailImage: { width: "100%", height: "100%" },
    colorSelectorContainer: { alignItems: "center", marginRight: 12 },
    colorNameText: { marginTop: 6, fontSize: 12, fontWeight: "500", color: theme.secondaryText, maxWidth: 64, textAlign: "center" },
    sizeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
    selectionTitle: { fontSize: 18, fontWeight: "600", color: theme.text, marginBottom: 12 },
    sizeGuideLink: { fontSize: 16, color: theme.secondaryText },
    sizeButtonContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    sizeButtonNew: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: theme.background, borderRadius: 8, borderWidth: 1.5, borderColor: theme.tabIconDefault, minWidth: 60, alignItems: "center", marginBottom: 10 },
    sizeButtonNewSelected: { backgroundColor: theme.text, borderColor: theme.text },
    sizeButtonTextNew: { fontSize: 16, fontWeight: "600", color: theme.text },
    sizeButtonTextNewSelected: { color: theme.background },
    bottomBar: { position: "absolute", bottom: 75, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: "transparent" },
    confirmButton: { backgroundColor: theme.tint, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
    confirmButtonText: { color: theme.background, fontSize: 18, fontWeight: "bold" },
    disabledButton: { backgroundColor: theme.tabIconDefault },
    modalContainer: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.9)", justifyContent: "center", alignItems: "center" },
    modalCloseButton: { position: "absolute", top: 50, right: 20, backgroundColor: "rgba(255, 255, 255, 0.2)", borderRadius: 20, width: 40, height: 40, justifyContent: "center", alignItems: "center", zIndex: 10 },
    modalCloseButtonText: { color: "white", fontSize: 28, lineHeight: 30 },
    designActionRow: { flexDirection: "row", width: "100%", justifyContent: "space-between", marginTop: 10 },
    designControlButtonPrimary: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center", backgroundColor: theme.tint, marginHorizontal: 5, shadowColor: theme.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    designControlButtonPrimaryText: { color: theme.background, fontSize: 14, fontWeight: "bold" },
});