// InsightOS — Main Application Shell
import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/layout/Sidebar'
import UploadCenter from './pages/UploadCenter'
import DataHealth from './pages/DataHealth'
import EDA from './pages/EDA'
import Storytelling from './pages/Storytelling'
import Profiling from './pages/Profiling'
import Cleaning from './pages/Cleaning'
import Statistics from './pages/Statistics'
import Patterns from './pages/Patterns'
import Anomaly from './pages/Anomaly'
import Clusters from './pages/Clusters'
import TimeSeries from './pages/TimeSeries'
import Comparison from './pages/Comparison'
import Lineage from './pages/Lineage'
import { NoDataset } from './components/ui/Components'
import { useStore } from './store/useStore'
import { Database } from 'lucide-react'

function RequireDataset({ children }: { children: React.ReactNode }) {
  const { currentDataset } = useStore()
  return currentDataset ? <>{children}</> : <NoDataset />
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const { activeModule, currentDataset } = useStore()
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => {
      fetch('http://localhost:8000/api/health-check')
        .then((res) => setApiOnline(res.ok))
        .catch(() => setApiOnline(false))
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  const renderModule = () => {
    switch (activeModule) {
      case 'upload':
        return <UploadCenter />
      case 'health':
        return <RequireDataset><DataHealth /></RequireDataset>
      case 'profiling':
        return <RequireDataset><Profiling /></RequireDataset>
      case 'cleaning':
        return <RequireDataset><Cleaning /></RequireDataset>
      case 'eda':
        return <RequireDataset><EDA /></RequireDataset>
      case 'statistics':
        return <RequireDataset><Statistics /></RequireDataset>
      case 'patterns':
        return <RequireDataset><Patterns /></RequireDataset>
      case 'anomaly':
        return <RequireDataset><Anomaly /></RequireDataset>
      case 'clusters':
        return <RequireDataset><Clusters /></RequireDataset>
      case 'timeseries':
        return <RequireDataset><TimeSeries /></RequireDataset>
      case 'storytelling':
        return <RequireDataset><Storytelling /></RequireDataset>
      case 'insights':
        return <RequireDataset><Storytelling /></RequireDataset>
      case 'recommendations':
        return <RequireDataset><Storytelling /></RequireDataset>
      case 'comparison':
        return <Comparison />
      case 'lineage':
        return <RequireDataset><Lineage /></RequireDataset>
      case 'reports':
        return <RequireDataset><Storytelling /></RequireDataset>
      default:
        return <UploadCenter />
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f0f1a] text-[#e2e8f0]">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-14 px-6 border-b border-[#2d2d3d] bg-[#131320]/80 backdrop-blur-md flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white tracking-wide">
              {activeModule.replace(/_/g, ' ').toUpperCase()}
            </span>
            {currentDataset && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-brand-500/10 border border-brand-500/20 text-brand-300 font-medium">
                <Database className="w-3.5 h-3.5" />
                {currentDataset.filename}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e1e2e] border border-[#2d2d3d]">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiOnline === true
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                    : apiOnline === false
                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-[#94a3b8] font-medium">
                {apiOnline === true
                  ? 'API Connected'
                  : apiOnline === false
                  ? 'API Offline'
                  : 'Checking...'}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {renderModule()}
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e1e2e',
            color: '#e2e8f0',
            border: '1px solid #2d2d3d',
            borderRadius: '12px',
          },
        }}
      />
    </div>
  )
}
