import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const
const THROTTLE_MS = 5_000
const CHECK_INTERVAL_MS = 30_000

/** Desloga o usuário automaticamente após `timeoutMinutes` sem interação. */
export function useIdleLogout(timeoutMinutes = 30) {
  const { logout } = useAuth()
  const lastActivityRef = useRef(Date.now())
  const lastUpdateRef   = useRef(Date.now())
  const loggedOutRef    = useRef(false)

  useEffect(() => {
    const timeoutMs = timeoutMinutes * 60_000
    loggedOutRef.current = false

    const registerActivity = () => {
      const now = Date.now()
      if (now - lastUpdateRef.current < THROTTLE_MS) return
      lastUpdateRef.current = now
      lastActivityRef.current = now
    }

    const checkIdle = () => {
      if (loggedOutRef.current) return
      if (Date.now() - lastActivityRef.current < timeoutMs) return

      loggedOutRef.current = true
      try {
        window.sessionStorage.setItem('logout_motivo', 'inatividade')
      } catch {
        // sessionStorage indisponível — segue com o logout mesmo assim
      }
      logout()
    }

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, registerActivity, { passive: true })
    })

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkIdle()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const intervalId = window.setInterval(checkIdle, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, registerActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearInterval(intervalId)
    }
  }, [timeoutMinutes, logout])
}
