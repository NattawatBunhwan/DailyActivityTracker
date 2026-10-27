import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { logoutFromServer, refreshAccessToken } from "../api/authApi";

type AuthProviderProps = {
    children: ReactNode
}

type AuthContextType = {
    isAuthenticated: boolean
    setIsAuthenticated: (value: boolean) => void
    token: string
    setToken: (value: string) => void
    logout: () => void
    refreshToken: string
    expiresAt: string
    setExpiresAt: (value: string) => void
    setRefreshToken: (value: string) => void
}

// The context is exported for the useAuth hook, not for component rendering.
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null)

function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [token, setToken] = useState('')
    const [refreshToken, setRefreshToken] = useState('')
    const [expiresAt, setExpiresAt] = useState('')

    const logout = useCallback(async () => {
        const activeToken = token
        const activeRefreshToken = refreshToken

        // Clear the local session immediately so protected content unmounts
        // without waiting for the server logout request to complete.
        setIsAuthenticated(false)
        setToken('')
        setExpiresAt('')
        setRefreshToken('')

        try {
            await logoutFromServer(activeToken, activeRefreshToken)
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }, [token, refreshToken])

    useEffect(() => {
        if (expiresAt === '' || refreshToken === '') {
            return
        }

        const expiresAtTime = new Date(expiresAt).getTime()
        const remainingTime = expiresAtTime - Date.now()
        
        const refreshBuffer = 60 * 1000
        const delay = remainingTime - refreshBuffer

        async function handleRefresh() {
            try {
                const data = await refreshAccessToken(refreshToken)

                setToken(data.token)
                setExpiresAt(data.expiresAt)
                setRefreshToken(data.refreshToken)
            } catch {
                await logout()
            }    
        }

        if (delay <= 0) {
            handleRefresh()
        }

        if (delay > 0) {
            const timer = setTimeout(() => {
                handleRefresh()
            }, delay);
            
            return () => {
                clearTimeout(timer)
            }
        }

    }, [expiresAt, refreshToken, logout])

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
                refreshToken,
                setRefreshToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider
