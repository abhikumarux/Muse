import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from "../../lib/UserContext";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const REGION = "us-east-2";
const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36";

const salesData = [
  { day: "S", profit: 60 },
  { day: "M", profit: 75 },
  { day: "T", profit: 65 },
  { day: "W", profit: 50 },
  { day: "T", profit: 85 },
  { day: "F", profit: 40 },
  { day: "S", profit: 70 },
];

export default function IndexScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { userId } = useUser();

  const [selectedMuse, setSelectedMuse] = useState<{
    name: string;
    image: string;
  } | null>(null);
  const [loadingMuse, setLoadingMuse] = useState(true);

  const loadSelectedMuse = async () => {
    if (!userId) {
      setLoadingMuse(false);
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

      // Get user's selected muse ID
      const userResult = await client.send(
        new GetItemCommand({
          TableName: "MuseUsers",
          Key: {
            userId: { S: userId },
          },
        })
      );

      const selectedMuseId = userResult.Item?.selectedMuseId?.S;

      if (selectedMuseId) {
        // Get the muse details
        const museResult = await client.send(
          new GetItemCommand({
            TableName: "Muse",
            Key: {
              museID: { S: selectedMuseId },
            },
          })
        );

        if (museResult.Item) {
          setSelectedMuse({
            name: museResult.Item.Name?.S || "Muse",
            image: museResult.Item.S3Location?.S || "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading selected muse:", error);
    } finally {
      setLoadingMuse(false);
    }
  };

  // Load muse when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadSelectedMuse();
    }, [userId])
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
        />
        <View style={[styles.coinsContainer, { backgroundColor: theme.headerChip }]}>
          <Image
            source={require("@/assets/images/coin-icon.png")}
            style={styles.coinIcon}
          />
          <Text style={styles.coinText}>325</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
      >
        <View style={styles.topCardsContainer}>
          {/* Muse Card - Navigate to Muses Screen */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.museCardContainer}
            onPress={() => router.push('/muses')}
          >
            {loadingMuse ? (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <ActivityIndicator size="small" color={theme.tint} style={{ marginVertical: 60 }} />
              </View>
            ) : selectedMuse ? (
              <View style={styles.museImageCard}>
                <Image
                  source={{ uri: selectedMuse.image }}
                  style={styles.museBackgroundImage}
                />
                <View style={styles.museOverlay}>
                  <Text style={styles.museTitleOverlay}>
                    {selectedMuse.name}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <Text style={[styles.maherTitle, { color: theme.text }]}>Select Muse</Text>
                <Image
                  source={require("@/assets/images/muse-placeholder.png")}
                  style={styles.maherAvatar}
                />
                <Text style={[styles.maherSubtitle, { color: theme.text }]}>
                  Tap to choose
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sales Card */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View>
              <Text style={[styles.salesTitle, { color: theme.text }]}>
                Total Sales
              </Text>
              <Text style={[styles.salesSubtitle, { color: theme.secondaryText }]}>
                Calculated in last 30 days
              </Text>
            </View>
            <View style={styles.chartContainer}>
              {salesData.map((data, index) => (
                <View key={index} style={styles.barWrapper}>
                  <View style={[styles.bar, { height: `${data.profit}%` }]} />
                  <Text style={[styles.barLabel, { color: theme.secondaryText }]}>
                    {data.day}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 16,
  },
  logo: {
    width: 200,
    height: 80,
    resizeMode: "contain",
    marginTop: -20,
    marginLeft: -20,
  },
  coinsContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coinIcon: { width: 24, height: 24, marginRight: 8 },
  coinText: { fontSize: 16, fontWeight: "bold", color: "#F57F17" },

  topCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  museCardContainer: {
    width: CARD_WIDTH,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
  museImageCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.8,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  museBackgroundImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  museOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  museTitleOverlay: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  maherTitle: { fontSize: 28, fontWeight: "bold" },
  maherAvatar: {
    width: CARD_WIDTH * 0.8,
    height: CARD_WIDTH * 1.2,
    resizeMode: "contain",
    marginVertical: 8,
  },
  maherSubtitle: { fontSize: 20 },
  salesTitle: { fontSize: 28, fontWeight: "bold" },
  salesSubtitle: { fontSize: 18 },

  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    alignSelf: "stretch",
    height: 120,
    marginVertical: 24,
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
  },
  bar: {
    width: 12,
    backgroundColor: "#00E676",
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 12,
    marginTop: 8,
  },
});