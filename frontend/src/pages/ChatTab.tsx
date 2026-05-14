import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import MermaidRenderer from '../components/MermaidRenderer'
import { buildFixPrompt, hasFailedCheckResults } from './chatPrompt'
import { buildChatRequestPayload } from './chatRequest'

interface Message { id: number; role: string; content: string }
interface Flowchart { id: number | null; mermaid_code: string; area: string | null }

export interface WorkspaceContext {
  area: string | null
  flowchartId: number | null
}

interface Props {
  groupId: string
  initialArea?: string | null
  initialFlowchartId?: number | null
  onMermaidChange?: (code: string | null) => void
  onWorkspaceContextChange?: (context: WorkspaceContext) => void
}

const mdStyles: React.CSSProperties = {
  fontSize: 14, lineHeight: 1.7,
}

function stripMermaid(content: string) {
  return content.replace(/```mermaid[\s\S]*?```/g, '').trim()
}

const AREAS = ['大门区域', '身份识别', '大厅安防', 'LED显示', '绿色植物', '自助系统'] as const
type Area = typeof AREAS[number]

function isArea(value: string | null | undefined): value is Area {
  return AREAS.includes(value as Area)
}

const AREA_FEATURES: Record<Area, string[]> = {
  '大门区域': [
    '利用人体红外传感器检测人员进出',
    '检测到人员靠近时自动开启大门',
    '人员离开后自动关闭大门',
  ],
  '身份识别': [
    '支持RFID刷卡完成读者身份识别',
    '识别通过后自动开启门禁闸机',
    '实时统计进出人流量数据',
    '非法闯入时触发声光报警装置',
  ],
  '大厅安防': [
    '实时监测大厅温湿度数据',
    '实时监测CO₂浓度和空气质量',
    '部署烟雾与火焰传感器实现火灾预警',
    '环境数据超标时自动发出预警提示',
    '超标时自动调控空调制冷或除湿',
  ],
  'LED显示': [
    '实时显示当前日期与时间',
    '实时推送温湿度和空气质量等环境数据',
    '滚动播放图书馆通知和新书推荐信息',
    '同步显示安防与门禁状态提示',
  ],
  '绿色植物': [
    '实时监测绿植土壤水分含量',
    '水分不足时自动启动雾化加湿或浇水装置',
    '浇水完成后自动停止设备运行',
    '实时监测水箱液位，液位不足时暂停浇水',
    '实时监测水温，水温偏低时自动启动加热',
  ],
  '自助系统': [
    '支持读者自助完成图书借还操作',
    '支持图书信息查询和续借功能',
    '借还成功后自动打印小票凭证',
  ],
}

const AREA_BASE: Record<Area, string> = {
  '大门区域': '设计图书馆大门自动开关控制系统',
  '身份识别': '设计图书馆读者身份识别与门禁管理系统',
  '大厅安防': '设计图书馆大厅环境监测与自动调控系统',
  'LED显示': '设计图书馆LED大屏信息发布与展示系统',
  '绿色植物': '设计图书馆绿植智能养护系统',
  '自助系统': '设计图书馆自助借还书终端系统',
}

function getAreaStarter(area: Area): string {
  const features = AREA_FEATURES[area]
  return `${AREA_BASE[area]}，${features.join('，')}`
}

const AREA_CRITERIA: Partial<Record<Area, string[]>> = {
  '大门区域': [
    '利用人体红外检测，自动判定有无人员进出图书馆大门',
    '有人靠近时，自动控制大门开启',
    '人员离开后，自动控制大门关闭',
  ],
  '身份识别': [
    '支持RFID刷卡完成读者身份识别',
    '识别通过后，自动开启门禁/闸机',
    '实时统计进出人流量数据',
    '非法闯入时，触发报警灯/声光报警',
  ],
  '自助系统': [
    '支持图书自助借还操作',
    '支持图书信息查询/续借功能',
    '借还成功后，自动打印小票凭证',
  ],
  '绿色植物': [
    '实时监测绿植土壤水分含量',
    '土壤水分不足时，自动启动雾化加湿/浇水',
    '浇水/加湿完成后，自动停止设备运行',
    '实时监测水箱液位，液位不足时暂停浇水',
    '实时监测水温，水温偏低时自动启动加热棒',
  ],
  'LED显示': [
    '实时显示当前日期/时间',
    '实时推送温湿度、空气质量等环境数据',
    '滚动显示图书馆通知/新书推荐信息',
    '同步显示安防/门禁状态提示',
  ],
  '大厅安防': [
    '实时监测大厅温湿度数据',
    '实时监测大厅空气质量/CO₂浓度',
    '实时监测烟雾/火焰，实现火灾预警',
    '环境数据超标时，自动发出预警提示',
    '环境数据超标时自动控制空调（温度过高开制冷、湿度过高开除湿），维持大厅舒适环境',
  ],
}

interface CheckResult { passed: boolean; comment: string }

{
  const s = document.createElement('style')
  s.textContent = '@keyframes spin { to { transform: rotate(360deg) } }'
  document.head.appendChild(s)
}

export default function ChatTab({
  groupId,
  initialArea,
  initialFlowchartId,
  onMermaidChange,
  onWorkspaceContextChange,
}: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedArea, setSelectedArea] = useState<Area | null>(() => isArea(initialArea) ? initialArea : null)
  const [checking, setChecking] = useState(false)
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [referenceFlowchart, setReferenceFlowchart] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [mermaidCode, setMermaidCode] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nextArea = isArea(initialArea) ? initialArea : null
    setSelectedArea(current => current === nextArea ? current : nextArea)
    if (!nextArea) setCheckResults(null)
  }, [initialArea])

  // 切换区域时加载该区域的对话
  useEffect(() => {
    if (!selectedArea) {
      setMessages([])
      setMermaidCode(null)
      onMermaidChange?.(null)
      onWorkspaceContextChange?.({ area: null, flowchartId: null })
      return
    }
    let cancelled = false
    const params = new URLSearchParams({ area: selectedArea })
    if (initialArea === selectedArea && initialFlowchartId != null) {
      params.set('flowchartId', String(initialFlowchartId))
    }
    fetch(`/api/groups/${groupId}/conversation?${params}`)
      .then(r => r.json())
      .then((data: { messages: Message[]; flowchart: Flowchart | null }) => {
        if (cancelled) return
        setMessages(data.messages)
        const code = data.flowchart?.mermaid_code ?? null
        const flowchartId = data.flowchart?.id ?? null
        setMermaidCode(code)
        onMermaidChange?.(code)
        onWorkspaceContextChange?.({ area: selectedArea, flowchartId })
      })
    return () => {
      cancelled = true
    }
  }, [selectedArea, groupId, initialArea, initialFlowchartId, onMermaidChange, onWorkspaceContextChange])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function reloadArea() {
    if (!selectedArea) return
    const data = await fetch(`/api/groups/${groupId}/conversation?area=${encodeURIComponent(selectedArea)}`).then(r => r.json()) as {
      messages: Message[]
      flowchart: Flowchart | null
    }
    setMessages(data.messages)
    const code = data.flowchart?.mermaid_code ?? null
    const flowchartId = data.flowchart?.id ?? null
    setMermaidCode(code)
    onMermaidChange?.(code)
    onWorkspaceContextChange?.({ area: selectedArea, flowchartId })
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    if (!selectedArea) {
      alert('请先选择一个功能区域')
      return
    }
    setInput('')
    setLoading(true)
    setCheckResults(null)
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: text }])
    try {
      await fetch(`/api/groups/${groupId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildChatRequestPayload(selectedArea, text))
      })
      await reloadArea()
    } finally {
      setLoading(false)
    }
  }

  async function runCheck() {
    if (!mermaidCode || !selectedArea) return
    const crit = AREA_CRITERIA[selectedArea]
    if (!crit) return
    setChecking(true)
    setCheckResults(null)
    try {
      const res = await fetch(`/api/groups/${groupId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mermaidCode, area: selectedArea, criteria: crit })
      })
      const data = await res.json() as {
        results: CheckResult[]
        check_count: number
        reference_flowchart: string | null
      }
      setCheckResults(data.results)
      setCheckCount(data.check_count)
      setReferenceFlowchart(data.reference_flowchart ?? null)
    } finally {
      setChecking(false)
    }
  }

  const canCheck = !!mermaidCode && !!selectedArea && !!AREA_CRITERIA[selectedArea]
  const canBuildFixPrompt = !!selectedArea && !!checkResults && !!AREA_CRITERIA[selectedArea]
  const shouldShowFixPromptButton = hasFailedCheckResults(checkResults)

  return (
    <>
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* 对话区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <p style={{ color: '#a0aec0', textAlign: 'center', marginTop: 60 }}>
              {selectedArea ? `选择「${selectedArea}」，描述需求后开始生成` : '请先选择上方功能区域'}
            </p>
          )}
          {messages.map(m => (
            <div key={m.id} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '82%',
              background: m.role === 'user' ? '#4299e1' : '#f7fafc',
              color: m.role === 'user' ? '#fff' : '#2d3748',
              padding: '10px 14px', borderRadius: 12,
              border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
            }}>
              {m.role === 'user' ? (
                <span style={{ fontSize: 14, lineHeight: 1.6 }}>{m.content}</span>
              ) : (
                <div style={mdStyles} className="md-body">
                  <ReactMarkdown
                    components={{
                      code({ children, className }) {
                        const lang = /language-(\w+)/.exec(className ?? '')?.[1]
                        if (lang === 'mermaid') return null
                        return (
                          <code style={{
                            background: '#e2e8f0', borderRadius: 4,
                            padding: '1px 5px', fontSize: 13, fontFamily: 'monospace'
                          }}>{children}</code>
                        )
                      },
                      pre({ children }) {
                        return (
                          <pre style={{
                            background: '#2d3748', color: '#e2e8f0', borderRadius: 8,
                            padding: '10px 14px', overflowX: 'auto', fontSize: 13,
                            fontFamily: 'monospace', margin: '8px 0'
                          }}>{children}</pre>
                        )
                      }
                    }}
                  >
                    {stripMermaid(m.content)}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: '#a0aec0', fontSize: 14, padding: '8px 14px' }}>
              AI 思考中…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: '10px 12px 0', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {AREAS.map(area => (
              <button
                key={area}
                onClick={() => {
                  if (area === selectedArea) {
                    setSelectedArea(null)
                    setCheckResults(null)
                    setCheckCount(0)
                    setReferenceFlowchart(null)
                    onWorkspaceContextChange?.({ area: null, flowchartId: null })
                  } else {
                    setSelectedArea(area)
                    setCheckResults(null)
                    setCheckCount(0)
                    setReferenceFlowchart(null)
                    setInput(getAreaStarter(area))
                    onWorkspaceContextChange?.({ area, flowchartId: null })
                  }
                }}
                style={{
                  padding: '4px 12px', fontSize: 13, borderRadius: 20, cursor: 'pointer',
                  border: selectedArea === area ? '2px solid #4299e1' : '1.5px solid #cbd5e0',
                  background: selectedArea === area ? '#ebf8ff' : '#fff',
                  color: selectedArea === area ? '#2b6cb0' : '#4a5568',
                  fontWeight: selectedArea === area ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '8px 12px 12px', display: 'flex', gap: 8 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={selectedArea ? `描述「${selectedArea}」模块的需求… (Enter 发送)` : '请先选择上方功能区域，再描述需求…'}
            rows={4}
            style={{
              flex: 1, resize: 'none', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '8px 12px', fontSize: 14, fontFamily: 'sans-serif', outline: 'none'
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim() || !selectedArea}
            style={{
              padding: '8px 20px', background: (loading || !selectedArea) ? '#a0aec0' : '#4299e1',
              color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14
            }}
          >
            发送
          </button>
        </div>
      </div>

      {/* 流程图区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 10px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, flex: 1, color: '#4a5568', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            当前流程图{selectedArea ? ` · ${selectedArea}` : ''}
          </h3>
          {mermaidCode && (
            <button
              onClick={() => setFullscreen(true)}
              title="全屏查看"
              style={{
                marginRight: 8, padding: '5px 10px', fontSize: 14, borderRadius: 6,
                border: '1.5px solid #cbd5e0', background: '#fff', color: '#4a5568',
                cursor: 'pointer', lineHeight: 1,
              }}
            >⛶</button>
          )}
          <button
            onClick={() => {
              if (!selectedArea) { alert('请先选择功能区域'); return }
              if (!AREA_CRITERIA[selectedArea]) { alert(`「${selectedArea}」暂无检查标准`); return }
              if (!mermaidCode) { alert('请先生成流程图'); return }
              runCheck()
            }}
            disabled={checking}
            style={{
              padding: '5px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
              border: `1.5px solid ${canCheck ? '#68d391' : '#cbd5e0'}`,
              background: checking ? '#f0fff4' : '#fff',
              color: checking ? '#68d391' : canCheck ? '#276749' : '#a0aec0',
              fontWeight: 500,
            }}
          >
            {checking ? '检查中…' : '✓ 检查'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(255,255,255,0.75)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '3px solid #e2e8f0', borderTopColor: '#4299e1',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 13, color: '#718096' }}>AI 生成中…</span>
            </div>
          )}

          {checkResults && selectedArea && AREA_CRITERIA[selectedArea] && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{
                padding: '10px 16px',
                background: '#f7fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 13, color: '#2d3748' }}>
                  「{selectedArea}」功能检查结果
                </div>
                {shouldShowFixPromptButton && (
                  <button
                    onClick={() => {
                      if (!canBuildFixPrompt) return
                      setInput(buildFixPrompt({
                        area: selectedArea,
                        criteria: AREA_CRITERIA[selectedArea]!,
                        results: checkResults,
                      }))
                    }}
                    style={{
                      padding: '5px 10px',
                      fontSize: 12,
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: '1.5px solid #4299e1',
                      background: '#fff',
                      color: '#2b6cb0',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    提示词建议
                  </button>
                )}
              </div>
              {AREA_CRITERIA[selectedArea]!.map((criterion, i) => {
                const result = checkResults[i]
                const passed = result?.passed ?? false
                return (
                  <div key={i} style={{
                    padding: '10px 16px',
                    borderBottom: i < checkResults.length - 1 ? '1px solid #f0f4f8' : 'none',
                    background: passed ? '#f0fff4' : '#fff5f5',
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{passed ? '✅' : '❌'}</span>
                      <div>
                        <div style={{ fontSize: 13, color: '#2d3748', marginBottom: 2 }}>{criterion}</div>
                        {result?.comment && (
                          <div style={{ fontSize: 12, color: '#718096' }}>{result.comment}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {referenceFlowchart && (
            <div style={{ border: '1px solid #bee3f8', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{
                padding: '10px 16px',
                background: '#ebf8ff',
                borderBottom: '1px solid #bee3f8',
                fontWeight: 600, fontSize: 13, color: '#2b6cb0',
              }}>
                参考流程图（已检查 {checkCount} 次，供参考）
              </div>
              <div style={{ padding: 16 }}>
                <MermaidRenderer code={referenceFlowchart} />
              </div>
            </div>
          )}

          {mermaidCode ? (
            <MermaidRenderer code={mermaidCode} />
          ) : (
            <div style={{ color: '#a0aec0', textAlign: 'center', paddingTop: 80 }}>
              {selectedArea ? '发送消息后，流程图将在这里显示' : '请先选择功能区域'}
            </div>
          )}
        </div>
      </div>
    </div>

    {fullscreen && mermaidCode && (
      <div
        onClick={() => setFullscreen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 12, padding: 32,
            width: '92vw', height: '90vh', overflow: 'auto',
            position: 'relative',
          }}
        >
          <button
            onClick={() => setFullscreen(false)}
            style={{
              position: 'absolute', top: 12, right: 12,
              border: 'none', background: 'transparent',
              fontSize: 20, cursor: 'pointer', color: '#718096', lineHeight: 1,
            }}
          >✕</button>
          <MermaidRenderer code={mermaidCode!} style={{ minWidth: 600 }} />
        </div>
      </div>
    )}
    </>
  )
}
