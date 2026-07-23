// InsightOS — Data Health Engine (Module 2)
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { getHealth } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, ScoreGauge, ProgressBar, Card } from '../components/ui/Components'
import toast from 'react-hot-toast'

const DIM_LABELS: Record<string, string> = {
  completeness: 'Completeness',
  uniqueness: 'Uniqueness',
  consistency: 'Consistency',
  validity: 'Validity',
  accuracy: 'Accuracy',
}

const DIM_DESC: Record<string, string> = {
  completeness: 'Percentage of non-null cells across the dataset',
  uniqueness: 'Fraction of rows that are not duplicates',
  consistency: 'Absence of mixed data types in columns',
  validity: 'Conformance to business rules and value ranges',
  accuracy: 'Absence of extreme outliers (potential entry errors)',
}

export default function DataHealth() {
  const { currentDataset, getCache, setCache } = useStore()
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentDataset) return
    const cached = getCache(`health_${currentDataset.id}`)
    if (cached) { setHealth(cached); return }
    setLoading(true)
    getHealth(currentDataset.id)
      .then(r => { setHealth(r.data); setCache(`health_${currentDataset.id}`, r.data) })
      .catch(() => toast.error('Failed to compute health score'))
      .finally(() => setLoading(false))
  }, [currentDataset?.id])

  if (!currentDataset) return (
    <div className="p-6"><PageHeader title="Data Health Engine" subtitle="Upload a dataset to see health metrics" icon={Activity} /></div>
  )
  if (loading) return <div className="p-6"><LoadingSpinner text="Computing health scores..." /></div>
  if (!health) return null

  const overall = health.overall_score || 0
  const gradeColor = overall >= 80 ? 'text-green-400' : overall >= 60 ? 'text-yellow-400' : 'text-red-400'
  const GradeIcon = overall >= 80 ? CheckCircle : overall >= 60 ? AlertTriangle : XCircle

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Data Health Engine"
        subtitle="Professional quality assessment across 5 dimensions"
        icon={Activity}
      />

      {/* Overall Score Hero */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreGauge score={overall} label="Overall Health" size={150} />
          <div className="flex-1 text-center md:text-left">
            <div className={`flex items-center gap-2 justify-center md:justify-start mb-2`}>
              <GradeIcon className={`w-6 h-6 ${gradeColor}`} />
              <span className={`text-3xl font-bold ${gradeColor}`}>
                Grade {health.grade} — {health.status}
              </span>
            </div>
            <p className="text-[#94a3b8] leading-relaxed max-w-xl">{health.summary}</p>
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {[
              { label: 'Missing %', value: `${health.dimensions?.completeness?.missing_pct ?? 0}%`, color: 'text-yellow-400' },
              { label: 'Duplicates', value: `${health.dimensions?.uniqueness?.duplicate_count ?? 0}`, color: 'text-red-400' },
              { label: 'Type Issues', value: `${health.dimensions?.consistency?.issue_count ?? 0}`, color: 'text-orange-400' },
              { label: 'Violations', value: `${health.dimensions?.validity?.violations?.length ?? 0}`, color: 'text-red-400' },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-xl bg-[#252538] border border-[#2d2d3d]">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-[#64748b]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Dimension Gauges */}
      <Card className="mb-6">
        <h3 className="section-title mb-6">Health Dimensions</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 justify-items-center mb-8">
          {Object.entries(health.dimensions || {}).map(([key, dim]: [string, any]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Object.keys(health.dimensions).indexOf(key) * 0.1 }}
            >
              <ScoreGauge score={dim.score} label={DIM_LABELS[key]} size={110} />
            </motion.div>
          ))}
        </div>

        {/* Dimension Details */}
        <div className="space-y-4">
          {Object.entries(health.dimensions || {}).map(([key, dim]: [string, any], idx) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 rounded-xl bg-[#252538] border border-[#2d2d3d]"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-white text-sm">{DIM_LABELS[key]}</span>
                  <span className="text-xs text-[#64748b] ml-2">{DIM_DESC[key]}</span>
                </div>
                <span className={`font-bold text-lg ${dim.score >= 80 ? 'text-green-400' : dim.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {dim.score?.toFixed(1)}%
                </span>
              </div>
              <ProgressBar value={dim.score} />
              <p className="text-xs text-[#94a3b8] mt-2">{dim.explanation}</p>

              {/* Issues detail */}
              {dim.issues && dim.issues.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {dim.issues.map((issue: any, i: number) => (
                    <span key={i} className="badge-warning">{issue.column}: {issue.issue}</span>
                  ))}
                </div>
              )}
              {dim.violations && dim.violations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {dim.violations.map((v: any, i: number) => (
                    <span key={i} className="badge-danger">{v.column}: {v.rule} ({v.count})</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  )
}
