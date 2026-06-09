import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';

interface SyncContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: false,
  isSyncing: false,
  lastSyncedAt: null,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    async function checkInitial() {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(Boolean(state.isInternetReachable));
    }
    checkInitial();

    const subscription = Network.addNetworkStateListener((state) => {
      const online = Boolean(state.isInternetReachable);
      setIsOnline(online);
    });

    return () => subscription.remove();
  }, []);

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, lastSyncedAt }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  return useContext(SyncContext);
}
