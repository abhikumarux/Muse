import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  ActivityIndicator, Modal, Pressable, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAccessTokenFromStorage, getIdTokenFromStorage, signOutGlobal } from "../../lib/aws/auth";
import { savePrintfulKeyAndStore, clearPrintfulKeyAndStore } from "../../lib/aws/userProfile";
import { useUser } from "../../lib/UserContext";
import { useRouter } from "expo-router";

export default function SettingsTab() {
  const router = useRouter();
  const { printfulApiKey, currentStoreId, setPrintfulApiKey, setCurrentStoreId, refreshUser, signOutLocal } = useUser();

  const [modalVisible, setModalVisible] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStoreLocal, setSelectedStoreLocal] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // show current values from context when opening
  useEffect(() => {
    if (!modalVisible) return;
    setApiKey(printfulApiKey ?? "");
    setSelectedStoreLocal(currentStoreId ? { id: currentStoreId } : null);
    setStores([]);
    setError(null);
  }, [modalVisible]);

  async function fetchStores() {
    try {
      if (!apiKey) {
        Alert.alert("Error", "Please enter your API key first");
        return;
      }
      setLoading(true);
      setError(null);

      const resp = await fetch(`https://api.printful.com/stores`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error((data && (data.error || data.message)) || "Failed to fetch stores");
      if (!Array.isArray(data.result)) throw new Error("No stores found.");
      setStores(data.result);
    } catch (err: any) {
      setError(err.message || "Failed to load stores");
      setStores([]);
    } finally {
      setLoading(false);
    }
  }

  const selectStore = async (store: any) => {
    setSelectedStoreLocal(store);
    setModalVisible(false);
    try {
      const idToken = await getIdTokenFromStorage();
      if (!idToken) return Alert.alert("Not signed in", "Please log in again.");

      await savePrintfulKeyAndStore(idToken, apiKey.trim(), String(store.id));
      setPrintfulApiKey(apiKey.trim());
      setCurrentStoreId(String(store.id));
      await refreshUser(); // persist in context on next app start too
      Alert.alert("Store Saved", `You selected "${store.name}" and API key saved.`);
    } catch (err: any) {
      console.error("Failed to save:", err);
      Alert.alert("Error", err?.message || "Failed to save the selected store.");
    }
  };

  const removeKeyAndStore = async () => {
    try {
      const idToken = await getIdTokenFromStorage();
      if (!idToken) return Alert.alert("Not signed in", "Please log in again.");

      await clearPrintfulKeyAndStore(idToken);
      setPrintfulApiKey(null);
      setCurrentStoreId(null);
      await refreshUser();
      Alert.alert("Removed", "Printful API key and store have been removed.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not remove key.");
    }
  };

  const handleSignOut = async () => {
    try {
      const access = await getAccessTokenFromStorage();
      if (access) await signOutGlobal(access);
    } catch {
      // ignore – we'll still clear local state
    } finally {
      await signOutLocal();
      router.replace("/login");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Current connection state */}
      <View style={styles.card}>
        <Text style={styles.title}>Printful Connection</Text>
        <Text style={styles.row}>
          API key: <Text style={styles.value}>{printfulApiKey ? "●●●●●●●●" : "Not connected"}</Text>
        </Text>
        <Text style={styles.row}>
          Store: <Text style={styles.value}>{currentStoreId ?? "None selected"}</Text>
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.primaryText}>{printfulApiKey ? "Change key / store" : "Connect Printful"}</Text>
          </TouchableOpacity>

          {printfulApiKey && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={removeKeyAndStore}>
              <Text style={styles.secondaryText}>Remove key</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleSignOut}>
          <Text style={styles.dangerText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for connecting / changing */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardWrapper}>
              <View style={styles.popup}>
                <Text style={styles.popupTitle}>Printful Setup</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter Printful API Key"
                  placeholderTextColor="#aaa"
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize="none"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <TouchableOpacity
                  style={[styles.fetchButton, !apiKey && { backgroundColor: "#ccc" }]}
                  onPress={fetchStores}
                  disabled={!apiKey || loading}
                >
                  <Text style={styles.fetchText}>{loading ? "Loading..." : "Fetch Stores"}</Text>
                </TouchableOpacity>

                {error && <Text style={styles.errorText}>{error}</Text>}

                {!loading && stores.length > 0 && (
                  <FlatList
                    data={stores}
                    keyExtractor={(item, i) => item.id?.toString() || i.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.storeItem} onPress={() => selectStore(item)}>
                        <Text style={styles.storeName}>{item.name}</Text>
                        <Text style={styles.storeUrl}>{item.website}</Text>
                      </TouchableOpacity>
                    )}
                    style={{ marginTop: 10, maxHeight: 240 }}
                  />
                )}

                <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7", padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  row: { fontSize: 15, marginVertical: 2 }, value: { fontWeight: "600" },
  buttons: { flexDirection: "row", gap: 10, marginTop: 12 },
  primaryBtn: { backgroundColor: "#007AFF", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  primaryText: { color: "#fff", fontWeight: "600" },
  secondaryBtn: { backgroundColor: "#f1f1f5", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  secondaryText: { color: "#333", fontWeight: "600" },
  dangerBtn: { backgroundColor: "#ff3b30", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  dangerText: { color: "#fff", fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", padding: 20 },
  keyboardWrapper: { width: "100%", alignItems: "center" },
  popup: { backgroundColor: "#fff", width: "90%", borderRadius: 18, padding: 20, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10 },
  popupTitle: { fontSize: 20, fontWeight: "600", textAlign: "center", marginBottom: 15 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 16, color: "#000", backgroundColor: "#fafafa" },
  fetchButton: { backgroundColor: "#007AFF", borderRadius: 10, paddingVertical: 12, marginBottom: 10 },
  fetchText: { textAlign: "center", color: "#fff", fontWeight: "600" },
  errorText: { color: "red", textAlign: "center", marginBottom: 10 },
  storeItem: { backgroundColor: "#f9f9f9", padding: 14, borderRadius: 10, marginVertical: 5 },
  storeName: { fontSize: 16, fontWeight: "600", color: "#111" },
  storeUrl: { fontSize: 13, color: "#666", marginTop: 3 },
  closeButton: { marginTop: 10, alignSelf: "center", paddingVertical: 8, paddingHorizontal: 20 },
  closeText: { fontSize: 16, color: "#007AFF" },
});