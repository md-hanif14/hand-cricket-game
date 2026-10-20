import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import PlayPage from './pages/PlayPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

export default function App() {
  return <div className="app-root"><Navbar /><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/play/:mode" element={<ProtectedRoute><PlayPage /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></div>;
}
