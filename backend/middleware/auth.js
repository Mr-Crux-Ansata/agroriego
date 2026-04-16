const jwt = require('jsonwebtoken');
require('dotenv').config();

function verificarToken(req, res, next) {
    const auth = req.headers.authorization;

    if (!auth) {
        return res.status(401).json({ error: 'Sin token' });
    }

    try {
        const token = auth.split(' ')[1];
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido' });
    }
}

module.exports = { verificarToken };