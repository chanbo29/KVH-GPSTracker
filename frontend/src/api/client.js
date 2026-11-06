const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    // The server usually returns a JSON error body, but a request that
    // never reaches a view (e.g. rejected for being too large, or a
    // Django debug/500 HTML page) returns plain text/HTML instead --
    // reading it as text first (and only parsing as JSON if it looks
    // like JSON) means the user always gets a readable message instead
    // of an empty "{}" from a failed res.json() call.
    const raw = await res.text().catch(() => '')
    let message = ''
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        message = typeof parsed === 'string' ? parsed
          : parsed.detail || parsed.message || parsed.error || JSON.stringify(parsed)
      } catch {
        // Not JSON -- an HTML error page or plain text. Don't dump raw
        // HTML into a toast; give a short, specific reason instead.
        if (res.status === 413 || /too large|RequestDataTooBig/i.test(raw)) {
          message = 'That request was too large for the server to accept (e.g. a photo that is too big). Please use a smaller image.'
        } else {
          message = `Server error (${res.status} ${res.statusText || ''}).`.trim()
        }
      }
    }
    if (!message) message = `Request failed (${res.status} ${res.statusText || ''}).`.trim()
    console.error('API Error:', res.status, raw)
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

  spareparts: {
    list:   ()       => get(`/spareparts/`),
    get:    (id)     => get(`/spareparts/${id}/`),
    create: (data)   => post(`/spareparts/`, data),
    update: (id, d)  => put(`/spareparts/${id}/`, d),
    delete: (id)     => del(`/spareparts/${id}/`),
  },

  stockMovements: {
    list:   (partId) => get(`/stockmovements/${partId ? `?part_id=${partId}` : ''}`),
    create: (data)   => post(`/stockmovements/`, data),
    delete: (id)     => del(`/stockmovements/${id}/`),
  },

  vehicleDocuments: {
    list:   ()       => get(`/vehicledocuments/`),
    get:    (id)     => get(`/vehicledocuments/${id}/`),
    create: (data)   => post(`/vehicledocuments/`, data),
    update: (id, d)  => put(`/vehicledocuments/${id}/`, d),
    delete: (id)     => del(`/vehicledocuments/${id}/`),
  },

  expenses: {
    list:   ()       => get(`/expenses/`),
    get:    (id)     => get(`/expenses/${id}/`),
    create: (data)   => post(`/expenses/`, data),
    update: (id, d)  => put(`/expenses/${id}/`, d),
    delete: (id)     => del(`/expenses/${id}/`),
  },

  // Standalone "Car Maintenance" feature set — own database (carmaint app),
  // own endpoints under /api/carmaint/<slug>/.
  carmaint: {
    otherWork: {
      list:   ()      => get(`/carmaint/other-work/`),
      create: (data)  => post(`/carmaint/other-work/`, data),
      update: (id, d) => put(`/carmaint/other-work/${id}/`, d),
      delete: (id)    => del(`/carmaint/other-work/${id}/`),
    },
    vehicleRoster: {
      list:   ()      => get(`/carmaint/vehicle-roster/`),
      create: (data)  => post(`/carmaint/vehicle-roster/`, data),
      update: (id, d) => put(`/carmaint/vehicle-roster/${id}/`, d),
      delete: (id)    => del(`/carmaint/vehicle-roster/${id}/`),
    },
    maintenanceRecords: {
      list:   ()      => get(`/carmaint/maintenance-records/`),
      create: (data)  => post(`/carmaint/maintenance-records/`, data),
      update: (id, d) => put(`/carmaint/maintenance-records/${id}/`, d),
      delete: (id)    => del(`/carmaint/maintenance-records/${id}/`),
    },
    reminders: {
      list:   ()      => get(`/carmaint/reminders/`),
      create: (data)  => post(`/carmaint/reminders/`, data),
      update: (id, d) => put(`/carmaint/reminders/${id}/`, d),
      delete: (id)    => del(`/carmaint/reminders/${id}/`),
    },
    feePayments: {
      list:   ()      => get(`/carmaint/fee-payments/`),
      create: (data)  => post(`/carmaint/fee-payments/`, data),
      update: (id, d) => put(`/carmaint/fee-payments/${id}/`, d),
      delete: (id)    => del(`/carmaint/fee-payments/${id}/`),
    },
    taxPayments: {
      list:   ()      => get(`/carmaint/tax-payments/`),
      create: (data)  => post(`/carmaint/tax-payments/`, data),
      update: (id, d) => put(`/carmaint/tax-payments/${id}/`, d),
      delete: (id)    => del(`/carmaint/tax-payments/${id}/`),
    },
    oilChanges: {
      list:   ()      => get(`/carmaint/oil-changes/`),
      create: (data)  => post(`/carmaint/oil-changes/`, data),
      update: (id, d) => put(`/carmaint/oil-changes/${id}/`, d),
      delete: (id)    => del(`/carmaint/oil-changes/${id}/`),
    },
    fuelRefills: {
      list:   ()      => get(`/carmaint/fuel-refills/`),
      create: (data)  => post(`/carmaint/fuel-refills/`, data),
      update: (id, d) => put(`/carmaint/fuel-refills/${id}/`, d),
      delete: (id)    => del(`/carmaint/fuel-refills/${id}/`),
    },
    gearboxOilChanges: {
      list:   ()      => get(`/carmaint/gearbox-oil-changes/`),
      create: (data)  => post(`/carmaint/gearbox-oil-changes/`, data),
      update: (id, d) => put(`/carmaint/gearbox-oil-changes/${id}/`, d),
      delete: (id)    => del(`/carmaint/gearbox-oil-changes/${id}/`),
    },
    differentialOilChanges: {
      list:   ()      => get(`/carmaint/differential-oil-changes/`),
      create: (data)  => post(`/carmaint/differential-oil-changes/`, data),
      update: (id, d) => put(`/carmaint/differential-oil-changes/${id}/`, d),
      delete: (id)    => del(`/carmaint/differential-oil-changes/${id}/`),
    },
    miscRepairCosts: {
      list:   ()      => get(`/carmaint/misc-repair-costs/`),
      create: (data)  => post(`/carmaint/misc-repair-costs/`, data),
      update: (id, d) => put(`/carmaint/misc-repair-costs/${id}/`, d),
      delete: (id)    => del(`/carmaint/misc-repair-costs/${id}/`),
    },
    vehiclesUnderRepair: {
      list:   ()      => get(`/carmaint/vehicles-under-repair/`),
      create: (data)  => post(`/carmaint/vehicles-under-repair/`, data),
      update: (id, d) => put(`/carmaint/vehicles-under-repair/${id}/`, d),
      delete: (id)    => del(`/carmaint/vehicles-under-repair/${id}/`),
    },
    fuelStations: {
      list:   ()      => get(`/carmaint/fuel-stations/`),
      create: (data)  => post(`/carmaint/fuel-stations/`, data),
      update: (id, d) => put(`/carmaint/fuel-stations/${id}/`, d),
      delete: (id)    => del(`/carmaint/fuel-stations/${id}/`),
    },
    vehicleUsers: {
      list:   ()      => get(`/carmaint/vehicle-users/`),
      create: (data)  => post(`/carmaint/vehicle-users/`, data),
      update: (id, d) => put(`/carmaint/vehicle-users/${id}/`, d),
      delete: (id)    => del(`/carmaint/vehicle-users/${id}/`),
    },
    vehicleUserChanges: {
      list:   ()      => get(`/carmaint/vehicle-user-changes/`),
      create: (data)  => post(`/carmaint/vehicle-user-changes/`, data),
      update: (id, d) => put(`/carmaint/vehicle-user-changes/${id}/`, d),
      delete: (id)    => del(`/carmaint/vehicle-user-changes/${id}/`),
    },
    outstandingInvoices: {
      list:   ()      => get(`/carmaint/outstanding-invoices/`),
      create: (data)  => post(`/carmaint/outstanding-invoices/`, data),
      update: (id, d) => put(`/carmaint/outstanding-invoices/${id}/`, d),
      delete: (id)    => del(`/carmaint/outstanding-invoices/${id}/`),
    },
    exchangeRates: {
      list:   ()      => get(`/carmaint/exchange-rates/`),
      create: (data)  => post(`/carmaint/exchange-rates/`, data),
      update: (id, d) => put(`/carmaint/exchange-rates/${id}/`, d),
      delete: (id)    => del(`/carmaint/exchange-rates/${id}/`),
    },
    expensePersons: {
      list:   ()      => get(`/carmaint/expense-persons/`),
      create: (data)  => post(`/carmaint/expense-persons/`, data),
      update: (id, d) => put(`/carmaint/expense-persons/${id}/`, d),
      delete: (id)    => del(`/carmaint/expense-persons/${id}/`),
    },
    cardNames: {
      list:   ()      => get(`/carmaint/card-names/`),
      create: (data)  => post(`/carmaint/card-names/`, data),
      update: (id, d) => put(`/carmaint/card-names/${id}/`, d),
      delete: (id)    => del(`/carmaint/card-names/${id}/`),
    },
    driverNames: {
      list:   ()      => get(`/carmaint/driver-names/`),
      create: (data)  => post(`/carmaint/driver-names/`, data),
      update: (id, d) => put(`/carmaint/driver-names/${id}/`, d),
      delete: (id)    => del(`/carmaint/driver-names/${id}/`),
    },
  },
}