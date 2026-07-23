// InsightOS — Data Storytelling (Module 11) — The Unique Feature
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Download, FileText, RefreshCw, Shield, Lightbulb, AlertTriangle, ChevronRight } from 'lucide-react'
import { getStory, downloadReport } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, LoadingSpinner, Card } from '../components/ui/Components'
import toast from 'react-hot-toast'

function InvestigationCard({ inv }: { inv: any }) {
  const [expanded, setExpanded] = useState(false)
  const confColor = inv.confidence >= 90 ? 'text-green-400 bg-green-500/10 border-green-500/30'
    : inv.confidence >= 70 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    : 'text-red-400 bg-red-500/10 border-red-500/30'
  const impactColor = inv.business_impact === 'high' ? 'badge-danger'
    : inv.business_impact === 'medium' ? 'badge-warning' : 'badge-info'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="investigation-card cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm">
          #{inv.id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${confColor}`}>
              {inv.confidence}% confidence
            </span>
            <span className={impactColor}>{inv.business_impact} impact</span>
            <span className="badge-brand">{inv.type}</span>
          </div>
          <h3 className="text-base font-semibold text-white leading-snug">{inv.title}</h3>
          {expanded && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-3">
              <p className="text-sm text-[#94a3b8] leading-relaxed">{inv.explanation}</p>
              <div className="p-3 rounded-xl bg-[#0f0f1a] border border-[#2d2d3d] text-xs font-mono text-brand-300">
                <span className="text-[#64748b]">Statistical Test: </span>{inv.statistical_test}
              </div>
              {inv.evidence && Object.entries(inv.evidence).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="text-[#64748b] capitalize">{k.replace(/_/g, ' ')}:</span>
                  <span className="text-[#e2e8f0] font-mono">{JSON.stringify(v)}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-[#64748b] shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
    </motion.div>
  )
}

export default function Storytelling() {
  const { currentDataset, getCache, setCache } = useStore()
  const [story, setStory] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const load = () => {
    if (!currentDataset) return
    const cached = getCache(`story_${currentDataset.id}`)
    if (cached) { setStory(cached); return }
    setLoading(true)
    getStory(currentDataset.id)
      .then(r => { setStory(r.data); setCache(`story_${currentDataset.id}`, r.data) })
      .catch(() => toast.error('Failed to generate story'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [currentDataset?.id])

  const handleDownload = async (format: 'html' | 'pdf' | 'docx') => {
    if (!currentDataset) return
    setDownloading(format)
    try {
      const res = await downloadReport(currentDataset.id, format)
      const blob = new Blob([res.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `InsightOS_Report_${currentDataset.filename}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${format.toUpperCase()} report downloaded!`)
    } catch { toast.error('Download failed') }
    finally { setDownloading(null) }
  }

  if (!currentDataset) return <div className="p-6"><PageHeader title="Data Storytelling" subtitle="Upload a dataset first" icon={BookOpen} /></div>
  if (loading) return <div className="p-6"><LoadingSpinner text="Generating narrative report..." /></div>

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="Data Storytelling Engine"
        subtitle="AI-generated narrative report — reads like a professional analyst wrote it"
        icon={BookOpen}
        action={
          <div className="flex gap-2">
            <button onClick={load} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
            {['html', 'pdf', 'docx'].map((fmt) => (
              <button key={fmt} onClick={() => handleDownload(fmt as any)} className="btn-ghost text-xs" disabled={downloading === fmt}>
                <Download className="w-3.5 h-3.5" /> {downloading === fmt ? '...' : fmt.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      {story && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-bold text-white">Executive Summary</h2>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-[#94a3b8] leading-relaxed text-sm whitespace-pre-wrap">
                {story.executive_summary?.replace(/^## Executive Summary\n\n/, '')}
              </p>
            </div>
          </Card>

          {/* Key Findings */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-white">Key Findings</h2>
            </div>
            <div className="space-y-3">
              {story.key_findings?.map((finding: string, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-3 p-3 rounded-xl bg-[#252538] border border-[#2d2d3d]"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 shrink-0" />
                  <p className="text-sm text-[#94a3b8] leading-relaxed">
                    {finding.replace(/\*\*/g, '').replace(/`/g, '')}
                  </p>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Investigations */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">🔬</div>
              <h2 className="text-lg font-bold text-white">Investigations</h2>
              <span className="badge-brand">{story.investigations?.length || 0} found</span>
            </div>
            <div className="space-y-3">
              {story.investigations?.length === 0 && (
                <p className="text-[#64748b] text-sm">No significant patterns detected in this dataset.</p>
              )}
              {story.investigations?.map((inv: any) => (
                <InvestigationCard key={inv.id} inv={inv} />
              ))}
            </div>
          </div>

          {/* Risks */}
          {story.risks && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-bold text-white">Potential Risks</h2>
              </div>
              <div className="space-y-2">
                {story.risks.map((risk: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{risk.replace(/\*\*/g, '')}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {story.recommendations && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-bold text-white">Recommendations</h2>
              </div>
              <div className="space-y-2">
                {story.recommendations.map((rec: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                    <p className="text-sm text-green-300">{rec}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
