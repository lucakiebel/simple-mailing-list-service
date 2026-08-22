<template>
  <div class="log-page">
    <h1>Versandlog</h1>

    <div class="filters">
      <select v-model="filter.listId">
        <option value="">Alle Listen</option>
        <option v-for="l in lists" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
      <select v-model="filter.status">
        <option value="">Alle Status</option>
        <option value="sent">Erfolgreich</option>
        <option value="failed">Fehlgeschlagen</option>
        <option value="pending">Ausstehend</option>
      </select>
      <button class="btn-primary" @click="load">Filtern</button>
    </div>

    <table class="data-table" v-if="entries.length">
      <thead>
        <tr>
          <th>Zeit</th>
          <th>Liste</th>
          <th>Betreff</th>
          <th>Empfänger</th>
          <th>Status</th>
          <th>Fehler</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in entries" :key="e.id">
          <td>{{ formatDate(e.sentAt) }}</td>
          <td>{{ e.list?.name }}</td>
          <td>{{ e.subject }}</td>
          <td>{{ e.recipientEmail }}</td>
          <td>
            <span :class="'badge badge-' + e.status">{{ e.status }}</span>
          </td>
          <td class="error-cell">{{ e.errorMessage || '' }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">Keine Einträge.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import client from '@/api/client'

const lists = ref<any[]>([])
const entries = ref<any[]>([])
const filter = ref({ listId: '', status: '' })

async function load() {
  const params: any = {}
  if (filter.value.listId) params.listId = filter.value.listId
  if (filter.value.status) params.status = filter.value.status
  const res = await client.get('/delivery-log', { params })
  entries.value = res.data
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE')
}

onMounted(async () => {
  const listsRes = await client.get('/lists')
  lists.value = listsRes.data
  await load()
})
</script>

<style scoped>
.filters {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}
.error-cell {
  color: #e74c3c;
  font-size: 0.85rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
