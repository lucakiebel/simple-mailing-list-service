<template>
  <div class="login-page">
    <div class="login-card">
      <h1>SMLS Admin</h1>
      <p>Mailing-List-Verwaltung</p>
      <p v-if="authStore.authenticated" class="logged-in">
        Du bist bereits angemeldet als <strong>{{ authStore.username }}</strong>.
      </p>
      <button v-if="!authStore.authenticated" @click="login">Anmelden mit Keycloak</button>
      <button v-else @click="goHome">Zum Dashboard</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

function login() {
  const redirect = (route.query.redirect as string) || '/'
  authStore.login(redirect)
}

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #1a1a2e;
}
.login-card {
  background: #fff;
  padding: 3rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.login-card h1 {
  margin-bottom: 0.5rem;
}
.login-card p {
  color: #666;
  margin-bottom: 2rem;
}
.logged-in {
  color: #27ae60;
}
.login-card button {
  background: #e94560;
  color: #fff;
  border: none;
  padding: 0.8rem 2rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}
</style>
