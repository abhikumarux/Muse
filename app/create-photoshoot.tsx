import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Dimensions, TextInput, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { photoshootScenarios, type PhotoshootScenario } from "@/lib/config/photoshootScenarios";
import { GEMINI_API_KEY } from "@/lib/config/constants";
import { LoadingModal } from "@/components/ui/LoadingModal";
import { savePhotoshoot } from "@/lib/aws/savePhotoshoot";
import { MuseCoin } from "@/assets/svg/MuseCoin";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";
const STUDIO_TITLE_REGEX = /\(Studio\)/i;

const getDisplayTitle = (title?: string) => (title ? title.replace(STUDIO_TITLE_REGEX, "").trim() : "");

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

export default function CreatePhotoshootScreen() {
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

  const prefilledImage = params.designUri ? decodeURIComponent(params.designUri) : null;
  const scenarioPromptFromParams = params.scenarioPrompt ? decodeURIComponent(params.scenarioPrompt) : null;
  const scenarioTitleFromParams = params.scenarioTitle ? decodeURIComponent(params.scenarioTitle) : null;
  const scenarioSummaryFromParams = params.scenarioSummary ? decodeURIComponent(params.scenarioSummary) : null;
  const isPrefilledSaved = params.saved === "1" && !!prefilledImage;

  const [mode, setMode] = useState<"select" | "detail">(params.scenarioId || isPrefilledSaved ? "detail" : "select");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Preparing photoshoot...");
  const [activeScenario, setActiveScenario] = useState<PhotoshootScenario | null>(null);
  const [baseImageUri, setBaseImageUri] = useState<string | null>(prefilledImage);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [remixPrompt, setRemixPrompt] = useState("");
  const [additionalImage, setAdditionalImage] = useState<string | null>(null);
  const [viewingSaved, setViewingSaved] = useState(false);

  const scenarios = useMemo(() => photoshootScenarios, []);

  useEffect(() => {
    if (params.scenarioId) {
      const fromList = scenarios.find((scenario) => scenario.id === params.scenarioId);
      setActiveScenario(
        fromList || {
          id: params.scenarioId,
          title: scenarioTitleFromParams || "Photoshoot",
          summary: scenarioSummaryFromParams || "",
          prompt: scenarioPromptFromParams || "",
        }
      );
      setMode("detail");
    }
  }, [params.scenarioId, scenarioPromptFromParams, scenarioSummaryFromParams, scenarioTitleFromParams, scenarios]);

  useEffect(() => {
    if (isPrefilledSaved && prefilledImage) {
      setResultImage(prefilledImage);
      setBaseImageUri(prefilledImage);
      setViewingSaved(true);
    }
  }, [isPrefilledSaved, prefilledImage]);

  const handleBack = () => {
    if (mode === "detail" && !viewingSaved && !params.scenarioId) {
      setActiveScenario(null);
      setResultImage(null);
      setMode("select");
      return;
    }
    router.back();
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled && result.assets?.length) {
      setBaseImageUri(result.assets[0].uri);
      if (!viewingSaved) setResultImage(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled && result.assets?.length) {
      setBaseImageUri(result.assets[0].uri);
      if (!viewingSaved) setResultImage(null);
    }
  };

  const chooseProductFromStore = () => {
    router.push("/(tabs)");
  };

  const generatePhotoshoot = async () => {
    if (!activeScenario) {
      Alert.alert("Select a scenario", "Choose a photoshoot prompt to continue.");
      return;
    }
    if (!baseImageUri) {
      Alert.alert("Add an image", "Upload or capture an image first.");
      return;
    }
    if (!GEMINI_API_KEY) {
      Alert.alert("Missing API Key", "Set GEMINI_API_KEY in your env config.");
      return;
    }

    try {
      setLoadingText("Setting up photoshoot...");
      setIsLoading(true);
      setViewingSaved(false);

      const parts: any[] = [{ inline_data: { mime_type: "image/png", data: await toBase64(baseImageUri) } }, { text: activeScenario.prompt }];

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
        const textResponse = candidate?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n");
        throw new Error(textResponse || "Gemini did not return image data.");
      }

      setResultImage(`data:image/png;base64,${imageData}`);
      setRemixPrompt("");
      setAdditionalImage(null);
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
      Alert.alert("Already Saved", "This photoshoot already lives in your studio. Remix it to create a new one.");
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
      Alert.alert("Saved", "Photoshoot added to your studio.");
    } catch (error: any) {
      console.error("Save photoshoot failed", error);
      Alert.alert("Save Error", error?.message || "Unable to save this photoshoot.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemix = async () => {
    if (!resultImage || !activeScenario) return;
    if (!remixPrompt.trim()) {
      Alert.alert("Add details", "Type what you want to remix before running it.");
      return;
    }
    if (!baseImageUri) {
      Alert.alert("Missing base image", "Upload or choose a product image before remixing.");
      return;
    }
    try {
      setLoadingText("Remixing photoshoot...");
      setIsLoading(true);
      const parts: any[] = [
        { inline_data: { mime_type: "image/png", data: await toBase64(baseImageUri) } },
        { inline_data: { mime_type: "image/png", data: await toBase64(resultImage) } },
        { text: `${activeScenario.prompt}\n\nFollow-up direction: ${remixPrompt.trim()}` },
      ];
      if (additionalImage) {
        parts.splice(2, 0, { inline_data: { mime_type: "image/png", data: await toBase64(additionalImage) } });
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
        const textResponse = candidate?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n");
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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled && result.assets?.length) {
      setAdditionalImage(result.assets[0].uri);
    }
  };

  const handleShare = async () => {
    if (!resultImage) return;
    try {
      let shareUri = resultImage;
      if (resultImage.startsWith("data:")) {
        const base64 = resultImage.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
        shareUri = `${FileSystem.cacheDirectory}photoshoot-share.png`;
        await FileSystem.writeAsStringAsync(shareUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      } else if (resultImage.startsWith("http")) {
        const download = await FileSystem.downloadAsync(resultImage, `${FileSystem.cacheDirectory}photoshoot-share.png`);
        shareUri = download.uri;
      }
      await Share.share({ url: shareUri, message: "Check out this shoot I made in Muse." });
    } catch (error: any) {
      console.error("Share failed", error);
      Alert.alert("Share Error", error?.message || "Unable to share this image.");
    }
  };

  const handleChangeFit = () => {
    chooseProductFromStore();
  };

  const detailDisplayImage = resultImage || baseImageUri || activeScenario?.image || null;
  const readyToRun = !!activeScenario && !!baseImageUri;

  const renderScenarioCard = (scenario: PhotoshootScenario) => (
    <TouchableOpacity
      key={scenario.id}
      style={[styles.scenarioCard, { backgroundColor: theme.card }]}
      onPress={() => {
        setActiveScenario(scenario);
        setMode("detail");
        setResultImage(null);
        setViewingSaved(false);
        setRemixPrompt("");
        setAdditionalImage(null);
      }}
    >
      {scenario.image ? <Image source={scenario.image} style={styles.cardImage} resizeMode="cover" /> : <View style={[styles.cardImage, styles.cardImagePlaceholder]} />}
      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
        {getDisplayTitle(scenario.title)}
      </Text>
    </TouchableOpacity>
  );

  const renderScenarioPicker = () => (
    <ScrollView contentContainerStyle={styles.selectorContent} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <Text style={[styles.appTitle, { color: theme.text }]}>Pick a Photoshoot</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Choose a prompt to continue.</Text>
      </View>
      <View style={styles.scenarioGrid}>{scenarios.map(renderScenarioCard)}</View>
    </ScrollView>
  );

  const renderDetail = () => (
    <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>back</Text>
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.text }]}>c0ntent</Text>
        <View style={[styles.coinsContainerFlow, { backgroundColor: theme.text }]}>
          <MuseCoin width={22} height={22} style={styles.coinIcon} />
          <Text style={[styles.coinTextFlow, { color: theme.background }]}>325</Text>
        </View>
      </View>

      <View style={[styles.previewCard, { backgroundColor: theme.card }]}> 
        {detailDisplayImage ? (
          <View style={styles.previewImageWrapper}>
            <Image source={typeof detailDisplayImage === "string" ? { uri: detailDisplayImage } : detailDisplayImage} style={styles.previewImage} resizeMode="contain" />
          </View>
        ) : (
          <Text style={[styles.emptyPreviewText, { color: theme.secondaryText }]}>Add an image to get started</Text>
        )}
      </View>

      {activeScenario ? (
        <View style={styles.scenarioMeta}>
        <Text style={[styles.scenarioTitle, { color: theme.text }]}>{getDisplayTitle(activeScenario.title) || activeScenario.title}</Text>
          <Text style={[styles.scenarioSummary, { color: theme.secondaryText }]}>{activeScenario.summary}</Text>
        </View>
      ) : null}

      <View style={styles.inlineButtons}>
        <TouchableOpacity style={[styles.inlineButton, { backgroundColor: theme.text }]} onPress={pickFromLibrary}>
          <Ionicons name="image-outline" size={18} color={theme.background} />
          <Text style={[styles.inlineButtonText, { color: theme.background }]}>upload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.inlineButton, { backgroundColor: theme.text }]} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={18} color={theme.background} />
          <Text style={[styles.inlineButtonText, { color: theme.background }]}>take pic</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.primaryButton, styles.primaryButtonOutlined, { borderColor: theme.text }]} onPress={chooseProductFromStore}>
        <Text style={[styles.primaryButtonText, { color: theme.text }]}>choose product from store</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          readyToRun ? { backgroundColor: theme.text } : { backgroundColor: theme.tabIconDefault },
        ]}
        disabled={!readyToRun}
        onPress={generatePhotoshoot}
      >
        <Text style={[styles.primaryButtonText, { color: readyToRun ? theme.background : "#fff" }]}>run photoshoot</Text>
      </TouchableOpacity>

      {resultImage ? (
        <View style={styles.resultSection}>
          <View style={styles.remixRow}>
            <TextInput
              style={[styles.remixInput, { borderColor: theme.tabIconDefault, backgroundColor: theme.inputBackground ?? "rgba(0,0,0,0.03)", color: theme.text }]}
              placeholder="Type smart edits..."
              placeholderTextColor={theme.secondaryText}
              value={remixPrompt}
              onChangeText={setRemixPrompt}
              multiline
            />
            <TouchableOpacity style={styles.addReferenceButton} onPress={pickAdditionalImage}>
              <Ionicons name="images" size={20} color={theme.tint} />
              <Text style={[styles.addReferenceText, { color: theme.tint }]}>Add reference</Text>
            </TouchableOpacity>
          </View>

          {additionalImage ? (
            <View style={[styles.extraImagePreview, { borderColor: theme.tabIconDefault }]}>
              <Image source={{ uri: additionalImage }} style={styles.extraImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeExtraButton} onPress={() => setAdditionalImage(null)}>
                <Text style={styles.removeExtraText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.text }]} onPress={handleRemix}>
              <Text style={[styles.actionButtonText, { color: theme.background }]}>remix</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: viewingSaved ? theme.tabIconDefault : theme.text }]} onPress={handleSave} disabled={viewingSaved}>
              <Text style={[styles.actionButtonText, { color: theme.background }]}>save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.text }]} onPress={handleShare}>
              <Text style={[styles.actionButtonText, { color: theme.background }]}>share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.text }]} onPress={handleChangeFit}>
              <Text style={[styles.actionButtonText, { color: theme.background }]}>change fit</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {mode === "select" ? renderScenarioPicker() : renderDetail()}
      <LoadingModal visible={isLoading} text={loadingText} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4,
    paddingTop: 15,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
  },
  topTitle: {
    fontSize: 24,
    fontFamily: "Inter-ExtraBold",
    letterSpacing: 1,
  },
  coinsContainerFlow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coinIcon: {
    marginRight: 6,
  },
  coinTextFlow: {
    fontSize: 16,
    fontFamily: "Inter-ExtraBold",
  },
  previewCard: {
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 18,
    padding: 12,
  },
  previewImageWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
    width: "100%",
    aspectRatio: 3 / 4,
    justifyContent: "center",
    alignItems: "center",
  },

  //PAINNN
  previewImage: {
    width: "110%",
    height: "110%",
  },
  emptyPreviewText: {
    textAlign: "center",
    padding: 32,
    fontFamily: "Inter-Bold",
  },
  scenarioMeta: {
    marginBottom: 20,
  },
  scenarioTitle: {
    fontFamily: "Inter-ExtraBold",
    fontSize: 22,
    marginBottom: 6,
  },
  scenarioSummary: {
    fontFamily: "Inter-Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  inlineButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  inlineButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  inlineButtonText: {
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
  },
  primaryButtonOutlined: {
    backgroundColor: "transparent",
  },
  primaryButtonText: {
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
    fontSize: 14,
    letterSpacing: 1,
  },
  resultSection: {
    marginTop: 10,
  },
  remixRow: {
    gap: 12,
  },
  remixInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  addReferenceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  addReferenceText: {
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
  extraImagePreview: {
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
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
    fontFamily: "Inter-Bold",
    color: "#ff3b30",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonText: {
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  selectorContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  detailHeader: {
    marginTop: 12,
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 24,
    fontFamily: "Inter-ExtraBold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
    marginTop: 4,
  },
  scenarioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  scenarioCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.1,
  },
  cardImagePlaceholder: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  cardTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 15,
    padding: 12,
  },
});
