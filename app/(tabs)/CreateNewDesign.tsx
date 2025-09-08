import React, { useState, useEffect, useRef } from "react";
import { Button, SafeAreaView } from 'react-native';
import * as FileSystem from 'expo-file-system';
import OpenAI from "openai";
import { captureRef } from "react-native-view-shot";
import fs from "fs";
import * as ImageManipulator from 'expo-image-manipulator';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  ActivityIndicator,
  Alert
} from "react-native";
import * as ImagePicker from 'expo-image-picker';

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

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;
const API_KEY = "bN327lVKvW0qlqbQqCD7FH2n7erra872HXUKvAVk";

export default function CreateNewDesignTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [placementFiles, setPlacementFiles] = useState<Record<string, string>>({});
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'categories' | 'products' | 'variants' | 'viewFinalDesign' | 'placements' | 'design'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null
  });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api.printful.com/categories', {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const data: CategoriesResponse = await response.json();
      
      if (data.code === 200) {
        setCategories(data.result.categories);
      } else {
        setError('Failed to fetch categories');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (categoryId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.printful.com/products?category_id=${categoryId}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const data: ProductsResponse = await response.json();
      
      if (data.code === 200) {
        setProducts(data.result);
        setCurrentView('products');
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    fetchProducts(category.id);
  };

  const fetchProductDetails = async (productId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.printful.com/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const data: ProductDetailsResponse = await response.json();
      if (data.code === 200) {
        setProductDetails(data.result);
        setCurrentView('variants');
      } else {
        setError('Failed to fetch product details');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching product details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    fetchProductDetails(product.id);
  };

  const handleBackToCategories = () => {
    setCurrentView('categories');
    setSelectedCategory(null);
    setProducts([]);
    setProductDetails(null);
    setSelectedProduct(null);
  };

  async function getStoreId() {
    const resp = await fetch(`https://api.printful.com/stores`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`
      }
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
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      const data: PrintFilesResponse = await response.json();
      if (data.code === 200) {
        setPlacementFiles(data.result.available_placements);
        setCurrentView('placements');
      } else {
        setError('Failed to fetch placement options');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching placement files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);
    fetchPlacementFiles(variant.product_id);
  };

  const handlePlacementToggle = (placementId: string) => {
    setSelectedPlacements(prev =>
      prev.includes(placementId)
        ? prev.filter(id => id !== placementId)
        : [...prev, placementId]
    );
  };


  function MergeImages({ leftUri, rightUri, onMerged }: { leftUri: string, rightUri: string, onMerged: (uri: string) => void }) {
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
    const tempMuseString =
      "I am giving one image file, but there are two images. Your job is to merge the two images into one image."
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
  
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=AIzaSyDG3tSZ_gxwdsuMxNeO5HIiEaVi03oX4nM",
        {
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
        }
      );
  
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
      Alert.alert(
        "No Placements Selected",
        "Please select at least one placement before generating your design."
      );
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
        setUploadedImages(prev => {
          if (!prev.left) {
            return { ...prev, left: result.assets[0].uri };
          } else if (!prev.right) {
            return { ...prev, right: result.assets[0].uri };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });


      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadedImages(prev => {
          if (!prev.left) {
            return { ...prev, left: result.assets[0].uri };
          } else if (!prev.right) {
            return { ...prev, right: result.assets[0].uri };
          }
          return prev;
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const deleteImage = (position: 'left' | 'right') => {
    setUploadedImages(prev => ({
      ...prev,
      [position]: null
    }));
  };

  const handleBackToProducts = () => {
    setCurrentView('products');
    setProductDetails(null);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setPlacementFiles({});
    setSelectedPlacements([]);
  };

  const handleBackToVariants = () => {
    setCurrentView('variants');
    setPlacementFiles({});
    setSelectedPlacements([]);
  };

  const handleBackToPlacements = () => {
    setCurrentView('placements');
    setUploadedImages({ left: null, right: null });
  };

  const handleBackToDesign = () => {
    setCurrentView('design');

  }

  const renderCategoryCard = (category: Category) => (
    <TouchableOpacity 
      key={category.id} 
      style={styles.categoryCard}
      onPress={() => handleCategorySelect(category)}
    >
      <Image 
        source={{ uri: category.image_url }} 
        style={styles.categoryImage}
        resizeMode="cover"
      />
      <Text style={styles.categoryTitle} numberOfLines={2}>
        {category.title}
      </Text>
    </TouchableOpacity>
  );

  const renderProductCard = (product: Product) => (
    <TouchableOpacity 
      key={product.id} 
      style={styles.productCard}
      onPress={() => handleProductSelect(product)}
    >
      <Image 
        source={{ uri: product.image }} 
        style={styles.productImage}
        resizeMode="cover"
      />
      <Text style={styles.productTitle} numberOfLines={2}>
        {product.title}
      </Text>
      <Text style={styles.productBrand}>{product.brand}</Text>
      <Text style={styles.productVariants}>{product.variant_count} variants</Text>
    </TouchableOpacity>
  );

  const renderVariantCard = (variant: Variant) => (
    <TouchableOpacity 
      key={variant.id} 
      style={styles.variantCard}
      onPress={() => handleVariantSelect(variant)}
    >
      <Image 
        source={{ uri: variant.image }} 
        style={styles.variantImage}
        resizeMode="cover"
      />
      <View style={styles.variantInfo}>
        <Text style={styles.variantName} numberOfLines={2}>
          {variant.name}
        </Text>
        <Text style={styles.variantSize}>Size: {variant.size}</Text>
        <Text style={styles.variantColor}>Color: {variant.color}</Text>
        <Text style={styles.variantPrice}>${variant.price}</Text>
        <View style={styles.stockStatus}>
          <View style={[
            styles.stockIndicator, 
            { backgroundColor: variant.in_stock ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={styles.stockText}>
            {variant.in_stock ? 'In Stock' : 'Out of Stock'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPlacementCard = (placementKey: string, placementValue: string) => (
    <TouchableOpacity 
      key={placementKey} 
      style={[
        styles.placementCard,
        selectedPlacements.includes(placementKey) && styles.placementCardSelected
      ]}
      onPress={() => handlePlacementToggle(placementKey)}
    >
      <View style={styles.placementHeader}>
        <Text style={styles.placementTitle}>{placementValue}</Text>
        <View style={[
          styles.checkbox,
          selectedPlacements.includes(placementKey) && styles.checkboxSelected
        ]}>
          {selectedPlacements.includes(placementKey) && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading categories...</Text>
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

  if(currentView === 'viewFinalDesign') {
    return (
        <SafeAreaView style={styles.container}>
          <View style={styles.container}>
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={handleBackToDesign} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerText}>Final Design</Text>
            </View>
      
            {generatedImage ? (
              <Image
                source={{ uri: generatedImage }}
                style={{ width: 300, height: 300, resizeMode: "contain" }}
              />
            ) : (
              <Text style={{ marginTop: 20 }}>No image generated yet</Text>
            )}
          </View>
        </SafeAreaView>
      );
  }

  if (currentView === 'design') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackToPlacements} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>Add Your Inspo</Text>
          </View>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.designContent}
            showsVerticalScrollIndicator={false}
          >
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
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => deleteImage('left')}
                    >
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
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => deleteImage('right')}
                    >
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
  {uploadedImages.left && (
    <Image source={{ uri: uploadedImages.left }} style={{ width: 512, height: 512 }} />
  )}
  {uploadedImages.right && (
    <Image source={{ uri: uploadedImages.right }} style={{ width: 512, height: 512 }} />
  )}
</View>
            
            <TouchableOpacity onPress={GenerateFinalDesign} style={styles.finalGenerateButton}>
              <Text style={styles.finalGenerateButtonText}>Generate Design</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'placements') {
    return (
      <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleBackToVariants} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Select Placements</Text>
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.placementsContainer}>
            {placementFiles && Object.keys(placementFiles).length > 0 ? 
              Object.entries(placementFiles).map(([key, value]) => renderPlacementCard(key, value)) : (
              <Text style={styles.noPlacementsText}>No placement options available</Text>
            )}
          </View>
          {selectedPlacements.length > 0 && (
            <View style={styles.selectionSummary}>
              <Text style={styles.selectionSummaryText}>
                {selectedPlacements.length} placement{selectedPlacements.length !== 1 ? 's' : ''} selected
              </Text>
              <TouchableOpacity 
                style={styles.generateButton}
                onPress={handleGenerateDesign}
              >
                <Text style={styles.generateButtonText}>Generate Design</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'variants') {
    return (
      <SafeAreaView style={styles.container}>  
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleBackToProducts} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>{selectedProduct?.title}</Text>
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.variantsContainer}>
            {productDetails?.variants.map(renderVariantCard)}
          </View>
        </ScrollView>
      </View>
      </SafeAreaView>
    );
  }

  if (currentView === 'products') {
    return (
      <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleBackToCategories} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>{selectedCategory?.title}</Text>
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridContainer}>
            {products.map(renderProductCard)}
          </View>
        </ScrollView>
      </View>
      </SafeAreaView>
    );
  }

 

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.container}>
      <Text style={styles.categoriesHeaderText}>Choose a Category</Text>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {categories.map(renderCategoryCard)}
        </View>
      </ScrollView>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  categoriesHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: CARD_WIDTH * 0.8,
    backgroundColor: '#f0f0f0',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    padding: 12,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH * 0.8,
    backgroundColor: '#f0f0f0',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 12,
    paddingTop: 12,
    lineHeight: 18,
  },
  productBrand: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  productVariants: {
    fontSize: 11,
    color: '#999',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 2,
  },
  variantsContainer: {
    paddingBottom: 20,
  },
  variantCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  variantImage: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  variantInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  variantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    lineHeight: 18,
    marginBottom: 4,
  },
  variantSize: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  variantColor: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  variantPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  stockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stockText: {
    fontSize: 11,
    color: '#666',
  },
  placementsContainer: {
    paddingBottom: 20,
  },
  placementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  placementCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  placementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  placementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  placementType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  placementPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  selectionSummary: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  selectionSummaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noPlacementsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  generateButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  designContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 15,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 15,
  },
  imagePreviewBox: {
    flex: 1,
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    position: 'relative',
  },
  imageWithDelete: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyImageBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImageText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  finalGenerateButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  finalGenerateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});