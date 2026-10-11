import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { ConfirmProvider } from '@/components/ConfirmProvider'
import { Layout } from '@/components/Layout'
import SetupPage from '@/pages/SetupPage'
import SeasonPage from '@/pages/SeasonPage'
import WatchingPage from '@/pages/WatchingPage'
import CalendarPage from '@/pages/CalendarPage'
import BacklogPage from '@/pages/BacklogPage'
import NotesPage from '@/pages/NotesPage'

export default function App() {
  return (
    <ConfirmProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/season" replace />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/season" element={<SeasonPage />} />
          <Route path="/watching" element={<WatchingPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/backlog" element={<BacklogPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="*" element={<Navigate to="/season" replace />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-center" />
    </ConfirmProvider>
  )
}
