import { useEffect, useState, useRef } from 'react'
import { canSaveStickerEdit, stickerImageSrc } from './stickerManagement'

interface Sticker {
  id: number
  name: string
  description: string
  install_location: string
  theme_color: string
  filename: string
  created_at: string
}

export default function AdminStickers() {
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [installLocation, setInstallLocation] = useState('')
  const [themeColor, setThemeColor] = useState('#4299e1')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingInstallLocation, setEditingInstallLocation] = useState('')
  const [editingThemeColor, setEditingThemeColor] = useState('#4299e1')
  const [editingFile, setEditingFile] = useState<File | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    fetch('/api/stickers').then(r => r.json()).then(setStickers)
  }
  useEffect(load, [])

  async function upload() {
    if (!name.trim() || !file) return
    setUploading(true)
    const form = new FormData()
    form.append('name', name.trim())
    form.append('description', description.trim())
    form.append('install_location', installLocation.trim())
    form.append('theme_color', themeColor)
    form.append('image', file)
    await fetch('/api/stickers', { method: 'POST', body: form })
    setName(''); setDescription(''); setInstallLocation(''); setThemeColor('#4299e1'); setFile(null); if (fileRef.current) fileRef.current.value = ''
    setUploading(false); load()
  }

  function startEdit(sticker: Sticker) {
    setEditingId(sticker.id)
    setEditingName(sticker.name)
    setEditingDescription(sticker.description)
    setEditingInstallLocation(sticker.install_location)
    setEditingThemeColor(sticker.theme_color)
    setEditingFile(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName('')
    setEditingDescription('')
    setEditingInstallLocation('')
    setEditingThemeColor('#4299e1')
    setEditingFile(null)
  }

  async function saveEdit(id: number) {
    if (!canSaveStickerEdit(editingName, savingId === id)) return
    setSavingId(id)
    const form = new FormData()
    form.append('name', editingName.trim())
    form.append('description', editingDescription.trim())
    form.append('install_location', editingInstallLocation.trim())
    form.append('theme_color', editingThemeColor)
    if (editingFile) form.append('image', editingFile)
    await fetch(`/api/stickers/${id}`, { method: 'PUT', body: form })
    setSavingId(null)
    cancelEdit()
    load()
  }

  async function del(id: number) {
    if (!confirm('确认删除该贴纸？')) return
    await fetch(`/api/stickers/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>贴纸管理</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="贴纸名称（如：树莓派）"
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="描述"
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
        />
        <input
          value={installLocation}
          onChange={e => setInstallLocation(e.target.value)}
          placeholder="安装位置"
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
        />
        <input
          type="color"
          value={themeColor}
          onChange={e => setThemeColor(e.target.value)}
          title="主题色"
          style={{ width: 40, height: 36, padding: 2, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          style={{ fontSize: 14 }}
        />
        <button
          onClick={upload}
          disabled={uploading || !name.trim() || !file}
          style={{ padding: '8px 20px', background: uploading ? '#a0aec0' : '#48bb78', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
        >上传贴纸</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {stickers.map(s => (
          <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 176 }}>
            <img src={stickerImageSrc(s)} alt={s.name} style={{ width: 64, height: 64, objectFit: 'contain' }} />
            {editingId === s.id ? (
              <>
                <input
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '5px 6px', border: '1px solid #cbd5e0', borderRadius: 4, fontSize: 12 }}
                />
                <textarea
                  value={editingDescription}
                  onChange={e => setEditingDescription(e.target.value)}
                  placeholder="描述"
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '5px 6px', border: '1px solid #cbd5e0', borderRadius: 4, fontSize: 12, resize: 'vertical', fontFamily: 'inherit' }}
                />
                <input
                  value={editingInstallLocation}
                  onChange={e => setEditingInstallLocation(e.target.value)}
                  placeholder="安装位置"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '5px 6px', border: '1px solid #cbd5e0', borderRadius: 4, fontSize: 12 }}
                />
                <input
                  type="color"
                  value={editingThemeColor}
                  onChange={e => setEditingThemeColor(e.target.value)}
                  title="主题色"
                  style={{ width: '100%', height: 30, padding: 2, border: '1px solid #cbd5e0', borderRadius: 4, background: '#fff' }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEditingFile(e.target.files?.[0] ?? null)}
                  style={{ width: '100%', fontSize: 11 }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => saveEdit(s.id)}
                    disabled={!canSaveStickerEdit(editingName, savingId === s.id)}
                    style={{ padding: '3px 8px', background: savingId === s.id ? '#a0aec0' : '#4299e1', color: '#fff', border: 'none', borderRadius: 4, cursor: savingId === s.id ? 'not-allowed' : 'pointer', fontSize: 12 }}
                  >保存</button>
                  <button
                    onClick={cancelEdit}
                    style={{ padding: '3px 8px', background: '#fff', border: '1px solid #cbd5e0', color: '#4a5568', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                  >取消</button>
                </div>
              </>
            ) : (
              <>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: s.theme_color, border: '1px solid #e2e8f0' }} />
                <span style={{ fontSize: 13, textAlign: 'center', color: '#2d3748' }}>{s.name}</span>
                {s.description && (
                  <span style={{ fontSize: 12, textAlign: 'center', color: '#718096', lineHeight: 1.35 }}>{s.description}</span>
                )}
                {s.install_location && (
                  <span style={{ fontSize: 12, textAlign: 'center', color: '#2b6cb0', lineHeight: 1.35 }}>安装位置：{s.install_location}</span>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => startEdit(s)}
                    style={{ padding: '3px 8px', background: '#fff', border: '1px solid #90cdf4', color: '#2b6cb0', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                  >编辑</button>
                  <button
                    onClick={() => del(s.id)}
                    style={{ padding: '3px 8px', background: '#fff', border: '1px solid #fc8181', color: '#e53e3e', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                  >删除</button>
                </div>
              </>
            )}
          </div>
        ))}
        {stickers.length === 0 && <p style={{ color: '#a0aec0' }}>暂无贴纸，请上传</p>}
      </div>
    </div>
  )
}
