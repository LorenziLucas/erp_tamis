import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ToastProvider } from './components/ui/Toast'
import { useAuthStore } from './store/authStore'
import { useLotesStore } from './store/lotesStore'
import Dashboard from './pages/Dashboard'
import LotesPage from './pages/lotes/LotesPage'
import NovoLotePage from './pages/lotes/NovoLotePage'
import ImportarPage from './pages/lotes/ImportarPage'
import LoginPage from './pages/LoginPage'

/** Redireciona para /login se não autenticado */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const migrateQtdDias = useLotesStore((s) => s.migrateQtdDias)
  const migrateMesRef  = useLotesStore((s) => s.migrateMesRef)

  // Migrações de dados executadas uma vez ao iniciar o app
  useEffect(() => {
    migrateQtdDias() // mesmo dia → 1 dia; sem entrega → 0
    migrateMesRef()  // normaliza mesRef para YYYY-MM-01 baseado em entrega ou envio
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <ToastProvider>
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
          </Route>

          {/* Qualquer rota desconhecida → home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
