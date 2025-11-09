import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolate, runOnJS, Easing, useAnimatedScrollHandler } from "react-native-reanimated";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { useUser } from "../../lib/UserContext";
import { getIdTokenFromStorage } from "../../lib/aws/auth";
import { savePrintfulKeyAndStore, clearPrintfulKeyAndStore } from "../../lib/aws/userProfile";
import { WebView } from "react-native-webview";
import { listDesignsForCurrentUser } from "@/lib/aws/saveDesign";
import { getPrintfulStoreProducts } from "@/lib/aws/printful";
import { listPhotoshootsForCurrentUser } from "@/lib/aws/savePhotoshoot";

import ColorPicker from "react-native-wheel-color-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const { width, height } = Dimensions.get("window");
const SHEET_HEIGHT = Math.round(Math.min(height * 0.5, 720));
const STORAGE_KEY = "profile_ui_colors_v1";
const AVATAR_STORAGE_KEY = "profile_avatar_uri_v1";
const DEFAULT_AVATAR = "https://i.pravatar.cc/300";

export default function AnimatedProfile() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const router = useRouter();
  const { name: userName, printfulApiKey, currentStoreId, signOutLocal } = useUser();

  const [designCount, setDesignCount] = useState(0);
  const [photoshootCount, setPhotoshootCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [storeModalVisible, setStoreModalVisible] = useState(false);

  const [apiKey, setApiKey] = useState(printfulApiKey ?? "");
  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultPrimary = theme.tint ?? "#6e45e2";
  const defaultSecondary = "#6e45e2";
  const [themeColor1, setThemeColor1] = useState<string>(defaultPrimary);
  const [themeColor2, setThemeColor2] = useState<string>(defaultSecondary);
  const [colorPickerVisible, setColorPickerVisible] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<1 | 2>(1);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const originalColorRef = useRef<{ c1: string; c2: string }>({ c1: defaultPrimary, c2: defaultSecondary });

  const sheetTranslateY = useSharedValue(SHEET_HEIGHT);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.c1 && parsed.c2) {
            setThemeColor1(parsed.c1);
            setThemeColor2(parsed.c2);
            originalColorRef.current = { c1: parsed.c1, c2: parsed.c2 };
          }
        } else {
          originalColorRef.current = { c1: defaultPrimary, c2: defaultSecondary };
        }

        const savedAvatar = await AsyncStorage.getItem(AVATAR_STORAGE_KEY);
        if (savedAvatar) {
          setAvatarUri(savedAvatar);
        }
      } catch (e) {
        console.warn("Failed to load saved theme colors or avatar", e);
      }
    })();
  }, []);

  const openColorSheet = useCallback(() => {
    setColorPickerVisible(true);
    sheetTranslateY.value = SHEET_HEIGHT;
    sheetTranslateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
  }, []);

  const closeColorSheet = useCallback(
    async (shouldSave = true) => {
      sheetTranslateY.value = withTiming(SHEET_HEIGHT, { duration: 300, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(setColorPickerVisible)(false);
        }
      });

      if (shouldSave) {
        try {
          const payload = { c1: themeColor1, c2: themeColor2 };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          originalColorRef.current = payload;
        } catch (e) {
          console.warn("Failed to save theme colors", e);
        }
      } else {
        setThemeColor1(originalColorRef.current.c1);
        setThemeColor2(originalColorRef.current.c2);
      }
    },
    [themeColor1, themeColor2]
  );

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Sorry, we need camera roll permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUri = result.assets[0].uri;
      setAvatarUri(newUri);
      try {
        await AsyncStorage.setItem(AVATAR_STORAGE_KEY, newUri);
      } catch (e) {
        console.warn("Failed to save avatar image", e);
      }
    }
  };

  const fetchCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const [designs, photoshoots] = await Promise.all([listDesignsForCurrentUser(), listPhotoshootsForCurrentUser()]);
      setDesignCount(designs.length);
      setPhotoshootCount(photoshoots.length);

      if (printfulApiKey && currentStoreId) {
        const products = await getPrintfulStoreProducts(printfulApiKey, currentStoreId);
        setProductCount(products.length);
      } else {
        setProductCount(0);
      }
    } catch (err) {
      console.error("Error fetching profile counts:", err);
    } finally {
      setLoadingCounts(false);
    }
  }, [printfulApiKey, currentStoreId]);

  useFocusEffect(
    useCallback(() => {
      fetchCounts();
    }, [fetchCounts])
  );

  const handleSignOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOutLocal();
            router.replace("/login");
          } catch (err) {
            console.error("Error signing out:", err);
            Alert.alert("Error", "Something went wrong while signing out.");
          }
        },
      },
    ]);
  };

  async function fetchStores() {
    try {
      if (!apiKey) {
        Alert.alert("Error", "Please enter your API key first");
        return;
      }
      setLoadingStores(true);
      const resp = await fetch(`https://api.printful.com/stores`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || "Failed to fetch stores");
      setStores(data.result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  }

  async function saveSelection(store: any) {
    try {
      const idToken = await getIdTokenFromStorage();
      if (!idToken) return Alert.alert("Not signed in", "Please log in again.");
      await savePrintfulKeyAndStore(idToken, apiKey.trim(), String(store.id));
      Alert.alert("Saved", `Connected to store: ${store.name}`);
      setModalVisible(false);
      fetchCounts();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  async function removeConnection() {
    Alert.alert("Confirm Removal", "Are you sure you want to remove the Printful connection?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const idToken = await getIdTokenFromStorage();
            if (!idToken) return Alert.alert("Not signed in");
            await clearPrintfulKeyAndStore(idToken);
            setApiKey("");
            setStores([]);
            setProductCount(0);
            Alert.alert("Removed", "Printful connection cleared.");
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  }

  const printfulStoreUrl = "https://www.printful.com/dashboard/store";

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: sheetTranslateY.value }],
    };
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-100, 0, 150], [1.06, 1, 1.06], Extrapolate.CLAMP);
    const borderRadius = interpolate(scrollY.value, [0, 150], [20, 8], Extrapolate.CLAMP);
    return { transform: [{ scale }], borderRadius };
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* FIX: New MotiView wrapper for the main header block */}
        <MotiView from={{ opacity: 0, translateY: -20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 300 }}>
          <Animated.View style={[styles.animatedHeader, headerAnimatedStyle]}>
            <LinearGradient colors={[themeColor1, themeColor2]} style={styles.headerGradient}>
              {/* Adjusted inner MotiView: removed delay, reduced duration slightly */}
              <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 200 }} style={styles.headerContent}>
                <TouchableOpacity style={styles.colorPickerIcon} onPress={openColorSheet}>
                  <Ionicons name="color-palette-outline" size={20} color="#fff" />
                </TouchableOpacity>

                {/* === AVATAR START === */}
                <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarContainer}>
                  <Image source={{ uri: avatarUri ?? DEFAULT_AVATAR }} style={styles.avatar} />
                  <View style={styles.avatarEditIcon}>
                    <Ionicons name="pencil" size={12} color="#333" />
                  </View>
                </TouchableOpacity>
                {/* === AVATAR END === */}

                <Text style={styles.name}>{userName || "Muse User"}</Text>
                <View style={styles.statsRow}>
                  {[
                    { label: "Designs", value: designCount },
                    { label: "Shoots", value: photoshootCount },
                    { label: "Products", value: productCount },
                  ].map((stat, i) => (
                    <AnimatedCounter key={i} label={stat.label} value={stat.value} delay={i * 200} isLoading={loadingCounts} />
                  ))}
                </View>
              </MotiView>
            </LinearGradient>
          </Animated.View>
        </MotiView>

        {/* QUICK ACTIONS - Delay adjusted from 300 to 200 */}
        <MotiView from={{ opacity: 0, translateY: 30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 200 }} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: "brush", label: "Saved Designs", route: "/saved-designs" },
              { icon: "camera", label: "Photoshoots", route: "/saved-photoshoots" },
              { icon: "bag", label: "Orders", route: "/(tabs)/orders" },
              {
                icon: "storefront",
                label: "My Store",
                action: () => setStoreModalVisible(true),
              },
            ].map((item, i) => (
              <MotiView key={i} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 300 + i * 100 }}>
                {/* Apply dynamic borderColor from themeColor1 */}
                <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.text }]} onPress={item.action ?? (() => router.push(item.route as any))}>
                  <Ionicons name={item.icon as any} size={28} color={theme.text} />
                  <Text style={[styles.actionLabel, { color: theme.text }]}>{item.label}</Text>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </MotiView>

        {/* PRINTFUL CONNECTION */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 600 }}>
          <BlurView intensity={colorScheme === "dark" ? 30 : 90} tint={colorScheme === "dark" ? "dark" : "light"} style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Printful Connection</Text>
            <View style={styles.row}>
              <Ionicons name="key-outline" size={22} color={theme.tint} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {printfulApiKey ? (
                  <MotiView
                    from={{ scale: 1, opacity: 1 }}
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ loop: true, duration: 2000 }}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#2ecc71",
                      shadowColor: "#2ecc71",
                      shadowOpacity: 0.8,
                      shadowRadius: 5,
                      shadowOffset: { width: 0, height: 0 },
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#ff3b30",
                    }}
                  />
                )}
                <Text
                  style={[
                    styles.infoText,
                    {
                      color: printfulApiKey ? "#2ecc71" : "#ff3b30",
                      fontWeight: "600",
                    },
                  ]}
                >
                  {printfulApiKey ? "Connected" : "Not connected"}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Ionicons name="storefront-outline" size={22} color={theme.tint} />
              <Text style={[styles.infoText, { color: theme.text }]}>Store: {currentStoreId ?? "None"}</Text>
            </View>
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.tint }]} onPress={() => setModalVisible(true)}>
                <Text style={[styles.primaryText, { color: theme.background }]}>{printfulApiKey ? "Manage Connection" : "Connect Printful"}</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </MotiView>
        {/* SETTINGS */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 700 }}>
          <BlurView intensity={colorScheme === "dark" ? 30 : 90} tint={colorScheme === "dark" ? "dark" : "light"} style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>
            <View style={styles.settingRow}>
              <Ionicons name="moon-outline" size={20} color={theme.tint} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
              <Switch value={colorScheme === "dark"} trackColor={{ false: "#767577", true: "#0a7ea4" }} />
            </View>
            <View style={styles.settingRow}>
              <Ionicons name="notifications-outline" size={20} color={theme.tint} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Notifications</Text>
              <Switch value={colorScheme === "dark"} trackColor={{ false: "#767577", true: "#0a7ea4" }} />
            </View>
          </BlurView>
        </MotiView>

        {/* LOGOUT */}
        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 650 }}>
          <MotiView from={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 650 }}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </MotiView>
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 800 }}>
            <Text style={styles.footer}>v1.0.0 • Made with ❤️</Text>
          </MotiView>
        </MotiView>
      </Animated.ScrollView>

      {/* === Printful Connection Modal === */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View
            style={[
              styles.overlay,
              {
                backgroundColor: colorScheme === "dark" ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)",
              },
            ]}
          >
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardWrapper}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.popup, { backgroundColor: colorScheme === "dark" ? "rgba(28,28,30,0.98)" : "#ffffff", paddingTop: 40 }]}>
                  {/* Header */}
                  <View style={styles.manageHeader}>
                    <Ionicons name="storefront-outline" size={24} color={theme.tint} />
                    <Text
                      style={[
                        styles.popupTitle,
                        {
                          color: theme.text,
                          textAlign: "center",
                          flex: 1,
                          marginRight: 24,
                        },
                      ]}
                    >
                      Manage Printful Connection
                    </Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeIconButton}>
                      <Ionicons name="close-outline" size={26} color={theme.tint} />
                    </TouchableOpacity>
                  </View>

                  {/* Status */}
                  <View style={styles.statusCard}>
                    <Ionicons name={printfulApiKey ? "checkmark-circle" : "alert-circle-outline"} size={22} color={printfulApiKey ? "#2ecc71" : "#ff3b30"} />
                    <Text style={[styles.statusText, { color: printfulApiKey ? "#2ecc71" : "#ff3b30" }]}>{printfulApiKey ? "Connected" : "Not Connected"}</Text>
                  </View>

                  {/* API Input */}
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        borderColor: theme.icon,
                        backgroundColor: theme.background,
                      },
                    ]}
                    placeholder="Enter Printful API Key"
                    placeholderTextColor={theme.secondaryText}
                    value={apiKey}
                    onChangeText={setApiKey}
                    secureTextEntry
                  />

                  {/* Fetch / Refresh */}
                  <TouchableOpacity style={[styles.fetchButton, { backgroundColor: theme.tint }, !apiKey && { opacity: 0.5 }]} onPress={fetchStores} disabled={!apiKey || loadingStores}>
                    {loadingStores ? (
                      <ActivityIndicator color={theme.background} />
                    ) : (
                      <Text style={[styles.fetchText, { color: theme.background }]}>{printfulApiKey ? "Refresh Stores" : "Fetch Stores"}</Text>
                    )}
                  </TouchableOpacity>

                  {error && <Text style={styles.errorText}>{error}</Text>}

                  {/* Store List */}
                  {!loadingStores && stores.length > 0 && (
                    <FlatList
                      data={stores}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={[styles.storeItem, { borderBottomColor: theme.icon }]} onPress={() => saveSelection(item)}>
                          <Ionicons name="home-outline" size={20} color={theme.tint} />
                          <View style={{ marginLeft: 10 }}>
                            <Text style={[styles.storeName, { color: theme.text }]}>{item.name}</Text>
                            <Text style={[styles.storeUrl, { color: theme.secondaryText }]}>{item.website}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      style={{ marginTop: 10, maxHeight: 200, width: "100%" }}
                    />
                  )}

                  {/* Remove Connection */}
                  {printfulApiKey && (
                    <View style={styles.removeSection}>
                      <View style={styles.removeDivider} />
                      <TouchableOpacity activeOpacity={0.8} onPress={removeConnection} style={styles.removeButton}>
                        <Ionicons name="warning-outline" size={20} color="#ff3b30" />
                        <Text style={styles.removeText}>Remove Connection</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* === My Store WebView Modal === */}
      <Modal animationType="slide" visible={storeModalVisible} presentationStyle="pageSheet" onRequestClose={() => setStoreModalVisible(false)}>
        <View style={[styles.webviewContainer, { backgroundColor: theme.card }]}>
          <View style={[styles.webviewHeader, { borderBottomColor: theme.tabIconDefault }]}>
            <TouchableOpacity onPress={() => setStoreModalVisible(false)}>
              <Text
                style={{
                  color: theme.tint,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: printfulStoreUrl }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webModalLoader}>
                <ActivityIndicator size="large" color={theme.tint} />
              </View>
            )}
            style={{ flex: 1, backgroundColor: theme.card }}
          />
        </View>
      </Modal>

      {/* === COLOR PICKER SHEET (animated bottom sheet) === */}
      <Modal visible={colorPickerVisible} animationType="none" transparent onRequestClose={() => closeColorSheet(false)}>
        <TouchableWithoutFeedback onPress={() => closeColorSheet(false)}>
          <View style={styles.colorModalOverlay} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheetContainer, sheetAnimatedStyle]}>
          <View style={[styles.sheetHeader]}>
            <View style={styles.sheetIndicator} />
            <Text style={[styles.colorModalTitle, { color: "#ffffff" }]}>Choose Profile Colors</Text>
          </View>

          <View
            style={[
              styles.sheetBody,
              {
                backgroundColor: colorScheme === "dark" ? "rgba(28,28,30,0.98)" : "#ffffff",
              },
            ]}
          >
            <View style={{ alignItems: "center" }}>
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                {[
                  { id: 1, label: "Primary", color: themeColor1 },
                  { id: 2, label: "Secondary", color: themeColor2 },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setEditingIndex(c.id as 1 | 2)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      marginHorizontal: 6,
                      backgroundColor: editingIndex === c.id ? c.color : "transparent",
                      borderWidth: editingIndex === c.id ? 0 : 1,
                      borderColor: editingIndex === c.id ? "transparent" : theme.icon,
                    }}
                  >
                    <Text style={{ color: editingIndex === c.id ? "#fff" : theme.text, fontWeight: "600" }}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ColorPicker
                color={editingIndex === 1 ? themeColor1 : themeColor2}
                onColorChange={(color) => (editingIndex === 1 ? setThemeColor1(color) : setThemeColor2(color))}
                thumbSize={28}
                sliderSize={18}
                noSnap
                row={false}
                style={{ width: width * 0.75, height: width * 0.75 }}
              />

              <View style={styles.sheetPreviewRow}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>Preview</Text>
                <LinearGradient colors={[themeColor1, themeColor2]} style={styles.previewGradient} />
              </View>

              <View style={styles.sheetButtonsRow}>
                <TouchableOpacity style={[styles.colorModalButton, { backgroundColor: colorScheme === "dark" ? theme.text : theme.tint }]} onPress={() => closeColorSheet(true)}>
                  <Text style={[styles.colorModalButtonText, { color: colorScheme === "dark" ? theme.background : "#fff" }]}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.colorModalButton, { backgroundColor: "transparent", borderWidth: 1, borderColor: theme.tint }]}
                  onPress={() => {
                    setThemeColor1(originalColorRef.current.c1);
                    setThemeColor2(originalColorRef.current.c2);
                    closeColorSheet(true);
                  }}
                >
                  <Text style={[styles.colorModalButtonText, { color: theme.tint }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.colorModalButton, { backgroundColor: "transparent", borderWidth: 1, borderColor: "#ccc" }]} onPress={() => closeColorSheet(false)}>
                  <Text style={[styles.colorModalButtonText, { color: "#fe5757ff" }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const AnimatedCounter = ({ value, label, delay, isLoading }: { value: number; label: string; delay?: number; isLoading?: boolean }) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 1000 });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(animatedValue.value, [0, value], [10, 0], Extrapolate.CLAMP);
    const opacity = interpolate(animatedValue.value, [0, value * 0.3], [0, 1], Extrapolate.CLAMP);
    return { transform: [{ translateY }], opacity };
  });

  return (
    <MotiView
      style={{
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.1)",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        width: width * 0.27,
      }}
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: (delay ?? 0) + 300 }}
    >
      <Animated.Text style={[styles.statValue, animatedStyle]}>{value}</Animated.Text>
      <Text style={[styles.statLabel, { color: "#f5f5f5" }]}>{label}</Text>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 100 },
  headerGradient: { borderRadius: 20, overflow: "hidden", marginBottom: 20 },
  headerContent: { alignItems: "center", paddingVertical: 30 },
  animatedHeader: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: "#fff" },
  avatarContainer: {
    marginBottom: 10,
    position: "relative",
  },
  avatarEditIcon: {
    position: "absolute",
    bottom: 10,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  name: { color: "#fff", fontSize: 22, fontFamily: "Inter-ExtraBold" },
  subtitle: { color: "#f0f0f0", fontSize: 14, marginBottom: 10, fontFamily: "Inter-ExtraBold" },
  statsRow: { flexDirection: "row", justifyContent: "space-evenly", width: "100%", marginTop: 10 },
  statCard: { alignItems: "center", minWidth: 60 },
  statValue: { color: "#fff", fontSize: 20, minHeight: 24, fontFamily: "Inter-ExtraBold" },
  statLabel: { color: "#f0f0f0", fontSize: 12, fontFamily: "Inter-ExtraBold" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, marginBottom: 10, fontFamily: "Inter-ExtraBold" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  actionCard: {
    width: width * 0.43,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#6e45e2",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionLabel: { marginTop: 6, fontFamily: "Inter-ExtraBold" },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  row: { flexDirection: "row", alignItems: "center", marginVertical: 6, gap: 8 },
  infoText: { fontSize: 15, fontFamily: "Inter-ExtraBold" },
  primaryBtn: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  primaryText: { fontSize: 16, fontFamily: "Inter-ExtraBold" },
  secondaryBtn: { paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#ff3b3010" },
  secondaryText: { color: "#ff3b30", fontSize: 16, fontFamily: "Inter-ExtraBold" },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 8 },
  settingLabel: { fontSize: 16, fontFamily: "Inter-ExtraBold" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff3b30",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  logoutText: { color: "#fff", fontSize: 16, fontFamily: "Inter-ExtraBold" },
  footer: { textAlign: "center", marginTop: 24, color: "#888", fontSize: 12, fontFamily: "Inter-ExtraBold" },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  keyboardWrapper: { width: "90%", maxHeight: "80%" },
  popup: { borderRadius: 16, padding: 20, alignItems: "center", width: "100%" },
  popupTitle: { fontSize: 20, marginBottom: 15, fontFamily: "Inter-ExtraBold" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    width: "100%",
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: "Inter-ExtraBold",
  },
  fetchButton: { paddingVertical: 12, borderRadius: 8, width: "100%", alignItems: "center", marginBottom: 10 },
  fetchText: { fontSize: 16, fontFamily: "Inter-ExtraBold" },
  errorText: { color: "#ff3b30", marginTop: 6, fontSize: 13, textAlign: "center", fontFamily: "Inter-ExtraBold" },
  storeName: { fontSize: 15, fontFamily: "Inter-ExtraBold" },
  storeUrl: { fontSize: 12, fontFamily: "Inter-ExtraBold" },
  closeButton: { marginTop: 15, padding: 5 },
  closeText: { fontSize: 16, fontFamily: "Inter-ExtraBold" },

  webviewContainer: { flex: 1 },
  webviewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "flex-end",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webModalLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },

  colorPickerIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    padding: 8,
    borderRadius: 20,
    zIndex: 5,
  },

  colorModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    justifyContent: "flex-end",
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: 8,
  },
  sheetIndicator: {
    width: 48,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#ccc",
    marginBottom: 8,
  },
  sheetBody: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
    padding: 16,
    width: "100%",
  },
  sheetPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginTop: 10,
    alignItems: "center",
  },
  previewGradient: {
    width: 90,
    height: 30,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  sheetButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 16,
  },

  colorModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  colorModalButtonText: {
    color: "#fff",
    fontFamily: "Inter-ExtraBold",
  },
  colorModalTitle: {
    fontSize: 16,
    fontFamily: "Inter-ExtraBold",
  },
  removeSection: {
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  removeDivider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 14,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    width: "100%",
    backgroundColor: "rgba(255,59,48,0.08)",
  },
  removeText: {
    color: "#ff3b30",
    fontSize: 16,
    marginLeft: 6,
    fontFamily: "Inter-ExtraBold",
  },
  manageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 14,
    position: "relative",
  },
  closeIconButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 5,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 15,
    fontFamily: "Inter-ExtraBold",
  },
  storeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    width: "100%",
  },
});
