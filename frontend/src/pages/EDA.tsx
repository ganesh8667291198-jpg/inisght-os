// InsightOS — EDA Page (Module 5)
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { getEDA } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card } from '../components/ui/Components'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  AreaChart, Area
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
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : p.value}
        </p>
      ))}
    </div>
  )
}

function ChartCard({ title, children, className = '' }: { title: string; children: any; className?: string }) {
  return (
    <Card className={`chart-container ${className}`}>
      <h3 className="text-sm font-semibold text-[#94a3b8] mb-4 uppercase tracking-wider">{title}</h3>
      {children}
    </Card>
  )
}

export default function EDA() {
  const { currentDataset, getCache, setCache } = useStore()
  const [eda, setEda] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!currentDataset) return
    const cached = getCache(`eda_${currentDataset.id}`)
    if (cached) { setEda(cached); return }
    setLoading(true)
    getEDA(currentDataset.id)
      .then(r => { setEda(r.data); setCache(`eda_${currentDataset.id}`, r.data) })
      .catch(() => toast.error('EDA failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])
  if (!currentDataset) return <div className="p-6"><PageHeader title="EDA" subtitle="Upload a dataset first" icon={TrendingUp} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Generating visualizations..." /></div>
  if (!eda) return null

  const charts = eda.charts || []

  const renderChart = (chart: any, i: number) => {
    if (chart.type === 'histogram' || chart.type === 'bar') {
      const data = chart.data?.map((d: any) => ({
        name: d.label || d.name || `${d.bin_start}`,
        value: d.count || d.value,
      })) || []
      return (
        <ChartCard key={i} title={chart.type === 'histogram' ? `Distribution of ${chart.column}` : `${chart.column} — Frequency`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {data.map((_: any, j: number) => (
                  <Cell key={j} fill={`hsl(${240 + j * 5}, 65%, ${55 + (j % 3) * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )
    }

    if (chart.type === 'scatter') {
      return (
        <ChartCard key={i} title={`${chart.x} vs ${chart.y}`}>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
              <XAxis dataKey="x" name={chart.x} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="y" name={chart.y} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter data={chart.data || []} fill="#8b5cf6" opacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      )
    }

    if (chart.type === 'pie') {
      return (
        <ChartCard key={i} title={`${chart.column} — Composition`}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chart.data || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`} labelLine={false}>
                {(chart.data || []).map((_: any, j: number) => <Cell key={j} fill={COLORS[j % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )
    }

    if (chart.type === 'line') {
      return (
        <ChartCard key={i} title={`${chart.y} over ${chart.x}`} className="col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chart.data || []}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
              <XAxis dataKey="x" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="y" stroke="#6366f1" fill="url(#lineGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )
    }

    if (chart.type === 'boxplot') {
      // Render box plot as a stat summary card
      return (
        <ChartCard key={i} title={`Box Plot — ${chart.column}`}>
          <div className="space-y-2 text-sm">
            {[
              ['Min', chart.min], ['Q1', chart.q1], ['Median', chart.median],
              ['Q3', chart.q3], ['Max', chart.max], ['Outliers', chart.outlier_count]
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between items-center py-1 border-b border-[#2d2d3d]">
                <span className="text-[#94a3b8]">{l}</span>
                <span className="font-mono text-white">{typeof v === 'number' ? v.toLocaleString() : v}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )
    }

    return null
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Exploratory Data Analysis"
        subtitle={`${charts.length} visualizations automatically generated`}
        icon={TrendingUp}
        action={
          <button onClick={load} className="btn-ghost">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      {/* Missing Value Summary */}
      <Card className="mb-6">
        <h3 className="section-title mb-3">Missing Value Overview</h3>
        <div className="space-y-2">
          {(eda.missing_matrix?.summary || []).filter((c: any) => c.missing_pct > 0).slice(0, 10).map((c: any) => (
            <div key={c.column} className="flex items-center gap-3">
              <span className="w-36 text-sm text-[#94a3b8] truncate">{c.column}</span>
              <div className="flex-1 h-2 bg-[#2d2d3d] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: c.missing_pct > 30 ? '#ef4444' : c.missing_pct > 10 ? '#f59e0b' : '#22c55e' }}
                  initial={{ width: 0 }} animate={{ width: `${c.missing_pct}%` }} transition={{ duration: 0.8 }}
                />
              </div>
              <span className="text-xs w-12 text-right text-[#64748b]">{c.missing_pct}%</span>
            </div>
          ))}
          {(eda.missing_matrix?.summary || []).every((c: any) => c.missing_pct === 0) && (
            <p className="text-green-400 text-sm">✅ No missing values detected!</p>
          )}
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
        {charts.map((chart: any, i: number) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={chart.type === 'line' ? 'col-span-full md:col-span-2' : ''}
          >
            {renderChart(chart, i)}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
