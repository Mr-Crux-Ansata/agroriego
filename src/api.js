const BASE = 'http://localhost:3001/api';

console.log("🚨 ESTE ES EL API CORRECTO");

// ---------------------
// TOKEN
// ---------------------
function getToken() {
    return localStorage.getItem('token');
}

function getStoredUser() {
    const raw = localStorage.getItem('user');
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
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

async function requestFormData(url, formData, auth = true) {
    try {
        const headers = {};
        if (auth) {
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const res = await fetch(`${BASE}${url}`, {
            method: 'POST',
            headers,
            body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return {
                ok: false,
                error: data.error || 'Error en servidor',
            };
        }

        return { ok: true, data };
    } catch (err) {
        console.log('❌ FETCH ERROR REAL:', err);
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

        if (res.ok && res.data?.token) {
            localStorage.setItem('token', res.data.token);
            if (res.data.user) {
                localStorage.setItem('user', JSON.stringify(res.data.user));
            }
        }

        return res;
    },

    getCurrentUser: async () => {
        const res = await request('/auth/me');

        if (res.ok && res.data?.user) {
            localStorage.setItem('user', JSON.stringify(res.data.user));
            return res.data.user;
        }

        return getStoredUser();
    },

    getStoredUser,

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getPredios: async () => {
        const res = await request('/predios');
        return res.data;
    },

    crearPredio: (data) =>
        request('/predios', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    activarCuenta: (token, password) =>
        request('/auth/activar', {
            method: 'POST',
            body: JSON.stringify({ token, password }),
        }, false),

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

    importarTelemetriaCSV: (csvContent, areaId) =>
        request('/reportes/importar-csv', {
            method: 'POST',
            body: JSON.stringify({ csvContent, areaId }),
        }),

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

    getMiPerfil: () => request('/usuarios/perfil'),

    cambiarPassword: (actual, nueva) =>
        request('/usuarios/perfil/password', {
            method: 'PUT',
            body: JSON.stringify({ actual, nueva }),
        }),

    actualizarMiPerfil: (data) =>
        request('/usuarios/perfil', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    subirFotoPerfil: (file) => {
        const formData = new FormData();
        formData.append('imagen', file);
        return requestFormData('/usuarios/perfil/foto', formData);
    },

};