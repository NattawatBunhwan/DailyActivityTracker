import Header from './components/Header'
import './App.css'
import LoginForm from './components/LoginForm'
import useAuth from './hooks/useAuth'
import Activities from './components/Activities'
import RegisterForm from './components/RegisterForm'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarCheck, CheckCircle2, ListTodo, LogOut, Menu, Shield, UserRound, UserRoundPlus, X } from "lucide-react"
import ActivityDetails from './components/ActivityDetails'
import ActivityEditor from './components/ActivityEditor'
import ConfirmDialog from './components/ConfirmDialog'
import type { Activity } from './types/activity'
import AuditHistory from './components/audit/AuditHistory'
import { isUserAdmin } from './utils/jwt'

function App() {
  const auth = useAuth()
  const isAdmin = isUserAdmin(auth.token)
  const [showRegister, setShowRegister] = useState(false)
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const listScrollY = useRef(0)
  const currentPathRef = useRef(currentPath)
  const dirtyRef = useRef(false)
  const discardingChangesRef = useRef(false)
  const submittingRef = useRef(false)
  const [toast, setToast] = useState('')
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; confirmLabel: string } | null>(null)
  const confirmationAction = useRef<(() => void) | null>(null)
  const [confirmationTrigger, setConfirmationTrigger] = useState<HTMLElement | null>(null)
  const [listMutation, setListMutation] = useState<{ kind: 'create' | 'update' | 'delete'; id: string; nonce: number } | null>(null)
  const [focusActivityId, setFocusActivityId] = useState<string | null>(null)
  const mutationNonce = useRef(0)
  const toastTimer = useRef<number | undefined>(undefined)

  const [isNavOpen, setIsNavOpen] = useState(false)
  const navMenuRef = useRef<HTMLDivElement | null>(null)
  const navToggleRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isNavOpen) return

    function handlePointerDown(e: PointerEvent) {
      if (
        navMenuRef.current &&
        !navMenuRef.current.contains(e.target as Node) &&
        navToggleRef.current &&
        !navToggleRef.current.contains(e.target as Node)
      ) {
        setIsNavOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsNavOpen(false)
        navToggleRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isNavOpen])

  useEffect(() => {
    discardingChangesRef.current = false
  }, [currentPath, auth.isAuthenticated])

  function notify(message: string) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 5000)
  }

  const setRoute = useCallback((path: string, replace = false) => {
    if (replace) window.history.replaceState(window.history.state, '', path)
    else window.history.pushState({ from: currentPathRef.current }, '', path)
    currentPathRef.current = path
    setCurrentPath(path)
    dirtyRef.current = false
  }, [])

  function askConfirmation(title: string, message: string, confirmLabel: string, action: () => void) {
    confirmationAction.current = action
    setConfirmationTrigger(document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setConfirmation({ title, message, confirmLabel })
  }

  function cancelConfirmation() {
    confirmationAction.current = null
    setConfirmation(null)
  }

  function acceptConfirmation() {
    const action = confirmationAction.current
    confirmationAction.current = null
    setConfirmation(null)
    action?.()
  }

  const navigateWithoutGuard = useCallback((path: string) => {
    if (window.history.state?.from === path || (path === '/activities' && window.history.state?.from === '/')) window.history.back()
    else setRoute(path, true)
    if (path === '/activities') requestAnimationFrame(() => window.scrollTo(0, listScrollY.current))
  }, [setRoute])

  function navigateGuarded(path: string) {
    if (submittingRef.current) return
    if (dirtyRef.current) {
      askConfirmation('Discard changes?', 'You have unsaved changes. Do you want to discard them and leave?', 'Discard changes', () => {
        discardingChangesRef.current = true
        dirtyRef.current = false
        navigateWithoutGuard(path)
      })
      return
    }
    dirtyRef.current = false
    navigateWithoutGuard(path)
  }

  function returnToList() {
    if (window.history.state?.from === '/activities' || window.history.state?.from === '/') window.history.back()
    else setRoute('/activities', true)
    requestAnimationFrame(() => window.scrollTo(0, listScrollY.current))
  }

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (dirtyRef.current) {
        if (submittingRef.current) {
          window.history.pushState({ from: path }, '', currentPathRef.current)
          return
        }
        window.history.pushState({ from: path }, '', currentPathRef.current)
        askConfirmation('Discard changes?', 'You have unsaved changes. Do you want to discard them and leave?', 'Discard changes', () => {
          discardingChangesRef.current = true
          dirtyRef.current = false
          setRoute(path, true)
          if (path === '/activities' || path === '/') requestAnimationFrame(() => window.scrollTo(0, listScrollY.current))
        })
        return
      }
      currentPathRef.current = path
      setCurrentPath(path)
      if (path === "/activities" || path === "/") {
        requestAnimationFrame(() => window.scrollTo(0, listScrollY.current))
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [listScrollY, setRoute])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (event.target instanceof HTMLElement && (event.target.tagName === 'SELECT' || event.target.closest('dialog,[role="listbox"],[role="dialog"]'))) return
      if (event.target instanceof HTMLInputElement && (event.target.type === 'date' || event.target.type === 'datetime-local' || event.target.type === 'time')) return
      const activePath = currentPathRef.current
      if (/^\/activities\/[^/]+\/?$/.test(activePath)) {
        event.preventDefault()
        if (window.history.state?.from === '/activities' || window.history.state?.from === '/') window.history.back()
        else setRoute('/activities', true)
        requestAnimationFrame(() => window.scrollTo(0, listScrollY.current))
        return
      }
      if (activePath !== '/activities/new' && !/^\/activities\/[^/]+\/edit\/?$/.test(activePath)) return
      if (submittingRef.current) { event.preventDefault(); return }
      event.preventDefault()
      if (dirtyRef.current) {
        const destination = activePath === '/activities/new' ? '/activities' : `/activities/${activePath.split('/')[2]}`
        askConfirmation('Discard changes?', 'You have unsaved changes. Do you want to discard them and leave?', 'Discard changes', () => {
          discardingChangesRef.current = true
          dirtyRef.current = false
          navigateWithoutGuard(destination)
        })
        return
      }
      dirtyRef.current = false
      const destination = activePath === '/activities/new' ? '/activities' : `/activities/${activePath.split('/')[2]}`
      if (window.history.state?.from === destination || (destination === '/activities' && window.history.state?.from === '/')) window.history.back()
      else setRoute(destination, true)
      if (destination === '/activities') requestAnimationFrame(() => window.scrollTo(0, listScrollY.current))
    }
    document.addEventListener('keydown', handleEscape, true)
    return () => document.removeEventListener('keydown', handleEscape, true)
  }, [navigateWithoutGuard, setRoute])

  function navigate(path: string, replace = false) {
    setRoute(path, replace)
  }
  
  
  return (
    <main>
      <header className="app-header">
        <div className="app-header-brand">
          <CalendarCheck
            size={24}
            aria-hidden="true"
          />

          <div className="app-header-text">
            <Header
              title="Daily Activity Tracker"
              description="Track your activities and stay organized."
            />
          </div>
        </div>

        {auth.isAuthenticated && (
          <nav className="app-navbar" aria-label="Main Navigation">
            <button
              ref={navToggleRef}
              type="button"
              className="navbar-toggle-btn"
              onClick={() => setIsNavOpen(prev => !prev)}
              aria-label={isNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isNavOpen}
              aria-controls="app-nav-menu"
            >
              {isNavOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>

            {isNavOpen && (
              <div
                id="app-nav-menu"
                ref={navMenuRef}
                className="navbar-dropdown-menu"
                role="region"
                aria-label="Navigation Links"
              >
                <div className="navbar-user-banner">
                  <div className="navbar-user-avatar" aria-hidden="true">
                    <UserRound size={18} />
                  </div>
                  <div className="navbar-user-meta">
                    <span className="navbar-user-status">Logged in</span>
                    {isAdmin && <span className="navbar-user-badge">Admin</span>}
                  </div>
                </div>

                <div className="navbar-links-section">
                  <button
                    type="button"
                    className={`navbar-item-btn${currentPath === '/activities' || currentPath === '/' ? ' active' : ''}`}
                    onClick={() => {
                      setIsNavOpen(false)
                      navigateGuarded('/activities')
                    }}
                  >
                    <ListTodo size={18} aria-hidden="true" />
                    <span>Activities</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      className={`navbar-item-btn${currentPath === '/admin/audit-logs' ? ' active' : ''}`}
                      onClick={() => {
                        setIsNavOpen(false)
                        navigateGuarded('/admin/audit-logs')
                      }}
                    >
                      <Shield size={18} aria-hidden="true" />
                      <span>Audit Logs</span>
                    </button>
                  )}
                </div>

                <div className="navbar-divider" role="separator" />

                <div className="navbar-footer-section">
                  <button
                    type="button"
                    className="navbar-item-btn navbar-logout-btn"
                    onClick={() => {
                      setIsNavOpen(false)
                      handleLogout()
                    }}
                  >
                    <LogOut size={18} aria-hidden="true" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </nav>
        )}
      </header>

      {toast && <div className="activity-toast-region"><div className="activity-toast" role="status"><CheckCircle2 size={19} aria-hidden="true" /><span>{toast}</span></div></div>}
      <ConfirmDialog isOpen={confirmation !== null} title={confirmation?.title ?? ''} message={confirmation?.message ?? ''} confirmLabel={confirmation?.confirmLabel ?? 'Confirm'} onCancel={cancelConfirmation} onConfirm={acceptConfirmation} triggerButton={confirmationTrigger} />

      {auth.isAuthenticated ? (
        <>
          <div hidden={currentPath !== '/activities' && currentPath !== '/'}>
            <Activities mutation={listMutation} isActive={currentPath === '/activities' || currentPath === '/'} focusActivityId={focusActivityId} onFocusActivityChange={setFocusActivityId} onNotify={notify} onCreateActivity={() => { listScrollY.current = window.scrollY; navigate('/activities/new') }} onViewDetails={(id) => {
              listScrollY.current = window.scrollY
              setFocusActivityId(id)
              navigate(`/activities/${encodeURIComponent(id)}`)
            }} />
          </div>
          {currentPath === '/activities/new' ? (
            <ActivityEditor mode="create" onBack={() => navigateGuarded('/activities')} onDirtyChange={dirty => { dirtyRef.current = discardingChangesRef.current ? false : dirty }} onSubmittingChange={busy => { submittingRef.current = busy }} onSaved={(activity: Activity) => {
              notify('Activity created successfully')
              setFocusActivityId(activity.id)
              setListMutation({ kind: 'create', id: activity.id, nonce: ++mutationNonce.current })
              navigate(`/activities/${encodeURIComponent(activity.id)}`, true)
            }} />
          ) : /^\/activities\/[^/]+\/edit\/?$/.test(currentPath) || /^\/activities\/[^/]+\/?$/.test(currentPath) ? (
            <ActivityDetails
              activityId={decodeURIComponent(currentPath.split('/')[2])}
              mode={currentPath.includes('/edit') ? 'edit' : 'details'}
              onBack={() => currentPath.includes('/edit') ? navigateGuarded(`/activities/${currentPath.split('/')[2]}`) : returnToList()}
              onEdit={() => navigate(`/activities/${currentPath.split('/')[2]}/edit`)}
              onDeleted={() => { notify('Activity deleted successfully'); setListMutation({ kind: 'delete', id: currentPath.split('/')[2], nonce: ++mutationNonce.current }); returnToList() }}
              onUnavailable={returnToList}
              onDirtyChange={dirty => { dirtyRef.current = discardingChangesRef.current ? false : dirty }}
              onSubmittingChange={busy => { submittingRef.current = busy }}
              onUpdated={(activity: Activity) => { notify('Activity updated successfully'); setFocusActivityId(activity.id); setListMutation({ kind: 'update', id: activity.id, nonce: ++mutationNonce.current }); navigateGuarded(`/activities/${activity.id}`) }}
            />
          ) : currentPath === '/admin/audit-logs' ? (
            <AuditHistory />
          ) : currentPath === '/activities' || currentPath === '/' ? null : (
            <section className="activities"><h1>Page not found</h1><button type="button" onClick={() => navigate('/activities')}>Back to Activities</button></section>
          )}
        </>
      ) : (
          showRegister ? (
            <>
              <div className="auth-container">
                <div className="auth-intro">
                  <div className="auth-intro-icon" aria-hidden="true">
                    <UserRoundPlus size={28} />
                  </div>

                  <h2>Create your account</h2>

                  <p>
                    Start organizing your day with Daily Activity Tracker.
                  </p>
                </div>

                <RegisterForm onAuthenticated={() => navigate('/activities', true)} />

                <div className="auth-footer">
                  <p>Already have an account?</p>

                  <button
                    type="button"
                    onClick={() => setShowRegister(false)}
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-container">
              <div className="auth-intro">
                <div className="auth-intro-icon" aria-hidden="true">
                    <CalendarCheck size={28} />
                </div>

                <h2>Welcome back</h2>

                <p>Log in to manage your daily activities.</p>
              </div>

              <LoginForm onAuthenticated={() => navigate('/activities', true)} />

              <div className="auth-footer">
                <p>Don't have an account?</p>

                <button
                    type="button"
                    onClick={() => setShowRegister(true)}
                >
                    Create Account
                </button>
              </div>
            </div>
          )
        )}
    </main>
  )


  function handleLogout() {
    if (submittingRef.current) return
    askConfirmation(dirtyRef.current ? 'Discard changes and log out?' : 'Log out?', dirtyRef.current ? 'You have unsaved changes. Do you want to discard them and log out?' : 'Are you sure you want to log out?', 'Log out', () => {
      discardingChangesRef.current = true
      dirtyRef.current = false
      navigate('/activities', true)
      void auth.logout()
      setShowRegister(false)
    })
  }
}

export default App
