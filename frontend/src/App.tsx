import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Admin from './pages/Admin';
import AddRecipe from './pages/AddRecipe';
import RecipeView from './pages/RecipeView';
import RecipeEdit from './pages/RecipeEdit';
import MyRecipes from './pages/MyRecipes';
import MyCollections from './pages/MyCollections';
import CollectionView from './pages/CollectionView';
import CollectionEdit from './pages/CollectionEdit';
import Settings from './pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/recipes" replace />} />
          <Route path="recipes" element={<MyRecipes />} />
          <Route path="recipes/add" element={<AddRecipe />} />
          <Route path="recipes/:id" element={<RecipeView />} />
          <Route path="recipes/:id/edit" element={<RecipeEdit />} />
          <Route path="collections" element={<MyCollections />} />
          <Route path="collections/shared" element={<Navigate to="/collections" replace />} />
          <Route path="collections/:id" element={<CollectionView />} />
          <Route path="collections/:id/edit" element={<CollectionEdit />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
