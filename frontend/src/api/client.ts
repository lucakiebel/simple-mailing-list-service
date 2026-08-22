import axios from 'axios'
import { getKeycloak } from '../auth/keycloak'

const client = axios.create({
  baseURL: '/api', // In dev via Vite proxy, in prod via Nginx
})

client.interceptors.request.use((config) => {
  const kc = getKeycloak()
  if (kc?.token) {
    config.headers.Authorization = `Bearer ${kc.token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const kc = getKeycloak()
      kc?.login()
    }
    return Promise.reject(error)
  },
)

export default client
