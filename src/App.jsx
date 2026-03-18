import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import SidebarLayout from './layouts/SidebarLayout'
import { AppStateProvider } from './context/AppState'
import RoleHome from './pages/RoleHome'
import StudentDashboard from './pages/StudentDashboard'
import StudentWorkspace from './pages/StudentWorkspace'
import AdminDashboard from './pages/AdminDashboard'
import MentorPortfolio from './pages/MentorPortfolio'
import TRLDefinitions from './pages/TRLDefinitions'
import MidsemReadiness from './pages/MidsemReadiness'

function App() {
  return (
    <Router>
      <AppStateProvider>
        <SidebarLayout>
          <Routes>
            <Route path="/" element={<RoleHome />} />
            <Route path="/founders" element={<StudentDashboard />} />
            <Route path="/students" element={<StudentWorkspace />} />
            <Route path="/cfe" element={<AdminDashboard />} />
            <Route path="/cfe/network" element={<MentorPortfolio />} />
            <Route path="/midsem" element={<MidsemReadiness />} />
            <Route path="/playbook" element={<TRLDefinitions />} />
            <Route path="/student" element={<Navigate to="/founders" replace />} />
            <Route path="/mentor" element={<Navigate to="/students" replace />} />
            <Route path="/admin" element={<Navigate to="/cfe" replace />} />
            <Route path="/admin/mentors" element={<Navigate to="/cfe/network" replace />} />
          </Routes>
        </SidebarLayout>
      </AppStateProvider>
    </Router>
  )
}

export default App
