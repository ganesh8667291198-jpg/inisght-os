// InsightOS — Dataset Comparison Page
import { useState } from 'react'

import { GitCompare, RefreshCw } from 'lucide-react'
import { getComparison } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, Card, LoadingSpinner } from '../components/ui/Components'
import toast from 'react-hot-toast'

export default function Comparison() {
  const { currentDataset, recentDatasets } = useStore()
  const [compareTarget, setCompareTarget] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!currentDataset || !compareTarget) { toast.error('Select a second dataset'); return }
    if (currentDataset.id === compareTarget) { toast.error('Select a different dataset to compare'); return }
    setLoading(true)
    try {
      const r = await getComparison(currentDataset.id, compareTarget)
      setResult(r.data)
    } catch {
      toast.error('Comparison failed')
    }
    setLoading(false)
  }

  if (!currentDataset) return <div className="p-6"><PageHeader title="Dataset Comparison" subtitle="Upload a dataset first" icon={GitCompare} /></div>

  const others = Array.isArray(recentDatasets) ? recentDatasets.filter(d => d.id !== currentDataset.id) : []

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <PageHeader title="Dataset Comparison" subtitle="Compare schema and statistics between two datasets" icon={GitCompare} />

      {/* Selector */}
      <Card className="mb-6">
        <h3 className="section-title mb-4 text-sm">Select Datasets to Compare</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs text-[#64748b] mb-1.5 block">Dataset A (active)</label>
            <div className="input-field bg-[#131320] text-[#6366f1] font-medium cursor-not-allowed">
              {currentDataset.filename}
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-[#64748b] mb-1.5 block">Dataset B</label>
            {others.length === 0 ? (
              <div className="input-field text-[#475569] italic">Upload another dataset first</div>
            ) : (
              <select
                className="input-field"
                value={compareTarget}
                onChange={e => setCompareTarget(e.target.value)}
              >
                <option value="">— Select dataset —</option>
                {others.map(d => (
                  <option key={d.id} value={d.id}>{d.filename} ({d.rows?.toLocaleString()} rows)</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={run} disabled={loading || !compareTarget} className="btn-brand shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </Card>

      {loading && <LoadingSpinner text="Running comparison..." />}

      {result && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            {[result.dataset_a, result.dataset_b].map((ds: any, i: number) => (
              <Card key={i}>
                <h4 className="text-xs text-[#64748b] uppercase tracking-wider mb-3">Dataset {i === 0 ? 'A' : 'B'}</h4>
                <p className="font-semibold text-white mb-1">{ds.filename}</p>
                <p className="text-sm text-[#94a3b8]">{ds.rows?.toLocaleString()} rows × {ds.cols} columns</p>
              </Card>
            ))}
          </div>

          {/* Schema Diff */}
          <Card>
            <h3 className="section-title mb-4 text-sm">Schema Differences</h3>
            <p className="text-sm text-[#94a3b8] mb-4">{result.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Only in A', cols: result.schema_diff?.only_in_a, color: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
                { label: 'Only in B', cols: result.schema_diff?.only_in_b, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
                { label: 'In Common', cols: result.schema_diff?.common, color: 'text-[#94a3b8] bg-[#252538] border-[#2d2d3d]' },
              ].map(({ label, cols, color }) => (
                <div key={label} className={`p-4 rounded-xl border ${color}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3">{label} ({cols?.length || 0})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {(cols || []).length === 0 ? (
                      <p className="text-xs opacity-60">None</p>
                    ) : (cols || []).map((c: string) => (
                      <div key={c} className="text-xs font-mono px-2 py-1 rounded bg-black/20">{c}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Statistical Drift */}
          {Object.keys(result.statistical_diff || {}).length > 0 && (
            <Card>
              <h3 className="section-title mb-4 text-sm">Statistical Drift (Common Columns)</h3>
              <div className="overflow-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Mean A</th>
                      <th>Mean B</th>
                      <th>Null% A</th>
                      <th>Null% B</th>
                      <th>Drift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.statistical_diff).map(([col, d]: [string, any]) => (
                      <tr key={col}>
                        <td className="font-medium text-white">{col}</td>
                        <td className="font-mono">{d.mean_a?.toFixed(4)}</td>
                        <td className="font-mono">{d.mean_b?.toFixed(4)}</td>
                        <td>{d.null_pct_a}%</td>
                        <td>{d.null_pct_b}%</td>
                        <td>
                          <span className={`badge-${d.drift_detected ? 'danger' : 'success'}`}>
                            {d.drift_detected ? '⚠ Drift' : '✓ Stable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
