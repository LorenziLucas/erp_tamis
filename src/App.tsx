import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import LotesPage from './pages/lotes/LotesPage'
import NovoLotePage from './pages/lotes/NovoLotePage'
import ImportarPage from './pages/lotes/ImportarPage'
import LoginPage from './pages/LoginPage'
import CobrancasPage from './pages/cobrancas/CobrancasPage'

/** Redireciona para /login se não autenticado; mostra nada enquanto carrega */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas protegidas */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/lotes" element={<LotesPage />} />
        <Route path="/lotes/novo" element={<NovoLotePage />} />
        <Route path="/lotes/importar" element={<ImportarPage />} />
        <Route path="/financeiro/cobrancas" element={<CobrancasPage />} />
      </Route>

      {/* Qualquer rota desconhecida → home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
