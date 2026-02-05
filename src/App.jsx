import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SidebarLayout from './layouts/SidebarLayout';
import StudentDashboard from './pages/StudentDashboard';
import MentorMatch from './pages/MentorMatch';
import MeetingLog from './pages/MeetingLog';
import MentorDashboard from './pages/MentorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MentorPortfolio from './pages/MentorPortfolio';
import TRLDefinitions from './pages/TRLDefinitions';

// Placeholder components for other pages
const Placeholder = ({ title }) => (
  <div className="p-8 text-center text-slate-400">
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    <p>Work in Progress</p>
  </div>
);

function App() {
  return (
    <Router>
      <SidebarLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/student" replace />} />

          {/* Student Routes */}
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/match" element={<MentorMatch />} />
          <Route path="/student/log" element={<MeetingLog />} />

          {/* Mentor Routes */}
          <Route path="/mentor" element={<MentorDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/mentors" element={<MentorPortfolio />} />
          <Route path="/admin/definitions" element={<TRLDefinitions />} />
        </Routes>
      </SidebarLayout>
    </Router>
  );
}

export default App;
