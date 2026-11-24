import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { logoutFromServer, refreshAccessToken } from "../api/authApi";
import { setAuthSessionCallbacks, setLatestAccessToken } from "../api/httpClient";

type AuthProviderProps = {
    children: ReactNode
}

type AuthContextType = {
    isAuthenticated: boolean
    setIsAuthenticated: (value: boolean) => void
    token: string
    setToken: (value: string) => void
    logout: () => void
    expiresAt: string
    setExpiresAt: (value: string) => void
    isInitializing: boolean
}

// The context is exported for the useAuth hook, not for component rendering.
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null)

function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [token, setToken] = useState('')
    const [expiresAt, setExpiresAt] = useState('')
    const [isInitializing, setIsInitializing] = useState(true)

    const logout = useCallback(async () => {
        const activeToken = token

        // Clear the local session immediately so protected content unmounts
        // without waiting for the server logout request to complete.
        setIsAuthenticated(false)
        setToken('')
        setExpiresAt('')
        setLatestAccessToken(null)

        try {
            await logoutFromServer(activeToken)
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }, [token])

    useEffect(() => {
        setLatestAccessToken(token || null)
    }, [token])

    useEffect(() => {
        setAuthSessionCallbacks({
            onSessionRefreshed: (data) => {
                setToken(data.token)
                setExpiresAt(data.expiresAt)
                setIsAuthenticated(true)
            },
            onSessionExpired: () => {
                void logout()
            },
        })

        return () => {
            setAuthSessionCallbacks(null)
        }
    }, [logout])

    // Silent session bootstrap on mount
    useEffect(() => {
        let isMounted = true

        async function bootstrapSession() {
            try {
                const data = await refreshAccessToken()
                if (isMounted) {
                    setToken(data.token)
                    setExpiresAt(data.expiresAt)
                    setIsAuthenticated(true)
                }
            } catch {
                if (isMounted) {
                    setIsAuthenticated(false)
                    setToken('')
                    setExpiresAt('')
                    setLatestAccessToken(null)
                }
            } finally {
                if (isMounted) {
                    setIsInitializing(false)
                }
            }
        }

        void bootstrapSession()

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        if (!expiresAt) {
            return
        }

        const expiresAtTime = new Date(expiresAt).getTime()
        const remainingTime = expiresAtTime - Date.now()
        
        const refreshBuffer = 60 * 1000
        const delay = remainingTime - refreshBuffer

        async function handleRefresh() {
            try {
                const data = await refreshAccessToken()
                setToken(data.token)
                setExpiresAt(data.expiresAt)
                setIsAuthenticated(true)
            } catch {
                await logout()
            }    
        }

        if (delay <= 0) {
            void handleRefresh()
        }

        if (delay > 0) {
            const timer = setTimeout(() => {
                void handleRefresh()
            }, delay);
            
            return () => {
                clearTimeout(timer)
            }
        }

    }, [expiresAt, logout])

    return (
        <AuthContext.Provider 
            value={{ 
                isAuthenticated, 
                setIsAuthenticated, 
                token, 
                setToken, 
                logout,
                expiresAt,
                setExpiresAt,
                isInitializing,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider
