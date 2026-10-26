const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const message = JSON.stringify(err)
    console.error('API Error:', message)
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}

const get   = (url)       => request(url)
const post  = (url, data) => request(url, { method: 'POST',   body: JSON.stringify(data) })
const patch = (url, data) => request(url, { method: 'PATCH',  body: JSON.stringify(data) })
const put   = (url, data) => request(url, { method: 'PUT',    body: JSON.stringify(data) })
const del   = (url)       => request(url, { method: 'DELETE'  })

export const api = {

  vehicles: {
    list:       ()           => get('/vehicles/'),
    create:     (data)       => post('/vehicles/', data),
    update:     (imei, data) => patch(`/vehicles/${imei}/`, data),
    delete:     (imei)       => del(`/vehicles/${imei}/`),
    stats:      ()           => get('/vehicles/stats/'),
    history:    (imei, date) => get(`/vehicles/${imei}/history/${date ? `?date=${date}` : ''}`),
    receiveGPS: (data)       => post('/vehicles/receive-gps/', data),
  },

  drivers: {
    list:   ()           => get('/drivers/'),
    create: (data)       => post('/drivers/', data),
    update: (id, data)   => patch(`/drivers/${id}/`, data),
    delete: (id)         => del(`/drivers/${id}/`),
  },

  alerts: {
    list:        ()         => get('/alerts/'),
    update:      (id, data) => patch(`/alerts/${id}/`, data),
    delete:      (id)       => del(`/alerts/${id}/`),
    markAllRead: ()         => post('/alerts/mark-all-read/', {}),
  },

  devices: {
    list:   ()           => get('/devices/'),
    create: (data)       => post('/devices/', data),
    update: (id, data)   => patch(`/devices/${id}/`, data),
    delete: (id)         => del(`/devices/${id}/`),
  },

  clients: {
    list:   ()           => get('/clients/'),
    create: (data)       => post('/clients/', data),
    update: (id, data)   => patch(`/clients/${id}/`, data),
    delete: (id)         => del(`/clients/${id}/`),
    login:  (data)       => post('/clients/login/', data),
  },

  geofences: {
    list:   ()           => get('/geofences/'),
    create: (data)       => post('/geofences/', data),
    update: (id, data)   => patch(`/geofences/${id}/`, data),
    delete: (id)         => del(`/geofences/${id}/`),
  },

  maintenance: {
    list:   ()       => get(`/maintenance/`),
    get:    (id)     => get(`/maintenance/${id}/`),
    create: (data)   => post(`/maintenance/`, data),
    update: (id, d)  => put(`/maintenance/${id}/`, d),
    delete: (id)     => del(`/maintenance/${id}/`),
  },

  fuel: {
    list:   ()       => get(`/fuel/`),
    get:    (id)     => get(`/fuel/${id}/`),
    create: (data)   => post(`/fuel/`, data),
    update: (id, d)  => put(`/fuel/${id}/`, d),
    delete: (id)     => del(`/fuel/${id}/`),
  },
}