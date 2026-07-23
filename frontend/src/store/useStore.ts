// InsightOS — Global State Store (Zustand)
import { create } from 'zustand'

export interface DatasetInfo {
  id: string
  filename: string
  rows: number
  columns: number
  null_count: number
  duplicate_count: number
  memory_usage_mb: number
  schema: any[]
  column_names: string[]
}

interface AppStore {
  // Current dataset
  currentDataset: DatasetInfo | null
  setCurrentDataset: (ds: DatasetInfo | null) => void

  // Recent datasets
  recentDatasets: Array<{ id: string; filename: string; rows: number; columns: number; uploaded_at: string }>
  setRecentDatasets: (ds: any[]) => void

  // Active module
  activeModule: string
  setActiveModule: (m: string) => void

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void

  // Loading states
  loading: Record<string, boolean>
  setLoading: (key: string, value: boolean) => void

  // Cache for analysis results
  cache: Record<string, any>
  setCache: (key: string, value: any) => void
  getCache: (key: string) => any
}

export const useStore = create<AppStore>((set, get) => ({
  currentDataset: null,
  setCurrentDataset: (ds) => set({ currentDataset: ds }),

  recentDatasets: [],
  setRecentDatasets: (ds) => set({ recentDatasets: ds }),

  activeModule: 'upload',
  setActiveModule: (m) => set({ activeModule: m }),

  theme: 'dark',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  loading: {},
  setLoading: (key, value) => set((s) => ({ loading: { ...s.loading, [key]: value } })),

  cache: {},
  setCache: (key, value) => set((s) => ({ cache: { ...s.cache, [key]: value } })),
  getCache: (key) => get().cache[key],
}))
