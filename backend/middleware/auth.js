const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    const header = req.headers.authorization;

    if (!header) {
        return res.status(401).json({ error: 'No token' });
    }

    const parts = header.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Formato de token inválido' });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

module.exports = { verificarToken };