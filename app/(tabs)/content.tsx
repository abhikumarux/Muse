import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { photoshootScenarios, type PhotoshootScenario } from "@/lib/config/photoshootScenarios";
import { MuseCoin } from "@/assets/svg/MuseCoin";
import ContentText from "@/assets/svg/ContentText";

const FAVORITES_KEY = "muse.photoshoot.favorites";
const CARD_WIDTH = (Dimensions.get("window").width - 60) / 2;
const STUDIO_TAG_REGEX = /\(Studio\)/i;

const scenarioIsStudio = (scenario: PhotoshootScenario) => scenario.category === "studio" || STUDIO_TAG_REGEX.test(scenario.title);
const getDisplayTitle = (title: string) => title.replace(STUDIO_TAG_REGEX, "").trim();

export default function ContentTab() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const styles = getStyles(theme);
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<"all" | "favorites">("all");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) setFavoriteIds(JSON.parse(stored));
      } catch (error) {
        console.warn("Failed to load photoshoot favorites", error);
      }
    })();
  }, []);

  const toggleFavorite = async (scenarioId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavoriteIds((prev) => {
      const exists = prev.includes(scenarioId);
      const updated = exists ? prev.filter((id) => id !== scenarioId) : [...prev, scenarioId];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated)).catch((error) => console.warn("Failed to persist favorites", error));
      return updated;
    });
  };

  const { photoshootPrompts, studioPrompts } = useMemo(() => {
    const prompts: PhotoshootScenario[] = [];
    const studios: PhotoshootScenario[] = [];
    photoshootScenarios.forEach((scenario) => {
      if (scenarioIsStudio(scenario)) studios.push(scenario);
      else prompts.push(scenario);
    });
    return { photoshootPrompts: prompts, studioPrompts: studios };
  }, []);

  const filteredPhotoshoots = useMemo(() => {
    if (activeFilter === "favorites") {
      return photoshootPrompts.filter((scenario) => favoriteIds.includes(scenario.id));
    }
    return photoshootPrompts;
  }, [activeFilter, favoriteIds, photoshootPrompts]);

  const filteredStudios = useMemo(() => {
    if (activeFilter === "favorites") {
      return studioPrompts.filter((scenario) => favoriteIds.includes(scenario.id));
    }
    return studioPrompts;
  }, [activeFilter, favoriteIds, studioPrompts]);

  const handleOpenScenario = (scenario: PhotoshootScenario) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/create-photoshoot",
      params: {
        scenarioId: scenario.id,
        scenarioTitle: encodeURIComponent(scenario.title),
        scenarioSummary: encodeURIComponent(scenario.summary),
        scenarioPrompt: encodeURIComponent(scenario.prompt),
      },
    });
  };

  const renderScenarioCard = (scenario: PhotoshootScenario) => {
    const isFavorite = favoriteIds.includes(scenario.id);
    return (
      <MotiView key={scenario.id} style={styles.scenarioCardContainer} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "timing", duration: 300 }}>
        <TouchableOpacity style={[styles.scenarioCard, { backgroundColor: theme.card }]} activeOpacity={0.9} onPress={() => handleOpenScenario(scenario)}>
          {scenario.image ? <Image source={scenario.image} style={styles.cardImage} resizeMode="cover" /> : <View style={[styles.cardImage, styles.cardImagePlaceholder]} />}
          <TouchableOpacity
            style={styles.favoriteToggle}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={(event) => {
              event.stopPropagation();
              toggleFavorite(scenario.id);
            }}
          >
            <MotiView key={isFavorite ? "favorite" : "not-favorite"} from={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, stiffness: 200 }}>
              <Ionicons name={isFavorite ? "star" : "star-outline"} size={20} color={isFavorite ? "#f4d03f" : theme.secondaryText} />
            </MotiView>
          </TouchableOpacity>
        </TouchableOpacity>

        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {getDisplayTitle(scenario.title)}
        </Text>
      </MotiView>
    );
  };

  const renderSection = (title: string, data: PhotoshootScenario[]) => (
    <View style={{ marginBottom: 32 }}>
      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{title}</Text>
      <View style={styles.scenarioGrid}>{data.length ? data.map(renderScenarioCard) : <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No favorites yet.</Text>}</View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <MotiView style={{ flex: 1 }} from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 100, type: "timing", duration: 300 }}>
        <View style={[styles.topBarContainer, { backgroundColor: theme.background }]}>
          <View style={styles.headerSpacer} />
          <View style={styles.titleImageContainer}>
            <ContentText fill={theme.text} style={{ marginBottom: 4 }} />
          </View>
          <View style={[styles.coinsContainer, { backgroundColor: theme.text }]}>
            <MuseCoin width={20} height={20} style={styles.coinIcon} />
            <Text style={[styles.coinText, { color: theme.background }]}>325</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {[
              { id: "all", label: "All" },
              { id: "favorites", label: "Favorites" },
            ].map((chip) => {
              const active = activeFilter === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.filterChip, { backgroundColor: active ? theme.text : colorScheme === "light" ? "#f0f0f0" : "#2c2c2e" }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setActiveFilter(chip.id as "all" | "favorites");
                  }}
                >
                  <Text style={[styles.filterText, { color: active ? theme.background : theme.text }]}>{chip.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {renderSection("// Photoshoot's", filteredPhotoshoots)}
          {renderSection("// Studio ", filteredStudios)}
        </ScrollView>
      </MotiView>
    </SafeAreaView>
  );
}

const getStyles = (theme: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 120,
    },
    topBarContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 5,
      marginTop: 13,
    },
    headerSpacer: {
      width: 70,
    },
    titleImageContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter-Medium",
    },
    coinsContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.text,
    },
    coinIcon: { width: 12, height: 12, marginRight: 8 },

    coinText: { fontSize: 16, color: theme.background, fontFamily: "Inter-ExtraBold" },

    filterRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 24,
      justifyContent: "center",
      marginTop: 20,
    },
    filterChip: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 12,
    },
    filterText: {
      fontSize: 14,
      fontFamily: "Inter-ExtraBold",
      textTransform: "uppercase",
    },
    sectionLabel: {
      fontFamily: "Inter-Bold",
      fontSize: 12,
      marginBottom: 12,
      borderColor: theme.secondaryText,
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 2,
      overflow: "hidden",
      alignSelf: "flex-start",
      textAlign: "center",
      textTransform: "uppercase",
    },
    scenarioGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    scenarioCardContainer: {
      width: CARD_WIDTH,
      marginBottom: 24,
    },
    scenarioCard: {
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    cardImage: {
      width: "100%",
      height: CARD_WIDTH * 1.4,
    },
    cardImagePlaceholder: {
      backgroundColor: "rgba(0,0,0,0.05)",
    },
    cardTitle: {
      fontFamily: "Inter-Bold",
      fontSize: 16,
      marginTop: 8,
      textAlign: "center",
      textTransform: "uppercase",
    },
    favoriteToggle: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "rgba(0,0,0,0.4)",
      borderRadius: 16,
      padding: 6,
    },
    emptyText: {
      fontFamily: "Inter-Medium",
      fontSize: 14,
      textAlign: "center",
      width: "100%",
    },
  });
