import React, { useState, useEffect, useRef } from "react";
import { Button, SafeAreaView, TextInput, useColorScheme as useDeviceColorScheme } from "react-native";
import * as FileSystem from "expo-file-system";
import { captureRef } from "react-native-view-shot";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/Colors"; // Import the Colors constant

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
const API_KEY = "bN327lVKvW0qlqbQqCD7FH2n7erra872HXUKvAVk";

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
  const [currentView, setCurrentView] = useState<"categories" | "products" | "variants" | "viewFinalDesign" | "placements" | "design">("categories");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null,
  });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedColor, setSelectedColor] = useState<Variant | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

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
    const resp = await fetch(`https://api.printful.com/stores`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    const data = await resp.json();
    const stores = data.result || [];

    if (stores.length === 0) {
      throw new Error("No stores found for this API key.");
    }

    return stores[0].id;
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

  function MergeImages({ leftUri, rightUri, onMerged }: { leftUri: string; rightUri: string; onMerged: (uri: string) => void }) {
    const mergeRef = useRef<View>(null);

    const doMerge = async () => {
      if (!mergeRef.current) return;
      try {
        const uri = await captureRef(mergeRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });
        onMerged(uri);
      } catch (err) {
        console.error("Error merging images:", err);
      }
    };

    return (
      <>
        <View
          ref={mergeRef}
          style={{
            flexDirection: "row",
            width: 1024,
            height: 512,
            position: "absolute",
            top: -9999,
          }}
        >
          <Image source={{ uri: leftUri }} style={{ width: 512, height: 512 }} />
          <Image source={{ uri: rightUri }} style={{ width: 512, height: 512 }} />
        </View>

        <Button title="Merge Now" onPress={doMerge} />
      </>
    );
  }

  const mergeRef = useRef<View>(null);

  const GenerateFinalDesign = async () => {
    const tempMuseString = "I am giving one image file, but there are two images. Your job is to merge the two images into one image.";
    if (!uploadedImages.left || !uploadedImages.right) {
      Alert.alert("Missing Images", "Please upload both images first.");
      return;
    }

    try {
      if (!mergeRef.current) {
        Alert.alert("Please wait", "The merge view is not ready yet.");
        return;
      }

      const mergedUri = await captureRef(mergeRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      const base64Image = await FileSystem.readAsStringAsync(mergedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=AIzaSyDG3tSZ_gxwdsuMxNeO5HIiEaVi03oX4nM", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: tempMuseString },
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      });

      const data = await response.json();

      let imageBase64: string | null = null;
      const parts = data?.candidates?.[0]?.content?.parts ?? [];

      for (const part of parts) {
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
          break;
        }
      }

      if (!imageBase64) {
        Alert.alert("Error", "Gemini did not return an image.");
        return;
      }

      const fileUri = FileSystem.cacheDirectory + "finalDesign.png";
      await FileSystem.writeAsStringAsync(fileUri, imageBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const combinedImageUri = `data:image/png;base64,${imageBase64}`;
      setGeneratedImage(combinedImageUri);

      setCurrentView("viewFinalDesign");
    } catch (err) {
      console.error("Error generating combined image:", err);
      Alert.alert("Error", "Failed to generate combined image.");
    }
  };

  const handleGenerateDesign = async () => {
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
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToDesign} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>Final Design</Text>
          </View>

          {generatedImage ? <Image source={{ uri: generatedImage }} style={{ width: 300, height: 300, resizeMode: "contain" }} /> : <Text style={{ marginTop: 20 }}>No image generated yet</Text>}
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === "design") {
    return (
      <SafeAreaView style={styles.container}>
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
                    <Text style={styles.emptyImageText}>No image</Text>
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
                    <Text style={styles.emptyImageText}>No image</Text>
                  </View>
                )}
              </View>
            </View>

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

            <TouchableOpacity onPress={GenerateFinalDesign} style={styles.finalGenerateButton}>
              <Text style={styles.finalGenerateButtonText}>Generate Design</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === "placements") {
    return (
      <SafeAreaView style={styles.container}>
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
                <TouchableOpacity style={styles.generateButton} onPress={handleGenerateDesign}>
                  <Text style={styles.generateButtonText}>Generate Design</Text>
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
    const availableSizes = selectedColor ? [...new Set(variants.filter((v) => v.color === selectedColor.color).map((v) => v.size))] : [];

    return (
      <SafeAreaView style={styles.container}>
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
                  {availableSizes.map((size) => (
                    <TouchableOpacity key={size} onPress={() => handleSizeSelect(size)} style={[styles.sizeButton, selectedSize === size && styles.sizeButtonSelected]}>
                      <Text style={[styles.sizeButtonText, selectedSize === size && styles.sizeButtonTextSelected]}>{size}</Text>
                    </TouchableOpacity>
                  ))}
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
  });
