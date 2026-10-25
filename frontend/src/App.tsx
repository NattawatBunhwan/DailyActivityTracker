import Header from './components/Header'
import './App.css'
import LoginForm from './components/LoginForm'
import useAuth from './hooks/useAuth'
import Activities from './components/Activities'
import RegisterForm from './components/RegisterForm'
import { useEffect, useRef, useState } from 'react'
import { CalendarCheck, CheckCircle2, LogOut, UserRound, UserRoundPlus } from "lucide-react"
import ActivityDetails from './components/ActivityDetails'
import ActivityEditor from './components/ActivityEditor'
import ConfirmDialog from './components/ConfirmDialog'
import type { Activity } from './types/activity'

function App() {
  const auth = useAuth()
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
  const confirmationTrigger = useRef<HTMLElement | null>(null)
  const [listMutation, setListMutation] = useState<{ kind: 'create' | 'update' | 'delete'; id: string; nonce: number } | null>(null)
  const [focusActivityId, setFocusActivityId] = useState<string | null>(null)
  const mutationNonce = useRef(0)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    discardingChangesRef.current = false
  }, [currentPath, auth.isAuthenticated])

  function notify(message: string) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 5000)
  }

  function setRoute(path: string, replace = false) {
    if (replace) window.history.replaceState(window.history.state, '', path)
    else window.history.pushState({ from: currentPathRef.current }, '', path)
    currentPathRef.current = path
    setCurrentPath(path)
    dirtyRef.current = false
  }

  function askConfirmation(title: string, message: string, confirmLabel: string, action: () => void) {
    confirmationAction.current = action
    confirmationTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
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

  function navigateWithoutGuard(path: string) {
    if (window.history.state?.from === path || (path === '/activities' && window.history.state?.from === '/')) window.history.back()
    else setRoute(path, true)
    if (path === '/activities') requestAnimationFrame(() => window.scrollTo(0, listScrollY.current))
  }

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
  }, [listScrollY])

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
  }, [])

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
          <div className="auth-section">
            <div className="auth-user-info">
              <UserRound
                size={20}
                aria-hidden="true"
              />
              <p>Logged in</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
            >
              <LogOut
                size={16}
                aria-hidden="true"
              />
              <span>Logout</span>
            </button>
          </div>
        )}
      </header>

      {toast && <div className="activity-toast-region"><div className="activity-toast" role="status"><CheckCircle2 size={19} aria-hidden="true" /><span>{toast}</span></div></div>}
      <ConfirmDialog isOpen={confirmation !== null} title={confirmation?.title ?? ''} message={confirmation?.message ?? ''} confirmLabel={confirmation?.confirmLabel ?? 'Confirm'} onCancel={cancelConfirmation} onConfirm={acceptConfirmation} triggerButton={confirmationTrigger.current} />

      {auth.isAuthenticated ? (
        <>
          <div hidden={currentPath !== '/activities' && currentPath !== '/'}>
            <Activities mutation={listMutation} isActive={currentPath === '/activities' || currentPath === '/'} focusActivityId={focusActivityId} onNotify={notify} onCreateActivity={() => { listScrollY.current = window.scrollY; navigate('/activities/new') }} onViewDetails={(id) => {
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
