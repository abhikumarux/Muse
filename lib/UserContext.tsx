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
  printfulApiKey: string | null;
  currentStoreId: string | null;
  selectedMuseId: string | null;
  initializing: boolean; // first boot gate
  loading: boolean;      // later refreshes
  setPrintfulApiKey: (k: string | null) => void;
  setCurrentStoreId: (s: string | null) => void;
  setSelectedMuseId: (m: string | null) => void;
  refreshUser: () => Promise<void>;
  signOutLocal: () => Promise<void>;
};

const UserContext = createContext<Ctx>({
  userId: null,
  email: null,
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
        setPrintfulApiKey(null);
        setCurrentStoreId(null);
        setSelectedMuseId(null);
        return;
      }
      try {
        const { exp, sub, email: mail } = decodeJwt(idToken);
        const now = Math.floor(Date.now() / 1000);
        if (typeof exp === "number" && exp <= now) {
          await clearTokens();
          setUserId(null);
          setEmail(null);
          setPrintfulApiKey(null);
          setCurrentStoreId(null);
          setSelectedMuseId(null);
          return;
        }
        setUserId(sub || null);
        setEmail(mail || null);
      } catch {
        await clearTokens();
        setUserId(null);
        setEmail(null);
        setPrintfulApiKey(null);
        setCurrentStoreId(null);
        setSelectedMuseId(null);
        return;
      }
      if (!userId) return;

      const out = await ddb.send(
        new GetItemCommand({
          TableName: DDB_TABLE_MUSE_USERS,
          Key: { userId: { S: userId } },
        })
      );
      const item = out.Item || {};
      setPrintfulApiKey(item.printfulApiKey?.S ?? null);
      setCurrentStoreId(item.currentStoreId?.S ?? null);
      setSelectedMuseId(item.selectedMuseId?.S ?? null);
    } finally {
      bootstrapped.current = true;
      setInitializing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId == null]); // trigger once at boot; later calls come from UI

  const signOutLocal = async () => {
    await clearTokens();
    setUserId(null);
    setEmail(null);
    setPrintfulApiKey(null);
    setCurrentStoreId(null);
    setSelectedMuseId(null);
  };

  const value = useMemo(
    () => ({
      userId,
      email,
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
    [userId, email, printfulApiKey, currentStoreId, selectedMuseId, initializing, loading]
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
