// InsightOS — Sidebar Navigation
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import {
  Upload, Activity, BarChart3, Wrench, TrendingUp, FlaskConical,
  Search, AlertTriangle, Layers, Clock, BookOpen, Lightbulb,
  Sparkles, GitCompare, GitBranch, FileText, Sun, Moon,
  ChevronRight, Database, Zap
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: any
  group: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'upload',      label: 'Data Upload',         icon: Upload,        group: 'Data' },
  { id: 'health',      label: 'Data Health',          icon: Activity,      group: 'Analysis', badge: '🏥' },
  { id: 'profiling',   label: 'Data Profiling',       icon: BarChart3,     group: 'Analysis' },
  { id: 'cleaning',    label: 'Cleaning Studio',      icon: Wrench,        group: 'Analysis' },
  { id: 'eda',         label: 'EDA',                  icon: TrendingUp,    group: 'Explore' },
  { id: 'statistics',  label: 'Statistics',           icon: FlaskConical,  group: 'Explore' },
  { id: 'patterns',    label: 'Pattern Discovery',    icon: Search,        group: 'Explore' },
  { id: 'anomaly',     label: 'Anomaly Detection',    icon: AlertTriangle, group: 'Explore' },
  { id: 'clusters',    label: 'Cluster Analysis',     icon: Layers,        group: 'Explore' },
  { id: 'timeseries',  label: 'Time Series',          icon: Clock,         group: 'Explore' },
  { id: 'storytelling',label: 'Data Storytelling',    icon: BookOpen,      group: 'Insights', badge: '✨' },
  { id: 'insights',    label: 'Insight Discovery',    icon: Lightbulb,     group: 'Insights' },
  { id: 'recommendations', label: 'Recommendations',  icon: Sparkles,      group: 'Insights' },
  { id: 'comparison',  label: 'Dataset Comparison',   icon: GitCompare,    group: 'Reports' },
  { id: 'lineage',     label: 'Data Lineage',         icon: GitBranch,     group: 'Reports' },
  { id: 'reports',     label: 'Report Generator',     icon: FileText,      group: 'Reports' },
]

const GROUPS = ['Data', 'Analysis', 'Explore', 'Insights', 'Reports']

interface SidebarProps { collapsed: boolean; onToggle: () => void }

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { activeModule, setActiveModule, currentDataset, theme, toggleTheme } = useStore()

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 252 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex flex-col h-screen bg-[#131320] border-r border-[#2d2d3d] shrink-0 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2d2d3d]">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-light flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="font-bold text-white text-[15px] leading-tight">InsightOS</div>
              <div className="text-[10px] text-brand-400 font-medium tracking-wider uppercase">Intelligence Platform</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dataset Indicator */}
      {currentDataset && (
        <div className={`mx-3 my-3 px-3 py-2 rounded-xl bg-brand-500/10 border border-brand-500/25 ${collapsed ? 'text-center' : ''}`}>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs text-brand-300 font-medium truncate">{currentDataset.filename}</div>
                <div className="text-[10px] text-brand-500">{currentDataset.rows?.toLocaleString()}r × {currentDataset.columns}c</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group)
          return (
            <div key={group} className="mb-4">
              {!collapsed && (
                <div className="px-2 py-1 text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-1">
                  {group}
                </div>
              )}
              {items.map((item) => {
                const Icon = item.icon
                const isActive = activeModule === item.id
                const isDisabled = item.id !== 'upload' && !currentDataset
                return (
                  <motion.div
                    key={item.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => !isDisabled && setActiveModule(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 nav-icon shrink-0 ${isActive ? 'text-brand-400' : 'text-[#64748b]'}`} />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-xs">{item.badge}</span>
                    )}
                    {!collapsed && isActive && (
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-brand-400 shrink-0" />
                    )}
                  </motion.div>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2d2d3d] p-3 flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className={`nav-item ${collapsed ? 'justify-center px-2' : ''}`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={onToggle}
          className={`nav-item ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-0' : 'rotate-180'}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  )
}
