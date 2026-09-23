import { createContext, useState, type ReactNode } from "react";

type AuthProviderProps = {
    children: ReactNode
}

type AuthContextType = {
    isAuthenticated: boolean
    setIsAuthenticated: (value: boolean) => void
    token: string
    setToken: (value: string) => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [token, setToken] = useState('')
    
    return (
        <AuthContext.Provider value={{ 
                isAuthenticated, setIsAuthenticated, token, setToken
            }}>{children}
        </AuthContext.Provider>
    )
}

export default AuthProvider