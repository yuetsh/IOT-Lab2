import { useState } from 'react'

type Status = 'idle' | 'loading' | 'ok' | 'error'

function ActionCard({
  title, description, buttonLabel, buttonColor, onConfirm,
}: {
  title: string
  description: string
  buttonLabel: string
  buttonColor: string
  onConfirm: () => Promise<void>
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [confirm, setConfirm] = useState(false)

  async function handle() {
    if (!confirm) { setConfirm(true); return }
    setStatus('loading')
    setConfirm(false)
    try {
      await onConfirm()
      setStatus('ok')
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#1a202c', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#718096' }}>{description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {status === 'ok' && <span style={{ color: '#38a169', fontSize: 13 }}>完成</span>}
        {status === 'error' && <span style={{ color: '#e53e3e', fontSize: 13 }}>失败</span>}
        {confirm && status === 'idle' && (
          <span style={{ fontSize: 13, color: '#e53e3e' }}>再次点击确认</span>
        )}
        <button
          onClick={handle}
          disabled={status === 'loading'}
          style={{
            background: status === 'loading' ? '#a0aec0' : buttonColor,
            color: '#fff', border: 'none', borderRadius: 6,
            padding: '8px 18px', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
          }}
        >
          {status === 'loading' ? '执行中…' : buttonLabel}
        </button>
      </div>
    </div>
  )
}

export default function AdminSettings() {
  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c', marginBottom: 8 }}>网站设置</h1>
      <p style={{ fontSize: 13, color: '#718096', marginBottom: 24 }}>以下操作不可逆，请谨慎执行。</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ActionCard
          title="加载种子数据"
          description="清空现有数据并写入种子数据"
          buttonLabel="加载种子"
          buttonColor="#3182ce"
          onConfirm={async () => {
            const res = await fetch('/api/admin/reset', { method: 'POST' })
            if (!res.ok) throw new Error()
          }}
        />
        <ActionCard
          title="清空所有数据"
          description="删除数据库所有数据并清理设备图片文件"
          buttonLabel="清空数据"
          buttonColor="#e53e3e"
          onConfirm={async () => {
            const res = await fetch('/api/admin/clear', { method: 'POST' })
            if (!res.ok) throw new Error()
          }}
        />
      </div>
    </div>
  )
}
