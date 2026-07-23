// InsightOS — Data Lineage Page
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import { getLineage } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card } from '../components/ui/Components'
import toast from 'react-hot-toast'

const OP_LABELS: Record<string, string> = {
  mean: 'Filled Nulls with Mean',
  median: 'Filled Nulls with Median',
  mode: 'Filled Nulls with Mode',
  forward_fill: 'Forward Fill Applied',
  backward_fill: 'Backward Fill Applied',
  drop: 'Dropped Null Rows',
  drop_duplicates: 'Removed Duplicates',
}

const OP_COLORS: Record<string, string> = {
  mean: 'bg-brand-500/20 border-brand-500/40 text-brand-400',
  median: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
  mode: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',
  forward_fill: 'bg-green-500/20 border-green-500/40 text-green-400',
  backward_fill: 'bg-green-500/20 border-green-500/40 text-green-400',
  drop: 'bg-red-500/20 border-red-500/40 text-red-400',
  drop_duplicates: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
}

export default function Lineage() {
  const { currentDataset } = useStore()
  const [lineage, setLineage] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (!currentDataset) return
    setLoading(true)
    getLineage(currentDataset.id)
      .then(r => { setLineage(r.data) })
      .catch(() => toast.error('Could not load lineage'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])

  if (!currentDataset) return <div className="p-6"><PageHeader title="Data Lineage" subtitle="Upload a dataset first" icon={GitBranch} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Loading transformation history..." /></div>
  if (!lineage) return null

  const steps: any[] = lineage.steps || []

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <PageHeader
        title="Data Lineage"
        subtitle={`Transformation history for ${lineage.filename}`}
        icon={GitBranch}
        action={<button onClick={load} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>}
      />

      {steps.length === 0 ? (
        <Card>
          <div className="text-center py-14">
            <GitBranch className="w-12 h-12 text-[#475569] mx-auto mb-4" />
            <h3 className="text-base font-semibold text-[#94a3b8]">No Transformations Yet</h3>
            <p className="text-sm text-[#475569] mt-1">Go to Cleaning Studio and apply operations — they will be tracked here.</p>
          </div>
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#2d2d3d]" />

          <div className="space-y-4 pl-16">
            {/* Upload origin node */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative -ml-16 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shrink-0 z-10 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="glass-card p-4 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">Original Upload</span>
                  <span className="badge-brand">Step 0</span>
                </div>
                <p className="text-xs text-[#94a3b8] mt-1">{lineage.filename}</p>
              </div>
            </motion.div>

            {steps.map((step: any, i: number) => {
              const colorClass = OP_COLORS[step.operation] || 'bg-brand-500/20 border-brand-500/40 text-brand-400'
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (i + 1) * 0.07 }}
                  className="relative -ml-16 flex items-start gap-4"
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 mt-2 font-bold text-xs ${colorClass}`}>
                    {step.step}
                  </div>
                  <div className="glass-card p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">{OP_LABELS[step.operation] || step.operation}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border shrink-0 ${colorClass}`}>Step {step.step}</span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mb-2">{step.description}</p>
                    <div className="flex items-center gap-4 text-xs text-[#64748b]">
                      {step.column && step.column !== '*' && (
                        <span className="font-mono px-2 py-0.5 rounded bg-[#131320] border border-[#2d2d3d] text-[#94a3b8]">{step.column}</span>
                      )}
                      {step.rows_affected > 0 && (
                        <span>{step.rows_affected.toLocaleString()} rows affected</span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {new Date(step.applied_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
