// InsightOS — Cluster Analysis Page
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Layers, RefreshCw } from 'lucide-react'
import { getClusters } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card, StatCard } from '../components/ui/Components'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts'
import toast from 'react-hot-toast'

const CLUSTER_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6']

export default function Clusters() {
  const { currentDataset, getCache, setCache } = useStore()
  const [clusters, setClusters] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!currentDataset) return
    const cached = getCache(`clusters_${currentDataset.id}`)
    if (cached) { setClusters(cached); return }
    setLoading(true)
    getClusters(currentDataset.id)
      .then(r => { setClusters(r.data); setCache(`clusters_${currentDataset.id}`, r.data) })
      .catch(() => toast.error('Cluster analysis failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])

  if (!currentDataset) return <div className="p-6"><PageHeader title="Cluster Analysis" subtitle="Upload a dataset first" icon={Layers} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Running cluster analysis..." /></div>
  if (!clusters) return null

  const clusterList: any[] = clusters.clusters || []
  const scatterData: any[] = clusters.scatter_data || []
  const n = clusters.n_clusters ?? clusterList.length

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Cluster Analysis"
        subtitle={`${n} clusters discovered using ${clusters.algorithm || 'K-Means'}`}
        icon={Layers}
        action={<button onClick={load} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Clusters" value={n} color="brand" />
        <StatCard label="Algorithm" value={clusters.algorithm || 'K-Means'} color="purple" />
        <StatCard label="Silhouette Score" value={clusters.silhouette_score != null ? Number(clusters.silhouette_score).toFixed(3) : '—'} color="green" />
        <StatCard label="Inertia" value={clusters.inertia != null ? Number(clusters.inertia).toFixed(1) : '—'} color="cyan" />
      </div>

      {/* Scatter Plot */}
      {scatterData.length > 0 && (
        <Card className="mb-6">
          <h3 className="section-title mb-4 text-sm">Cluster Visualization (PCA Projection)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
              <XAxis dataKey="x" type="number" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'PC1', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="y" type="number" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'PC2', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="bg-[#252538] border border-[#3d3d5c] rounded-xl px-4 py-3 shadow-xl text-sm">
                    <p className="text-[#94a3b8]">Cluster <span style={{ color: CLUSTER_COLORS[d?.cluster % CLUSTER_COLORS.length] }} className="font-bold">{d?.cluster}</span></p>
                    <p className="font-mono text-xs text-white">({d?.x?.toFixed(3)}, {d?.y?.toFixed(3)})</p>
                  </div>
                )
              }} />
              <Scatter data={scatterData} opacity={0.8}>
                {scatterData.map((d: any, i: number) => (
                  <Cell key={i} fill={CLUSTER_COLORS[(d.cluster ?? 0) % CLUSTER_COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {Array.from({ length: n }).map((_, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
                Cluster {i}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Cluster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clusterList.map((cl: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="glass-card p-5" style={{ borderLeft: `4px solid ${CLUSTER_COLORS[i % CLUSTER_COLORS.length]}` }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                style={{ background: CLUSTER_COLORS[i % CLUSTER_COLORS.length] + '33', border: `1px solid ${CLUSTER_COLORS[i % CLUSTER_COLORS.length]}55` }}>
                {cl.label ?? i}
              </span>
              <div>
                <div className="font-semibold text-white text-sm">Cluster {cl.label ?? i}</div>
                <div className="text-xs text-[#64748b]">{cl.size?.toLocaleString()} rows · {((cl.size / (clusters.total_rows || 1)) * 100).toFixed(1)}%</div>
              </div>
            </div>
            {cl.centroid && (
              <div className="space-y-1">
                {Object.entries(cl.centroid).slice(0, 4).map(([feat, val]) => (
                  <div key={feat} className="flex items-center justify-between text-xs">
                    <span className="text-[#64748b] truncate mr-2">{feat}</span>
                    <span className="font-mono text-white shrink-0">{typeof val === 'number' ? val.toFixed(3) : String(val)}</span>
                  </div>
                ))}
              </div>
            )}
            {cl.top_features && (
              <div className="mt-2 flex flex-wrap gap-1">
                {cl.top_features.slice(0, 3).map((f: string, j: number) => (
                  <span key={j} className="px-2 py-0.5 text-xs rounded-md bg-[#252538] border border-[#2d2d3d] text-[#94a3b8]">{f}</span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
