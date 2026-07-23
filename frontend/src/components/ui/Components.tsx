// InsightOS — Shared UI Components
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Database } from 'lucide-react'
import { useStore } from '../../store/useStore'

// ── Loading Spinner ───────────────────────────────────────────────────────────
export function LoadingSpinner({ text = 'Analyzing...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin" />
        <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }} />
      </div>
      <p className="text-[#94a3b8] text-sm font-medium">{text}</p>
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, icon: Icon, action }: {
  title: string; subtitle: string; icon?: any; action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between mb-6"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center">
            <Icon className="w-5 h-5 text-brand-400" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">{subtitle}</p>
        </div>
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'brand', icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: any
}) {
  const colorMap: Record<string, string> = {
    brand: 'text-brand-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
  }
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 0 20px rgba(99,102,241,0.12)' }}
      className="stat-card"
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${colorMap[color] || colorMap.brand}`} />}
        <span className="text-xs text-[#64748b] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colorMap[color] || colorMap.brand}`}>{value}</div>
      {sub && <div className="text-xs text-[#64748b] mt-0.5">{sub}</div>}
    </motion.div>
  )
}

// ── Score Gauge ───────────────────────────────────────────────────────────────
export function ScoreGauge({ score, label, size = 120 }: { score: number; label: string; size?: number }) {
  const r = (size / 2) - 12
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={8} stroke="#2d2d3d" fill="none" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} strokeWidth={8} stroke={color} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <text x={size/2} y={size/2 + 6} textAnchor="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px`, fill: color, fontSize: 22, fontWeight: 700, fontFamily: 'Inter' }}>
          {score.toFixed(0)}
        </text>
      </svg>
      <span className="text-xs text-[#94a3b8] font-medium text-center">{label}</span>
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const bg = color || (value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444')
  return (
    <div className="progress-bar">
      <motion.div
        className="progress-fill"
        style={{ background: bg }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-5 ${className}`}
    >
      {children}
    </motion.div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'brand' }: { children: ReactNode; color?: 'brand' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className={`badge-${color === 'brand' ? 'brand' : color === 'success' ? 'success' : color === 'warning' ? 'warning' : color === 'danger' ? 'danger' : 'info'}`}>{children}</span>
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, subtitle }: { icon?: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[#252538] border border-[#2d2d3d] flex items-center justify-center">
          <Icon className="w-8 h-8 text-[#475569]" />
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-[#94a3b8]">{title}</h3>
        <p className="text-sm text-[#475569] mt-1">{subtitle}</p>
      </div>
    </div>
  )
}

// ── No Dataset ────────────────────────────────────────────────────────────────
export function NoDataset() {
  const { setActiveModule } = useStore()
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#252538] border border-[#2d2d3d] flex items-center justify-center">
        <Database className="w-8 h-8 text-[#475569]" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[#94a3b8]">No Dataset Loaded</h3>
        <p className="text-sm text-[#475569] mt-1 mb-4">Upload a dataset first to enable this analysis.</p>
        <button
          onClick={() => setActiveModule('upload')}
          className="btn-brand text-xs"
        >
          Go to Data Upload
        </button>
      </div>
    </div>
  )
}
