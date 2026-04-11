import type { Auth0ProviderOptions } from '@auth0/auth0-react'
import { Auth0Provider } from '@auth0/auth0-react'
import config from '../utils/config'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const options: Auth0ProviderOptions = {
    domain: config.AUTH0_ISSUER_DOMAIN,
    clientId: config.AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: config.AUTH0_AUDIENCE_URL,
      scope: 'openid profile email',
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  }

  return <Auth0Provider {...options}>{children}</Auth0Provider>
}
