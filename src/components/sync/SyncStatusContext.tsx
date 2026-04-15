"use client";

import { createContext, useContext } from "react";

export type SyncPhase = "idle" | "checking" | "syncing" | "just-updated";

export interface SyncStatusValue {
  lastSyncAt: string | null;
  phase: SyncPhase;
}

const defaultValue: SyncStatusValue = {
  lastSyncAt: null,
  phase: "idle",
};

export const SyncStatusContext = createContext<SyncStatusValue>(defaultValue);

export function useSyncStatus(): SyncStatusValue {
  return useContext(SyncStatusContext);
}
