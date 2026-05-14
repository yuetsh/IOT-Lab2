import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GroupSelect from './pages/GroupSelect'
import GroupWorkspace from './pages/GroupWorkspace'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminGroups from './pages/admin/AdminGroups'
import AdminStickers from './pages/admin/AdminStickers'
import AdminGroupDetail from './pages/admin/AdminGroupDetail'
import AdminSettings from './pages/admin/AdminSettings'
import AdminDevicePlacements from './pages/admin/AdminDevicePlacements'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GroupSelect />} />
        <Route path="/group/:id/:tab" element={<GroupWorkspace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="groups" element={<AdminGroups />} />
          <Route path="stickers" element={<AdminStickers />} />
          <Route path="groups/:id" element={<AdminGroupDetail />} />
          <Route path="device-placements" element={<AdminDevicePlacements />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
