import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Dimensions, Modal, TextInput } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { photoshootScenarios, type PhotoshootScenario } from "@/lib/config/photoshootScenarios";
import { LoadingModal } from "@/components/ui/LoadingModal";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GEMINI_API_KEY } from "@/lib/config/constants";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { savePhotoshoot } from "@/lib/aws/savePhotoshoot";
import * as ImagePicker from "expo-image-picker";

// New loader
import PhotoshootLoader from "@/assets/lottie/photoshoot-loader.json";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";

async function toBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:")) {
    return uri.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  }

  if (uri.startsWith("file://")) {
    return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }

  if (uri.startsWith("http")) {
    const tempPath = `${FileSystem.cacheDirectory}photoshoot_${Date.now()}.png`;
    const download = await FileSystem.downloadAsync(uri, tempPath);
    const data = await FileSystem.readAsStringAsync(download.uri, { encoding: FileSystem.EncodingType.Base64 });
    await FileSystem.deleteAsync(download.uri, { idempotent: true });
    return data;
  }

  throw new Error("Unsupported image URI provided.");
}

export default function PhotoshootScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();
  const params = useLocalSearchParams<{
    designUri?: string;
    scenarioId?: string;
    scenarioTitle?: string;
    scenarioSummary?: string;
    scenarioPrompt?: string;
    saved?: string;
  }>();

  const designImageUri = params.designUri ? decodeURIComponent(params.designUri) : null;
  const scenarioPromptFromParams = params.scenarioPrompt ? decodeURIComponent(params.scenarioPrompt) : null;
  const scenarioTitleFromParams = params.scenarioTitle ? decodeURIComponent(params.scenarioTitle) : null;
  const scenarioSummaryFromParams = params.scenarioSummary ? decodeURIComponent(params.scenarioSummary) : null;
  const isPrefilledSaved = params.saved === "1" && !!designImageUri;

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Setting up photoshoot...");
  const [activeScenario, setActiveScenario] = useState<PhotoshootScenario | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [remixPrompt, setRemixPrompt] = useState("");
  const [additionalImage, setAdditionalImage] = useState<string | null>(null);
  const [viewingSaved, setViewingSaved] = useState(false);

  const scenarios = useMemo(() => photoshootScenarios, []);

  useEffect(() => {
    if (isPrefilledSaved && designImageUri) {
      setResultImage(designImageUri);
      setActiveScenario({
        id: params.scenarioId || `saved-${Date.now()}`,
        title: scenarioTitleFromParams || "Saved Photoshoot",
        summary: scenarioSummaryFromParams || "",
        prompt: scenarioPromptFromParams || "",
      });
      setViewingSaved(true);
      setResultModalVisible(true);
    }
  }, [designImageUri, isPrefilledSaved, params.scenarioId, scenarioPromptFromParams, scenarioTitleFromParams, scenarioSummaryFromParams]);

  const closeModal = () => {
    setResultModalVisible(false);
    setViewingSaved(false);
    setAdditionalImage(null);
    setRemixPrompt("");
  };

  const handleScenarioPress = async (scenario: PhotoshootScenario) => {
    if (!designImageUri) {
      Alert.alert("Missing Image", "We could not find the base design image to send to Gemini.");
      return;
    }
    if (!GEMINI_API_KEY) {
      Alert.alert("Missing API Key", "GEMINI_API_KEY is not set. Please update your configuration.");
      return;
    }

    try {
      setActiveScenario(scenario);
      setResultImage(null);
      setAdditionalImage(null);
      setRemixPrompt("");
      setViewingSaved(false);
      setLoadingText("Setting up photoshoot...");
      setIsLoading(true);

      const base64 = await toBase64(designImageUri);
      const parts: any[] = [{ inline_data: { mime_type: "image/png", data: base64 } }, { text: scenario.prompt }];

      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents: [{ parts }] }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      let imageData: string | null = null;

      candidate?.content?.parts?.forEach((part: any) => {
        if (!imageData && (part?.inlineData?.data || part?.inline_data?.data)) {
          imageData = part.inlineData?.data || part.inline_data?.data;
        }
      });

      if (!imageData) {
        const textResponse = candidate?.content?.parts
          ?.map((p: any) => p?.text)
          .filter(Boolean)
          .join("\n");
        throw new Error(textResponse || "Gemini did not return image data.");
      }

      setResultImage(`data:image/png;base64,${imageData}`);
      setResultModalVisible(true);
    } catch (error: any) {
      console.error("Photoshoot generation failed", error);
      Alert.alert("Generation Error", error?.message || "Unable to generate the photoshoot image.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resultImage || !activeScenario) return;
    if (viewingSaved) {
      Alert.alert("Already Saved", "This photoshoot is already in your library. Remix it to create a new one.");
      return;
    }
    try {
      setLoadingText("Saving photoshoot...");
      setIsLoading(true);
      await savePhotoshoot({
        imageUri: resultImage,
        scenarioId: activeScenario.id,
        scenarioTitle: activeScenario.title,
        scenarioSummary: activeScenario.summary,
        prompt: activeScenario.prompt,
      });
      Alert.alert("Saved", "Photoshoot added to My Saved Photoshoots.");
      closeModal();
    } catch (error: any) {
      console.error("Save photoshoot failed", error);
      Alert.alert("Save Error", error?.message || "Unable to save this photoshoot.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemix = async () => {
    if (!resultImage || !activeScenario || !designImageUri) return;
    if (!remixPrompt.trim()) {
      Alert.alert("Add Details", "Enter a follow-up prompt to remix this photoshoot.");
      return;
    }

    try {
      setLoadingText("Remixing photoshoot...");
      setIsLoading(true);
      const parts: any[] = [
        { inline_data: { mime_type: "image/png", data: await toBase64(designImageUri) } },
        { inline_data: { mime_type: "image/png", data: await toBase64(resultImage) } },
        { text: `${activeScenario.prompt}\n\nFollow-up direction: ${remixPrompt.trim()}` },
      ];

      if (additionalImage) {
        parts.splice(2, 0, {
          inline_data: { mime_type: "image/png", data: await toBase64(additionalImage) },
        });
      }

      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents: [{ parts }] }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini remix failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      let imageData: string | null = null;
      candidate?.content?.parts?.forEach((part: any) => {
        if (!imageData && (part?.inlineData?.data || part?.inline_data?.data)) {
          imageData = part.inlineData?.data || part.inline_data?.data;
        }
      });

      if (!imageData) {
        const textResponse = candidate?.content?.parts
          ?.map((p: any) => p?.text)
          .filter(Boolean)
          .join("\n");
        throw new Error(textResponse || "Gemini did not return image data.");
      }

      setResultImage(`data:image/png;base64,${imageData}`);
      setRemixPrompt("");
      setAdditionalImage(null);
      setViewingSaved(false);
    } catch (error: any) {
      console.error("Remix photoshoot failed", error);
      Alert.alert("Remix Error", error?.message || "Unable to remix this photoshoot.");
    } finally {
      setIsLoading(false);
    }
  };

  const pickAdditionalImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Please allow photo library access to add reference images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled && result.assets?.length) {
      setAdditionalImage(result.assets[0].uri);
    }
  };

  const renderScenarioCard = (scenario: PhotoshootScenario) => {
    const isActive = activeScenario?.id === scenario.id && !viewingSaved;
    return (
      <TouchableOpacity
        key={scenario.id}
        style={[styles.card, { backgroundColor: theme.card, borderColor: isActive ? theme.tint : "transparent" }]}
        onPress={() => handleScenarioPress(scenario)}
        disabled={isLoading}
      >
        {scenario.image && <Image source={scenario.image} style={styles.cardImage} resizeMode="cover" />}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{scenario.title}</Text>
          <Text style={[styles.cardSummary, { color: theme.secondaryText }]}>{scenario.summary}</Text>
        </View>
        <View style={[styles.cardAction, { backgroundColor: theme.tint }]}>
          <Text style={[styles.cardActionText, { color: theme.background }]}>Run</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const showSaveButton = !viewingSaved;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Select Photoshoot</Text>
        <View style={{ width: 60 }} />
      </View>

      {!designImageUri ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No design image available.</Text>
          <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>Return to your design results and try again.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.previewBlock, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Base Image</Text>
            <Image source={{ uri: designImageUri }} style={styles.previewImage} resizeMode="cover" />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Photoshoot Concepts</Text>

          {scenarios.map(renderScenarioCard)}
        </ScrollView>
      )}

      <Modal visible={resultModalVisible && !!resultImage && !isLoading} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{activeScenario?.title}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            {resultImage && <Image source={{ uri: resultImage }} style={styles.modalImage} resizeMode="cover" />}

            <View style={styles.remixAccessoryRow}>
              {additionalImage ? (
                <View style={styles.extraImagePreview}>
                  <Image source={{ uri: additionalImage }} style={styles.extraImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeExtraButton} onPress={() => setAdditionalImage(null)}>
                    <Text style={styles.removeExtraText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={[styles.addImageButton, { borderColor: theme.tint, backgroundColor: `${theme.tint}22` }]} onPress={pickAdditionalImage}>
                  <Ionicons name="image" size={20} color={theme.tint} />
                  <Text style={[styles.addImageText, { color: theme.tint }]}>Add reference photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[styles.remixInput, { backgroundColor: theme.inputBackground ?? "rgba(0,0,0,0.05)", color: theme.text, borderColor: theme.tabIconDefault }]}
              placeholder="Add a follow-up prompt to remix..."
              placeholderTextColor={theme.secondaryText}
              value={remixPrompt}
              onChangeText={setRemixPrompt}
              multiline
            />

            <View style={styles.modalButtonsRow}>
              {showSaveButton && (
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.tint }]} onPress={handleSave} disabled={isLoading}>
                  <Text style={[styles.primaryButtonText, { color: theme.background }]}>Save</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.primaryButton, styles.outlineButton, { borderColor: theme.tint }]} onPress={handleRemix} disabled={isLoading}>
                <Text style={[styles.primaryButtonText, { color: theme.tint }]}>Remix</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pass the imported loader AND the new style prop */}
      <LoadingModal visible={isLoading} text={loadingText} lottieSource={PhotoshootLoader} lottieStyle={{ width: 175, height: 175 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  content: {
    paddingBottom: 60,
    paddingHorizontal: 20,
    gap: 18,
  },
  previewBlock: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    padding: 16,
    gap: 12,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  card: {
    width: CARD_WIDTH,
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 8,
    borderWidth: 2,
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 0.55,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  cardActionText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
  },
  modalImage: {
    width: "100%",
    borderRadius: 18,
    aspectRatio: 3 / 4,
  },
  remixAccessoryRow: {
    width: "100%",
    alignItems: "center",
  },
  addImageButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addImageText: {
    fontSize: 15,
    fontWeight: "700",
  },
  extraImagePreview: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  extraImage: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  removeExtraButton: {
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  removeExtraText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ff3b30",
  },
  remixInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: "top",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
