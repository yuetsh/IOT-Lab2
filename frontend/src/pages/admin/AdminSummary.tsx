import { useEffect, useState } from 'react'

const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统'] as const
const AREA_SHORT = ['大门', '身份', '安防', 'LED', '绿植', '自助'] as const

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

function computeFlowchartRate(group: GroupSummary): number {
  const total = AREAS.reduce((s, a) => s + (group.areas[a]?.latest_check_total ?? 0), 0)
  const passed = AREAS.reduce((s, a) => s + (group.areas[a]?.latest_check_passed ?? 0), 0)
  return total > 0 ? Math.round((passed / total) * 100) : 0
}

function computeFlowchartImprovement(groupId: number, checkTrend: GroupCheckTrend[]): number | null {
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

function computeDeviceRate(group: GroupSummary): number {
  const total = AREAS.reduce((s, a) => s + (group.areas[a]?.device_check_total ?? 0), 0)
  const passed = AREAS.reduce((s, a) => s + (group.areas[a]?.device_check_passed ?? 0), 0)
  return total > 0 ? Math.round((passed / total) * 100) : 0
}

function computeDeviceCoverage(group: GroupSummary): number {
  return AREAS.filter(a => group.areas[a]?.has_device_submission).length
}

function passColor(rate: number): string {
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

// ─── AreaDots ─────────────────────────────────────────────────

function AreaDots({ group, mode }: { group: GroupSummary; mode: 'flowchart' | 'device' }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {AREAS.map((area, i) => {
        const a = group.areas[area]
        let bg: string
        let title: string
        if (mode === 'flowchart') {
          const total = a?.latest_check_total ?? 0
          const passed = a?.latest_check_passed ?? 0
          if (total === 0) { bg = '#e2e8f0'; title = '未检测' }
          else if (passed === total) { bg = '#10b981'; title = '全部通过' }
          else if (passed / total >= 0.6) { bg = '#f59e0b'; title = '部分通过' }
          else { bg = '#ef4444'; title = '未通过' }
        } else {
          if (!a?.has_device_submission) { bg = '#e2e8f0'; title = '未提交' }
          else if (a.device_check_all_passed) { bg = '#10b981'; title = '验证通过' }
          else { bg = '#60a5fa'; title = '待验证' }
        }
        return (
          <div
            key={area}
            title={`${AREA_SHORT[i]}: ${title}`}
            style={{
              width: 22, height: 22, borderRadius: 5, background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#fff', fontWeight: 700,
            }}
          >
            {AREA_SHORT[i]}
          </div>
        )
      })}
    </div>
  )
}

// ─── DimBlock ─────────────────────────────────────────────────

function DimBlock({ title, dotColor, rate, improvement, coverage, group, mode }: {
  title: string
  dotColor: string
  rate: number
  improvement: number | null
  coverage: number
  group: GroupSummary
  mode: 'flowchart' | 'device'
}) {
  const barColor = passColor(rate)
  return (
    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{title}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>最终通过率</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: rate > 0 ? barColor : '#94a3b8' }}>
            {rate > 0 ? `${rate}%` : '—'}
          </span>
        </div>
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${rate}%`, height: '100%', background: barColor, borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>进步幅度</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: improvement !== null && improvement > 0 ? '#10b981' : '#94a3b8' }}>
          {improvement !== null ? (improvement > 0 ? `+${improvement}%` : `${improvement}%`) : '—'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>完成区域</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{coverage} / 6</span>
      </div>
      <AreaDots group={group} mode={mode} />
    </div>
  )
}

// ─── GroupCard ────────────────────────────────────────────────

function GroupCard({ group, checkTrend, isTop }: {
  group: GroupSummary
  checkTrend: GroupCheckTrend[]
  isTop: boolean
}) {
  const flowchartRate = computeFlowchartRate(group)
  const flowchartImprovement = computeFlowchartImprovement(group.id, checkTrend)
  const flowchartCoverage = AREAS.filter(a => (group.areas[a]?.latest_check_total ?? 0) > 0).length
  const deviceRate = computeDeviceRate(group)
  const deviceCoverage = computeDeviceCoverage(group)

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      border: `2px solid ${isTop ? '#f59e0b' : 'transparent'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{group.name}</span>
        {isTop && (
          <span style={{
            fontSize: 12, background: '#fef3c7', color: '#92400e',
            padding: '4px 10px', borderRadius: 20, fontWeight: 700,
          }}>
            最佳小组
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <DimBlock
          title="功能设计"
          dotColor="#3b82f6"
          rate={flowchartRate}
          improvement={flowchartImprovement}
          coverage={flowchartCoverage}
          group={group}
          mode="flowchart"
        />
        <DimBlock
          title="设备选型"
          dotColor="#10b981"
          rate={deviceRate}
          improvement={null}
          coverage={deviceCoverage}
          group={group}
          mode="device"
        />
      </div>
    </div>
  )
}

// ─── GroupCardGrid ────────────────────────────────────────────

function GroupCardGrid({ groups, checkTrend }: { groups: GroupSummary[]; checkTrend: GroupCheckTrend[] }) {
  const sorted = [...groups].sort((a, b) =>
    (computeFlowchartRate(b) + computeDeviceRate(b)) - (computeFlowchartRate(a) + computeDeviceRate(a))
  )
  const topId = sorted[0]?.id

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {sorted.map(group => (
        <GroupCard
          key={group.id}
          group={group}
          checkTrend={checkTrend}
          isTop={group.id === topId}
        />
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
      <GroupCardGrid groups={data.groups} checkTrend={progress.checkTrend} />
    </div>
  )
}
