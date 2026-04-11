import { useAuth0 } from '@auth0/auth0-react'
import { useCallback, useEffect, useState } from 'react'

export function useAuth() {
  const {
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    getIdTokenClaims,
    getAccessTokenSilently,
    logout,
    user,
  } = useAuth0()

  const [expires, setExpires] = useState(0)

  useEffect(() => {
    async function getExpires() {
      if (isLoading) return
      if (isAuthenticated) {
        const claims = await getIdTokenClaims()
        const exp = claims?.exp ? claims.exp * 1000 : null
        if (exp !== null && exp !== expires) setExpires(exp)
      } else if (expires !== 0) {
        setExpires(0)
      }
    }
    void getExpires()
  }, [expires, isLoading, isAuthenticated, getIdTokenClaims])

  const login = useCallback(
    async (options?: Parameters<typeof loginWithRedirect>[0]) => {
      await loginWithRedirect({
        authorizationParams: { prompt: 'login', ...options?.authorizationParams },
      })
    },
    [loginWithRedirect],
  )

  const handleLogout = useCallback(
    async (options?: Parameters<typeof logout>[0]) => {
      setExpires(0)
      await logout({
        ...options,
        logoutParams: { returnTo: window.location.origin, ...options?.logoutParams },
      })
    },
    [logout],
  )

  return {
    loading: isLoading,
    isAuthenticated,
    user,
    expires,
    login,
    logout: handleLogout,
    getAccessTokenSilently,
  }
}
