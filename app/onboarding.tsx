import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

// Import slide components
import { Slide1Intro } from "@/components/onboarding/slides/Slide1Intro";
import { Slide2Muse } from "@/components/onboarding/slides/Slide2Muse";
import { Slide3Products } from "@/components/onboarding/slides/Slide3Products";
import { Slide4Inspo } from "@/components/onboarding/slides/Slide4Inspo";
import { Slide5Photoshoot } from "@/components/onboarding/slides/Slide5Photoshoot";
import { Slide6Sell } from "@/components/onboarding/slides/Slide6Sell";

const { width } = Dimensions.get("window");

// Custom Title Component for Red Text
const ColoredTitle = ({ text, colorizedWords, theme }: { text: string; colorizedWords?: string[]; theme: any }) => {
    if (!colorizedWords) {
        return <Text style={[styles.title, { color: theme.text }]}>{text}</Text>;
    }

    const parts = text.split(" ");
    const redColor = '#FF3B30'; 

    return (
        <Text style={[styles.title, { color: theme.text }]}>
            {parts.map((word, index) => {
                const cleanWord = word.replace(/[^a-zA-Z]/g, "");
                const isTarget = colorizedWords.includes(cleanWord);
                return (
                    <Text key={index} style={isTarget ? { color: redColor } : {}}>
                        {word}{index < parts.length - 1 ? " " : ""}
                    </Text>
                );
            })}
        </Text>
    );
};

const slides = [
  {
    id: "1",
    title: "Design and Sell Clothes in Minutes",
    colorized: ["Design", "Sell"],
    description: "Turn your creativity into reality. Create a full product from just a design idea instantly.",
    component: <Slide1Intro />,
  },
  {
    id: "2",
    title: "Choose or Create a Muse",
    description: "Select a persona that matches your vibe or create your own to guide your design journey.",
    component: <Slide2Muse />,
  },
  {
    id: "3",
    title: "Select a Product",
    description: "From hoodies to caps, choose from our vast catalog of high-quality apparel.",
    component: <Slide3Products />,
  },
  {
    id: "4",
    title: "Add your Inspo",
    description: "Upload your inspiration and watch our AI blend it seamlessly onto your chosen product.",
    component: <Slide4Inspo />,
  },
  {
    id: "5",
    title: "Photoshoot",
    description: "Visualize your designs on real models with our AI-powered photoshoot feature.",
    component: <Slide5Photoshoot />,
  },
  {
    id: "6",
    title: "Sell your Designs",
    description: "Connect your store and start selling your unique creations to the world.",
    component: <Slide6Sell />,
  },
];

export default function OnboardingScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const finishOnboarding = () => {
    router.replace("/register");
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    finishOnboarding();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        
        {/* 1. FlatList (Visual Content) */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={({ item }) => (
            <View style={[styles.slideContainer, { width }]}>
                
                {/* Title Section (Top) */}
                <View style={styles.textHeaderContainer}>
                    <ColoredTitle 
                        text={item.title} 
                        colorizedWords={item.colorized} 
                        theme={theme} 
                    />
                </View>

                {/* Visual Section (Middle) */}
                <View style={styles.visualContainer}>
                    {item.component}
                </View>

                {/* Description Section (Below Visual) */}
                <View style={styles.descriptionContainer}>
                    <Text style={[styles.description, { color: theme.secondaryText }]}>
                        {item.description}
                    </Text>
                </View>
            </View>
          )}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewConfig}
          scrollEventThrottle={32}
          bounces={false}
        />

        {/* 2. Footer (Buttons) */}
        <View style={styles.footer}>
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <PaginationDot key={index} index={index} currentIndex={currentIndex} theme={theme} />
            ))}
          </View>

          <View style={styles.actionArea}>
              {/* Main Button */}
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: theme.text }]} 
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: theme.background }]}>
                    {currentIndex === slides.length - 1 ? "Create Account" : "Next"}
                </Text>
                {currentIndex !== slides.length - 1 && (
                     <Ionicons name="arrow-forward" size={20} color={theme.background} style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>

              {/* Skip Button (Bottom) */}
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={[styles.skipText, { color: theme.secondaryText }]}>Skip</Text>
              </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const PaginationDot = ({ index, currentIndex, theme }: { index: number; currentIndex: number, theme: any }) => {
  const isActive = index === currentIndex;
  return (
    <MotiView
      style={{
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
        backgroundColor: isActive ? theme.text : theme.tabIconDefault,
      }}
      animate={{
        width: isActive ? 32 : 8,
        opacity: isActive ? 1 : 0.5,
      }}
      transition={{ type: "spring", damping: 15 }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 30, 
  },
  textHeaderContainer: {
    width: '100%',
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: 20,
    height: 80,
    justifyContent: 'center',
  },
  visualContainer: {
      flex: 1, 
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 30,
  },
  descriptionContainer: {
      width: '100%',
      paddingHorizontal: 40,
      alignItems: 'center',
      height: 100, 
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter-ExtraBold",
    textAlign: "center",
    lineHeight: 38,
  },
  description: {
    fontSize: 16,
    fontFamily: "Inter-ExtraBold",
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: "row",
    marginBottom: 30,
  },
  actionArea: {
      width: '100%',
      alignItems: 'center',
      gap: 20,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: "Inter-ExtraBold",
    fontWeight: "bold",
  },
  skipButton: {
    padding: 0,
    width: '100%',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontFamily: "Inter-ExtraBold",
    fontWeight: '700',
    opacity: 0.6,
  },
});