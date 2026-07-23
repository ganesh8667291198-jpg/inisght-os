// InsightOS — Data Profiling Page
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, RefreshCw } from 'lucide-react'
import { getProfile } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card, StatCard } from '../components/ui/Components'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#252538] border border-[#3d3d5c] rounded-xl px-4 py-3 shadow-xl text-sm">
      {label && <p className="text-[#94a3b8] mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || '#6366f1' }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Profiling() {
  const { currentDataset, getCache, setCache } = useStore()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCol, setSelectedCol] = useState<string | null>(null)

  const load = () => {
    if (!currentDataset) return
    const cached = getCache(`profile_${currentDataset.id}`)
    if (cached) { setProfile(cached); return }
    setLoading(true)
    getProfile(currentDataset.id)
      .then(r => { setProfile(r.data); setCache(`profile_${currentDataset.id}`, r.data) })
      .catch(() => toast.error('Profiling failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])

  if (!currentDataset) return <div className="p-6"><PageHeader title="Data Profiling" subtitle="Upload a dataset first" icon={BarChart3} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Profiling dataset..." /></div>
  if (!profile) return null

  const columns = Object.entries(profile.columns || {}) as [string, any][]
  const activeCol = selectedCol || columns[0]?.[0]
  const colData = profile.columns?.[activeCol]

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Data Profiling"
        subtitle={`${columns.length} columns profiled`}
        icon={BarChart3}
        action={<button onClick={load} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>}
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Columns" value={columns.length} color="brand" />
        <StatCard label="Numeric" value={profile.numeric_columns?.length || 0} color="purple" />
        <StatCard label="Categorical" value={profile.categorical_columns?.length || 0} color="cyan" />
        <StatCard label="Datetime" value={profile.datetime_columns?.length || 0} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column List */}
        <Card className="lg:col-span-1 overflow-hidden">
          <h3 className="section-title mb-3 text-sm">Columns</h3>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {columns.map(([col, data]: [string, any]) => (
              <motion.button
                key={col}
                whileHover={{ x: 2 }}
                onClick={() => setSelectedCol(col)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                  activeCol === col
                    ? 'bg-brand-500/20 border border-brand-500/40 text-white'
                    : 'text-[#94a3b8] hover:bg-[#252538]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{col}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                    data.semantic_type === 'numeric' ? 'bg-purple-500/20 text-purple-400' :
                    data.semantic_type === 'datetime' ? 'bg-cyan-500/20 text-cyan-400' :
                    'bg-brand-500/20 text-brand-400'
                  }`}>
                    {data.semantic_type}
                  </span>
                </div>
                {data.null_pct > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-[#2d2d3d] rounded-full">
                      <div className="h-full rounded-full bg-yellow-500/70" style={{ width: `${data.null_pct}%` }} />
                    </div>
                    <span className="text-[10px] text-yellow-500">{data.null_pct}% null</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </Card>

        {/* Column Detail */}
        <div className="lg:col-span-2 space-y-4">
          {colData && (
            <>
              <Card>
                <h3 className="text-base font-bold text-white mb-4">{activeCol}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Type', value: colData.dtype },
                    { label: 'Unique', value: colData.unique_count?.toLocaleString() },
                    { label: 'Null Count', value: colData.null_count?.toLocaleString() },
                    { label: 'Null %', value: `${colData.null_pct}%` },
                    { label: 'Total', value: colData.total_count?.toLocaleString() },
                    { label: 'Role', value: colData.suggested_role || colData.semantic_type },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-xl bg-[#252538] border border-[#2d2d3d] text-center">
                      <div className="text-sm font-semibold text-white">{s.value}</div>
                      <div className="text-xs text-[#64748b] mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Sample Values */}
                {colData.sample_values && (
                  <div>
                    <span className="text-xs text-[#64748b] uppercase tracking-wider">Sample Values</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {colData.sample_values.map((v: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-[#131320] border border-[#2d2d3d] text-xs font-mono text-[#94a3b8]">{v}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Numeric Stats */}
              {colData.mean !== undefined && (
                <Card>
                  <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Mean', value: colData.mean?.toLocaleString(undefined, { maximumFractionDigits: 4 }) },
                      { label: 'Median', value: colData.median?.toLocaleString(undefined, { maximumFractionDigits: 4 }) },
                      { label: 'Std Dev', value: colData.std?.toLocaleString(undefined, { maximumFractionDigits: 4 }) },
                      { label: 'Min', value: colData.min?.toLocaleString() },
                      { label: 'Max', value: colData.max?.toLocaleString() },
                      { label: 'Q1', value: colData.q1?.toLocaleString(undefined, { maximumFractionDigits: 4 }) },
                      { label: 'Q3', value: colData.q3?.toLocaleString(undefined, { maximumFractionDigits: 4 }) },
                      { label: 'Skewness', value: colData.skewness?.toFixed(3) },
                    ].map((s) => (
                      <div key={s.label} className="p-3 rounded-xl bg-[#252538] border border-[#2d2d3d]">
                        <div className="text-sm font-bold text-brand-300">{s.value ?? '—'}</div>
                        <div className="text-xs text-[#64748b] mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Distribution Histogram */}
                  {colData.histogram && colData.histogram.length > 0 && (
                    <>
                      <h4 className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Distribution</h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={colData.histogram}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
                          <XAxis dataKey="bin" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={(v) => Number(v).toFixed(1)} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]}>
                            {colData.histogram.map((_: any, j: number) => (
                              <Cell key={j} fill={COLORS[j % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      {colData.skewness_interpretation && (
                        <p className="text-xs text-[#64748b] mt-2">Shape: {colData.distribution_shape} · {colData.skewness_interpretation}</p>
                      )}
                    </>
                  )}
                </Card>
              )}

              {/* Categorical Bar Chart */}
              {colData.bar_data && colData.bar_data.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Top Values</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={colData.bar_data} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis type="category" dataKey="value" tick={{ fill: '#94a3b8', fontSize: 10 }} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 3, 3, 0]}>
                        {colData.bar_data.map((_: any, j: number) => (
                          <Cell key={j} fill={COLORS[j % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-[#64748b] mt-2">Cardinality: {colData.cardinality?.toLocaleString()} unique values</p>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
