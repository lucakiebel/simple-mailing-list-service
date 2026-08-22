import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getKeycloak } from '../auth/keycloak'

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false)
  const username = ref('')
  const token = ref<string | undefined>(undefined)

  function update() {
    const kc = getKeycloak()
    authenticated.value = !!kc?.authenticated
    username.value = kc?.tokenParsed?.preferred_username || ''
    token.value = kc?.token
  }

  function login(redirectPath?: string) {
    const kc = getKeycloak()
    const redirectUri = redirectPath
      ? window.location.origin + redirectPath
      : window.location.origin
    kc?.login({ redirectUri })
  }

  function logout() {
    const kc = getKeycloak()
    kc?.logout({ redirectUri: window.location.origin })
  }

  update()

  return { authenticated, username, token, login, logout, update }
})
