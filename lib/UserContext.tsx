import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { ddb } from "./aws/dynamo";
import { DDB_TABLE_MUSE_USERS } from "./aws/config";
import { getIdTokenFromStorage, clearTokens } from "./aws/auth";
import { Buffer } from "buffer";

type Ctx = {
  userId: string | null;
  email: string | null;
  name: string | null;
  printfulApiKey: string | null;
  currentStoreId: string | null;
  selectedMuseId: string | null;
  initializing: boolean; // first boot gate
  loading: boolean; // later refreshes
  setPrintfulApiKey: (k: string | null) => void;
  setCurrentStoreId: (s: string | null) => void;
  setSelectedMuseId: (m: string | null) => void;
  refreshUser: () => Promise<void>;
  signOutLocal: () => Promise<void>;
};

const UserContext = createContext<Ctx>({
  userId: null,
  email: null,
  name: null, // Added initial value for name
  printfulApiKey: null,
  currentStoreId: null,
  selectedMuseId: null,
  initializing: true,
  loading: true,
  setPrintfulApiKey: () => {},
  setCurrentStoreId: () => {},
  setSelectedMuseId: () => {},
  refreshUser: async () => {},
  signOutLocal: async () => {},
});

function decodeJwt(idToken: string): any {
  const payload = idToken.split(".")[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(normalized, "base64").toString("utf8");
  return JSON.parse(json);
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null); // Added name state
  const [printfulApiKey, setPrintfulApiKey] = useState<string | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [selectedMuseId, setSelectedMuseId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(true);
  const bootstrapped = useRef(false);

  const refreshUser = async () => {
    if (bootstrapped.current) setLoading(true);
    try {
      const idToken = await getIdTokenFromStorage();
      if (!idToken) {
        setUserId(null);
        setEmail(null);
        setName(null); // Clear name on token absence
        setPrintfulApiKey(null);
        setCurrentStoreId(null);
        setSelectedMuseId(null);
        return;
      }
      let decodedSub: string | null = null;
      try {
        const { exp, sub, email: mail } = decodeJwt(idToken);
        const now = Math.floor(Date.now() / 1000);
        if (typeof exp === "number" && exp <= now) {
          await clearTokens();
          setUserId(null);
          setEmail(null);
          setName(null); // Clear name on expired token
          setPrintfulApiKey(null);
          setCurrentStoreId(null);
          setSelectedMuseId(null);
          return;
        }
        decodedSub = sub || null;
        setUserId(decodedSub); // Set userId here
        setEmail(mail || null);
      } catch {
        await clearTokens();
        setUserId(null);
        setEmail(null);
        setName(null); // Clear name on decode error
        setPrintfulApiKey(null);
        setCurrentStoreId(null);
        setSelectedMuseId(null);
        return;
      }

      // Use the decodedSub directly as userId might not be set yet due to async nature
      if (!decodedSub) return;

      const out = await ddb.send(
        new GetItemCommand({
          TableName: DDB_TABLE_MUSE_USERS,
          Key: { userId: { S: decodedSub } }, // Use decodedSub
        })
      );
      const item = out.Item || {};
      setName(item.name?.S ?? null); // Extract and set name
      setPrintfulApiKey(item.printfulApiKey?.S ?? null);
      setCurrentStoreId(item.currentStoreId?.S ?? null);
      setSelectedMuseId(item.selectedMuseId?.S ?? null);
    } catch (error) {
      console.error("Error refreshing user data:", error);
      // Optionally clear state or show error to user
      setUserId(null);
      setEmail(null);
      setName(null);
      setPrintfulApiKey(null);
      setCurrentStoreId(null);
      setSelectedMuseId(null);
    } finally {
      bootstrapped.current = true;
      setInitializing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const signOutLocal = async () => {
    await clearTokens();
    setUserId(null);
    setEmail(null);
    setName(null); // Clear name on sign out
    setPrintfulApiKey(null);
    setCurrentStoreId(null);
    setSelectedMuseId(null);
  };

  const value = useMemo(
    () => ({
      userId,
      email,
      name, // Include name in context value
      printfulApiKey,
      currentStoreId,
      selectedMuseId,
      initializing,
      loading,
      setPrintfulApiKey,
      setCurrentStoreId,
      setSelectedMuseId,
      refreshUser,
      signOutLocal,
    }),
    // Add name to dependency array
    [userId, email, name, printfulApiKey, currentStoreId, selectedMuseId, initializing, loading]
  );

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: "#fff", marginTop: 12 }}>Loading your profile…</Text>
      </View>
    );
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
