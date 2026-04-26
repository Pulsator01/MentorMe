import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import SidebarLayout from './layouts/SidebarLayout'
import { AppStateProvider } from './context/AppState'
import RequireAuth from './components/RequireAuth'
import RequireOnboarded from './components/RequireOnboarded'
import RequireRole from './components/RequireRole'
import RoleHome from './pages/RoleHome'
import FounderOverviewPage from './pages/founders/FounderOverviewPage'
import NewRequestPage from './pages/founders/NewRequestPage'
import FounderPipelinePage from './pages/founders/FounderPipelinePage'
import StudentOverviewPage from './pages/students/StudentOverviewPage'
import StudentFollowUpPage from './pages/students/StudentFollowUpPage'
import CfeOverviewPage from './pages/cfe/CfeOverviewPage'
import CfePipelinePage from './pages/cfe/CfePipelinePage'
import MentorDashboard from './pages/MentorDashboard'
import MentorPortfolio from './pages/MentorPortfolio'
import InvitationsPage from './pages/InvitationsPage'
import TRLDefinitions from './pages/TRLDefinitions'
import MidsemReadiness from './pages/MidsemReadiness'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import GoogleCallbackPage from './pages/auth/GoogleCallbackPage'
import MagicLinkVerifyPage from './pages/auth/MagicLinkVerifyPage'
import FounderOnboardingPage from './pages/onboarding/FounderOnboardingPage'
import StudentOnboardingPage from './pages/onboarding/StudentOnboardingPage'
import InvitationAcceptPage from './pages/invitations/InvitationAcceptPage'

function ProtectedShell({ children }) {
  return (
    <RequireAuth>
      <RequireOnboarded>
        <SidebarLayout>{children}</SidebarLayout>
      </RequireOnboarded>
    </RequireAuth>
  )
}

function OnboardingShell({ children }) {
  return <RequireAuth>{children}</RequireAuth>
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
          <Route path="/invite/:token" element={<InvitationAcceptPage />} />

          <Route
            path="/onboarding/founder"
            element={(
              <OnboardingShell>
                <FounderOnboardingPage />
              </OnboardingShell>
            )}
          />
          <Route
            path="/onboarding/student"
            element={(
              <OnboardingShell>
                <StudentOnboardingPage />
              </OnboardingShell>
            )}
          />

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
                <FounderOverviewPage />
              </ProtectedShell>
            )}
          />
          <Route
            path="/founders/new-request"
            element={(
              <ProtectedShell>
                <NewRequestPage />
              </ProtectedShell>
            )}
          />
          <Route
            path="/founders/pipeline"
            element={(
              <ProtectedShell>
                <FounderPipelinePage />
              </ProtectedShell>
            )}
          />
          <Route
            path="/students"
            element={(
              <ProtectedShell>
                <StudentOverviewPage />
              </ProtectedShell>
            )}
          />
          <Route
            path="/students/follow-up"
            element={(
              <ProtectedShell>
                <StudentFollowUpPage />
              </ProtectedShell>
            )}
          />
          <Route
            path="/cfe"
            element={(
              <ProtectedShell>
                <CfeOverviewPage />
              </ProtectedShell>
            )}
          />
          <Route
            path="/cfe/pipeline"
            element={(
              <ProtectedShell>
                <CfePipelinePage />
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
            path="/cfe/invitations"
            element={(
              <ProtectedShell>
                <RequireRole allowedRoles={['cfe', 'admin']}>
                  <InvitationsPage />
                </RequireRole>
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
