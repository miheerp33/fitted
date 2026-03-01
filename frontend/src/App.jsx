import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Wardrobe from './pages/Wardrobe';
import Recommend from './pages/Recommend';
import Share from './pages/Share';
import SavedOutfits from './pages/SavedOutfits';

function ProtectedRoute({ children }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/share/:shareId" element={<Share />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/wardrobe" replace />} />
        <Route path="wardrobe" element={<Wardrobe />} />
        <Route path="recommend" element={<Recommend />} />
        <Route path="saved" element={<SavedOutfits />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
