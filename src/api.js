const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'token';
// No persistir sesión en localStorage para evitar auto-login por cache entre reinicios.
localStorage.removeItem(TOKEN_KEY);

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
    if (!token) return;
    sessionStorage.setItem(TOKEN_KEY, token);
    // Limpiar legado para evitar sesiones persistentes por cache/localStorage.
    localStorage.removeItem(TOKEN_KEY);
}

function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
}

function headers() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        cache: 'no-store',
        ...options,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        clearToken();
    }

    return { response, data };
}

export const api = {
    login: async (email, password) => {
        const { response, data } = await fetchJson(`${BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            return { ok: false, error: data?.error || 'No se pudo iniciar sesión' };
        }

        if (data?.token) {
            saveToken(data.token);
        }

        return { ok: true, data };
    },

    getCurrentUser: async () => {
        const token = getToken();
        if (!token) return null;

        const { response, data } = await fetchJson(`${BASE}/usuarios/perfil`, {
            headers: headers(),
        });

        if (!response.ok) {
            return null;
        }

        return data?.perfil || null;
    },

    logout: () => {
        clearToken();
    },

    getPredios: () =>
        fetchJson(`${BASE}/predios`, { headers: headers() }).then(({ data }) => data),

    getAreas: () =>
        fetchJson(`${BASE}/areas`, { headers: headers() }).then(({ data }) => data),

    getTelemetria: (areaId, desde, hasta) => {
        const params = desde && hasta
            ? `?desde=${desde}&hasta=${hasta}` : '';
        return fetchJson(`${BASE}/areas/${areaId}/telemetria${params}`,
            { headers: headers() }).then(({ data }) => data);
    },

    updateAreaConfig: (areaId, config) =>
        fetchJson(`${BASE}/areas/${areaId}/config`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(config),
        }).then(({ data }) => data),

    getAlertas: () =>
        fetchJson(`${BASE}/alertas`, { headers: headers() }).then(({ data }) => data),

    marcarAlertaLeida: (id) =>
        fetchJson(`${BASE}/alertas/${id}/leer`, {
            method: 'PATCH',
            headers: headers(),
        }).then(({ data }) => data),

    getUsuarios: () =>
        fetchJson(`${BASE}/usuarios`, { headers: headers() }).then(({ data }) => data),

    crearUsuario: (data) =>
        fetchJson(`${BASE}/usuarios`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(data),
        }).then(({ data: body }) => body),

    eliminarUsuario: (id) =>
        fetchJson(`${BASE}/usuarios/${id}`, {
            method: 'DELETE',
            headers: headers(),
        }).then(({ data }) => data),

    crearPredio: (data) =>
        fetchJson(`${BASE}/predios`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(data),
        }).then(({ data }) => data),

    // Dashboard
    getDashboardResumen: () =>
        fetchJson(`${BASE}/dashboard/resumen`, { headers: headers() }).then(({ data }) => data),

    // Configuración general
    getConfiguracionGeneral: () =>
        fetchJson(`${BASE}/configuracion`, { headers: headers() }).then(({ data }) => data),

    actualizarConfiguracionGeneral: (data) =>
        fetchJson(`${BASE}/configuracion`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(data),
        }).then(({ data }) => data),

    // Perfil del usuario autenticado
    getMiPerfil: () =>
        fetchJson(`${BASE}/usuarios/perfil`, { headers: headers() }).then(({ data }) => data),

    actualizarMiPerfil: (data) =>
        fetchJson(`${BASE}/usuarios/perfil`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(data),
        }).then(({ data: body }) => body),

    subirFotoPerfil: (file) => {
        const form = new FormData();
        form.append('foto', file);
        const token = getToken();
        return fetchJson(`${BASE}/usuarios/perfil/foto`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: form,
        }).then(({ data }) => data);
    },

    cambiarPassword: (actual, nueva) =>
        fetchJson(`${BASE}/usuarios/perfil/password`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify({ actual, nueva }),
        }).then(({ data }) => data),
};