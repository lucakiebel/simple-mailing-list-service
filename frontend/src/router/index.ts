import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import ListsView from '@/views/ListsView.vue'
import ListDetailView from '@/views/ListDetailView.vue'
import DeliveryLogView from '@/views/DeliveryLogView.vue'
import ImapView from '@/views/ImapView.vue'
import LoginView from '@/views/LoginView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/lists', name: 'lists', component: ListsView, meta: { requiresAuth: true } },
  { path: '/lists/:id', name: 'list-detail', component: ListDetailView, meta: { requiresAuth: true } },
  { path: '/delivery-log', name: 'delivery-log', component: DeliveryLogView, meta: { requiresAuth: true } },
  { path: '/imap', name: 'imap', component: ImapView, meta: { requiresAuth: true } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
