import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  useColorScheme as useDeviceColorScheme,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPrintfulProductDetails, PrintfulSyncProduct, deletePrintfulProduct, PrintfulSyncVariant, getVariantInfo } from '@/lib/aws/printful';
import { useUser } from '@/lib/UserContext';
import { Colors } from '@/constants/Colors';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import ColorSwatch from '@/components/ColorSwatch';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const colorScheme = useDeviceColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { printfulApiKey, currentStoreId } = useUser();

  const [product, setProduct] = useState<PrintfulSyncProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWebView, setShowWebView] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!productId || !printfulApiKey) {
        Alert.alert('Error', 'Missing product ID or API key.');
        setLoading(false);
        return;
      }
      try {
        if(currentStoreId != null) {

        
        const details = await getPrintfulProductDetails(printfulApiKey, productId, currentStoreId);
        setProduct(details);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [productId, printfulApiKey]);

  const handleDelete = () => {
    if (!product) return;
    
    Alert.alert(
      'Delete Product',
      'Are you sure you want to permanently delete this product from your Printful store?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!printfulApiKey) throw new Error("API Key not found");
              await deletePrintfulProduct(printfulApiKey, product.id, currentStoreId != null ? currentStoreId : "");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error: any) {
              Alert.alert('Error', `Failed to delete product: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const handleOpenPrintful = () => {
    setShowWebView(true);
  };
  
  const printfulUrl = `https://www.printful.com/auth/login`;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Product could not be loaded.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.tint }]}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  const mainImageUrl = product.thumbnail_url || product.sync_variants[0]?.files[0]?.preview_url;
  const firstVariant = product.sync_variants[0];
  
  const { color, size, colorCode } = getVariantInfo(firstVariant);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Product Details</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.tint }]}>Done</Text>
            </TouchableOpacity>
        </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {mainImageUrl && (
            <View style={styles.imageContainer}>
                <Image source={{ uri: mainImageUrl }} style={styles.mainImage} />
            </View>
        )}

        <Text style={[styles.productTitle, { color: theme.text }]}>{product.name}</Text>

        <View style={styles.detailsContainer}>
            <Text style={[styles.price, { color: theme.text }]}>${firstVariant.retail_price}</Text>
            <View style={styles.specsContainer}>
                <View style={styles.spec}>
                    <Text style={[styles.specLabel, { color: theme.secondaryText }]}>Color:</Text>
                    <ColorSwatch color={colorCode || color} />
                </View>
                <View style={styles.spec}>
                    <Text style={[styles.specLabel, { color: theme.secondaryText }]}>Size:</Text>
                    <Text style={[styles.specValue, { color: theme.text }]}>{size}</Text>
                </View>
            </View>
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={handleOpenPrintful}>
          <Text style={[styles.buttonText, { color: theme.background }]}>Manage on Printful</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
          <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete Product</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        visible={showWebView}
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWebView(false)}>
          <View style={[styles.webviewContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.webviewHeader, { borderBottomColor: theme.tabIconDefault }]}>
              <TouchableOpacity onPress={() => setShowWebView(false)}>
                <Text style={{ color: theme.tint, fontSize: 18, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <WebView source={{ uri: printfulUrl }} style={{ flex: 1, backgroundColor: theme.card }} />
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter-ExtraBold", // Updated
  },
  closeButton: { padding: 8 },
  closeButtonText: {
    fontSize: 18,
    fontFamily: "Inter-ExtraBold", // Updated
  },
  scrollContainer: { paddingBottom: 50 },
  imageContainer: {
    width: width,
    height: width * 1.1,
    alignItems: "center",
    justifyContent: "center",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  productTitle: {
    fontSize: 28,
    marginHorizontal: 20,
    marginVertical: 24,
    textAlign: "left",
    fontFamily: "Inter-ExtraBold", // Updated
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    marginBottom: 24,
  },
  price: {
    fontSize: 24,
    fontFamily: "Inter-ExtraBold", // Updated
  },
  specsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  spec: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  specLabel: {
    fontSize: 16,
    marginRight: 8,
    fontFamily: "Inter-ExtraBold", // Updated
  },
  specValue: {
    fontSize: 16,
    fontFamily: "Inter-ExtraBold", // Updated
  },
  button: { marginHorizontal: 16, padding: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter-ExtraBold", // Updated
  },
  deleteButton: { backgroundColor: "#ff3b3020" },
  deleteButtonText: {
    color: "#ff3b30",
    fontFamily: "Inter-ExtraBold", // Updated
  },
  errorText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
    fontFamily: "Inter-ExtraBold", // Updated
  },
  backButton: { position: "absolute", top: 60, left: 20 },
  backButtonText: {
    fontSize: 18,
    fontFamily: "Inter-ExtraBold", // Updated
  },
  webviewContainer: {
    flex: 1,
  },
  webviewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "flex-end",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});