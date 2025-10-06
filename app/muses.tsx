import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "./UserContext";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useRouter, useFocusEffect } from "expo-router";
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

const REGION = "us-east-2";
const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36";

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
  const { userId } = useUser();

  const [muses, setMuses] = useState<Muse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMuses = async () => {
    setLoading(true);
    try {
      const client = new DynamoDBClient({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: REGION },
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });

      const scanResult = await client.send(
        new ScanCommand({
          TableName: "Muse",
        })
      );

      const musesData: Muse[] = (scanResult.Items || []).map((item) => ({
        museID: item.museID?.S || "",
        Name: item.Name?.S || "",
        Description: item.Description?.S || "",
        S3Location: item.S3Location?.S || "",
      }));

      setMuses(musesData);
      console.log(`✅ Loaded ${musesData.length} muses from DynamoDB`);
    } catch (error) {
      console.error("Error loading muses:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load muses when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadMuses();
    }, [])
  );

  const handleSelectMuse = async (museID: string) => {
    if (!userId) {
      console.error("No userId available");
      return;
    }

    try {
      const client = new DynamoDBClient({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: REGION },
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });

      // Update the MuseUsers table to set the selected muse
      await client.send(
        new UpdateItemCommand({
          TableName: "MuseUsers",
          Key: {
            userId: { S: userId },
          },
          UpdateExpression: "SET selectedMuseId = :museId",
          ExpressionAttributeValues: {
            ":museId": { S: museID },
          },
        })
      );

      console.log(`✅ Updated user ${userId} with selected muse: ${museID}`);
      
      // Navigate back to home
      router.back();
    } catch (error) {
      console.error("Error selecting muse:", error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Select Muse</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Add Muse Button (Top Right) */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          onPress={() => router.push('/create-muse')}
          style={[styles.addButton, { backgroundColor: theme.tint }]}
        >
          <Text style={styles.addButtonText}>+ Add Muse</Text>
        </TouchableOpacity>
      </View>

      {/* Muses Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Loading muses...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {muses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                No muses yet. Create your first one!
              </Text>
            </View>
          ) : (
            <View style={styles.musesGrid}>
              {muses.map((muse) => (
                <TouchableOpacity
                  key={muse.museID}
                  onPress={() => handleSelectMuse(muse.museID)}
                  style={[styles.museCard, { backgroundColor: theme.card }]}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: muse.S3Location }}
                    style={styles.museImage}
                  />
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

const styles = StyleSheet.create({
  container: {
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
  addButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "flex-end",
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyState: {
    marginTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  musesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  museCard: {
    width: "48%",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  museImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  museName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    padding: 12,
  },
});
