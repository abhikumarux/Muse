import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { useUser } from "../UserContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

const REGION = "us-east-2";
const IDENTITY_POOL_ID = "us-east-2:3680323d-0bc6-499f-acc5-f98acb534e36";


export default function SettingsTab() {
  const [modalVisible, setModalVisible] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const client = new DynamoDBClient({
    region: REGION,
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: REGION },
      identityPoolId: IDENTITY_POOL_ID,
    }),
  });

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

      if (!data.result || !Array.isArray(data.result)) {
        throw new Error("Invalid response or no stores found.");
      }

      setStores(data.result);
    } catch (err: any) {
      setError(err.message || "Failed to load stores");
      setStores([]);
    } finally {
      setLoading(false);
    }
  }

  const { userId, setPrintfulApiKey, setCurrentStoreId } = useUser();

const selectStore = async (store: any) => {
  setSelectedStore(store);
  setModalVisible(false);

  try {
    // Save store ID and API key to DynamoDB
    await client.send(
      new UpdateItemCommand({
        TableName: "MuseUsers",
        Key: { userId: { S: userId ?? "" } },
        UpdateExpression: "SET currentStoreId = :storeId, printfulApiKey = :apiKey",
        ExpressionAttributeValues: {
          ":storeId": { S: store.id.toString() },
          ":apiKey": { S: apiKey },
        },
      })
    );

    setPrintfulApiKey(apiKey);
    setCurrentStoreId(store.id.toString());

    Alert.alert("Store Saved", `You selected "${store.name}" and API key saved.`);
  } catch (err) {
    console.error("Failed to save store and API key to DB:", err);
    Alert.alert("Error", "Failed to save the selected store. Try again.");
  }
};

  return (
    <SafeAreaView style={styles.container}>
      {/* Main settings button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.menuText}>Configure Printful Store</Text>
      </TouchableOpacity>

      {selectedStore && (
        <Text style={styles.selectedText}>
          Selected Store: {selectedStore.name}
        </Text>
      )}

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.keyboardWrapper}
            >
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
                  style={[
                    styles.fetchButton,
                    !apiKey && { backgroundColor: "#ccc" },
                  ]}
                  onPress={fetchStores}
                  disabled={!apiKey || loading}
                >
                  <Text style={styles.fetchText}>
                    {loading ? "Loading..." : "Fetch Stores"}
                  </Text>
                </TouchableOpacity>

                {error && <Text style={styles.errorText}>{error}</Text>}

                {!loading && stores.length > 0 && (
                  <FlatList
                    data={stores}
                    keyExtractor={(item, index) =>
                      item.id?.toString() || index.toString()
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.storeItem}
                        onPress={() => selectStore(item)}
                      >
                        <Text style={styles.storeName}>{item.name}</Text>
                        <Text style={styles.storeUrl}>{item.website}</Text>
                      </TouchableOpacity>
                    )}
                    style={{ marginTop: 10, maxHeight: 200 }}
                  />
                )}

                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
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
//test

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7", padding: 16 },
  menuButton: {
    backgroundColor: "#fff",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  menuText: { fontSize: 16, color: "#007AFF", fontWeight: "600" },
  selectedText: { marginTop: 10, fontSize: 15, color: "#333" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  keyboardWrapper: { width: "100%", alignItems: "center" },
  popup: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#fafafa",
  },
  fetchButton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  fetchText: { textAlign: "center", color: "#fff", fontWeight: "600" },
  errorText: { color: "red", textAlign: "center", marginBottom: 10 },
  storeItem: {
    backgroundColor: "#f9f9f9",
    padding: 14,
    borderRadius: 10,
    marginVertical: 5,
  },
  storeName: { fontSize: 16, fontWeight: "600", color: "#111" },
  storeUrl: { fontSize: 13, color: "#666", marginTop: 3 },
  closeButton: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  closeText: { fontSize: 16, color: "#007AFF" },
});