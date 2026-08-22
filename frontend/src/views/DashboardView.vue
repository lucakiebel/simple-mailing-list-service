<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Gesamt versendet</h3>
        <p class="stat">{{ stats.total }}</p>
      </div>
      <div class="stat-card ok">
        <h3>Erfolgreich</h3>
        <p class="stat">{{ stats.sent }}</p>
      </div>
      <div class="stat-card err">
        <h3>Fehlgeschlagen</h3>
        <p class="stat">{{ stats.failed }}</p>
      </div>
      <div class="stat-card">
        <h3>Heute</h3>
        <p class="stat">{{ stats.today }}</p>
      </div>
    </div>

    <h2>Letzte Aktivitäten</h2>
    <table class="data-table" v-if="recent.length">
      <thead>
        <tr>
          <th>Zeit</th>
          <th>Liste</th>
          <th>Betreff</th>
          <th>Empfänger</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in recent" :key="entry.id">
          <td>{{ formatDate(entry.sentAt) }}</td>
          <td>{{ entry.list?.name }}</td>
          <td>{{ entry.subject }}</td>
          <td>{{ entry.recipientEmail }}</td>
          <td>
            <span :class="'badge badge-' + entry.status">{{ entry.status }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">Keine Aktivitäten.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import client from '@/api/client'

const stats = ref({ total: 0, sent: 0, failed: 0, today: 0 })
const recent = ref<any[]>([])

async function load() {
  const [statsRes, logRes] = await Promise.all([
    client.get('/delivery-log/stats'),
    client.get('/delivery-log?dateFrom=' + new Date(Date.now() - 86400000 * 7).toISOString()),
  ])
  stats.value = statsRes.data
  recent.value = logRes.data.slice(0, 20)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE')
}

onMounted(load)
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}
.stat-card {
  background: #fff;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.stat-card h3 {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.5rem;
}
.stat {
  font-size: 2rem;
  font-weight: bold;
}
.stat-card.ok .stat { color: #27ae60; }
.stat-card.err .stat { color: #e74c3c; }
</style>
