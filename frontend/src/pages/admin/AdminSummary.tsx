import { useEffect, useState } from 'react'
import type React from 'react'
import {
  BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统'] as const
const AREA_SHORT = ['大门', '身份', '安防', 'LED', '绿植', '自助'] as const

interface AreaSummary {
  flowchart_count: number
  latest_check_passed: number
  latest_check_total: number
  has_device_submission: boolean
  device_check_passed: number
  device_check_total: number
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

interface RevisionRound {
  area: string
  avg_rounds: number
  groups_count: number
}

interface CompletionGroup {
  group_id: number
  group_name: string
  areas: Record<string, number | null>
}

interface ProgressData {
  checkTrend: GroupCheckTrend[]
  revisionRounds: RevisionRound[]
  completionTimeline: CompletionGroup[]
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 180,
      background: '#fff',
      borderLeft: `8px solid ${color}`,
      borderRadius: 14,
      padding: '28px 32px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontSize: 72, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2d3748', marginTop: 10 }}>{label}</div>
      {sub && <div style={{ fontSize: 14, color: '#a0aec0', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function ChartCard({ title, height = 360, children }: { title: string; height?: number; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', marginBottom: 20, paddingBottom: 12, borderBottom: '3px solid #edf2f7' }}>
        {title}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

function AreaHeatmap({ groups, mode }: { groups: GroupSummary[]; mode: 'status' | 'count' }) {
  const maxCount = mode === 'count'
    ? Math.max(...groups.flatMap(g => AREAS.map(a => g.areas[a]?.flowchart_count ?? 0)), 1)
    : 1

  const gridCols = `80px repeat(6, 1fr)`

  return (
    <div>
      {/* 表头 */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 6, marginBottom: 6 }}>
        <div />
        {AREA_SHORT.map((a, i) => (
          <div key={i} style={{ fontSize: 14, fontWeight: 700, color: '#4a5568', textAlign: 'center', paddingBottom: 4 }}>{a}</div>
        ))}
      </div>

      {/* 数据行 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {groups.map(g => (
          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 6, alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#4a5568', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {g.name}
            </div>
            {AREAS.map(area => {
              const a = g.areas[area]

              if (mode === 'count') {
                const cnt = a?.flowchart_count ?? 0
                const intensity = cnt / maxCount
                const bg = cnt === 0 ? '#f1f5f9' : `rgba(59,130,246,${0.15 + intensity * 0.75})`
                const textColor = intensity > 0.5 ? '#fff' : '#1e3a8a'
                return (
                  <div key={area} style={{ height: 64, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: cnt === 0 ? 13 : 24, fontWeight: 900, color: cnt === 0 ? '#94a3b8' : textColor }}>
                      {cnt === 0 ? '—' : cnt}
                    </span>
                  </div>
                )
              }

              const hasFlowchart = a?.flowchart_count > 0
              const hasDevice = a?.has_device_submission
              let bg = '#f1f5f9', label = '未开始', textColor = '#94a3b8'
              if (hasDevice) { bg = '#bbf7d0'; textColor = '#166534'; label = '已安放' }
              else if (hasFlowchart) {
                const checkRate = a.latest_check_total > 0 ? a.latest_check_passed / a.latest_check_total : null
                if (checkRate === 1) { bg = '#fef9c3'; textColor = '#854d0e'; label = '待安放' }
                else { bg = '#fed7aa'; textColor = '#9a3412'; label = '进行中' }
              }

              return (
                <div key={area} style={{ height: 64, borderRadius: 10, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: textColor }}>{label}</span>
                  {hasFlowchart && (
                    <span style={{ fontSize: 12, color: textColor, opacity: 0.85 }}>
                      {a.latest_check_total > 0 ? `${a.latest_check_passed}/${a.latest_check_total}` : `×${a.flowchart_count}`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {mode === 'status' && (
        <div style={{ display: 'flex', gap: 20, marginTop: 18, flexWrap: 'wrap' }}>
          {[
            { bg: '#bbf7d0', color: '#166534', label: '已安放设备' },
            { bg: '#fef9c3', color: '#854d0e', label: '待安放（检测通过）' },
            { bg: '#fed7aa', color: '#9a3412', label: '进行中' },
            { bg: '#f1f5f9', color: '#94a3b8', label: '未开始' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: item.bg }} />
              <span style={{ fontSize: 14, color: item.color, fontWeight: 700 }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
      {mode === 'count' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <span style={{ fontSize: 14, color: '#94a3b8' }}>少</span>
          {[0.15, 0.35, 0.55, 0.75, 0.9].map(op => (
            <div key={op} style={{ width: 26, height: 18, borderRadius: 4, background: `rgba(59,130,246,${op})` }} />
          ))}
          <span style={{ fontSize: 14, color: '#94a3b8' }}>多</span>
          <span style={{ fontSize: 13, color: '#a0aec0', marginLeft: 6 }}>数字 = 流程图生成次数</span>
        </div>
      )}
    </div>
  )
}

const tooltipStyle = { fontSize: 14, borderRadius: 8, border: '1px solid #e2e8f0' }
function rateColor(rate: number): { bg: string; text: string } {
  if (rate >= 90) return { bg: '#34d399', text: '#fff' }
  if (rate >= 80) return { bg: '#bbf7d0', text: '#064e3b' }
  if (rate >= 60) return { bg: '#d1fae5', text: '#065f46' }
  if (rate >= 40) return { bg: '#fef3c7', text: '#92400e' }
  return { bg: '#fee2e2', text: '#991b1b' }
}

// 小组 × 区域矩阵：每格展示该组在该区域的各轮检测通过率
function CheckTrendMatrix({ groups }: { groups: GroupCheckTrend[] }) {
  const active = groups.filter(g => g.checks.length > 0)
  if (active.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, color: '#a0aec0', fontSize: 14 }}>暂无检测数据</div>
  )

  const data = active.map(g => ({
    group_id: g.group_id,
    group_name: g.group_name,
    byArea: Object.fromEntries(
      AREAS.map(area => [area, g.checks.filter(c => c.area === area)])
    ) as Record<string, CheckAttempt[]>,
  }))

  const gridCols = `80px repeat(6, 1fr)`

  return (
    <div>
      {/* 列头：区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, marginBottom: 8 }}>
        <div />
        {AREA_SHORT.map((a, i) => (
          <div key={i} style={{ fontSize: 13, fontWeight: 700, color: '#4a5568', textAlign: 'center', paddingBottom: 4 }}>{a}</div>
        ))}
      </div>

      {/* 行：每个小组 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(g => (
          <div key={g.group_id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, alignItems: 'start' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4a5568', paddingTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {g.group_name}
            </div>
            {AREAS.map(area => {
              const attempts = g.byArea[area]
              if (!attempts || attempts.length === 0) {
                return (
                  <div key={area} style={{ minHeight: 34, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, color: '#cbd5e0' }}>—</span>
                  </div>
                )
              }
              return (
                <div key={area} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {attempts.map((a, i) => {
                    const { bg, text } = rateColor(a.rate)
                    const isLast = i === attempts.length - 1
                    return (
                      <div key={i} style={{
                        background: bg, color: text,
                        borderRadius: 7, padding: '4px 6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontWeight: 700, fontSize: 12,
                        opacity: isLast ? 1 : 0.6,
                        outline: isLast ? `2px solid ${text}22` : 'none',
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>第{i + 1}轮</span>
                        <span>{a.rate}%</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>通过率</span>
          {(['#fee2e2', '#fef3c7', '#d1fae5', '#bbf7d0', '#34d399'] as const).map(c => (
            <div key={c} style={{ width: 14, height: 10, background: c, borderRadius: 2 }} />
          ))}
          <span style={{ fontSize: 12, color: '#94a3b8' }}>低→高</span>
        </div>
        <span style={{ fontSize: 12, color: '#cbd5e0' }}>·</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>最终轮加粗，历史轮半透明；格内从上到下为第1、2、3轮</span>
      </div>
    </div>
  )
}

function rankStyle(rank: number, maxRank: number): { bg: string; text: string } {
  const t = maxRank <= 1 ? 1 : 1 - (rank - 1) / (maxRank - 1)
  if (t > 0.85) return { bg: '#166534', text: '#fff' }
  if (t > 0.65) return { bg: '#15803d', text: '#fff' }
  if (t > 0.45) return { bg: '#4ade80', text: '#14532d' }
  if (t > 0.25) return { bg: '#bbf7d0', text: '#166534' }
  return { bg: '#f0fdf4', text: '#166534' }
}

function TimelineGrid({ groups }: { groups: CompletionGroup[] }) {
  const allRanks = groups.flatMap(g => Object.values(g.areas)).filter((r): r is number => r !== null)
  const maxRank = allRanks.length > 0 ? Math.max(...allRanks) : 1

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(6, 1fr)', gap: 6, marginBottom: 6 }}>
        <div />
        {AREA_SHORT.map((a, i) => (
          <div key={i} style={{ fontSize: 14, fontWeight: 700, color: '#4a5568', textAlign: 'center' }}>{a}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {groups.map(g => (
          <div key={g.group_id} style={{ display: 'grid', gridTemplateColumns: '80px repeat(6, 1fr)', gap: 6, alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.group_name}</div>
            {AREAS.map(area => {
              const rank = g.areas[area]
              if (rank === null) {
                return (
                  <div key={area} style={{ height: 56, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>—</span>
                  </div>
                )
              }
              const { bg, text } = rankStyle(rank, maxRank)
              return (
                <div key={area} style={{ height: 56, borderRadius: 8, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: text }}>#{rank}</span>
                  <span style={{ fontSize: 11, color: text, opacity: 0.8 }}>共{maxRank}项</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        {[0.9, 0.7, 0.5, 0.3, 0.1].map((t, i) => {
          const fakeRank = Math.round((1 - t) * (maxRank - 1)) + 1
          const { bg } = rankStyle(fakeRank, maxRank)
          return <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: bg }} />
        })}
        <span style={{ fontSize: 12, color: '#a0aec0', marginLeft: 4 }}>深绿 = 全班最早完成；所有组所有区域统一排名，灰格 = 尚未通过检测</span>
      </div>
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
  if (!data) return <p style={{ color: '#e53e3e', padding: 32 }}>加载失败</p>

  const { overview, groups } = data

  // 活跃度数据
  const activityData = groups.map(g => ({
    name: g.name,
    学生消息: g.user_message_count,
  }))

  // 流程图生成次数
  const flowchartData = groups.map(g => ({
    name: g.name,
    生成次数: g.total_flowcharts,
  }))

  // 检测通过率
  const checkRateData = groups
    .map(g => {
      const allPassed = AREAS.reduce((s, a) => s + (g.areas[a]?.latest_check_passed ?? 0), 0)
      const allTotal = AREAS.reduce((s, a) => s + (g.areas[a]?.latest_check_total ?? 0), 0)
      const rate = allTotal > 0 ? Math.round((allPassed / allTotal) * 100) : 0
      const fill = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444'
      return { name: g.name, 通过率: rate, total: allTotal, fill }
    })
    .filter(d => d.total > 0)

  // 各区域难度（跨组平均通过率）
  const areaDifficultyData = AREAS.map((area, i) => {
    const checked = groups.filter(g => (g.areas[area]?.latest_check_total ?? 0) > 0)
    const avgRate = checked.length > 0
      ? Math.round(checked.reduce((s, g) => {
          const a = g.areas[area]
          return s + (a.latest_check_passed / a.latest_check_total) * 100
        }, 0) / checked.length)
      : 0
    return { name: AREA_SHORT[i], 平均通过率: avgRate, 检测组数: checked.length }
  })


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#1a202c' }}>数据总结</h2>

      {/* KPI */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <KpiCard label="小组总数" value={overview.total_groups} color="#3b82f6" />
        <KpiCard label="平均对话消息" value={overview.avg_messages} sub="条/组" color="#8b5cf6" />
        <KpiCard label="平均流程图数" value={overview.avg_flowcharts} sub="张/组" color="#f59e0b" />
        <KpiCard label="6区域全部完成" value={`${overview.all_areas_complete}/${overview.total_groups}`} sub="组完成全部流程图" color="#10b981" />
        <KpiCard label="设备全部完成" value={`${overview.all_device_complete}/${overview.total_groups}`} sub="组完成全部安放" color="#06b6d4" />
      </div>

      {/* 第一行：对话次数 + 流程图生成次数 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ChartCard title="各组与 AI 对话次数" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 14, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 14, fill: '#64748b' }} />
              <Tooltip formatter={(v) => [v, '对话次数']} contentStyle={tooltipStyle} />
              <Bar dataKey="学生消息" name="对话次数" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="各组流程图生成总次数" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flowchartData} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 14, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 14, fill: '#64748b' }} />
              <Tooltip formatter={(v) => [v, '生成次数']} contentStyle={tooltipStyle} />
              <Bar dataKey="生成次数" name="生成次数" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 第二行：通过率 + 区域难度 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ChartCard title="各组流程图检测通过率">
          {checkRateData.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0', fontSize: 13 }}>
              暂无检测数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={checkRateData} layout="vertical" barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 14, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 14, fill: '#64748b' }} width={55} />
                <Tooltip formatter={(v) => [`${v}%`, '通过率']} contentStyle={tooltipStyle} />
                <Bar
                  dataKey="通过率"
                  shape={(props: any) => <Rectangle {...props} fill={props.fill} radius={[0, 4, 4, 0]} />}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="各区域平均检测通过率（难度分析）">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={areaDifficultyData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 14, fill: '#64748b' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 13, fill: '#a0aec0' }} tickFormatter={v => `${v}%`} />
              <Radar name="平均通过率" dataKey="平均通过率" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
              <Tooltip formatter={(v) => [`${v}%`, '平均通过率']} contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>


{/* 第四五行：两个矩阵并排 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', marginBottom: 20, paddingBottom: 12, borderBottom: '3px solid #edf2f7' }}>
            区域完成状态矩阵
          </div>
          <AreaHeatmap groups={groups} mode="status" />
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', marginBottom: 20, paddingBottom: 12, borderBottom: '3px solid #edf2f7' }}>
            各区域流程图生成次数
          </div>
          <AreaHeatmap groups={groups} mode="count" />
        </div>
      </div>

      {/* 学习进步分析 */}
      {progress && (
        <>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#1a202c', paddingTop: 8 }}>学习进步分析</div>

          {/* 检测通过率趋势热力表格 */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', marginBottom: 20, paddingBottom: 12, borderBottom: '3px solid #edf2f7' }}>
              各组历次检测通过率趋势
            </div>
            <CheckTrendMatrix groups={progress.checkTrend} />
          </div>

          {/* 完成时间线 */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', marginBottom: 20, paddingBottom: 12, borderBottom: '3px solid #edf2f7' }}>
              各组区域攻克时间线
            </div>
            <TimelineGrid groups={progress.completionTimeline} />
          </div>
        </>
      )}
    </div>
  )
}
