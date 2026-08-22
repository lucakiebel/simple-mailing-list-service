import Keycloak from 'keycloak-js'

let keycloak: Keycloak | null = null

export async function initKeycloak(): Promise<Keycloak> {
  keycloak = new Keycloak({
    url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
    realm: import.meta.env.VITE_KEYCLOAK_REALM || 'afb',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'mailing-list-service-frontend',
  })

  await keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  })

  keycloak.onTokenExpired = () => {
    keycloak?.updateToken(30).catch(() => {
      keycloak?.login()
    })
  }

  return keycloak
}

export function getKeycloak(): Keycloak | null {
  return keycloak
}
