import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, useColorScheme as useDeviceColorScheme, Dimensions, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useUser } from "@/lib/UserContext";
import { getPrintfulStoreProducts, deletePrintfulProduct, PrintfulSyncProduct, getPrintfulProductDetails, getVariantInfo } from "@/lib/aws/printful";
import { Colors } from "@/constants/Colors";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import ColorSwatch from "@/components/ColorSwatch";
import { LoadingModal } from "@/components/ui/LoadingModal";
import { MotiView } from "moti";
const { width } = Dimensions.get("window");

export default function OrdersScreen() {
  const colorScheme = useDeviceColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();

  const { printfulApiKey, currentStoreId } = useUser();
  const [products, setProducts] = useState<PrintfulSyncProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const swipeableRefs = useRef<Record<number, Swipeable>>({});

  const fetchProducts = useCallback(async () => {
    if (!printfulApiKey || !currentStoreId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const basicProductList = await getPrintfulStoreProducts(printfulApiKey, currentStoreId);

      const detailedProducts = await Promise.all(basicProductList.map((p) => getPrintfulProductDetails(printfulApiKey, String(p.id), currentStoreId)));

      setProducts(detailedProducts);
    } catch (error: any) {
      console.error("Failed to fetch Printful products:", error);
      Alert.alert("Error", "Could not load your products from Printful.");
    } finally {
      setLoading(false);
    }
  }, [printfulApiKey, currentStoreId]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  const handleDelete = async (productId: number) => {
    const originalProducts = [...products];
    setProducts(products.filter((p) => p.id !== productId));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (!printfulApiKey) throw new Error("API Key not found");
      await deletePrintfulProduct(printfulApiKey, productId, currentStoreId != null ? currentStoreId : "");
    } catch (error: any) {
      setProducts(originalProducts);
      Alert.alert("Error", `Failed to delete product: ${error.message}`);
    }
  };

  const renderRightActions = (productId: number) => {
    return (
      <TouchableOpacity
        onPress={() => {
          swipeableRefs.current[productId]?.close();
          handleDelete(productId);
        }}
        style={styles.deleteButtonContainer}
      >
        <View style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (!printfulApiKey || !currentStoreId) {
      return (
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, { color: theme.secondaryText }]}>Please connect your Printful account in Settings.</Text>
        </View>
      );
    }
    if (products.length === 0 && !loading) {
      return (
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, { color: theme.secondaryText }]}>You haven't added any products to your Printful store yet.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: product }) => {
          const firstVariant = product.sync_variants?.[0];
          const variantDetails = firstVariant ? getVariantInfo(firstVariant) : { color: "N/A", size: "N/A", colorCode: null };
          const price = firstVariant?.retail_price ?? "0.00";

          return (
            <Swipeable
              ref={(ref: Swipeable | null) => {
                if (ref) {
                  swipeableRefs.current[product.id] = ref;
                }
              }}
              renderRightActions={() => renderRightActions(product.id)}
              onSwipeableWillOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card }]}
                onPress={() => router.push({ pathname: "/product-detail" as any, params: { productId: product.id } })}
                activeOpacity={0.8}
              >
                <Image source={{ uri: product.thumbnail_url }} style={styles.image} resizeMode="cover" />
                <View style={styles.infoContainer}>
                  <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>Size: </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{variantDetails.size}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>Color: </Text>
                      <ColorSwatch color={variantDetails.colorCode || variantDetails.color} size={14} />
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={[styles.priceText, { color: theme.text }]}>${price}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <LoadingModal visible={loading} text="Loading Products..." />

      <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 100, type: "timing", duration: 300 }}>
        <Text style={[styles.header, { color: theme.text }]}>My Store Products</Text>
      </MotiView>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    fontSize: 28,
    margin: 16,
    textAlign: "center",
    fontFamily: "Inter-ExtraBold",
  },
  grid: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    width: "100%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: "#000000ff",
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "white",
    marginVertical: 8,
  },
  image: { width: 100, height: 100 },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  productName: {
    fontSize: 16,
    flexShrink: 1,
    marginBottom: 8,
    fontFamily: "Inter-ExtraBold",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Inter-ExtraBold",
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Inter-ExtraBold",
  },
  priceContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 18,
    fontFamily: "Inter-ExtraBold",
  },
  messageContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  messageText: {
    fontSize: 16,
    textAlign: "center",
    fontFamily: "Inter-ExtraBold",
  },
  deleteButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 100,
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "90%",
    borderRadius: 16,
    marginVertical: 8,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Inter-ExtraBold",
  },
});