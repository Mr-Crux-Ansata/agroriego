const BASE = 'http://localhost:3001';

function getToken() {
    return localStorage.getItem('token');
}

function getHeaders(auth = true) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (auth) {
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
}

// 🔥 función base para todas las requests
async function request(url, options = {}, auth = true) {
    try {
        const res = await fetch(`${BASE}${url}`, {
            ...options,
            headers: getHeaders(auth),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { ok: false, error: error.error || 'Error en servidor' };
        }

        const data = await res.json();
        return { ok: true, ...data };

    } catch (err) {
        return { ok: false, error: 'Error de conexión' };
    }
}

export const api = {

    // 🔑 LOGIN
    login: async (email, password) => {
        const res = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }, false);

        if (res.ok && res.token) {
            localStorage.setItem('token', res.token);
        }

        return res;
    },

    // 🔓 LOGOUT (extra útil)
    logout: () => {
        localStorage.removeItem('token');
    },

    getPredios: () => request('/predios'),

    getAreas: () => request('/areas'),

    getTelemetria: (areaId, desde, hasta) => {
        const params = desde && hasta
            ? `?desde=${desde}&hasta=${hasta}`
            : '';
        return request(`/areas/${areaId}/telemetria${params}`);
    },

    updateAreaConfig: (areaId, config) =>
        request(`/areas/${areaId}/config`, {
            method: 'PUT',
            body: JSON.stringify(config),
        }),

    getAlertas: () => request('/alertas'),

    marcarAlertaLeida: (id) =>
        request(`/alertas/${id}/leer`, {
            method: 'PATCH',
        }),

    getUsuarios: () => request('/usuarios'),

    crearUsuario: (data) =>
        request('/usuarios', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    eliminarUsuario: (id) =>
        request(`/usuarios/${id}`, {
            method: 'DELETE',
        }),

    crearPredio: (data) =>
        request('/predios', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

