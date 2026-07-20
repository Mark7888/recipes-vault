import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import { UpdatePrompt } from './components/ui/UpdatePrompt';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Admin from './pages/Admin';
import AddRecipe from './pages/AddRecipe';
import RecipeView from './pages/RecipeView';
import SharedRecipe from './pages/SharedRecipe';
import RecipeEdit from './pages/RecipeEdit';
import MyRecipes from './pages/MyRecipes';
import MyCollections from './pages/MyCollections';
import CollectionView from './pages/CollectionView';
import CollectionEdit from './pages/CollectionEdit';
import Settings from './pages/Settings';
import SettingsPreferences from './pages/SettingsPreferences';
import TagManagement from './pages/TagManagement';
import ShoppingList from './pages/ShoppingList';
import NotFound from './pages/NotFound';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <UpdatePrompt />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/shared/:token" element={<SharedRecipe />} />
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
          <Route path="shopping" element={<ShoppingList />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/preferences" element={<SettingsPreferences />} />
          <Route path="settings/tags" element={<TagManagement />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
