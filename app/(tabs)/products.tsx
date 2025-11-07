import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, useColorScheme as useDeviceColorScheme, Dimensions, Modal, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { listDesignsForCurrentUser, deleteDesign, MuseDesignRow } from "@/lib/aws/saveDesign";
import { listPhotoshootsForCurrentUser, deletePhotoshoot, MusePhotoshootRow } from "@/lib/aws/savePhotoshoot";
import { Colors } from "@/constants/Colors";
import { LoadingModal } from "@/components/ui/LoadingModal";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function SavedLibraryScreen() {
  const colorScheme = useDeviceColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [designs, setDesigns] = useState<MuseDesignRow[]>([]);
  const [photoshoots, setPhotoshoots] = useState<MusePhotoshootRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const [userDesigns, userPhotoshoots] = await Promise.all([
        listDesignsForCurrentUser(),
        listPhotoshootsForCurrentUser(),
      ]);
      setDesigns(userDesigns);
      setPhotoshoots(userPhotoshoots);
    } catch (error: any) {
      console.error("Failed to fetch library:", error);
      Alert.alert("Error", "Could not load your saved items. " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLibrary();
    }, [fetchLibrary])
  );

  const handleRemoveDesign = (designId: string) => {
    Alert.alert("Remove Design", "Are you sure you want to permanently remove this design?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDesign(designId);
            setDesigns((prev) => prev.filter((d) => d.designId !== designId));
            Alert.alert("Success", "Design removed.");
          } catch (error: any) {
            console.error("Failed to delete design:", error);
            Alert.alert("Error", "Could not remove design. " + error.message);
          }
        },
      },
    ]);
  };

  const handleRemovePhotoshoot = (photoshootId: string) => {
    Alert.alert("Remove Photoshoot", "Are you sure you want to permanently remove this photoshoot?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePhotoshoot(photoshootId);
            setPhotoshoots((prev) => prev.filter((p) => p.photoshootId !== photoshootId));
            Alert.alert("Success", "Photoshoot removed.");
          } catch (error: any) {
            console.error("Failed to delete photoshoot:", error);
            Alert.alert("Error", "Could not remove photoshoot. " + error.message);
          }
        },
      },
    ]);
  };

  const handleApplyDesign = (design: MuseDesignRow) => {
    if (!design.s3Location) {
      Alert.alert("Error", "Image location is missing for this design.");
      return;
    }
    router.push({ pathname: "/(tabs)", params: { savedDesignUri: design.s3Location } });
  };

  const openDesignModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setSelectedTitle(null);
    setModalVisible(true);
  };

  const openPhotoshootModal = (item: MusePhotoshootRow) => {
    if (!item.s3Location) return;
    setSelectedImage(item.s3Location);
    setSelectedTitle(item.scenarioTitle ?? "Saved Photoshoot");
    setModalVisible(true);
  };

  const libraryIsEmpty = !loading && designs.length === 0 && photoshoots.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <LoadingModal visible={loading} text="Loading Library..." />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionHeader, { color: theme.text }]}>My Saved Designs</Text>
        {designs.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.messageText, { color: theme.secondaryText }]}>You haven't saved any designs yet.</Text>
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {designs.map((design) => (
              <View key={design.designId} style={[styles.card, { backgroundColor: theme.card }]}> 
                {design.s3Location && (
                  <TouchableOpacity onPress={() => openDesignModal(design.s3Location!)}>
                    <Image source={{ uri: design.s3Location }} style={styles.image} resizeMode="cover" />
                  </TouchableOpacity>
                )}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={() => handleApplyDesign(design)}>
                    <Text style={[styles.buttonText, { color: theme.background }]}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.removeButton]} onPress={() => handleRemoveDesign(design.designId)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionHeader, { color: theme.text }]}>My Saved Photoshoots</Text>
        {photoshoots.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.messageText, { color: theme.secondaryText }]}>You haven't saved any photoshoots yet.</Text>
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {photoshoots.map((item) => (
              <View key={item.photoshootId} style={[styles.card, { backgroundColor: theme.card }]}> 
                {item.scenarioTitle ? <Text style={[styles.cardHeading, { color: theme.text }]} numberOfLines={1}>{item.scenarioTitle}</Text> : null}
                <Text style={[styles.timestampText, { color: theme.secondaryText }]}>{formatDate(item.createdAt)}</Text>
                {item.s3Location && (
                  <TouchableOpacity onPress={() => openPhotoshootModal(item)}>
                    <Image source={{ uri: item.s3Location }} style={styles.image} resizeMode="cover" />
                  </TouchableOpacity>
                )}
                <View style={styles.photoButtonsRow}>
                  <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint }]} onPress={() => openPhotoshootModal(item)}>
                    <Text style={[styles.buttonText, { color: theme.background }]}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.removeButton]} onPress={() => handleRemovePhotoshoot(item.photoshootId)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {libraryIsEmpty && (
          <View style={[styles.emptyContainer, { marginTop: 20 }]}> 
            <Text style={[styles.messageText, { color: theme.secondaryText }]}>Start creating to see your saved designs and photoshoots here.</Text>
          </View>
        )}
      </ScrollView>

      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalContainer} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}> 
            {selectedTitle ? <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedTitle}</Text> : null}
            {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullscreenImage} resizeMode="contain" />}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  sectionHeader: {
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 16,
    textAlign: "center",
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: "#000000ff",
    overflow: "hidden",
    paddingBottom: 8,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  timestampText: {
    fontSize: 13,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  image: {
    width: "100%",
    height: CARD_WIDTH,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: "#ff3b3020",
  },
  removeButtonText: {
    color: "#ff3b30",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#00000040",
    backgroundColor: "transparent",
  },
  photoButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  messageText: {
    fontSize: 16,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "90%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  fullscreenImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
  },
});
