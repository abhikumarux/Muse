import React, { createContext, useState, ReactNode, useContext } from "react";

type UserContextType = {
  userId: string | null;
  setUserId: (id: string | null) => void;
  printfulApiKey: string | null;
  setPrintfulApiKey: (key: string | null) => void;
  currentStoreId: string | null;
  setCurrentStoreId: (id: string | null) => void;
};

const UserContext = createContext<UserContextType>({
  userId: null,
  setUserId: () => {},
  printfulApiKey: null,
  setPrintfulApiKey: () => {},
  currentStoreId: null,
  setCurrentStoreId: () => {},
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [printfulApiKey, setPrintfulApiKey] = useState<string | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);

  return (
    <UserContext.Provider value={{ userId, setUserId, printfulApiKey, setPrintfulApiKey, currentStoreId, setCurrentStoreId }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);