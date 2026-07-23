// InsightOS — Axios API Client
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 120000, // 2 min for heavy analysis
})

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadFile = (file: File, onProgress?: (pct: number) => void) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/api/upload/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
}

export const listDatasets = () => api.get('/api/upload/datasets')
export const getOverview  = (id: string) => api.get(`/api/upload/${id}/overview`)
export const deleteDataset = (id: string) => api.delete(`/api/upload/${id}`)

// ── Analysis ──────────────────────────────────────────────────────────────────
export const getHealth      = (id: string) => api.get(`/api/health/${id}`)
export const getProfile     = (id: string) => api.get(`/api/profiling/${id}`)
export const getSuggestions = (id: string) => api.get(`/api/cleaning/${id}/suggestions`)
export const applyCleaning  = (id: string, ops: any[]) => api.post(`/api/cleaning/${id}/apply`, ops)
export const getEDA         = (id: string) => api.get(`/api/eda/${id}`)
export const getStatistics  = (id: string) => api.get(`/api/statistics/${id}`)
export const getPatterns    = (id: string) => api.get(`/api/patterns/${id}`)
export const getAnomalies   = (id: string) => api.get(`/api/anomaly/${id}`)
export const getClusters    = (id: string) => api.get(`/api/clusters/${id}`)
export const getTimeSeries  = (id: string) => api.get(`/api/timeseries/${id}`)
export const getStory       = (id: string) => api.get(`/api/story/${id}`)
export const getLineage     = (id: string) => api.get(`/api/lineage/${id}`)
export const getComparison  = (a: string, b: string) => api.get(`/api/comparison/${a}/${b}`)

// ── Reports ───────────────────────────────────────────────────────────────────
export const downloadReport = (id: string, format: 'html' | 'pdf' | 'docx') => {
  return api.get(`/api/reports/${id}/${format}`, { responseType: 'blob' })
}

export default api
