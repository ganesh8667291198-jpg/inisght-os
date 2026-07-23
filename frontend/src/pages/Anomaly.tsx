// InsightOS — Anomaly Detection Page
import { useState, useEffect } from 'react'

import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react'
import { getAnomalies } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card, StatCard } from '../components/ui/Components'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts'
import toast from 'react-hot-toast'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#252538] border border-[#3d3d5c] rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-[#94a3b8] mb-1">Row {label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value?.toFixed(4)}</p>
      ))}
    </div>
  )
}

export default function Anomaly() {
  const { currentDataset, getCache, setCache } = useStore()
  const [anomalies, setAnomalies] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!currentDataset) return
    const cached = getCache(`anomaly_${currentDataset.id}`)
    if (cached) { setAnomalies(cached); return }
    setLoading(true)
    getAnomalies(currentDataset.id)
      .then(r => { setAnomalies(r.data); setCache(`anomaly_${currentDataset.id}`, r.data) })
      .catch(() => toast.error('Anomaly detection failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])

  if (!currentDataset) return <div className="p-6"><PageHeader title="Anomaly Detection" subtitle="Upload a dataset first" icon={AlertTriangle} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Running anomaly detection..." /></div>
  if (!anomalies) return null

  const topAnomalies: any[] = (anomalies.top_anomalies || []).slice(0, 20)
  const scoreData = topAnomalies.map((a: any, i: number) => ({
    index: i + 1,
    row: a.row_index ?? i,
    score: Math.abs(a.anomaly_score ?? a.score ?? 0),
    isAnomaly: a.is_anomaly ?? true,
  }))

  const totalAnomalies = anomalies.total_anomalies ?? anomalies.anomaly_count ?? topAnomalies.length
  const anomalyRate = anomalies.anomaly_rate ?? (totalAnomalies / (anomalies.total_rows || 1) * 100)

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Anomaly Detection"
        subtitle="Statistical outlier detection using multiple algorithms"
        icon={AlertTriangle}
        action={<button onClick={load} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Anomalies" value={totalAnomalies.toLocaleString()} color="red" icon={ShieldAlert} />
        <StatCard label="Anomaly Rate" value={`${Number(anomalyRate).toFixed(2)}%`} color="yellow" />
        <StatCard label="Total Rows" value={(anomalies.total_rows ?? 0).toLocaleString()} color="brand" />
        <StatCard label="Algorithm" value={anomalies.algorithm || 'Ensemble'} color="cyan" />
      </div>

      {/* Score Chart */}
      {scoreData.length > 0 && (
        <Card className="mb-6">
          <h3 className="section-title mb-4 text-sm">Top Anomaly Scores</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
              <XAxis dataKey="row" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Row Index', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Anomaly Score', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" name="Anomaly Score" radius={[4, 4, 0, 0]}>
                {scoreData.map((d: any, i: number) => (
                  <Cell key={i} fill={d.score > 0.5 ? '#ef4444' : d.score > 0.2 ? '#f59e0b' : '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> High ({'>'} 0.5)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-500 inline-block" /> Medium (0.2 – 0.5)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-500 inline-block" /> Low ({'<'} 0.2)</span>
          </div>
        </Card>
      )}

      {/* Anomaly Table */}
      {topAnomalies.length > 0 && (
        <Card>
          <h3 className="section-title mb-4 text-sm">Top Anomalous Rows</h3>
          <div className="overflow-auto max-h-80">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Score</th>
                  <th>Severity</th>
                  {Object.keys(topAnomalies[0]).filter(k => !['row_index', 'anomaly_score', 'score', 'is_anomaly'].includes(k)).slice(0, 5).map(k => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topAnomalies.map((a: any, i: number) => {
                  const score = Math.abs(a.anomaly_score ?? a.score ?? 0)
                  const severity = score > 0.5 ? 'high' : score > 0.2 ? 'medium' : 'low'
                  const extraCols = Object.entries(a).filter(([k]) => !['row_index', 'anomaly_score', 'score', 'is_anomaly'].includes(k)).slice(0, 5)
                  return (
                    <tr key={i}>
                      <td className="font-mono text-brand-300">{a.row_index ?? i}</td>
                      <td className={`font-mono font-semibold ${score > 0.5 ? 'text-red-400' : score > 0.2 ? 'text-yellow-400' : 'text-green-400'}`}>{score.toFixed(4)}</td>
                      <td><span className={`badge-${severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'success'}`}>{severity}</span></td>
                      {extraCols.map(([k, v]) => <td key={k}>{String(v)}</td>)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {topAnomalies.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <ShieldAlert className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">No Anomalies Detected</h3>
            <p className="text-[#94a3b8] text-sm mt-1">Your data looks clean — no statistical outliers found.</p>
          </div>
        </Card>
      )}
    </div>
  )
}
