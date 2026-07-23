// InsightOS — Pattern Discovery Page
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, RefreshCw, TrendingUp, Link2, Hash } from 'lucide-react'
import { getPatterns } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card, StatCard } from '../components/ui/Components'
import toast from 'react-hot-toast'

const TYPE_ICONS: Record<string, any> = {
  correlation: Link2,
  frequency: Hash,
  trend: TrendingUp,
}

const TYPE_COLORS: Record<string, string> = {
  correlation: 'brand',
  frequency: 'cyan',
  trend: 'green',
  clustering: 'purple',
  default: 'brand',
}

export default function Patterns() {
  const { currentDataset, getCache, setCache } = useStore()
  const [patterns, setPatterns] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const load = () => {
    if (!currentDataset) return
    const cached = getCache(`patterns_${currentDataset.id}`)
    if (cached) { setPatterns(cached); return }
    setLoading(true)
    getPatterns(currentDataset.id)
      .then(r => { setPatterns(r.data); setCache(`patterns_${currentDataset.id}`, r.data) })
      .catch(() => toast.error('Pattern discovery failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])

  if (!currentDataset) return <div className="p-6"><PageHeader title="Pattern Discovery" subtitle="Upload a dataset first" icon={Search} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Discovering patterns..." /></div>
  if (!patterns) return null

  const allPatterns: any[] = patterns.ranked_insights || []
  const types = ['all', ...new Set(allPatterns.map((p: any) => p.type || 'unknown'))] as string[]
  const filtered = filter === 'all' ? allPatterns : allPatterns.filter((p: any) => p.type === filter)

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Pattern Discovery"
        subtitle={`${allPatterns.length} patterns discovered in your data`}
        icon={Search}
        action={<button onClick={load} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Patterns" value={allPatterns.length} color="brand" />
        {types.filter(t => t !== 'all').slice(0, 3).map(t => (
          <StatCard key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} value={allPatterns.filter((p: any) => p.type === t).length} color={TYPE_COLORS[t] || 'brand'} />
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-[#1e1e2e] rounded-xl border border-[#2d2d3d] mb-5 w-fit flex-wrap">
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === t ? 'bg-brand-500 text-white shadow' : 'text-[#94a3b8] hover:text-white'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}
            <span className="ml-1.5 text-xs opacity-70">
              {t === 'all' ? allPatterns.length : allPatterns.filter((p: any) => p.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <p className="text-[#64748b] text-center py-12">No patterns of this type found.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p: any, i: number) => {
          const Icon = TYPE_ICONS[p.type] || Search
          const colorKey = TYPE_COLORS[p.type] || 'brand'
          const colorMap: Record<string, string> = {
            brand: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
            cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
            green: 'text-green-400 bg-green-500/10 border-green-500/20',
            purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          }
          const cols = p.col1 && p.col2 ? [p.col1, p.col2] : p.column ? [p.column] : []
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card p-5">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorMap[colorKey]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorMap[colorKey]}`}>{p.type?.replace('_', ' ') || 'pattern'}</span>
                    {p.strength && <span className="text-xs text-[#64748b]">Strength: {typeof p.strength === 'number' ? p.strength.toFixed(3) : p.strength}</span>}
                    {p.confidence && <span className="text-xs text-[#64748b]">Confidence: {p.confidence}%</span>}
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1">{p.explanation || 'Discovered Pattern'}</h3>
                  {cols.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cols.map((c: string, j: number) => (
                        <span key={j} className="px-2 py-0.5 rounded-md bg-[#252538] border border-[#2d2d3d] text-xs font-mono text-[#94a3b8]">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
