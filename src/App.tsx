import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import LotesPage from './pages/lotes/LotesPage'
import NovoLotePage from './pages/lotes/NovoLotePage'
import LoginPage from './pages/LoginPage'
import CobrancasPage from './pages/cobrancas/CobrancasPage'
import PeritosPage from './pages/peritos/PeritosPage'
import TRTsPage from './pages/trts/TRTsPage'
import AnalistasPage from './pages/analistas/AnalistasPage'
import BoardPeritosPage from './pages/board/BoardPeritosPage'

/** Redireciona para /login se não autenticado; mostra nada enquanto carrega */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Redireciona analistas (não-administradores) para /board/peritos — único módulo liberado para eles */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, accessCheckFailed } = useAuth()

  if (accessCheckFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1B4D2E]/5 px-4">
        <div className="max-w-sm w-full text-center">
          <p className="text-sm text-gray-600 mb-4">
            Não foi possível verificar seu nível de acesso. Verifique sua conexão e tente novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-[#2D7A47] text-white text-sm font-medium hover:bg-[#1B4D2E] transition-colors"
          >
            Recarregar página
          </button>
        </div>
      </div>
    )
  }

  if (!isAdmin) return <Navigate to="/board/peritos" replace />
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
        <Route path="/" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="/lotes" element={<RequireAdmin><LotesPage /></RequireAdmin>} />
        <Route path="/lotes/novo" element={<RequireAdmin><NovoLotePage /></RequireAdmin>} />
        <Route path="/financeiro/cobrancas" element={<RequireAdmin><CobrancasPage /></RequireAdmin>} />
        <Route path="/cadastros/peritos"   element={<RequireAdmin><PeritosPage /></RequireAdmin>} />
        <Route path="/cadastros/trts"     element={<RequireAdmin><TRTsPage /></RequireAdmin>} />
        <Route path="/cadastros/analistas" element={<RequireAdmin><AnalistasPage /></RequireAdmin>} />
        <Route path="/board/peritos"      element={<BoardPeritosPage />} />
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
