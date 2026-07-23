// InsightOS — Cleaning Studio Page
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wrench, CheckCircle, AlertTriangle, Play, RefreshCw } from 'lucide-react'
import { getSuggestions, applyCleaning } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card, StatCard } from '../components/ui/Components'
import toast from 'react-hot-toast'

const METHOD_LABELS: Record<string, string> = {
  mean: 'Fill with Mean',
  median: 'Fill with Median',
  mode: 'Fill with Mode',
  forward_fill: 'Forward Fill',
  backward_fill: 'Backward Fill',
  drop: 'Drop Rows',
  drop_duplicates: 'Remove Duplicates',
}

export default function Cleaning() {
  const { currentDataset, getCache, setCache } = useStore()
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [applied, setApplied] = useState<string[]>([])

  const load = () => {
    if (!currentDataset) return
    const cached = getCache(`cleaning_${currentDataset.id}`)
    if (cached) { setSuggestions(cached); return }
    setLoading(true)
    getSuggestions(currentDataset.id)
      .then(r => {
        const sugs = r.data.suggestions || []
        setSuggestions(sugs)
        setCache(`cleaning_${currentDataset.id}`, sugs)
        // Pre-select recommended methods
        const defaults: Record<string, string> = {}
        sugs.forEach((s: any) => { defaults[s.column] = s.recommended_method })
        setSelected(defaults)
      })
      .catch(() => toast.error('Could not load cleaning suggestions'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])

  const applyAll = async () => {
    if (!currentDataset) return
    const ops = Object.entries(selected).map(([column, method]) => ({ column, method }))
    if (ops.length === 0) { toast.error('No operations selected'); return }
    setApplying(true)
    try {
      const r = await applyCleaning(currentDataset.id, ops)
      toast.success(`Cleaned! ${r.data.rows} rows, ${r.data.columns} cols remaining`)
      setApplied(ops.map(o => o.column))
      // Bust caches for this dataset
      setCache(`cleaning_${currentDataset.id}`, null)
      setCache(`health_${currentDataset.id}`, null)
      setCache(`eda_${currentDataset.id}`, null)
      load()
    } catch {
      toast.error('Cleaning failed')
    }
    setApplying(false)
  }

  if (!currentDataset) return <div className="p-6"><PageHeader title="Cleaning Studio" subtitle="Upload a dataset first" icon={Wrench} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Scanning for issues..." /></div>

  const highSev = suggestions.filter(s => s.severity === 'high' || s.severity === 'critical').length
  const medSev = suggestions.filter(s => s.severity === 'medium').length
  const lowSev = suggestions.filter(s => s.severity === 'low').length

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="Cleaning Studio"
        subtitle="Detect and fix data quality issues"
        icon={Wrench}
        action={
          <div className="flex gap-2">
            <button onClick={load} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
            <button onClick={applyAll} disabled={applying || suggestions.length === 0} className="btn-brand text-xs">
              <Play className="w-3.5 h-3.5" /> {applying ? 'Applying...' : 'Apply Selected'}
            </button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Issues" value={suggestions.length} color="brand" />
        <StatCard label="High Severity" value={highSev} color="red" />
        <StatCard label="Medium" value={medSev} color="yellow" />
        <StatCard label="Low" value={lowSev} color="green" />
      </div>

      {suggestions.length === 0 && (
        <Card>
          <div className="flex flex-col items-center py-12 gap-4">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <h3 className="text-lg font-bold text-white">Dataset Looks Clean!</h3>
            <p className="text-[#94a3b8] text-sm">No missing values or duplicate rows detected.</p>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {suggestions.map((s: any, i: number) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass-card p-5 border-l-4 ${
              s.severity === 'critical' || s.severity === 'high' ? 'border-l-red-500' :
              s.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
            } ${applied.includes(s.column) ? 'opacity-50' : ''}`}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${
                    s.severity === 'critical' || s.severity === 'high' ? 'text-red-400' :
                    s.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                  }`} />
                  <span className="font-semibold text-white text-sm">
                    {s.column === '*' ? 'Duplicate Rows' : s.column}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.severity === 'critical' || s.severity === 'high' ? 'bg-red-500/15 text-red-400' :
                    s.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-green-500/15 text-green-400'
                  }`}>
                    {s.severity}
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8]">
                  {s.issue === 'missing_values'
                    ? `${s.null_pct}% of values are missing`
                    : `${s.count?.toLocaleString()} duplicate rows detected`}
                </p>
                {applied.includes(s.column) && (
                  <p className="text-xs text-green-400 mt-1">✅ Applied</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <select
                  value={selected[s.column] || s.recommended_method}
                  onChange={(e) => setSelected(prev => ({ ...prev, [s.column]: e.target.value }))}
                  className="input-field text-xs py-1.5 px-3 w-44"
                  disabled={applied.includes(s.column)}
                >
                  {(s.available_methods || [s.recommended_method]).map((m: string) => (
                    <option key={m} value={m}>{METHOD_LABELS[m] || m}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
