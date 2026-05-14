import { useEffect, useState } from 'react'

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

// ─── 计算辅助 ───────────────────────────────────────────────

export function computeFlowchartRate(group: GroupSummary): number {
  const total = AREAS.reduce((s, a) => s + (group.areas[a]?.latest_check_total ?? 0), 0)
  const passed = AREAS.reduce((s, a) => s + (group.areas[a]?.latest_check_passed ?? 0), 0)
  return total > 0 ? Math.round((passed / total) * 100) : 0
}

export function computeFlowchartImprovement(groupId: number, checkTrend: GroupCheckTrend[]): number | null {
  const trend = checkTrend.find(t => t.group_id === groupId)
  if (!trend || trend.checks.length === 0) return null
  const byArea: Record<string, CheckAttempt[]> = {}
  for (const check of trend.checks) {
    if (!byArea[check.area]) byArea[check.area] = []
    byArea[check.area].push(check)
  }
  for (const area in byArea) {
    byArea[area].sort((a, b) => a.attempt - b.attempt)
  }
  const areasWithMultiple = Object.values(byArea).filter(checks => checks.length >= 2)
  if (areasWithMultiple.length === 0) return null
  const avgFirst = areasWithMultiple.reduce((s, checks) => s + checks[0].rate, 0) / areasWithMultiple.length
  const avgLast = areasWithMultiple.reduce((s, checks) => s + checks[checks.length - 1].rate, 0) / areasWithMultiple.length
  return Math.round(avgLast - avgFirst)
}

export function computeDeviceRate(group: GroupSummary): number {
  const total = AREAS.reduce((s, a) => s + (group.areas[a]?.device_check_total ?? 0), 0)
  const passed = AREAS.reduce((s, a) => s + (group.areas[a]?.device_check_passed ?? 0), 0)
  return total > 0 ? Math.round((passed / total) * 100) : 0
}

export function computeDeviceCoverage(group: GroupSummary): number {
  return AREAS.filter(a => group.areas[a]?.has_device_submission).length
}

export function passColor(rate: number): string {
  if (rate >= 80) return '#10b981'
  if (rate >= 60) return '#f59e0b'
  return '#ef4444'
}

// ─── SummaryBar ───────────────────────────────────────────────

function SummaryBar({ overview, groups }: { overview: Overview; groups: GroupSummary[] }) {
  const activeGroups = groups.filter(g => AREAS.some(a => (g.areas[a]?.latest_check_total ?? 0) > 0))
  const avgFlowchartRate = activeGroups.length > 0
    ? Math.round(activeGroups.reduce((s, g) => s + computeFlowchartRate(g), 0) / activeGroups.length)
    : 0

  const activeDeviceGroups = groups.filter(g => AREAS.some(a => g.areas[a]?.has_device_submission))
  const avgDeviceRate = activeDeviceGroups.length > 0
    ? Math.round(activeDeviceGroups.reduce((s, g) => s + computeDeviceRate(g), 0) / activeDeviceGroups.length)
    : 0

  const stats = [
    { label: '参与小组', value: String(overview.total_groups), unit: '组', color: '#60a5fa' },
    { label: '功能设计平均通过率', value: `${avgFlowchartRate}%`, unit: '', color: passColor(avgFlowchartRate) },
    { label: '设备选型平均通过率', value: `${avgDeviceRate}%`, unit: '', color: passColor(avgDeviceRate) },
    { label: '全区域完成', value: `${overview.all_areas_complete} / ${overview.total_groups}`, unit: '组', color: '#60a5fa' },
  ]

  return (
    <div style={{ background: '#1e293b', borderRadius: 16, padding: '24px 32px', display: 'flex' }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          flex: 1,
          textAlign: 'center',
          borderRight: i < stats.length - 1 ? '1px solid #334155' : 'none',
          padding: '0 24px',
        }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
            {s.label}{s.unit ? `（${s.unit}）` : ''}
          </div>
        </div>
      ))}
    </div>
  )
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
      <SummaryBar overview={data.overview} groups={data.groups} />
    </div>
  )
}
