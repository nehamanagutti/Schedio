// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Timetable from './pages/Timetable';
import Colleagues from './pages/Colleagues';
import Board from './pages/Board';
import Cover from './pages/Cover';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import { Spinner } from './components/UI';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/"           element={<Dashboard />} />
              <Route path="/classes"    element={<Classes />} />
              <Route path="/timetable"  element={<Timetable />} />
              <Route path="/colleagues" element={<Colleagues />} />
              <Route path="/board"      element={<Board />} />
              <Route path="/cover"      element={<Cover />} />
              <Route path="/chat"       element={<Chat />} />
              <Route path="/profile"    element={<Profile />} />
              <Route path="*"           element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
