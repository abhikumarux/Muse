import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useColorScheme as useDeviceColorScheme,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { listDesignsForCurrentUser, deleteDesign, MuseDesignRow } from "@/lib/aws/saveDesign";
import { Colors } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

export default function SavedDesignsScreen() {
  const colorScheme = useDeviceColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [designs, setDesigns] = useState<MuseDesignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const userDesigns = await listDesignsForCurrentUser();
      setDesigns(userDesigns);
    } catch (error: any) {
      console.error("Failed to fetch designs:", error);
      Alert.alert("Error", "Could not load your designs. " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDesigns();
    }, [])
  );

  const handleRemove = (designId: string) => {
    Alert.alert(
      "Remove Design",
      "Are you sure you want to permanently remove this design?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDesign(designId);
              // Refresh the list after deletion
              setDesigns((prev) => prev.filter((d) => d.designId !== designId));
              Alert.alert("Success", "Design removed.");
            } catch (error: any) {
              console.error("Failed to delete design:", error);
              Alert.alert("Error", "Could not remove design. " + error.message);
            }
          },
        },
      ]
    );
  };

  const handleApply = (design: MuseDesignRow) => {
    if (!design.s3Location) {
      Alert.alert("Error", "Image location is missing for this design.");
      return;
    }
    router.push({
      pathname: "/(tabs)",
      params: { savedDesignUri: design.s3Location },
    });
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.messageText, { color: theme.text, marginTop: 10 }]}>Loading Designs...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <Text style={[styles.header, { color: theme.text }]}>My Saved Designs</Text>
      
      {designs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.messageText, { color: theme.secondaryText }]}>You haven't saved any designs yet.</Text>
        </View>
      ) : (
        <FlatList
          data={designs}
          keyExtractor={(item) => item.designId}
          contentContainerStyle={styles.grid}
          numColumns={2}
          renderItem={({ item: design }) => (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              {design.s3Location && (
                <TouchableOpacity onPress={() => openImageModal(design.s3Location!)}>
                  <Image
                    source={{ uri: design.s3Location }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={() => handleApply(design)}>
                  <Text style={[styles.buttonText, { color: theme.background }]}>Apply</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.removeButton]} onPress={() => handleRemove(design.designId)}>
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalContainer} onPress={() => setModalVisible(false)}>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    margin: 16,
    textAlign: 'center',
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: CARD_WIDTH,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#ff3b3020',
  },
  removeButtonText: {
    color: '#ff3b30',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '90%',
    height: '90%',
  },
});