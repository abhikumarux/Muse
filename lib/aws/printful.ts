export interface PrintfulProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
}

export interface PrintfulSyncVariantFile {
    id: number;
    type: string;
    url: string;
    options: any[];
    filename: string;
    visible: boolean;
    position: any;
    dpi: number | null;
    mime_type: string;
    width: number;
    height: number;
    thumbnail_url: string;
    preview_url: string;
}

export interface PrintfulSyncVariant {
    id: number;
    external_id: string;
    sync_product_id: number;
    name: string;
    synced: boolean;
    variant_id: number;
    retail_price: string;
    is_ignored: boolean;
    sku: string | null;
    files: PrintfulSyncVariantFile[];
    options: any[];
    main_category_id: number;
    warehouse_product_variant_id: number | null;
}

export interface PrintfulSyncProductResponse {
    sync_product: PrintfulSyncProduct;
    sync_variants: PrintfulSyncVariant[];
}

export interface PrintfulSyncProduct {
    id: number;
    external_id: string;
    name: string;
    thumbnail: string;
    thumbnail_url: string;
    is_ignored: boolean;
    sync_variants: PrintfulSyncVariant[];
}

/**
 * Parses a variant's name and options to extract color name, size, and hex color code
 * @param variant - The PrintfulSyncVariant object
 * @returns An object with color, size, and colorCode
 */
export const getVariantInfo = (variant: PrintfulSyncVariant) => {
  let color = 'N/A';
  let size = 'N/A';
  let colorCode: string | null = null;

  // Prioritize the 'options' array as it is more structured and reliable
  const sizeFromOptions = variant.options.find(opt => opt.id === 'size')?.value;
  if (typeof sizeFromOptions === 'string') {
    size = sizeFromOptions;
  }

  const colorNameFromOptions = variant.options.find(opt => opt.id === 'color')?.value;
  if (typeof colorNameFromOptions === 'string' && !colorNameFromOptions.startsWith('#')) {
    color = colorNameFromOptions;
  }

  // Fallback to parsing the variant's name if options aren't sufficient
  if (size === 'N/A' || color === 'N/A') {
    const nameParts = variant.name.split(' / ').map(part => part.trim());
    if (nameParts.length >= 3) {
      if (size === 'N/A') size = nameParts[nameParts.length - 1];
      if (color === 'N/A') color = nameParts[nameParts.length - 2];
    }
  }

  // find the hex code for the color swatch
  const colorCodeValue = variant.options.find(opt => opt.id === 'color_code')?.value;
  const colorValue = variant.options.find(opt => opt.id === 'color')?.value;

  // 1st priority: the 'color_code' field, if it's a valid hex
  if (typeof colorCodeValue === 'string' && colorCodeValue.startsWith('#')) {
    colorCode = colorCodeValue;
  } 
  // 2nd priority: the 'color' field, but only if it contains a hex code
  else if (typeof colorValue === 'string' && colorValue.startsWith('#')) {
    colorCode = colorValue;
  }

  return { color, size, colorCode };
};


export const getPrintfulProductDetails = async (
  apiKey: string,
  productId: string
): Promise<PrintfulSyncProduct> => {
  if (!apiKey || !productId) {
    throw new Error('API key and Product ID are required.');
  }

  const response = await fetch(`https://api.printful.com/store/products/${productId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to fetch product details from Printful.');
  }

  const data = await response.json();
  const result: PrintfulSyncProductResponse = data.result;
  
  return {
      ...result.sync_product,
      sync_variants: result.sync_variants,
  };
};

export const getPrintfulStoreProducts = async (
  apiKey: string,
  storeId: string
): Promise<PrintfulProduct[]> => {
  if (!apiKey || !storeId) {
    throw new Error('API key and Store ID are required.');
  }

  const response = await fetch(`https://api.printful.com/store/products?store_id=${storeId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to fetch products from Printful.');
  }

  const data = await response.json();
  return data.result || [];
};

export const deletePrintfulProduct = async (
  apiKey: string,
  productId: number
): Promise<void> => {
    if (!apiKey || !productId) {
        throw new Error('API key and Product ID are required.');
    }

    const response = await fetch(`https://api.printful.com/store/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete product from Printful.');
    }
};