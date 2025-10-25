import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Image, Pressable, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useUser } from "../lib/UserContext";
import { ddb } from "../lib/aws/dynamo";
import { ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { Ionicons } from "@expo/vector-icons"; // Import Ionicons

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

  const styles = getStyles(theme);

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

  useFocusEffect(
    React.useCallback(() => {
      loadMuses();
    }, [])
  );

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
        <TouchableOpacity style={styles.backButtonNew} onPress={() => router.back()}>
          <View style={styles.backIconCircle}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </View>
          <Text style={styles.backText}>back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Select Muse</Text>
        <View style={styles.backButtonNew} />
      </View>

      <View style={styles.addButtonContainer}>
        <TouchableOpacity onPress={() => router.push("/create-muse")} style={[styles.addButton, { backgroundColor: theme.text }]} disabled={!userId}>
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
                <TouchableOpacity key={muse.museID} onPress={() => handleSelectMuse(muse.museID)} style={[styles.museCard, { backgroundColor: theme.card }]} activeOpacity={0.7} disabled={!userId}>
                  <Image source={{ uri: muse.S3Location }} style={styles.museImage} />
                  <Text style={[styles.museName, { color: theme.text }]} numberOfLines={2}>
                    {muse.Name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 5,
    },
    headerTitle: {
      flex: 1,
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      color: theme.text,
      marginHorizontal: 10,
    },
    addButtonContainer: { paddingHorizontal: 20, paddingVertical: 12, alignItems: "flex-end" },
    addButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    addButtonText: {
      color: theme.background,
      fontSize: 14,
      fontWeight: "600",
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    emptyState: { marginTop: 60, alignItems: "center" },
    emptyText: { fontSize: 16, textAlign: "center", color: theme.secondaryText }, // Added theme color
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
    loadingText: { fontSize: 16, marginTop: 16, color: theme.secondaryText }, // Added theme color
    musesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    museCard: {
      width: "48%",
      borderRadius: 12,
      marginBottom: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      backgroundColor: theme.card,
    },
    museImage: { width: "100%", height: 200, resizeMode: "cover" },
    museName: {
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
      padding: 12,
      color: theme.text,
    },
    backButtonNew: {
      alignItems: "center",
      justifyContent: "center",
      width: 50,
      height: 50,
      backgroundColor: "transparent",
    },
    backIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      justifyContent: "center",
      alignItems: "center",
      borderColor: theme.text,
    },
    backText: {
      fontSize: 12,
      fontWeight: "600",
      marginTop: 2,
      color: theme.text,
    },
  });
