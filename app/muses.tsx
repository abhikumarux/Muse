import React, { useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, Image, Pressable,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useUser } from "../lib/UserContext";
import { ddb } from "../lib/aws/dynamo";
import { ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

interface Muse {
  museID: string;
  Name: string;
  Description: string;
  S3Location: string;
}

export default function MusesScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();
  const { userId, loading: userLoading, setSelectedMuseId } = useUser();

  const [muses, setMuses] = useState<Muse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMuses = async () => {
    setLoading(true);
    try {
      const scanResult = await ddb.send(new ScanCommand({ TableName: "Muse" }));
      const musesData: Muse[] = (scanResult.Items || []).map((item) => ({
        museID: item.museID?.S || "",
        Name: item.Name?.S || "",
        Description: item.Description?.S || "",
        S3Location: item.S3Location?.S || "",
      }));
      setMuses(musesData);
      console.log(`Loaded ${musesData.length} muses from DynamoDB`);
    } catch (error) {
      console.error("Error loading muses:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(React.useCallback(() => { loadMuses(); }, []));

  const handleSelectMuse = async (museID: string) => {
    if (!userId) {
      console.warn("User not loaded yet; ignoring tap");
      return;
    }
    try {
      await ddb.send(
        new UpdateItemCommand({
          TableName: "MuseUsers",
          Key: { userId: { S: userId } },
          UpdateExpression: "SET selectedMuseId = :museId",
          ExpressionAttributeValues: { ":museId": { S: museID } },
        })
      );
      setSelectedMuseId(museID); // instant UI update
      console.log(`Updated user ${userId} with selected muse: ${museID}`);
      router.back();
    } catch (error) {
      console.error("Error selecting muse:", error);
    }
  };

  if (userLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading your profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Select Muse</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.addButtonContainer}>
        <TouchableOpacity onPress={() => router.push("/create-muse")} style={[styles.addButton, { backgroundColor: theme.tint }]} disabled={!userId}>
          <Text style={styles.addButtonText}>+ Add Muse</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading muses...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {muses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No muses yet. Create your first one!</Text>
            </View>
          ) : (
            <View style={styles.musesGrid}>
              {muses.map((muse) => (
                <TouchableOpacity
                  key={muse.museID}
                  onPress={() => handleSelectMuse(muse.museID)}
                  style={[styles.museCard, { backgroundColor: theme.card }]}
                  activeOpacity={0.7}
                  disabled={!userId}
                >
                  <Image source={{ uri: muse.S3Location }} style={styles.museImage} />
                  <Text style={[styles.museName, { color: theme.text }]} numberOfLines={2}>{muse.Name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.1)", justifyContent: "center", alignItems: "center" },
  backButtonText: { fontSize: 24, fontWeight: "bold" },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  addButtonContainer: { paddingHorizontal: 20, paddingVertical: 12, alignItems: "flex-end" },
  addButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyState: { marginTop: 60, alignItems: "center" },
  emptyText: { fontSize: 16, textAlign: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  loadingText: { fontSize: 16, marginTop: 16 },
  musesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  museCard: { width: "48%", borderRadius: 12, marginBottom: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  museImage: { width: "100%", height: 200, resizeMode: "cover" },
  museName: { fontSize: 16, fontWeight: "600", textAlign: "center", padding: 12 },
});