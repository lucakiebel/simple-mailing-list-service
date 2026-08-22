<template>
  <div class="lists-page">
    <h1>Mailing-Listen</h1>

    <button class="btn-primary" @click="showCreate = true">Neue Liste</button>

    <table class="data-table" v-if="lists.length">
      <thead>
        <tr>
          <th>Name</th>
          <th>E-Mail</th>
          <th>Modus</th>
          <th>Mitglieder</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="list in lists" :key="list.id">
          <td>
            <router-link :to="`/lists/${list.id}`">{{ list.name }}</router-link>
          </td>
          <td>{{ list.email }}</td>
          <td>
            <span :class="'badge badge-mode badge-' + list.mode">{{ list.mode }}</span>
          </td>
          <td>{{ list.memberCount ?? '?' }}</td>
          <td>
            <router-link :to="`/lists/${list.id}`" class="btn-sm">Details</router-link>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">Keine Listen vorhanden.</p>

    <div v-if="showCreate" class="modal">
      <div class="modal-content">
        <h2>Neue Liste</h2>
        <input v-model="newList.name" placeholder="Name" />
        <input v-model="newList.email" placeholder="E-Mail" />
        <select v-model="newList.mode">
          <option value="open">Open</option>
          <option value="members_only">Members Only</option>
          <option value="moderated">Moderated</option>
        </select>
        <div class="modal-actions">
          <button class="btn-primary" @click="createList">Anlegen</button>
          <button class="btn-secondary" @click="showCreate = false">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import client from '@/api/client'

const lists = ref<any[]>([])
const showCreate = ref(false)
const newList = ref({ name: '', email: '', mode: 'open' })

async function load() {
  const res = await client.get('/lists')
  lists.value = res.data
}

async function createList() {
  await client.post('/lists', newList.value)
  showCreate.value = false
  newList.value = { name: '', email: '', mode: 'open' }
  await load()
}

onMounted(load)
</script>
