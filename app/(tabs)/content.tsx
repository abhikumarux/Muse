import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { photoshootScenarios, type PhotoshootScenario } from "@/lib/config/photoshootScenarios";
import { MuseCoin } from "@/assets/svg/MuseCoin";
import ContentWordmark from "@/components/icons/ContentWordmark";

const FAVORITES_KEY = "muse.photoshoot.favorites";
const CARD_WIDTH = (Dimensions.get("window").width - 60) / 2;
const STUDIO_TAG_REGEX = /\(Studio\)/i;

const scenarioIsStudio = (scenario: PhotoshootScenario) => scenario.category === "studio" || STUDIO_TAG_REGEX.test(scenario.title);
const getDisplayTitle = (title: string) => title.replace(STUDIO_TAG_REGEX, "").trim();

export default function ContentTab() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
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
      <TouchableOpacity key={scenario.id} style={[styles.scenarioCard, { backgroundColor: theme.card }]} activeOpacity={0.9} onPress={() => handleOpenScenario(scenario)}>
        {scenario.image ? <Image source={scenario.image} style={styles.cardImage} resizeMode="cover" /> : <View style={[styles.cardImage, styles.cardImagePlaceholder]} />}
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {getDisplayTitle(scenario.title)}
        </Text>
        <TouchableOpacity
          style={styles.favoriteToggle}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={(event) => {
            event.stopPropagation();
            toggleFavorite(scenario.id);
          }}
        >
          <Ionicons name={isFavorite ? "star" : "star-outline"} size={20} color={isFavorite ? "#f4d03f" : theme.secondaryText} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, data: PhotoshootScenario[]) => (
    <View style={{ marginBottom: 32 }}>
      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{title}</Text>
      <View style={styles.scenarioGrid}>
        {data.length ? data.map(renderScenarioCard) : <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No favorites yet.</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <ContentWordmark color={theme.text} style={{ marginBottom: 4 }} />
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>// Photoshoots //</Text>
          </View>
          <View style={[styles.coinsContainer, { backgroundColor: theme.text }]}>
            <MuseCoin width={24} height={24} style={styles.coinIcon} />
            <Text style={[styles.coinText, { color: theme.background }]}>325</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {[
            { id: "all", label: "All" },
            { id: "favorites", label: "Favorites" },
          ].map((chip) => {
            const active = activeFilter === chip.id;
            return (
              <TouchableOpacity key={chip.id} style={[styles.filterChip, active && { backgroundColor: theme.text }]} onPress={() => setActiveFilter(chip.id as "all" | "favorites")}>
                <Text style={[styles.filterText, { color: active ? theme.background : theme.text }]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {renderSection("// Photoshoots //", filteredPhotoshoots)}
        {renderSection("// Studio //", filteredStudios)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  coinsContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
    justifyContent: "center",
  },
  coinIcon: {
    marginRight: 8,
  },
  coinText: {
    fontSize: 18,
    fontFamily: "Inter-ExtraBold",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  filterText: {
    fontSize: 14,
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontFamily: "Inter-Bold",
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  scenarioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  scenarioCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.2,
  },
  cardImagePlaceholder: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  cardTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
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
