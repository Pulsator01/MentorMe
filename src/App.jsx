import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import SidebarLayout from './layouts/SidebarLayout'
import { AppStateProvider } from './context/AppState'
import RequireAuth from './components/RequireAuth'
import RoleHome from './pages/RoleHome'
import StudentDashboard from './pages/StudentDashboard'
import StudentWorkspace from './pages/StudentWorkspace'
import AdminDashboard from './pages/AdminDashboard'
import MentorDashboard from './pages/MentorDashboard'
import MentorPortfolio from './pages/MentorPortfolio'
import TRLDefinitions from './pages/TRLDefinitions'
import MidsemReadiness from './pages/MidsemReadiness'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import GoogleCallbackPage from './pages/auth/GoogleCallbackPage'
import MagicLinkVerifyPage from './pages/auth/MagicLinkVerifyPage'

function ProtectedShell({ children }) {
  return (
    <RequireAuth>
      <SidebarLayout>{children}</SidebarLayout>
    </RequireAuth>
  )
}

function App() {
  return (
    <Router>
      <AppStateProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/auth/verify" element={<MagicLinkVerifyPage />} />

          <Route
            path="/"
            element={(
              <ProtectedShell>
                <RoleHome />
              </ProtectedShell>
            )}
          />
          <Route
            path="/founders"
            element={(
              <ProtectedShell>
                <StudentDashboard />
              </ProtectedShell>
            )}
          />
          <Route
            path="/students"
            element={(
              <ProtectedShell>
                <StudentWorkspace />
              </ProtectedShell>
            )}
          />
          <Route
            path="/cfe"
            element={(
              <ProtectedShell>
                <AdminDashboard />
              </ProtectedShell>
            )}
          />
          <Route
            path="/cfe/network"
            element={(
              <ProtectedShell>
                <MentorPortfolio />
              </ProtectedShell>
            )}
          />
          <Route
            path="/mentors/desk"
            element={(
              <ProtectedShell>
                <MentorDashboard />
              </ProtectedShell>
            )}
          />
          <Route
            path="/midsem"
            element={(
              <ProtectedShell>
                <MidsemReadiness />
              </ProtectedShell>
            )}
          />
          <Route
            path="/playbook"
            element={(
              <ProtectedShell>
                <TRLDefinitions />
              </ProtectedShell>
            )}
          />

          <Route path="/student" element={<Navigate to="/founders" replace />} />
          <Route path="/mentor" element={<Navigate to="/mentors/desk" replace />} />
          <Route path="/admin" element={<Navigate to="/cfe" replace />} />
          <Route path="/admin/mentors" element={<Navigate to="/cfe/network" replace />} />
        </Routes>
      </AppStateProvider>
    </Router>
  )
}

export default App
