import { create } from 'zustand';
import type {
  Subscription,
  SourceConnection,
  UserProfile,
  ScanRun,
  AppSettings,
  WasteSummary,
  SourceType,
} from '../types';

interface AppState {
  // Data
  subscriptions: Subscription[];
  connections: SourceConnection[];
  profile: UserProfile | null;
  settings: AppSettings | null;
  latestScanRun: ScanRun | null;
  wasteSummary: WasteSummary | null;

  // UI state
  isDemoMode: boolean;
  isScanning: boolean;
  scanProgress: number; // 0-100
  scanStage: string;
  onboardingComplete: boolean;
  isPremium: boolean;

  // Actions
  setSubscriptions: (subs: Subscription[]) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  setConnections: (connections: SourceConnection[]) => void;
  updateConnection: (connection: SourceConnection) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSettings: (settings: AppSettings | null) => void;
  setLatestScanRun: (run: ScanRun | null) => void;
  setWasteSummary: (summary: WasteSummary | null) => void;
  setDemoMode: (isDemoMode: boolean) => void;
  setScanning: (isScanning: boolean, progress?: number, stage?: string) => void;
  setScanProgress: (progress: number, stage?: string) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setPremium: (isPremium: boolean) => void;
  reset: () => void;
}

const initialState = {
  subscriptions: [],
  connections: [],
  profile: null,
  settings: null,
  latestScanRun: null,
  wasteSummary: null,
  isDemoMode: true,
  isScanning: false,
  scanProgress: 0,
  scanStage: '',
  onboardingComplete: false,
  isPremium: false,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setSubscriptions: (subs) => set({ subscriptions: subs }),

  updateSubscription: (id, patch) =>
    set((state) => ({
      subscriptions: state.subscriptions.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s
      ),
    })),

  setConnections: (connections) => set({ connections }),

  updateConnection: (connection) =>
    set((state) => ({
      connections: state.connections.some((c) => c.source === connection.source)
        ? state.connections.map((c) =>
            c.source === connection.source ? connection : c
          )
        : [...state.connections, connection],
    })),

  setProfile: (profile) => set({ profile }),

  setSettings: (settings) =>
    set({ settings, isDemoMode: settings?.isDemoMode ?? true }),

  setLatestScanRun: (run) => set({ latestScanRun: run }),

  setWasteSummary: (summary) => set({ wasteSummary: summary }),

  setDemoMode: (isDemoMode) => set({ isDemoMode }),

  setScanning: (isScanning, progress = 0, stage = '') =>
    set({ isScanning, scanProgress: progress, scanStage: stage }),

  setScanProgress: (progress, stage) =>
    set((state) => ({
      scanProgress: progress,
      scanStage: stage !== undefined ? stage : state.scanStage,
    })),

  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),

  setPremium: (isPremium) => set({ isPremium }),

  reset: () => set(initialState),
}));
