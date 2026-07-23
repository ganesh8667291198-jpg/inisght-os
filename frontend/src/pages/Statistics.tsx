// InsightOS — Statistics Page
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, RefreshCw } from 'lucide-react'
import { getStatistics } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card } from '../components/ui/Components'
import toast from 'react-hot-toast'

function correlationColor(val: number) {
  if (val >= 0.7) return '#22c55e'
  if (val >= 0.4) return '#f59e0b'
  if (val <= -0.7) return '#ef4444'
  if (val <= -0.4) return '#f97316'
  return '#475569'
}

export default function Statistics() {
  const { currentDataset, getCache, setCache } = useStore()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'descriptive' | 'correlation' | 'hypothesis'>('descriptive')

  const load = () => {
    if (!currentDataset) return
    const cached = getCache(`stats_${currentDataset.id}`)
    if (cached) { setStats(cached); return }
    setLoading(true)
    getStatistics(currentDataset.id)
      .then(r => { setStats(r.data); setCache(`stats_${currentDataset.id}`, r.data) })
      .catch(() => toast.error('Statistics computation failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])

  if (!currentDataset) return <div className="p-6"><PageHeader title="Statistics" subtitle="Upload a dataset first" icon={FlaskConical} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Computing statistics..." /></div>
  if (!stats) return null

  const descEntries = Object.entries(stats.descriptive || {}) as [string, any][]
  const corrMatrix = stats.correlations
  const hypothesis = stats.hypothesis_tests || []

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Statistical Analysis"
        subtitle="Descriptive statistics, correlations, and hypothesis tests"
        icon={FlaskConical}
        action={<button onClick={load} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>}
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#1e1e2e] rounded-xl border border-[#2d2d3d] mb-5 w-fit">
        {(['descriptive', 'correlation', 'hypothesis'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-brand-500 text-white shadow' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Descriptive Stats Table */}
      {tab === 'descriptive' && (
        <Card>
          <h3 className="section-title mb-4 text-sm">Descriptive Statistics</h3>
          <div className="overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Count</th>
                  <th>Mean</th>
                  <th>Std</th>
                  <th>Min</th>
                  <th>25%</th>
                  <th>50%</th>
                  <th>75%</th>
                  <th>Max</th>
                  <th>Skew</th>
                </tr>
              </thead>
              <tbody>
                {descEntries.map(([col, d]: [string, any]) => (
                  <tr key={col}>
                    <td className="font-medium text-white">{col}</td>
                    <td>{d.count?.toLocaleString()}</td>
                    <td>{d.mean?.toFixed(4)}</td>
                    <td>{d.std?.toFixed(4)}</td>
                    <td>{d.min?.toFixed(4)}</td>
                    <td>{d['25%']?.toFixed(4)}</td>
                    <td>{d['50%']?.toFixed(4)}</td>
                    <td>{d['75%']?.toFixed(4)}</td>
                    <td>{d.max?.toFixed(4)}</td>
                    <td className={Math.abs(d.skewness || 0) > 1 ? 'text-yellow-400' : ''}>{d.skewness?.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Correlation Matrix */}
      {tab === 'correlation' && (
        <Card>
          <h3 className="section-title mb-4 text-sm">Pearson Correlation Matrix</h3>
          {corrMatrix?.columns?.length > 0 ? (
            <div className="overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th></th>
                    {corrMatrix.columns.map((c: string) => <th key={c} className="text-center">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {corrMatrix.columns.map((row: string, ri: number) => (
                    <tr key={row}>
                      <td className="font-medium text-white">{row}</td>
                      {corrMatrix.matrix[ri].map((val: number, ci: number) => (
                        <td key={ci} className="text-center font-mono" style={{ color: correlationColor(val), background: ri === ci ? 'rgba(99,102,241,0.1)' : undefined }}>
                          {val.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[#64748b] text-sm">Not enough numeric columns for correlation.</p>
          )}
        </Card>
      )}

      {/* Hypothesis Tests */}
      {tab === 'hypothesis' && (
        <div className="space-y-3">
          {hypothesis.length === 0 ? (
            <Card>
              <p className="text-[#64748b] text-sm text-center py-8">No hypothesis tests available for this dataset.</p>
            </Card>
          ) : hypothesis.map((test: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-semibold text-white">{test.test_name}</span>
                  <span className="text-xs text-[#64748b] ml-2">{test.column}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  test.reject_null ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'
                }`}>
                  {test.reject_null ? 'Reject H₀' : 'Accept H₀'}
                </span>
              </div>
              <p className="text-sm text-[#94a3b8] mb-3">{test.interpretation}</p>
              <div className="flex gap-4 text-xs font-mono">
                <span className="text-[#64748b]">p-value: <span className="text-white">{test.p_value?.toFixed(6)}</span></span>
                {test.statistic !== undefined && (
                  <span className="text-[#64748b]">statistic: <span className="text-white">{test.statistic?.toFixed(4)}</span></span>
                )}
                <span className="text-[#64748b]">α = <span className="text-white">0.05</span></span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
