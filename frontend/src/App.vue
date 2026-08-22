<template>
  <div id="app-layout">
    <aside v-if="authStore.authenticated" class="sidebar">
      <h2>SMLS Admin</h2>
      <nav>
        <router-link to="/">Dashboard</router-link>
        <router-link to="/lists">Listen</router-link>
        <router-link to="/delivery-log">Versandlog</router-link>
        <router-link to="/imap">IMAP</router-link>
      </nav>
      <div class="sidebar-footer">
        <span>{{ authStore.username }}</span>
        <button @click="logout">Logout</button>
      </div>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

function logout() {
  authStore.logout()
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

#app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background: #1a1a2e;
  color: #eee;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.sidebar h2 {
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.sidebar nav a {
  color: #ccc;
  text-decoration: none;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.sidebar nav a:hover,
.sidebar nav a.router-link-active {
  background: #16213e;
  color: #fff;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.sidebar-footer button {
  background: #e94560;
  color: #fff;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}

main {
  flex: 1;
  padding: 2rem;
  background: #f5f5f5;
}
</style>
