import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Dimensions, FlatList, Modal, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { listPhotoshootsForCurrentUser, deletePhotoshoot, MusePhotoshootRow } from "@/lib/aws/savePhotoshoot";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function SavedPhotoshootsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [photoshoots, setPhotoshoots] = useState<MusePhotoshootRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  const fetchPhotoshoots = useCallback(async () => {
    setLoading(true);
    try {
      const userPhotoshoots = await listPhotoshootsForCurrentUser();
      setPhotoshoots(userPhotoshoots);
    } catch (error: any) {
      console.error("Failed to fetch photoshoots:", error);
      Alert.alert("Error", "Could not load your saved photoshoots. " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPhotoshoots();
    }, [fetchPhotoshoots])
  );

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

  const openPhotoshootModal = (item: MusePhotoshootRow) => {
    if (!item.s3Location) return;
    setSelectedImage(item.s3Location);
    setSelectedTitle(item.scenarioTitle ?? "Saved Photoshoot");
    setModalVisible(true);
  };

  const libraryIsEmpty = !loading && photoshoots.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* HEADER with DONE button */}
      <View style={[styles.modalHeader, { borderBottomColor: theme.tabIconDefault }]}>
        <Text style={[styles.header, { color: theme.text }]}>My Saved Photoshoots</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.doneButton}>
          <Text style={[styles.doneButtonText, { color: theme.tint }]}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* --- LOADING / EMPTY STATE --- */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.messageText, { color: theme.secondaryText, marginTop: 10 }]}>Loading Photoshoots...</Text>
        </View>
      ) : libraryIsEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.messageText, { color: theme.secondaryText }]}>You haven't saved any photoshoots yet.</Text>
        </View>
      ) : (
        /* --- SAVED PHOTOSHOOT LIST --- */
        <FlatList
          data={photoshoots}
          keyExtractor={(item) => item.photoshootId}
          contentContainerStyle={styles.grid}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              {item.scenarioTitle ? (
                <Text style={[styles.cardHeading, { color: theme.text }]} numberOfLines={1}>
                  {item.scenarioTitle}
                </Text>
              ) : null}
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
          )}
        />
      )}

      {/* --- MODAL FOR VIEWING A SAVED IMAGE --- */}
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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    fontSize: 24,
    textAlign: "center",
    flex: 1,
    fontFamily: "Inter-ExtraBold",
  },
  doneButton: {
    position: "absolute",
    right: 16,
    top: 12,
    padding: 8,
  },
  doneButtonText: {
    fontSize: 18,
    fontFamily: "Inter-ExtraBold",
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
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
    paddingHorizontal: 12,
    paddingTop: 12,
    fontFamily: "Inter-ExtraBold",
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
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: "Inter-ExtraBold",
  },
  removeButton: {
    backgroundColor: "#ff3b3020",
  },
  removeButtonText: {
    color: "#ff3b30",
    fontSize: 14,
    fontFamily: "Inter-ExtraBold",
  },
  photoButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageText: {
    fontSize: 16,
    fontFamily: "Inter-ExtraBold",
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
    textAlign: "center",
    fontFamily: "Inter-ExtraBold",
  },
  fullscreenImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
  },
});
