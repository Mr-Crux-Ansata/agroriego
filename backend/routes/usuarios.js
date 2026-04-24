const router = require('express').Router();
const { getPool, sql } = require('../db');
const { verificarToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { enviarCorreo } = require('../utils/email');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '..', 'uploads', 'perfiles');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ext || '.jpg';
        cb(null, `perfil_${req.user.id_usuario}_${Date.now()}${safeExt}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten imágenes'));
        }
        cb(null, true);
    },
});

const uploadSingleImage = (req, res, next) => {
    upload.single('imagen')(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'La imagen supera el tamaño máximo de 2MB' });
            }
            return res.status(400).json({ error: `Error de carga: ${err.message}` });
        }

        return res.status(400).json({ error: err.message || 'Archivo inválido' });
    });
};

async function ensureUsuarioProfileColumns(pool) {
    await pool.request().query(`
        IF NOT EXISTS (
            SELECT *
            FROM sys.columns
            WHERE object_id = OBJECT_ID('Usuario')
              AND name = 'telefono'
        )
        BEGIN
            ALTER TABLE Usuario ADD telefono VARCHAR(20) NULL;
        END

        IF NOT EXISTS (
            SELECT *
            FROM sys.columns
            WHERE object_id = OBJECT_ID('Usuario')
              AND name = 'foto_perfil_url'
        )
        BEGIN
            ALTER TABLE Usuario ADD foto_perfil_url VARCHAR(255) NULL;
        END
    `);
}

// Obtener usuarios
router.get('/', verificarToken, async (req, res) => {
    try {
        const pool = await getPool();
        await ensureUsuarioProfileColumns(pool);
        const result = await pool.request()
            .query('SELECT id_usuario, email, nombre_completo, rol, activo, foto_perfil_url FROM Usuario');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/perfil', verificarToken, async (req, res) => {
    try {
        const pool = await getPool();
        await ensureUsuarioProfileColumns(pool);
        const result = await pool.request()
            .input('id', sql.Int, req.user.id_usuario)
            .query(`
                SELECT id_usuario, email, nombre_completo, rol, telefono, foto_perfil_url
                FROM Usuario
                WHERE id_usuario = @id
            `);

        const perfil = result.recordset[0];
        if (!perfil) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ perfil });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/perfil', verificarToken, async (req, res) => {
    const { nombre_completo, telefono } = req.body;

    try {
        const pool = await getPool();
        await ensureUsuarioProfileColumns(pool);
        const result = await pool.request()
            .input('id', sql.Int, req.user.id_usuario)
            .input('nombre', sql.VarChar, nombre_completo || null)
            .input('telefono', sql.VarChar, telefono || null)
            .query(`
                UPDATE Usuario
                SET nombre_completo = COALESCE(@nombre, nombre_completo),
                    telefono = @telefono
                WHERE id_usuario = @id;

                SELECT id_usuario, email, nombre_completo, rol, telefono, foto_perfil_url
                FROM Usuario
                WHERE id_usuario = @id;
            `);

        res.json({ perfil: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/perfil/foto', verificarToken, uploadSingleImage, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ninguna imagen' });
        }

        const fotoUrl = `/uploads/perfiles/${req.file.filename}`;
        const pool = await getPool();
        await ensureUsuarioProfileColumns(pool);

        const currentPhotoResult = await pool.request()
            .input('id', sql.Int, req.user.id_usuario)
            .query(`
                SELECT foto_perfil_url
                FROM Usuario
                WHERE id_usuario = @id
            `);

        const fotoAnteriorUrl = currentPhotoResult.recordset[0]?.foto_perfil_url || null;

        const result = await pool.request()
            .input('id', sql.Int, req.user.id_usuario)
            .input('foto', sql.VarChar, fotoUrl)
            .query(`
                UPDATE Usuario
                SET foto_perfil_url = @foto
                WHERE id_usuario = @id;

                SELECT id_usuario, email, nombre_completo, rol, telefono, foto_perfil_url
                FROM Usuario
                WHERE id_usuario = @id;
            `);

        if (fotoAnteriorUrl && fotoAnteriorUrl !== fotoUrl) {
            const relativePath = fotoAnteriorUrl.replace(/^\/+/, '').replace(/\//g, path.sep);
            const absolutePath = path.join(__dirname, '..', relativePath);

            if (absolutePath.startsWith(uploadDir) && fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        res.json({ foto_perfil_url: fotoUrl, perfil: result.recordset[0] });
    } catch (err) {
        console.error(err);
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: err.message || 'Error al subir imagen' });
    }
});


router.post('/', verificarToken, async (req, res) => {
    const { email, nombre_completo, rol } = req.body;


    if (req.user.rol !== 'Administrador Sistema') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const pool = await getPool();

        const existe = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT id_usuario FROM Usuario WHERE email = @email');

        if (existe.recordset.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const rolesPermitidos = [
            'Administrador Sistema',
            'Administrador Predio',
            'Operador Campo'
        ];

        if (!rolesPermitidos.includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }


        // No hashear password aquí, se hará en activar
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .input('pass', sql.VarChar, '') // password vacío temporal
            .input('nombre', sql.VarChar, nombre_completo)
            .input('rol', sql.VarChar, rol)
            .input('activo', sql.Bit, 0)
            .query(`INSERT INTO Usuario (email, password_hash, nombre_completo, rol, activo)
                    OUTPUT INSERTED.id_usuario
                    VALUES (@email, @pass, @nombre, @rol, @activo)`);

        const nuevoUsuarioId = result.recordset[0].id_usuario;

        // generar token temporal
        const token = jwt.sign(
            { id_usuario: nuevoUsuarioId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Cambiado a 24 horas para testing
        );

        // enviar correo
        try {
            await enviarCorreo(email, token);
        } catch (emailError) {
            // Si falla el envío, eliminar el usuario insertado
            await pool.request()
                .input('id', sql.Int, nuevoUsuarioId)
                .query('DELETE FROM Usuario WHERE id_usuario = @id');
            throw new Error('Error al enviar el correo de activación');
        }

        res.json({ ok: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/perfil/password', verificarToken, async (req, res) => {
    const { actual, nueva } = req.body;

    if (!actual || !nueva) {
        return res.status(400).json({ error: 'Debes enviar la contraseña actual y la nueva' });
    }

    if (nueva.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.Int, req.user.id_usuario)
            .query('SELECT password_hash FROM Usuario WHERE id_usuario = @id');

        const usuario = result.recordset[0];
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const bcrypt = require('bcryptjs');
        const valida = await bcrypt.compare(actual, usuario.password_hash);
        if (!valida) {
            return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
        }

        const nuevoHash = await bcrypt.hash(nueva, 10);
        await pool.request()
            .input('id', sql.Int, req.user.id_usuario)
            .input('hash', sql.VarChar, nuevoHash)
            .query('UPDATE Usuario SET password_hash = @hash WHERE id_usuario = @id');

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Eliminar usuario
router.delete('/:id', verificarToken, async (req, res) => {
    const { id } = req.params;

    if (req.user.rol !== 'Administrador Sistema') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.Int, parseInt(id, 10))
            .query('DELETE FROM Usuario WHERE id_usuario = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

