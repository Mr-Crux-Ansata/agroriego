const BASE = 'http://127.0.0.1:3001/api';

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
async function request(url, options = {}, auth = true) {
    try {
        const res = await fetch(`${BASE}${url}`, {
            ...options,
            headers: getHeaders(auth),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            return {
                ok: false,
                error: data.error || 'Error en servidor',
            };
        }

        return {
            ok: true,
            ...data,
        };

    } catch (err) {
        return {
            ok: false,
            error: 'Error de conexión',
        };
    }
}

export const api = {

    // 🔑 LOGIN
    login: async (email, password) => {
        const res = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }, false);

        // guardar token correctamente
        if (res.ok && res.data?.token) {
            localStorage.setItem('token', res.data.token);
        }

        return res;
    },

    // 🔓 LOGOUT
    logout: () => {
        localStorage.removeItem('token');
    },

    // 📍 PREDIOS
    getPredios: () => request('/predios'),

    crearPredio: (data) =>
        request('/predios', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 🌱 AREAS
    getAreas: () => request('/areas'),

    updateAreaConfig: (areaId, config) =>
        request(`/areas/${areaId}/config`, {
            method: 'PUT',
            body: JSON.stringify(config),
        }),

    // 📡 TELEMETRIA
    getTelemetria: (areaId, desde, hasta) => {
        const params = desde && hasta
            ? `?desde=${desde}&hasta=${hasta}`
            : '';

        return request(`/areas/${areaId}/telemetria${params}`);
    },

    // 🚨 ALERTAS
    getAlertas: () => request('/alertas'),

    marcarAlertaLeida: (id) =>
        request(`/alertas/${id}/leer`, {
            method: 'PATCH',
        }),

    // 👤 USUARIOS
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
};