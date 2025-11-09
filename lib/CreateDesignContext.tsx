import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { Category, Product, Variant, ProductDetails, Muse, DesignView } from '@/lib/types/printful';
import {ScrollView,} from 'react-native';

type CreateDesignState = {
  categories: Category[];
  setCategories: (c: Category[]) => void;
  products: Product[];
  setProducts: (p: Product[]) => void;
  productDetails: ProductDetails | null;
  setProductDetails: (pd: ProductDetails | null) => void;
  placementFiles: Record<string, string>;
  setPlacementFiles: (pf: Record<string, string>) => void;
  selectedPlacements: string[];
  setSelectedPlacements: (sp: string[]) => void;
  selectedCategory: Category | null;
  setSelectedCategory: (c: Category | null) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  selectedVariant: Variant | null;
  setSelectedVariant: (v: Variant | null) => void;
  selectedColor: Variant | null;
  setSelectedColor: (v: Variant | null) => void;
  selectedSize: string | null;
  setSelectedSize: (s: string | null) => void;
  uploadedImages: { left: string | null; right: string | null };
  setUploadedImages: (imgs: { left: string | null; right: string | null }) => void;
  generatedImage: string | null;
  setGeneratedImage: (img: string | null) => void;
  mockupImages: string[];
  setMockupImages: (imgs: string[]) => void;
  mockupUrls: string[];
  setMockupUrls: (urls: string[]) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  preloadedDesignUri: string | null;
  setPreloadedDesignUri: (uri: string | null) => void;
  clothesFilter: "men" | "women" | "kids";
  setClothesFilter: (f: "men" | "women" | "kids") => void;
  clothesCategoryIds: { men: number | null; women: number | null; kids: number | null };
  setClothesCategoryIds: (ids: { men: number | null; women: number | null; kids: number | null }) => void;

  // Refs for scrolling
  categoryScrollViewRef: React.RefObject<ScrollView>;
  placementScrollViewRef: React.RefObject<ScrollView>;
  designScrollViewRef: React.RefObject<ScrollView>;
  variantScrollViewRef: React.RefObject<any>;

  // Function to reset the flow
  resetFlow: () => void;
};

// Create the context
const CreateDesignContext = createContext<CreateDesignState | undefined>(undefined);

// Create the provider component
export const CreateDesignProvider = ({ children }: { children: ReactNode }) => {
  // useState hooks 
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [placementFiles, setPlacementFiles] = useState<Record<string, string>>({});
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedColor, setSelectedColor] = useState<Variant | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [mockupImages, setMockupImages] = useState<string[]>([]);
  const [mockupUrls, setMockupUrls] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [preloadedDesignUri, setPreloadedDesignUri] = useState<string | null>(null);
  const [clothesFilter, setClothesFilter] = useState<"men" | "women" | "kids">("men");
  const [clothesCategoryIds, setClothesCategoryIds] = useState<{
    men: number | null;
    women: number | null;
    kids: number | null;
  }>({ men: null, women: null, kids: null });

  // Refs
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const placementScrollViewRef = useRef<ScrollView>(null);
  const designScrollViewRef = useRef<ScrollView>(null);
  const variantScrollViewRef = useRef<any>(null);


  // ResetFlow function
  const resetFlow = () => {
    setProducts([]);
    setProductDetails(null);
    setPlacementFiles({});
    setSelectedPlacements([]);
    setSelectedCategory(null);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setUploadedImages({ left: null, right: null });
    setGeneratedImage(null);
    setMockupImages([]);
    setMockupUrls([]);
    setSelectedColor(null);
    setSelectedSize(null);
    setPrompt("");
    setPreloadedDesignUri(null);
  };
  
  const value = {
    categories, setCategories,
    products, setProducts,
    productDetails, setProductDetails,
    placementFiles, setPlacementFiles,
    selectedPlacements, setSelectedPlacements,
    selectedCategory, setSelectedCategory,
    selectedProduct, setSelectedProduct,
    selectedVariant, setSelectedVariant,
    selectedColor, setSelectedColor,
    selectedSize, setSelectedSize,
    uploadedImages, setUploadedImages,
    generatedImage, setGeneratedImage,
    mockupImages, setMockupImages,
    mockupUrls, setMockupUrls,
    prompt, setPrompt,
    preloadedDesignUri, setPreloadedDesignUri,
    clothesFilter, setClothesFilter,
    clothesCategoryIds, setClothesCategoryIds,
    categoryScrollViewRef,
    placementScrollViewRef,
    designScrollViewRef,
    variantScrollViewRef,
    resetFlow
  };

  return (
    <CreateDesignContext.Provider value={value}>
      {children}
    </CreateDesignContext.Provider>
  );
};

// Create a custom hook to easily access the context
export const useCreateDesign = () => {
  const context = useContext(CreateDesignContext);
  if (context === undefined) {
    throw new Error('useCreateDesign must be used within a CreateDesignProvider');
  }
  return context;
};