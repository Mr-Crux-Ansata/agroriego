const BASE = 'http://localhost:3001/api';

// ---------------------
// TOKEN
// ---------------------
function getToken() {
    return localStorage.getItem('token');
}

// ---------------------
// HEADERS
// ---------------------
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

// ---------------------
// REQUEST CENTRAL
// ---------------------
async function request(url, options = {}, auth = true) {
    try {
        console.log("➡️ URL:", `${BASE}${url}`);

        const res = await fetch(`${BASE}${url}`, {
            ...options,
            headers: getHeaders(auth),
        });

        const data = await res.json().catch(() => ({}));

        console.log("📦 STATUS:", res.status);
        console.log("📦 DATA:", data);

        if (!res.ok) {
            return {
                ok: false,
                error: data.error || 'Error en servidor',
            };
        }

        return {
            ok: true,
            data, // 👈 CONSISTENTE TODO EL SISTEMA
        };

    } catch (err) {
        console.log("❌ FETCH ERROR REAL:", err);

        return {
            ok: false,
            error: 'Error de conexión',
        };
    }
}

// ---------------------
// API
// ---------------------
export const api = {

    // 🔑 LOGIN
    login: async (email, password) => {
        const res = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }, false);

        // 🔥 ahora todo viene en res.data
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
    getPredios: async () => {
        const res = await request('/predios');
        return res.data;
    },

    crearPredio: (data) =>
        request('/predios', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // 🌱 AREAS
    getAreas: async () => {
        const res = await request('/areas');
        return res.data;
    },

    updateAreaConfig: (areaId, config) =>
        request(`/areas/${areaId}/config`, {
            method: 'PUT',
            body: JSON.stringify(config),
        }),

    // 📡 TELEMETRIA
    getTelemetria: async (areaId, desde, hasta) => {
        const params = desde && hasta
            ? `?desde=${desde}&hasta=${hasta}`
            : '';

        const res = await request(`/areas/${areaId}/telemetria${params}`);
        return res.data;
    },

    // 🚨 ALERTAS
    getAlertas: async () => {
        const res = await request('/alertas');
        return res.data;
    },

    marcarAlertaLeida: (id) =>
        request(`/alertas/${id}/leer`, {
            method: 'PATCH',
        }),

    // 👤 USUARIOS
    getUsuarios: async () => {
        const res = await request('/usuarios');
        return res.data;
    },

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