import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const navStyle = (isActive: boolean) => ({
  display: 'block', padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 14,
  color: isActive ? '#2b6cb0' : '#4a5568',
  background: isActive ? '#ebf8ff' : 'transparent',
  fontWeight: isActive ? 600 : 400
})

export default function AdminLayout() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ width: 200, background: '#f7fafc', borderRight: '1px solid #e2e8f0', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a202c', margin: '0 0 16px' }}>教师后台</h2>
        <NavLink to="/admin" end style={({ isActive }) => navStyle(isActive)}>流程设计</NavLink>
        <NavLink to="/admin/device-placements" style={({ isActive }) => navStyle(isActive)}>设备安放</NavLink>
        <NavLink to="/admin/groups" style={({ isActive }) => navStyle(isActive)}>小组管理</NavLink>
        <NavLink to="/admin/stickers" style={({ isActive }) => navStyle(isActive)}>贴纸管理</NavLink>
        <NavLink to="/admin/settings" style={({ isActive }) => navStyle(isActive)}>网站设置</NavLink>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: '#718096', fontSize: 13 }}
        >← 学生页面</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <Outlet />
      </div>
    </div>
  )
}
