<template>
  <div class="detail-page" v-if="list">
    <h1>{{ list.name }}</h1>
    <p class="meta">{{ list.email }} — Modus: {{ list.mode }}</p>

    <div class="tabs">
      <button :class="{ active: tab === 'members' }" @click="tab = 'members'">Mitglieder</button>
      <button :class="{ active: tab === 'moderation' }" @click="tab = 'moderation'">Moderation</button>
    </div>

    <div v-if="tab === 'members'">
      <h2>Mitglieder</h2>
      <button class="btn-primary" @click="showAddMember = true">Mitglied hinzufügen</button>

      <table class="data-table" v-if="members.length">
        <thead>
          <tr>
            <th>Name</th>
            <th>E-Mail</th>
            <th>Rolle</th>
            <th>Aktiv</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.id">
            <td>{{ m.name }}</td>
            <td>{{ m.email }}</td>
            <td><span :class="'badge badge-' + m.role">{{ m.role }}</span></td>
            <td>
              <span :class="'badge ' + (m.active ? 'badge-active' : 'badge-inactive')">
                {{ m.active ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </td>
            <td>
              <button class="btn-sm" @click="toggleActive(m)">{{ m.active ? 'Deaktivieren' : 'Aktivieren' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Keine Mitglieder.</p>
    </div>

    <div v-if="tab === 'moderation'">
      <h2>Ausstehende Nachrichten</h2>
      <table class="data-table" v-if="pending.length">
        <thead>
          <tr>
            <th>Von</th>
            <th>Betreff</th>
            <th>Erhalten</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in pending" :key="p.id">
            <td>{{ p.fromEmail }}</td>
            <td>{{ p.subject }}</td>
            <td>{{ formatDate(p.createdAt) }}</td>
            <td>
              <button class="btn-sm ok" @click="moderate(p.id, 'approve')">Freigeben</button>
              <button class="btn-sm err" @click="moderate(p.id, 'reject')">Ablehnen</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Keine ausstehenden Nachrichten.</p>
    </div>

    <div v-if="showAddMember" class="modal">
      <div class="modal-content">
        <h2>Mitglied hinzufügen</h2>
        <input v-model="newMember.email" placeholder="E-Mail" />
        <input v-model="newMember.name" placeholder="Name" />
        <select v-model="newMember.role">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <div class="modal-actions">
          <button class="btn-primary" @click="addMember">Hinzufügen</button>
          <button class="btn-secondary" @click="showAddMember = false">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import client from '@/api/client'

const route = useRoute()
const listId = route.params.id as string
const list = ref<any>(null)
const members = ref<any[]>([])
const pending = ref<any[]>([])
const tab = ref('members')
const showAddMember = ref(false)
const newMember = ref({ email: '', name: '', role: 'member' })

async function load() {
  const [listRes, membersRes, pendingRes] = await Promise.all([
    client.get(`/lists/${listId}`),
    client.get(`/lists/${listId}/members`),
    client.get(`/lists/${listId}/messages/pending`),
  ])
  list.value = listRes.data
  members.value = membersRes.data
  pending.value = pendingRes.data
}

async function addMember() {
  await client.post(`/lists/${listId}/members`, newMember.value)
  showAddMember.value = false
  newMember.value = { email: '', name: '', role: 'member' }
  await load()
}

async function toggleActive(m: any) {
  await client.patch(`/lists/members/${m.id}/active?active=${!m.active}`)
  await load()
}

async function moderate(pendingId: string, action: string) {
  await client.post(`/lists/${listId}/messages/pending/${pendingId}`, { action })
  await load()
}

function formatDate(_iso: string) {
  return '...'
}

onMounted(load)
</script>
