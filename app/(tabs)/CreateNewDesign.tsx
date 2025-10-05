import React, { useState, useEffect, useRef } from "react";
import { Button, SafeAreaView, TextInput, useColorScheme as useDeviceColorScheme, Animated } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { captureRef } from "react-native-view-shot";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/Colors"; // Import the Colors constant
import { useUser } from "../UserContext";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { Buffer } from "buffer";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FILE } from "dns";
import { LinearGradient } from "expo-linear-gradient";
import { Platform } from "react-native";

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
  availability_status: Array<{
    region: string;
    status: string;
  }>;
  material: Array<{
    name: string;
    percentage: number;
  }>;
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
  result: {
    categories: Category[];
  };
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
  const [uploadedImages, setUploadedImages] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null,
  });
  interface PrintfulFile {
    type: string;
    url: string;
    placement: string;
    filename: string;
    visible: boolean;
  }

  // In your component
  const filesRef = useRef<PrintfulFile[]>([]);
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
  // State for the prompt used in the final design/remix step
  const [prompt, setPrompt] = useState("");

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progress, {
      toValue: currentStep - 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    // Update current step based on currentView
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
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
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

  const getImageUrl = async (userId: string) => {
    const s3Client = new S3Client({
      region: REGION,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: REGION },
        identityPoolId: IDENTITY_POOL_ID,
      }),
    });

    const key = `${userId}/tempUpload/tempImage.png`;

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    // URL expires in 5 minutes
    return await getSignedUrl(s3Client, command, { expiresIn: 300 });
  };

  const fetchProducts = async (categoryId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.printful.com/products?category_id=${categoryId}`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
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
    if (subcategories.length > 0) {
      return;
    }
    fetchProducts(category.id);
  };

  const fetchProductDetails = async (productId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.printful.com/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });
      const data: ProductDetailsResponse = await response.json();
      if (data.code === 200) {
        setProductDetails(data.result);
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

  async function getStoreId() {
    return currentStoreId;
  }

  const fetchPlacementFiles = async (productId: number) => {
    try {
      const storeId = await getStoreId();
      setLoading(true);
      const response = await fetch(`https://api.printful.com/mockup-generator/printfiles/${productId}?store_id=${storeId}`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
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

  // The original image merging view is kept here, but the function below mocks the final step.
  const mergeRef = useRef<View>(null);

  const GenerateFinalDesign = async () => {
    setLoading(true);
    const usingSecond = !!uploadedImages.right;
    const tempMuseString = usingSecond
      ? "Take the first image and the second image, merge them into one cohesive image that makes sense."
      : "Use the first image to generate an appealing, well-composed design based on the image provided.";

    if (!uploadedImages.left) {
      Alert.alert("Missing Images", "Please upload at least one image first.");
      return;
    }

    try {

      const Gemini_API_KEY = "AIzaSyBNbBd8yqnOTSM5C3bt56hgN_5X8OmMorY";
      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";

      // Convert images to base64
      const img1Base64 = await FileSystem.readAsStringAsync(uploadedImages.left, {
        encoding: "base64",
      });

      let img2Base64: string | null = null;
      if (usingSecond && uploadedImages.right) {
        img2Base64 = await FileSystem.readAsStringAsync(uploadedImages.right, {
          encoding: "base64",
        });
      }

      // Build request body like curl
      const parts: any[] = [
        {
          inline_data: {
            mime_type: "image/png",
            data: img1Base64,
          },
        },
      ];

      if (img2Base64) {
        parts.push({
          inline_data: {
            mime_type: "image/png",
            data: img2Base64,
          },
        });
      }

      parts.push({ text: tempMuseString });

      const body = JSON.stringify({
        contents: [{ parts }],
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-goog-api-key": Gemini_API_KEY,
          "Content-Type": "application/json",
        },
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

      const base64Image = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      const fileUri = FileSystem.documentDirectory + "finalDesign.png";
      await FileSystem.writeAsStringAsync(fileUri, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const combinedImageUri = `data:image/png;base64,${base64Image}`;
      setGeneratedImage(combinedImageUri);
      setLoading(false);
      //setCurrentView("viewFinalDesign");
    } catch (err: any) {
      console.error("Error generating combined image:", err);
      setLoading(false);
      Alert.alert("Error", "Failed to generate combined image. " + (err?.message || ""));
    }
    setLoading(false);
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

      const parts: any[] = [
        {
          inline_data: {
            mime_type: "image/png",
            data: base64Image,
          },
        },
        { text: prompt },
      ];

      const body = JSON.stringify({
        contents: [{ parts }],
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-goog-api-key": Gemini_API_KEY,
          "Content-Type": "application/json",
        },
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
      // Find the first part with inline_data
      const remixedBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      console.log("Base 64: ", base64Image);

      const remixedImageUri = `data:image/png;base64,${remixedBase64}`;
      setGeneratedImage(remixedImageUri);
      setPrompt(""); // Clear prompt after remixing
    } catch (err: any) {
      console.error("Error remixing image:", err);
      Alert.alert("Error", "Failed to remix image. " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
    setLoading(false);
  };

  const handleGenerateDesign = () => {
    if (selectedPlacements.length === 0) {
      Alert.alert("No Placements Selected", "Please select at least one placement before generating your design.");
      return;
    }

    setCurrentView("design");
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
          if (!prev.left) {
            return { ...prev, left: result.assets[0].uri };
          } else if (!prev.right) {
            return { ...prev, right: result.assets[0].uri };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to open photo library. Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadedImages((prev) => {
          if (!prev.left) {
            return { ...prev, left: result.assets[0].uri };
          } else if (!prev.right) {
            return { ...prev, right: result.assets[0].uri };
          }
          return prev;
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open camera. Please try again.");
    }
  };

  const deleteImage = (position: "left" | "right") => {
    setUploadedImages((prev) => ({
      ...prev,
      [position]: null,
    }));
  };
  const sortSizes = (sizes: string[]): string[] => {
    const sizeOrderMap: { [key: string]: number } = {
      // Define a logical order for standard sizes
      XS: 1,
      S: 2,
      M: 3,
      L: 4,
      XL: 5,
      "2XL": 6,
      XXL: 6, // Treat 2XL and XXL the same
      "3XL": 7,
      XXXL: 7, // Treat 3XL and XXXL the same
      "4XL": 8,
      "5XL": 9,
    };

    return [...sizes].sort((a, b) => {
      const aIsNum = /^\d+$/.test(a);
      const bIsNum = /^\d+$/.test(b);

      // If both are simple numbers (like for shoes or pants), sort them numerically
      if (aIsNum && bIsNum) {
        return parseInt(a, 10) - parseInt(b, 10);
      }

      const aOrder = sizeOrderMap[a.toUpperCase()];
      const bOrder = sizeOrderMap[b.toUpperCase()];

      // If both sizes are in our defined map, use that order
      if (aOrder && bOrder) {
        return aOrder - bOrder;
      }

      // If only one is in our map, it should come first
      if (aOrder) return -1;
      if (bOrder) return 1;

      // For any other sizes not in our map (e.g., "One Size"), sort them alphabetically
      return a.localeCompare(b);
    });
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
    setGeneratedImage(null); // Clear generated image when returning to design step
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

  const ProgressBar = () => {
    const steps = ["Product", "Design", "Final"];

    const circleSize = 32;

    return (
      <View style={styles.progressWrapper}>
        {/* Track line */}
        <View style={styles.progressTrack} />

        {/* Animated gradient progress */}
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 2],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        >
          <LinearGradient colors={[theme.progressLine, "#29e668ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 4 }} />
        </Animated.View>

        {/* Step markers */}
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
  const renderCategoryCard = (category: Category) => (
    <TouchableOpacity key={category.id} style={styles.categoryCard} onPress={() => handleCategorySelect(category)}>
      <Image source={{ uri: category.image_url }} style={styles.categoryImage} resizeMode="cover" />
      <Text style={styles.categoryTitle} numberOfLines={2}>
        {category.title}
      </Text>
    </TouchableOpacity>
  );

  const renderProductCard = (product: Product) => (
    <TouchableOpacity key={product.id} style={styles.productCard} onPress={() => handleProductSelect(product)}>
      <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
      <Text style={styles.productTitle} numberOfLines={2}>
        {product.title}
      </Text>
      <Text style={styles.productBrand}>{product.brand}</Text>
      <Text style={styles.productVariants}>{product.variant_count} variants</Text>
    </TouchableOpacity>
  );

  const renderPlacementCard = (placementKey: string, placementValue: string) => (
    <TouchableOpacity key={placementKey} style={[styles.placementCard, selectedPlacements.includes(placementKey) && styles.placementCardSelected]} onPress={() => handlePlacementToggle(placementKey)}>
      <View style={styles.placementHeader}>
        <Text style={styles.placementTitle}>{placementValue}</Text>
        <View style={[styles.checkbox, selectedPlacements.includes(placementKey) && styles.checkboxSelected]}>
          {selectedPlacements.includes(placementKey) && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Handler to clear generated image
  const deleteGeneratedImage = () => {
    setGeneratedImage(null);
  };

  const putImageOnItem = async () => {
    if (!userId || !generatedImage) {
      console.error("❌ Missing userId or generatedImage");
      return;
    }
  
    if (!selectedProduct?.id || !selectedVariant?.id || !selectedPlacements.length) {
      Alert.alert("Missing Data", "Please make sure you have selected a product, variant, and placement.");
      return;
    }
  
    setLoading(true);
  
    try {
      // 1️⃣ Upload image to S3
      const s3Client = new S3Client({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          client: new CognitoIdentityClient({ region: REGION }),
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });
  
      const timestamp = Date.now();
      const key = `${userId}/tempUpload/tempImage_${timestamp}.png`;
      const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
  
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: "image/png",
        })
      );
  
      const imageUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}?t=${timestamp}`;
      console.log("✅ Uploaded to S3:", imageUrl);
  
      // 2️⃣ Validate uploaded image
      const headCheck = await fetch(imageUrl, { method: "HEAD" });
      if (!headCheck.ok) {
        console.error("❌ Uploaded image not accessible to Printful:", imageUrl);
        Alert.alert("Error", "Image upload failed — URL is not accessible.");
        setLoading(false);
        return;
      }
  
      // 3️⃣ Prepare mockup generation payload
      const storeId = await getStoreId();
      const mockupPayload = {
        variant_ids: [selectedVariant.id],
        format: "jpg",
        files: selectedPlacements.map((placement) => ({
          placement,
          image_url: imageUrl,
          position: {
            area_width: 1800,
            area_height: 2400,
            width: 1800,
            height: 1800,
            top: 300,
            left: 0,
          },
        })),
      };
  
      console.log("📦 Sending payload to Printful:", JSON.stringify(mockupPayload, null, 2));
  
      const mockupResponse = await fetch(
        `https://api.printful.com/mockup-generator/create-task/${selectedProduct.id}?store_id=${storeId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mockupPayload),
        }
      );
  
      if (!mockupResponse.ok) {
        const errorData = await mockupResponse.json();
        console.error("❌ Mockup creation failed:", errorData);
        Alert.alert("Error", errorData.error?.message || "Failed to create mockup.");
        setLoading(false);
        return;
      }
  
      const mockupData = await mockupResponse.json();
      const taskKey = mockupData?.result?.task_key;
  
      if (!taskKey) {
        console.error("❌ No task_key returned from Printful:", mockupData);
        Alert.alert("Error", "Failed to start mockup task.");
        setLoading(false);
        return;
      }
  
      // 4️⃣ Poll for completion
      console.log(`⏳ Polling for mockup completion (task: ${taskKey})`);
      let attempts = 0;
      const maxAttempts = 30;
  
      while (attempts < maxAttempts) {
        await new Promise((res) => setTimeout(res, 1000));
        attempts++;
  
        const statusResponse = await fetch(
          `https://api.printful.com/mockup-generator/task?task_key=${taskKey}&store_id=${storeId}`,
          { headers: { Authorization: `Bearer ${API_KEY}` } }
        );
  
        if (!statusResponse.ok) {
          console.log(`⚠️ Status check failed: ${statusResponse.status}`);
          continue;
        }
  
        const statusData = await statusResponse.json();
        const status = statusData?.result?.status;
  
        if (status === "completed") {
          const mockups = statusData?.result?.mockups || [];
          const seenUrls = new Set<string>();
          const urls: string[] = [];
  
          mockups.forEach((mockup: any, index: number) => {
            // main mockup
            if (mockup.mockup_url && !seenUrls.has(mockup.mockup_url)) {
              urls.push(mockup.mockup_url);
              seenUrls.add(mockup.mockup_url);
            }
  
            // extra mockups
            mockup.extra?.forEach((extra: any) => {
              if (extra.url && !seenUrls.has(extra.url)) {
                urls.push(extra.url);
                seenUrls.add(extra.url);
              }
            });
          });
  
          if (!urls.length) {
            Alert.alert("Error", "No mockup URLs found in Printful response.");
            setLoading(false);
            return;
          }
  
          console.log("✅ Final unique mockup URLs:", urls);
  
          setMockupUrls(urls);
          setMockupImages(urls);
          setCurrentView("viewFinalDesign");
          setLoading(false);
          return;
        }
  
        if (status === "failed") {
          console.error("❌ Mockup generation failed:", statusData);
          Alert.alert("Error", "Mockup generation failed. Please try again.");
          setLoading(false);
          return;
        }
  
        console.log(`Still processing... (${attempts}/${maxAttempts})`);
      }
  
      Alert.alert("Timeout", "Mockup generation is taking longer than expected.");
      setLoading(false);
    } catch (err) {
      console.error("❌ Error in putImageOnItem:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
      setLoading(false);
    }
  };
  
  const addToStore = async (mockupUrls: string[]) => {
    if (!mockupUrls.length) {
      Alert.alert("Error", "No mockup URLs provided.");
      return;
    }
  
    if (!selectedVariant?.id) {
      Alert.alert("Error", "No variant selected for the product.");
      return;
    }
  
    if (!selectedProduct) {
      Alert.alert("Error", "No product selected.");
      return;
    }
  
    try {
      const storeId = await getStoreId();
  
      // 🔧 FIXED: Create files array with correct structure (url + type, NOT image_url + placement)
      const files = selectedPlacements.map((placement, i) => {
        const fileObj: any = {
          url: mockupUrls[i] || mockupUrls[0], // Use corresponding URL or fallback to first
        };
        
        // Add type if it's not the default front placement
        if (placement !== "front" && placement !== "default") {
          fileObj.type = placement;
        }
        
        return fileObj;
      });
  
      let endpoint: string;
      let payload: any;

        // 🆕 Create new product
        if (!selectedProduct.title) {
          Alert.alert("Error", "Product title is required to create a new product.");
          return;
        }
  
        endpoint = `https://api.printful.com/store/products?store_id=${storeId}`;
        
        payload = {
          sync_product: {
            name: selectedProduct.title,
            thumbnail: mockupUrls[0],
          },
          sync_variants: [
            {
              retail_price: "25.00",
              variant_id: selectedVariant.id,
              files,
            }
          ]
        };
        
        console.log("🆕 Creating new product");
      
  
      console.log("📦 Adding to store with payload:", JSON.stringify(payload, null, 2));
  
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Failed to add product to store:", errorData);
        Alert.alert("Error", errorData.error?.message || "Failed to add product to store.");
        return;
      }
  
      const result = await response.json();
      console.log("✅ Product successfully added to store:", result);
      Alert.alert("Success", "Product added to your store!");
    } catch (err) {
      console.error("Error in addToStore:", err);
      Alert.alert("Error", "Something went wrong while adding the product to store.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
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
      <SafeAreaView style={styles.container}>
        <ProgressBar />
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToDesign} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>DESIGN RESULTS</Text>
          </View>

          {/* Step 3: Final Design */}
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.finalDesignContent}>
            <Text style={styles.finalDesignProductText}>
              Selected Product: {selectedProduct?.title} ({selectedColor?.color}, {selectedSize})
            </Text>

            {/* Mockup Images Horizontal Scroll */}
            {mockupImages.length > 0 ? (
              <View style={styles.mockupContainer}>
                <Text style={styles.mockupTitle}>Your Design on Product</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mockupScrollView} contentContainerStyle={styles.mockupScrollContent}>
                  {mockupImages.map((mockupUrl, index) => (
                    <View key={index} style={styles.mockupImageContainer}>
                      <Image source={{ uri: mockupUrl }} style={styles.mockupImage} resizeMode="contain" />
                      <Text style={styles.mockupImageLabel}>View {index + 1}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.noMockupContainer}>
                <Text style={styles.noMockupText}>No mockup images available</Text>
              </View>
            )}

            {/* Input for remix prompt */}
            <TextInput style={styles.input} placeholder="Type your smart adjustments for a remix..." placeholderTextColor={theme.secondaryText} value={prompt} onChangeText={setPrompt} />

            {/* Button Rows */}
            <View style={styles.finalDesignButtonRow}>
              {/* ADD TO STORE - Secondary button, neutral appearance */}
              <TouchableOpacity
                style={styles.designControlButton}
                onPress={async () => {
                  Alert.alert("Action", "Adding to store...");
                  try {
                    if (!mockupUrls || mockupUrls.length === 0) {
                      Alert.alert("Error", "No mockups available to add.");
                      return;
                    }
                    await addToStore(mockupUrls); // call your function here
                  } catch (err) {
                    console.error(err);
                    Alert.alert("Error", "Failed to add product to store.");
                  }
                }}
              >
                <Text style={styles.designControlButtonText}>ADD TO STORE</Text>
              </TouchableOpacity>
              {/* REMIX - Secondary button, neutral appearance */}
              <TouchableOpacity style={styles.designControlButton} onPress={handleRemix}>
                <Text style={styles.designControlButtonText}>REMIX</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.finalDesignButtonRow}>
              {/* SAVE DESIGN - Secondary button, neutral appearance */}
              <TouchableOpacity
                style={styles.designControlButton}
                onPress={() => {
                  Alert.alert("Action", "Saving design...");
                }}
              >
                <Text style={styles.designControlButtonText}>SAVE DESIGN</Text>
              </TouchableOpacity>
              {/* PHOTOSHOOT - Secondary button, neutral appearance */}
              <TouchableOpacity
                style={styles.designControlButton}
                onPress={() => {
                  Alert.alert("Action", "Starting Photoshoot...");
                }}
              >
                <Text style={styles.designControlButtonText}>PHOTOSHOOT</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.tint} />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === "design") {
    return (
      <SafeAreaView style={styles.container}>
        <ProgressBar />
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToPlacements} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>Add Your Inspo</Text>
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.designContent} showsVerticalScrollIndicator={false}>
            <View style={styles.uploadButtonsContainer}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => {
                  takePhoto();
                }}
              >
                <Text style={styles.uploadButtonText}>📷 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => {
                  pickImage();
                }}
              >
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
                ) : (
                  <View style={styles.emptyImageBox}>
                    <Text style={styles.emptyImageText}>Image 1</Text>
                  </View>
                )}
              </View>

              <View style={styles.imagePreviewBox}>
                {uploadedImages.right ? (
                  <View style={styles.imageWithDelete}>
                    <Image source={{ uri: uploadedImages.right }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteImage("right")}>
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyImageBox}>
                    <Text style={styles.emptyImageText}>Image 2</Text>
                  </View>
                )}
              </View>
            </View>
            {/* Show generated image and remix controls below the upload area */}
            {generatedImage && (
              <View
                style={{
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
                }}
              >
                {/* X button in top right */}
                <TouchableOpacity
                  style={{
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
                  }}
                  onPress={deleteGeneratedImage}
                >
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", lineHeight: 20 }}>×</Text>
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: theme.text,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  Generated Design
                </Text>
                <Image
                  source={{ uri: generatedImage }}
                  style={{
                    width: 260,
                    height: 260,
                    borderRadius: 14,
                    marginBottom: 18,
                    backgroundColor: theme.background,
                    resizeMode: "contain",
                    alignSelf: "center",
                  }}
                />
                <TextInput style={styles.input} placeholder="Type your smart adjustments for a remix..." placeholderTextColor={theme.secondaryText} value={prompt} onChangeText={setPrompt} />
                <TouchableOpacity style={[styles.finalGenerateButton, { marginTop: 0 }]} onPress={handleRemix}>
                  <Text style={styles.finalGenerateButtonText}>Remix</Text>
                </TouchableOpacity>
                {/* New Apply button */}
                <TouchableOpacity style={[styles.finalGenerateButton, { marginTop: 16, backgroundColor: theme.tint }]} onPress={putImageOnItem}>
                  <Text style={[styles.finalGenerateButtonText, { color: theme.background }]}>Apply to selected item</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Generate Design Button only if no generated image */}
            {!generatedImage && (
              <TouchableOpacity onPress={GenerateFinalDesign} style={styles.finalGenerateButton}>
                <Text style={styles.finalGenerateButtonText}>Generate Design</Text>
              </TouchableOpacity>
            )}

            {/* Hidden view for capturing two images as one (for the real API call) */}
            <View
              ref={mergeRef}
              collapsable={false}
              style={{
                flexDirection: "row",
                width: 1024,
                height: 512,
                position: "absolute",
                top: -9999,
              }}
            >
              {uploadedImages.left && <Image source={{ uri: uploadedImages.left }} style={{ width: 512, height: 512 }} />}
              {uploadedImages.right && <Image source={{ uri: uploadedImages.right }} style={{ width: 512, height: 512 }} />}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === "placements") {
    return (
      <SafeAreaView style={styles.container}>
        <ProgressBar />
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
                Object.entries(placementFiles).map(([key, value]) => renderPlacementCard(key, value))
              ) : (
                <Text style={styles.noPlacementsText}>No placement options available</Text>
              )}
            </View>
            {selectedPlacements.length > 0 && (
              <View style={styles.selectionSummary}>
                <Text style={styles.selectionSummaryText}>
                  {selectedPlacements.length} placement{selectedPlacements.length !== 1 ? "s" : ""} selected
                </Text>
                {/* This button moves to the design step (Step 2) */}
                <TouchableOpacity style={styles.generateButton} onPress={handleGenerateDesign}>
                  <Text style={styles.generateButtonText}>Go to Design</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === "variants") {
    const { product, variants } = productDetails!;
    const uniqueColors = [...new Map(variants.map((v) => [v.color, v])).values()];

    // MODIFICATION START: Get unique sizes first, then sort them
    const uniqueSizes = selectedColor ? [...new Set(variants.filter((v) => v.color === selectedColor.color).map((v) => v.size))] : [];
    const availableSizes = sortSizes(uniqueSizes);
    // MODIFICATION END

    return (
      <SafeAreaView style={styles.container}>
        <ProgressBar />
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToProducts} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>{product.title}</Text>
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Image source={{ uri: selectedColor ? selectedColor.image : product.image }} style={styles.mainProductImage} />

            <View style={styles.selectionContainer}>
              <Text style={styles.selectionTitle}>
                Color: <Text style={styles.selectionValue}>{selectedColor?.color || "Select a color"}</Text>
              </Text>
              <View style={styles.colorSwatchContainer}>
                {uniqueColors.map((variant) => (
                  <TouchableOpacity key={variant.id} onPress={() => handleColorSelect(variant)} style={[styles.colorSwatch, selectedColor?.color === variant.color && styles.colorSwatchSelected]}>
                    <View style={[styles.colorInner, { backgroundColor: variant.color_code }]} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selectedColor && (
              <View style={styles.selectionContainer}>
                <Text style={styles.selectionTitle}>
                  Size: <Text style={styles.selectionValue}>{selectedSize || "Select a size"}</Text>
                </Text>
                <View style={styles.sizeButtonContainer}>
                  {availableSizes.map(
                    (
                      size // This will now map over the sorted sizes
                    ) => (
                      <TouchableOpacity key={size} onPress={() => handleSizeSelect(size)} style={[styles.sizeButton, selectedSize === size && styles.sizeButtonSelected]}>
                        <Text style={[styles.sizeButtonText, selectedSize === size && styles.sizeButtonTextSelected]}>{size}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            )}

            {selectedVariant && (
              <View style={styles.selectionSummary}>
                <TouchableOpacity style={styles.generateButton} onPress={() => handleVariantSelect(selectedVariant)}>
                  <Text style={styles.generateButtonText}>Confirm Selection</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === "products") {
    const filteredProducts = products.filter((product) => product.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <SafeAreaView style={styles.container}>
        <ProgressBar />
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToCategories} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>{selectedCategory?.title}</Text>
          </View>
          <View style={styles.searchContainer}>
            <TextInput style={styles.searchInput} placeholder="Search for products..." placeholderTextColor={theme.secondaryText} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.gridContainer}>{filteredProducts.map(renderProductCard)}</View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  const parentCategories = categories.filter((c) => c.parent_id === 0);
  const subcategories = selectedCategory ? categories.filter((c) => c.parent_id === selectedCategory.id) : [];
  const displayedCategories = (subcategories.length > 0 ? subcategories : parentCategories).filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar />
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
          <TextInput style={styles.searchInput} placeholder="Search for categories..." placeholderTextColor={theme.secondaryText} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>{displayedCategories.map(renderCategoryCard)}</View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingTop: 0,
      paddingBottom: 40,
    },
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
      backgroundColor: theme.background,
    },
    backButton: {
      marginRight: 15,
      padding: 5,
    },
    backButtonText: {
      fontSize: 18,
      color: theme.tint,
      fontWeight: "600",
    },
    headerText: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.text,
      flex: 1,
      textAlign: "center",
      marginRight: 40,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    searchInput: {
      height: 44,
      backgroundColor: theme.card,
      borderRadius: 8,
      paddingHorizontal: 15,
      fontSize: 16,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
      color: theme.text,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    variantsContainer: {
      paddingBottom: 20,
    },
    placementsContainer: {
      paddingBottom: 20,
    },
    categoryCard: {
      width: CARD_WIDTH,
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
    },
    categoryImage: {
      width: "100%",
      height: CARD_WIDTH * 0.8,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: theme.tabIconDefault,
    },
    categoryTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
      textAlign: "center",
      padding: 12,
    },
    productCard: {
      width: CARD_WIDTH,
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
      paddingBottom: 12,
    },
    productImage: {
      width: "100%",
      height: CARD_WIDTH * 0.8,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: theme.tabIconDefault,
    },
    productTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    productBrand: {
      fontSize: 12,
      color: theme.secondaryText,
      paddingHorizontal: 12,
      paddingTop: 4,
    },
    productVariants: {
      fontSize: 11,
      color: theme.secondaryText,
      paddingHorizontal: 12,
      paddingTop: 2,
    },
    placementCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 15,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.tabIconDefault,
    },
    placementCardSelected: {
      borderColor: theme.tint,
      backgroundColor: theme.headerChip,
    },
    placementHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    placementTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.tabIconDefault,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxSelected: {
      backgroundColor: theme.tint,
      borderColor: theme.tint,
    },
    checkmark: {
      color: theme.background,
      fontSize: 14,
      fontWeight: "bold",
    },
    noPlacementsText: {
      fontSize: 16,
      color: theme.secondaryText,
      textAlign: "center",
      marginTop: 40,
    },
    selectionSummary: {
      padding: 16,
      marginTop: 10,
    },
    selectionSummaryText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 16,
    },
    generateButton: {
      backgroundColor: theme.tint,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: theme.tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    generateButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: "bold",
    },
    designContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    uploadButtonsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 30,
      gap: 15,
    },
    uploadButton: {
      flex: 1,
      backgroundColor: theme.card,
      paddingVertical: 20,
      paddingHorizontal: 15,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 80,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
    },
    uploadButtonText: {
      color: theme.tint,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    imagePreviewContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 30,
      gap: 15,
    },
    imagePreviewBox: {
      flex: 1,
      aspectRatio: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.tabIconDefault,
      borderStyle: "dashed",
      position: "relative",
    },
    imageWithDelete: {
      width: "100%",
      height: "100%",
    },
    previewImage: {
      width: "100%",
      height: "100%",
      borderRadius: 10,
    },
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
    },
    deleteButtonText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "bold",
      lineHeight: 20,
    },
    emptyImageBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyImageText: {
      color: theme.secondaryText,
      fontSize: 14,
    },
    finalGenerateButton: {
      backgroundColor: theme.tint,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: theme.tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    finalGenerateButtonText: {
      color: theme.background,
      fontSize: 18,
      fontWeight: "bold",
    },
    progressWrapper: {
      marginHorizontal: 25,
      marginVertical: Platform.OS === "android" ? 15 : -15,
      height: 80,
      justifyContent: "flex-start",
      paddingTop: Platform.OS === "android" ? 40 : 10, // pushes it down slightly on Android
    },
    progressTrack: {
      position: "absolute",
      top: Platform.OS === "android" ? 65 : 35, // pushes it down slightly on Android
      height: 6,
      width: "100%",
      backgroundColor: theme.tabIconDefault,
      borderRadius: 3,
    },
    progressFill: {
      position: "absolute",
      top: Platform.OS === "android" ? 65 : 35, // pushes it down slightly on Android
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
    },
    stepsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    stepContainer: {
      alignItems: "center",
      width: 70, // ensures spacing for label
    },

    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: theme.tabIconDefault,
      justifyContent: "center",
      alignItems: "center",
    },

    stepCircleActive: {
      borderColor: theme.activebar,
      backgroundColor: theme.activebar,
    },

    stepCircleCompleted: {
      backgroundColor: "#4CAF50",
      borderColor: "#4CAF50",
    },

    stepText: {
      color: theme.text,
      fontWeight: "600",
    },
    stepMarkersContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      position: "absolute",
      bottom: 0,
    },
    stepLabel: {
      marginTop: 2, // Position labels below the bar
      fontSize: 12,
      fontWeight: "500",
      color: theme.tabIconDefault,
      textAlign: "center",
    },
    stepLabelActive: {
      color: theme.text,
      fontWeight: "bold",
    },

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: theme.secondaryText,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 16,
      color: "#F44336",
      textAlign: "center",
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: "600",
    },
    mainProductImage: {
      width: "100%",
      aspectRatio: 1,
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
    },
    selectionContainer: {
      marginBottom: 25,
    },
    selectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 12,
    },
    selectionValue: {
      fontWeight: "normal",
      color: theme.secondaryText,
    },
    colorSwatchContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 15,
    },
    colorSwatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: "transparent",
    },
    colorSwatchSelected: {
      borderColor: theme.tint,
    },
    colorInner: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
    },
    sizeButtonContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    sizeButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: theme.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
    },
    sizeButtonSelected: {
      backgroundColor: theme.tint,
      borderColor: theme.tint,
    },
    sizeButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    sizeButtonTextSelected: {
      color: theme.background,
    },
    // New Styles for Final Design View
    finalDesignContent: {
      flex: 1,
      alignItems: "center",
      padding: 20,
    },
    finalDesignImage: {
      width: 300,
      height: 300,
      borderRadius: 15,
      resizeMode: "contain",
      backgroundColor: theme.card,
      marginBottom: 20,
    },
    finalDesignProductText: {
      fontSize: 16,
      color: theme.secondaryText,
      marginBottom: 20,
      textAlign: "center",
    },
    input: {
      backgroundColor: theme.card,
      width: "100%",
      padding: 15,
      borderRadius: 12,
      marginBottom: 20,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.tabIconDefault,
    },
    finalDesignButtonRow: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
      marginBottom: 15,
    },
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
    },
    designControlButtonText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "bold",
    },
    noImageText: {
      color: theme.secondaryText,
      marginTop: 20,
    },
    loadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      justifyContent: "center",
      alignItems: "center",
      opacity: 0.9,
    },
    // Mockup display styles
    mockupContainer: {
      marginBottom: 30,
      width: "100%",
    },
    mockupTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      textAlign: "center",
      marginBottom: 15,
    },
    mockupScrollView: {
      maxHeight: 300,
    },
    mockupScrollContent: {
      paddingHorizontal: 10,
    },
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
    mockupImage: {
      width: 180,
      height: 200,
      borderRadius: 8,
      backgroundColor: theme.background,
    },
    mockupImageLabel: {
      fontSize: 12,
      color: theme.secondaryText,
      marginTop: 8,
      textAlign: "center",
    },
    noMockupContainer: {
      alignItems: "center",
      padding: 20,
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 20,
    },
    noMockupText: {
      fontSize: 16,
      color: theme.secondaryText,
      textAlign: "center",
    },
  });
