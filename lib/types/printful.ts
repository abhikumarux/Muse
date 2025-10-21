// Type definitions moved from CreateNewDesign.tsx
export interface Category {
  id: number;
  parent_id: number;
  image_url: string;
  size: string;
  title: string;
}

export interface Product {
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

export interface Variant {
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

export interface ProductDetails {
  product: Product;
  variants: Variant[];
}

export interface PrintFilesResponse {
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

export interface CategoriesResponse {
  code: number;
  result: { categories: Category[] };
}

export interface ProductsResponse {
  code: number;
  result: Product[];
}

export interface ProductDetailsResponse {
  code: number;
  result: ProductDetails;
}

export type DesignView = "categories" | "products" | "variants" | "viewFinalDesign" | "placements" | "design";
