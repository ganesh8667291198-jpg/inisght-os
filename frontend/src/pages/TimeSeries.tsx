// InsightOS — Time Series Analysis Page
import { useState, useEffect } from 'react'

import { Clock, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { getTimeSeries } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card, StatCard } from '../components/ui/Components'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import toast from 'react-hot-toast'

export default function TimeSeries() {
  const { currentDataset, getCache, setCache } = useStore()
  const [ts, setTs] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeCol, setActiveCol] = useState<string | null>(null)

  const load = () => {
    if (!currentDataset) return
    const cached = getCache(`ts_${currentDataset.id}`)
    if (cached) { setTs(cached); return }
    setLoading(true)
    getTimeSeries(currentDataset.id)
      .then(r => { setTs(r.data); setCache(`ts_${currentDataset.id}`, r.data) })
      .catch(() => toast.error('Time series analysis failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])

  if (!currentDataset) return <div className="p-6"><PageHeader title="Time Series" subtitle="Upload a dataset first" icon={Clock} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Analyzing time series..." /></div>
  if (!ts) return null

  const series: Record<string, any[]> = ts.series || {}
  const seriesKeys = Object.keys(series)
  const current = activeCol || seriesKeys[0]
  const chartData = series[current] || []
  const meta = ts.metadata?.[current] || {}

  if (seriesKeys.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-fade-in">
        <PageHeader title="Time Series Analysis" subtitle="No datetime columns detected" icon={Clock} />
        <Card>
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-[#475569] mx-auto mb-4" />
            <h3 className="text-base font-semibold text-[#94a3b8]">No Time Series Detected</h3>
            <p className="text-sm text-[#475569] mt-1">Your dataset does not have a datetime or time-indexed column. Add one and re-upload.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Time Series Analysis"
        subtitle={`${seriesKeys.length} time series detected`}
        icon={Clock}
        action={<button onClick={load} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>}
      />

      {/* Series Selector */}
      {seriesKeys.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {seriesKeys.map(k => (
            <button key={k} onClick={() => setActiveCol(k)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                current === k ? 'bg-brand-500 text-white border-brand-500' : 'text-[#94a3b8] border-[#2d2d3d] hover:border-brand-500/50'
              }`}>
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Data Points" value={(chartData.length).toLocaleString()} color="brand" />
        <StatCard label="Trend" value={meta.trend_direction || '—'} color={meta.trend_direction === 'upward' ? 'green' : meta.trend_direction === 'downward' ? 'red' : 'cyan'} icon={meta.trend_direction === 'upward' ? TrendingUp : TrendingDown} />
        <StatCard label="Seasonality" value={meta.has_seasonality ? `Period: ${meta.seasonality_period}` : 'None detected'} color="purple" />
        <StatCard label="Stationarity" value={meta.is_stationary ? 'Stationary' : 'Non-stationary'} color={meta.is_stationary ? 'green' : 'yellow'} />
      </div>

      {/* Trend Chart */}
      <Card className="mb-5">
        <h3 className="section-title mb-4 text-sm">{current} — Over Time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#252538', border: '1px solid #3d3d5c', borderRadius: 12 }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#6366f1' }} />
            <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#tsGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Additional insights */}
      {ts.insights && ts.insights.length > 0 && (
        <Card>
          <h3 className="section-title mb-3 text-sm">Time Series Insights</h3>
          <div className="space-y-2">
            {ts.insights.map((insight: string, i: number) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-[#252538] border border-[#2d2d3d]">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                <p className="text-sm text-[#94a3b8]">{insight}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
