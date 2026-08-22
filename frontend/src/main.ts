import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { initKeycloak, getKeycloak } from './auth/keycloak'
import { useAuthStore } from './stores/auth'
import './assets/style.css'

let kcReady: Promise<void>

router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  if (!requiresAuth) return true

  await kcReady

  const kc = getKeycloak()
  if (!kc?.authenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  return true
})

async function bootstrap() {
  const app = createApp(App)
  app.use(createPinia())

  kcReady = initKeycloak()

  app.use(router)

  const authStore = useAuthStore()

  try {
    await kcReady
    authStore.update()

    // Clean up Keycloak redirect params from URL
    if (window.location.href.includes('?')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  } catch (err) {
    console.warn('Keycloak init failed', err)
  }

  app.mount('#app')
}

bootstrap()
