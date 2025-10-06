import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useRouter } from "expo-router";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Buffer } from "buffer";

const Gemini_API_KEY = "AIzaSyBNbBd8yqnOTSM5C3bt56hgN_5X8OmMorY";
const MUSE_REFERENCE_IMAGE = "https://muse-app-uploads.s3.us-east-2.amazonaws.com/MuseStorage/Streetwear.png";

// S3 Configuration
const REGION = "us-east-2";
const BUCKET = "muse-app-uploads";
const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36";

export default function CreateMuseScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();

  const [museName, setMuseName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreateMuse = async () => {
    if (!museName.trim()) {
      Alert.alert("Error", "Please enter a name for your muse.");
      return;
    }

    if (!prompt.trim()) {
      Alert.alert("Error", "Please enter a prompt for your muse.");
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch the reference image and convert to base64
      const imageResponse = await fetch(MUSE_REFERENCE_IMAGE);
      const imageBlob = await imageResponse.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64 = base64data.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
      });

      // 2. Build the Gemini prompt
      const geminiPrompt = `This is a prompt to create an image based off of the one I have provided. Take the idea of the following prompt and put it onto a variant of this image I provide with the same black background: ${prompt}`;

      // 3. Build request body for Gemini API
      const parts: any[] = [
        {
          inline_data: {
            mime_type: "image/png",
            data: imageBase64,
          },
        },
        { text: geminiPrompt },
      ];

      const body = JSON.stringify({
        contents: [{ parts }],
      });

      // 4. Call Gemini API
      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-goog-api-key": Gemini_API_KEY,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API HTTP error:", response.status, errorText);
        Alert.alert("Error", `Gemini API request failed: ${response.status}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("✅ Gemini response received");

      // 5. Extract generated image from response
      let generatedImageData = null;
      
      // The image is in: candidates[0].content.parts[0].inline_data.data
      const candidate = data?.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inline_data?.data) {
            generatedImageData = part.inline_data.data;
            break;
          }
          // Also check for inlineData (camelCase variant)
          if (part.inlineData?.data) {
            generatedImageData = part.inlineData.data;
            break;
          }
        }
      }
      
      if (!generatedImageData) {
        console.error("❌ Could not find image in response structure.");
        console.error("Full response:", JSON.stringify(data, null, 2));
        Alert.alert(
          "Error", 
          "Gemini generated a response but no image was found. This might be a text-only response or unexpected format."
        );
        setLoading(false);
        return;
      }

      // 6. Set the generated image (with data URI prefix for display)
      const imageDataUri = `data:image/png;base64,${generatedImageData}`;
      setGeneratedImage(imageDataUri);
      
    } catch (error) {
      console.error("Error creating muse:", error);
      Alert.alert("Error", "Something went wrong while creating the muse.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMuse = async () => {
    if (!generatedImage) return;

    setSaving(true);

    try {
      // 1. Set up S3 client
      const s3Client = new S3Client({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: REGION },
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });

      // 2. Prepare the image data
      const key = `MuseStorage/${museName}.png`;
      const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // 3. Upload to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: "image/png",
        })
      );

      const imageUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}`;
      console.log("✅ Uploaded muse to S3:", imageUrl);

      // 4. Save to DynamoDB
      const dynamoClient = new DynamoDBClient({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: REGION },
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });

      // Generate unique museId using timestamp + random string
      const museId = `muse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await dynamoClient.send(
        new PutItemCommand({
          TableName: "Muse",
          Item: {
            museID: { S: museId }, // Changed from museId to museID (capital D)
            Name: { S: museName },
            Description: { S: prompt },
            S3Location: { S: imageUrl },
          },
        })
      );

      console.log("✅ Muse saved to DynamoDB:", museId);

      Alert.alert("Success", "Muse saved successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);

    } catch (error) {
      console.error("Error saving muse:", error);
      Alert.alert("Error", "Failed to save muse. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {generatedImage ? "Your Muse" : "Create Muse"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        {!generatedImage ? (
          // Form View
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.label, { color: theme.text }]}>Muse Name</Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.secondaryText + "40",
                },
              ]}
              placeholder="e.g., Urban Explorer"
              placeholderTextColor={theme.secondaryText}
              value={museName}
              onChangeText={setMuseName}
            />

            <Text style={[styles.label, { color: theme.text, marginTop: 24 }]}>
              Describe your muse
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Enter a prompt that describes the style, vibe, or theme of your muse
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.secondaryText + "40",
                },
              ]}
              placeholder="e.g., Minimalist streetwear with bold graphics"
              placeholderTextColor={theme.secondaryText}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Pressable
              onPress={handleCreateMuse}
              style={[
                styles.createButton,
                { backgroundColor: loading ? theme.secondaryText : theme.tint },
              ]}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={[styles.createButtonText, { marginLeft: 12 }]}>
                    Generating...
                  </Text>
                </View>
              ) : (
                <Text style={styles.createButtonText}>Generate Muse</Text>
              )}
            </Pressable>
          </ScrollView>
        ) : (
          // Preview View
          <ScrollView contentContainerStyle={styles.previewContent}>
            <View style={[styles.imageContainer, { backgroundColor: theme.card }]}>
              <Image source={{ uri: generatedImage }} style={styles.generatedImage} />
            </View>

            <View style={styles.messageContainer}>
              <Text style={[styles.successTitle, { color: theme.text }]}>
                ✨ {museName} is Ready!
              </Text>
              <Text style={[styles.successMessage, { color: theme.secondaryText }]}>
                Your muse has been generated. Save it to add to your collection.
              </Text>
            </View>

            <Pressable
              onPress={handleSaveMuse}
              style={[
                styles.saveButton,
                { backgroundColor: saving ? theme.secondaryText : theme.tint },
              ]}
              disabled={saving}
            >
              {saving ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={[styles.createButtonText, { marginLeft: 12 }]}>
                    Saving...
                  </Text>
                </View>
              ) : (
                <Text style={styles.createButtonText}>Save Muse</Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  label: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 32,
  },
  createButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 32,
  },
  generatedImage: {
    width: "100%",
    height: 400,
    borderRadius: 12,
    resizeMode: "contain",
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  saveButton: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});