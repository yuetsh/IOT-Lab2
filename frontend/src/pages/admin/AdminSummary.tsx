import { useEffect, useState } from 'react'
// recharts components used in later tasks
// @ts-ignore
import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统'] as const
export const AREA_SHORT = ['大门', '身份', '安防', 'LED', '绿植', '自助'] as const

interface AreaSummary {
  flowchart_count: number
  latest_check_passed: number
  latest_check_total: number
  has_device_submission: boolean
  device_check_passed: number
  device_check_total: number
  device_check_all_passed: boolean
}

interface GroupSummary {
  id: number
  name: string
  message_count: number
  user_message_count: number
  total_flowcharts: number
  completed_areas: number
  device_completed_areas: number
  areas: Record<string, AreaSummary>
}

interface Overview {
  total_groups: number
  avg_messages: number
  avg_flowcharts: number
  all_areas_complete: number
  all_device_complete: number
}

interface SummaryData {
  overview: Overview
  groups: GroupSummary[]
}

interface CheckAttempt {
  attempt: number
  passed: number
  total: number
  rate: number
  area: string
}

interface GroupCheckTrend {
  group_id: number
  group_name: string
  checks: CheckAttempt[]
}

interface ProgressData {
  checkTrend: GroupCheckTrend[]
  completionTimeline: unknown[]
}

export default function AdminSummary() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/summary').then(r => r.json()),
      fetch('/api/admin/progress').then(r => r.json()),
    ]).then(([summary, prog]) => {
      setData(summary)
      setProgress(prog)
      setLoading(false)
    })
  }, [])

  if (loading) return <p style={{ color: '#a0aec0', padding: 32 }}>加载中…</p>
  if (!data || !progress) return <p style={{ color: '#e53e3e', padding: 32 }}>加载失败</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#1a202c' }}>学习评价</h2>
    </div>
  )
}
