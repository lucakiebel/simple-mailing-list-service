<template>
  <div class="imap-page">
    <h1>IMAP Debug</h1>

    <div class="status-bar" v-if="status">
      <span :class="'status-dot ' + (status.running ? 'green' : 'red')"></span>
      Worker: {{ status.running ? 'Läuft' : 'Gestoppt' }}
      | Verbunden: {{ status.connected ? 'Ja' : 'Nein' }}
      | Letzter Poll: {{ formatDate(status.lastPoll) }}
    </div>

    <h2>Posteingang</h2>
    <button class="btn-primary" @click="loadInbox" :disabled="loading">Neu laden</button>

    <table class="data-table" v-if="messages.length">
      <thead>
        <tr>
          <th>Seq</th>
          <th>UID</th>
          <th>Von</th>
          <th>Betreff</th>
          <th>Datum</th>
          <th>An</th>
          <th>Flags</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in messages" :key="m.seq">
          <td>{{ m.seq }}</td>
          <td>{{ m.uid }}</td>
          <td>{{ m.from?.join(', ') }}</td>
          <td>{{ m.subject }}</td>
          <td>{{ formatDate(m.date) }}</td>
          <td>{{ m.to?.join(', ') }}</td>
          <td>{{ m.flags?.join(', ') }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">Keine Nachrichten geladen.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import client from '@/api/client'

const status = ref<any>(null)
const messages = ref<any[]>([])
const loading = ref(false)

async function loadStatus() {
  const res = await client.get('/imap/status')
  status.value = res.data
}

async function loadInbox() {
  loading.value = true
  try {
    const res = await client.get('/debug/imap/messages')
    messages.value = res.data
  } finally {
    loading.value = false
  }
}

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('de-DE')
}

onMounted(() => {
  loadStatus()
  loadInbox()
})
</script>

<style scoped>
.status-bar {
  background: #fff;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
.status-dot.green { background: #27ae60; }
.status-dot.red { background: #e74c3c; }
</style>
