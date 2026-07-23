// InsightOS — Upload Center (Module 1)
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Database, AlertCircle, CheckCircle, Clock, Trash2, Eye, Table } from 'lucide-react'
import { uploadFile, listDatasets, deleteDataset } from '../api/client'
import { useStore } from '../store/useStore'
import { PageHeader, StatCard, LoadingSpinner, Card } from '../components/ui/Components'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

export default function UploadCenter() {
  const { setCurrentDataset, currentDataset, recentDatasets, setRecentDatasets } = useStore()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [preview, setPreview] = useState<any[]>([])
  const [previewCols, setPreviewCols] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    listDatasets().then(r => setRecentDatasets(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return
    const file = accepted[0]
    setUploading(true)
    setUploadProgress(0)
    try {
      const res = await uploadFile(file, setUploadProgress)
      const { dataset_id, overview, preview: rows } = res.data
      setCurrentDataset({ id: dataset_id, ...overview })
      setPreview(rows)
      setPreviewCols(overview.column_names || [])
      setShowPreview(true)
      toast.success(`✅ ${file.name} uploaded and analyzed!`)
      listDatasets().then(r => setRecentDatasets(r.data)).catch(() => {})
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xlsx', '.xls'], 'application/json': ['.json'] },
    multiple: false,
    disabled: uploading,
  })

  const loadDataset = async (id: string, filename: string) => {
    try {
      const { default: api } = await import('../api/client')
      const res = await api.get(`/api/upload/${id}/overview`)
      setCurrentDataset({ id, ...res.data.overview })
      setPreview(res.data.preview)
      setPreviewCols(res.data.overview.column_names || [])
      setShowPreview(true)
      toast.success(`Loaded ${filename}`)
    } catch { toast.error('Failed to load dataset') }
  }

  const removeDataset = async (id: string) => {
    try {
      await deleteDataset(id)
      toast.success('Dataset deleted')
      listDatasets().then(r => setRecentDatasets(r.data)).catch(() => {})
      if (currentDataset?.id === id) setCurrentDataset(null)
    } catch { toast.error('Delete failed') }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Data Upload Center"
        subtitle="Upload your dataset and InsightOS will automatically analyze it"
        icon={Upload}
      />

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`drop-zone mb-6 ${isDragActive ? 'active' : ''} ${uploading ? 'opacity-70 cursor-wait' : ''}`}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
              <LoadingSpinner text={`Uploading... ${uploadProgress}%`} />
              <div className="w-64 progress-bar">
                <motion.div className="progress-fill" animate={{ width: `${uploadProgress}%` }} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
                <Upload className={`w-8 h-8 ${isDragActive ? 'text-brand-400' : 'text-[#64748b]'}`} />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#e2e8f0]">
                  {isDragActive ? 'Drop to analyze!' : 'Drag & drop your dataset'}
                </p>
                <p className="text-sm text-[#64748b] mt-1">Supports CSV, Excel (.xlsx), and JSON files</p>
              </div>
              <button className="btn-brand">Browse Files</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Current Dataset Stats */}
      {currentDataset && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h2 className="text-base font-semibold text-white">Active Dataset: {currentDataset.filename}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard label="Rows" value={currentDataset.rows?.toLocaleString() || 0} color="brand" icon={Table} />
            <StatCard label="Columns" value={currentDataset.columns || 0} color="purple" icon={Database} />
            <StatCard label="Missing" value={currentDataset.null_count?.toLocaleString() || 0} color="yellow" icon={AlertCircle} />
            <StatCard label="Duplicates" value={currentDataset.duplicate_count?.toLocaleString() || 0} color="red" icon={AlertCircle} />
            <StatCard label="Memory" value={`${currentDataset.memory_usage_mb?.toFixed(2) || 0} MB`} color="cyan" />
            <StatCard label="Schema" value={`${currentDataset.schema?.length || 0} cols`} color="green" />
          </div>
        </motion.div>
      )}

      {/* Schema Table */}
      {currentDataset && currentDataset.schema && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Auto-Detected Schema</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn-ghost text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Column</th><th>Data Type</th><th>Semantic Type</th>
                  <th>Missing</th><th>Unique</th><th>Sample Values</th>
                </tr>
              </thead>
              <tbody>
                {currentDataset.schema.map((col: any) => (
                  <tr key={col.name}>
                    <td className="font-medium text-brand-400">{col.name}</td>
                    <td><span className="badge-info">{col.dtype}</span></td>
                    <td><span className="badge-brand">{col.semantic_type}</span></td>
                    <td>
                      <span className={col.null_pct > 20 ? 'text-red-400' : col.null_pct > 5 ? 'text-yellow-400' : 'text-green-400'}>
                        {col.null_pct}%
                      </span>
                    </td>
                    <td>{col.unique_count?.toLocaleString()}</td>
                    <td className="text-[#64748b]">{col.sample_values?.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Data Preview */}
      {showPreview && preview.length > 0 && (
        <Card className="mb-6">
          <h3 className="section-title mb-4">Data Preview (first 50 rows)</h3>
          <div className="overflow-auto max-h-80">
            <table className="data-table">
              <thead>
                <tr>{previewCols.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {previewCols.map((c) => (
                      <td key={c} className={row[c] === '' ? 'text-red-400/60 italic' : ''}>
                        {row[c] === '' ? 'null' : row[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent Datasets */}
      {Array.isArray(recentDatasets) && recentDatasets.length > 0 && (
        <Card>
          <h3 className="section-title mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" /> Recent Datasets
          </h3>
          <div className="space-y-2">
            {recentDatasets.map((ds: any) => (
              <motion.div
                key={ds.id}
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#252538] border border-[#2d2d3d] hover:border-brand-500/30 transition-colors"
              >
                <FileText className="w-4 h-4 text-brand-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{ds.filename}</div>
                  <div className="text-xs text-[#64748b]">{ds.rows?.toLocaleString()} rows × {ds.columns} cols · {ds.memory_mb?.toFixed(2)} MB</div>
                </div>
                <div className="text-xs text-[#475569]">{new Date(ds.uploaded_at).toLocaleDateString()}</div>
                <button onClick={() => loadDataset(ds.id, ds.filename)} className="btn-ghost text-xs py-1 px-2">Load</button>
                <button onClick={() => removeDataset(ds.id)} className="p-1.5 rounded-lg text-[#475569] hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
