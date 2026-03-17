const BASE = 'https://agroriego.onrender.com/test';

function getToken() {
    return localStorage.getItem('token');
}

function headers() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
    };
}

export const api = {
    login: (email, password) =>
        fetch(`${BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        }).then(r => r.json()),

    getPredios: () =>
        fetch(`${BASE}/predios`, { headers: headers() }).then(r => r.json()),

    getAreas: () =>
        fetch(`${BASE}/areas`, { headers: headers() }).then(r => r.json()),

    getTelemetria: (areaId, desde, hasta) => {
        const params = desde && hasta
            ? `?desde=${desde}&hasta=${hasta}` : '';
        return fetch(`${BASE}/areas/${areaId}/telemetria${params}`,
            { headers: headers() }).then(r => r.json());
    },

    updateAreaConfig: (areaId, config) =>
        fetch(`${BASE}/areas/${areaId}/config`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(config),
        }).then(r => r.json()),

    getAlertas: () =>
        fetch(`${BASE}/alertas`, { headers: headers() }).then(r => r.json()),

    marcarAlertaLeida: (id) =>
        fetch(`${BASE}/alertas/${id}/leer`, {
            method: 'PATCH',
            headers: headers(),
        }).then(r => r.json()),

    getUsuarios: () =>
        fetch(`${BASE}/usuarios`, { headers: headers() }).then(r => r.json()),

    crearUsuario: (data) =>
        fetch(`${BASE}/usuarios`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(data),
        }).then(r => r.json()),

    eliminarUsuario: (id) =>
        fetch(`${BASE}/usuarios/${id}`, {
            method: 'DELETE',
            headers: headers(),
        }).then(r => r.json()),

    crearPredio: (data) =>
        fetch(`${BASE}/predios`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(data),
        }).then(r => r.json()),
};