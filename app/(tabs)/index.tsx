import React, { useRef, useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Image, Dimensions, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from "../../lib/UserContext";
import { DynamoDBClient, GetItemCommand, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

const { width } = Dimensions.get("window");
const FULL_WIDTH = width;
const ITEM_WIDTH = FULL_WIDTH * 0.7; // Each item will be 70% of the screen width
const ITEM_SPACING = (FULL_WIDTH - ITEM_WIDTH) / 2;
const CARD_ASPECT_RATIO = 1.25;

const REGION = "us-east-2";
const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36";

interface Muse {
  museID: string;
  Name: string;
  Description: string;
  S3Location: string;
}

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
  const router = useRouter();
  const { userId, selectedMuseId, setSelectedMuseId } = useUser();
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const [muses, setMuses] = useState<Muse[]>([]);
  const [loadingMuses, setLoadingMuses] = useState(true);

  const loadMusesAndSelection = async () => {
    if (!userId) {
      setLoadingMuses(false);
      return;
    }
    setLoadingMuses(true);
    try {
      const client = new DynamoDBClient({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: REGION },
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });

      // Scan for all muses
      const scanResult = await client.send(new ScanCommand({ TableName: "Muse" }));
      const musesData: Muse[] = (scanResult.Items || []).map((item) => ({
        museID: item.museID?.S || "",
        Name: item.Name?.S || "",
        Description: item.Description?.S || "",
        S3Location: item.S3Location?.S || "",
      }));
      setMuses(musesData);

      // Get user's selected muse ID from context or fetch if needed
      const currentMuseId = selectedMuseId || (await fetchSelectedMuseId(client));

      if (currentMuseId && musesData.length > 0) {
        const initialIndex = musesData.findIndex((muse) => muse.museID === currentMuseId);
        if (initialIndex !== -1) {
          // Manually set the scrollX value to update the animation
          scrollX.setValue(initialIndex * ITEM_WIDTH);
          // Use setTimeout to ensure the scroll happens after the render
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ x: initialIndex * ITEM_WIDTH, animated: false });
          }, 0);
        }
      }
    } catch (error) {
      console.error("Error loading muses:", error);
    } finally {
      setLoadingMuses(false);
    }
  };

  const fetchSelectedMuseId = async (client: DynamoDBClient) => {
    if (!userId) return null;
    const userResult = await client.send(
      new GetItemCommand({
        TableName: "MuseUsers",
        Key: { userId: { S: userId } },
      })
    );
    return userResult.Item?.selectedMuseId?.S || null;
  };

  // Load muses when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadMusesAndSelection();
    }, [userId]) // Only re-run if the user changes
  );

  const handleMuseSelection = async (newIndex: number) => {
    if (!userId || !muses[newIndex]) return;

    const newMuseId = muses[newIndex].museID;

    // Prevent redundant updates
    if (newMuseId === selectedMuseId) return;

    setSelectedMuseId(newMuseId); // Update context immediately for snappy UI

    try {
      const client = new DynamoDBClient({
        region: REGION,
        credentials: fromCognitoIdentityPool({
          clientConfig: { region: REGION },
          identityPoolId: IDENTITY_POOL_ID,
        }),
      });

      await client.send(
        new UpdateItemCommand({
          TableName: "MuseUsers",
          Key: { userId: { S: userId } },
          UpdateExpression: "SET selectedMuseId = :museId",
          ExpressionAttributeValues: { ":museId": { S: newMuseId } },
        })
      );
    } catch (error) {
      console.error("Error updating selected muse:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require("@/assets/images/logo.png")} style={styles.logo} />
        <View style={[styles.coinsContainer, { backgroundColor: theme.headerChip }]}>
          <Image source={require("@/assets/images/coin-icon.png")} style={styles.coinIcon} />
          <Text style={styles.coinText}>325</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Muse Carousel Section */}
        <View style={styles.museCarouselContainer}>
          {loadingMuses ? (
            <View style={[styles.loadingCard, { backgroundColor: theme.card, justifyContent: "center" }]}>
              <ActivityIndicator size="large" color={theme.tint} />
            </View>
          ) : muses.length > 0 ? (
            <>
              {/* --- ADDED: Section Header --- */}
              <View style={styles.museHeader}>
                <Text style={[styles.museHeaderText, { color: theme.text }]}>Your Muses</Text>
                <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push("/muses")}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>

              <Animated.ScrollView
                ref={scrollViewRef as any}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={ITEM_WIDTH}
                contentContainerStyle={styles.carouselScrollView}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
                  handleMuseSelection(newIndex);
                }}
                scrollEventThrottle={16}
              >
                {muses.map((muse, index) => {
                  const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];
                  const scale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.8, 1, 0.8],
                    extrapolate: "clamp",
                  });
                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.5, 1, 0.5],
                    extrapolate: "clamp",
                  });
                  return (
                    <Animated.View key={muse.museID} style={[styles.museImageCard, { transform: [{ scale }], opacity }]}>
                      <Image source={{ uri: muse.S3Location }} style={styles.museBackgroundImage} />
                      <View style={styles.museOverlay}>
                        <Text style={styles.museTitleOverlay}>{muse.Name}</Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </Animated.ScrollView>
              {/* --- MOVED/REMOVED: "See All" button was here --- */}
            </>
          ) : (
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/muses")} style={[styles.largeCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.maherTitle, { color: theme.text }]}>Select Muse</Text>
              <Image source={require("@/assets/images/muse-placeholder.png")} style={styles.maherAvatar} />
              <Text style={[styles.maherSubtitle, { color: theme.text }]}>Tap to choose</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sales Card */}
        <View style={styles.bottomCardContainer}>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.salesHeader}>
              <Text style={[styles.salesTitle, { color: theme.text }]}>Total Sales</Text>
              <Text style={[styles.salesSubtitle, { color: theme.secondaryText }]}>Last 30 days</Text>
            </View>
            <View style={styles.chartContainer}>
              {salesData.map((data, index) => (
                <View key={index} style={styles.barWrapper}>
                  <View style={[styles.bar, { height: `${data.profit}%` }]} />
                  <Text style={[styles.barLabel, { color: theme.secondaryText }]}>{data.day}</Text>
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

  museCarouselContainer: {
    // MODIFIED: The height now only needs to account for the header and carousel
    minHeight: ITEM_WIDTH * CARD_ASPECT_RATIO + 50, // Added minHeight for placeholder
    marginBottom: 24,
  },
  carouselScrollView: {
    paddingHorizontal: ITEM_SPACING,
    alignItems: "center",
    height: ITEM_WIDTH * CARD_ASPECT_RATIO, // Give scrollview a fixed height
  },
  // RENAMED for clarity
  loadingCard: {
    height: ITEM_WIDTH * CARD_ASPECT_RATIO,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  // This is now just for the placeholder
  largeCard: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  museImageCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * CARD_ASPECT_RATIO,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  museBackgroundImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  museOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  museTitleOverlay: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  seeAllButton: {
    position: "absolute",
    top: 1,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
  },
  // MODIFIED: Styles for the "See All" button are now cleaner
  seeAllText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  // --- ADDED: Styles for the new Muse section header ---
  museHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  museHeaderText: {
    fontSize: 24,
    fontWeight: "bold",
  },

  maherTitle: { fontSize: 32, fontWeight: "bold", marginBottom: 16 },
  maherAvatar: {
    width: FULL_WIDTH * 0.5,
    height: FULL_WIDTH * 0.5,
    resizeMode: "contain",
    marginVertical: 8,
  },
  maherSubtitle: { fontSize: 22, marginTop: 8 },

  bottomCardContainer: {
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  salesHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  salesTitle: { fontSize: 24, fontWeight: "bold" },
  salesSubtitle: { fontSize: 16 },

  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 150,
    marginTop: 24,
    width: "100%",
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
  },
  bar: {
    width: 18,
    backgroundColor: "#00E676",
    borderRadius: 9,
  },
  barLabel: {
    fontSize: 14,
    marginTop: 8,
  },
});