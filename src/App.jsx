import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import SidebarLayout from './layouts/SidebarLayout'
import { AppStateProvider } from './context/AppState'
import StudentDashboard from './pages/StudentDashboard'
import MentorDashboard from './pages/MentorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import MentorPortfolio from './pages/MentorPortfolio'
import TRLDefinitions from './pages/TRLDefinitions'

function App() {
  return (
    <AppStateProvider>
      <Router>
        <SidebarLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/student" replace />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/mentor" element={<MentorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/mentors" element={<MentorPortfolio />} />
            <Route path="/playbook" element={<TRLDefinitions />} />
          </Routes>
        </SidebarLayout>
      </Router>
    </AppStateProvider>
  )
}

export default App
