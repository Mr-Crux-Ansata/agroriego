const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Debe ser un App Password de Gmail
    }
});

async function enviarCorreo(destino, token) {
    try {
        const link = `http://localhost:3000/activar?token=${token}`;

        const info = await transporter.sendMail({
            from: `"AgroRiego" <${process.env.EMAIL_USER}>`,
            to: destino,
            subject: 'Activar cuenta - AgroRiego',
            html: `
                <h2>Bienvenido a AgroRiego</h2>
                <p>Haz clic en el siguiente enlace para activar tu cuenta:</p>
                <a href="${link}">Activar cuenta</a>
                <p>Este enlace expirará en 1 hora.</p>
            `
        });

        console.log('Correo enviado:', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('Error enviando correo:', error);
        throw new Error('Error al enviar el correo de activación');
    }
}

async function enviarCorreoAlerta(destino, alerta) {
    try {
        const fechaTexto = alerta?.fecha
            ? new Date(alerta.fecha).toLocaleString('es-MX')
            : new Date().toLocaleString('es-MX');

        const info = await transporter.sendMail({
            from: `"AgroRiego" <${process.env.EMAIL_USER}>`,
            to: destino,
            subject: `[Alerta ${alerta?.severidad || 'Sistema'}] ${alerta?.tipo || 'Evento'}`,
            html: `
                <h2>AgroRiego - Nueva alerta</h2>
                <p><strong>Área:</strong> ${alerta?.id_area || 'N/D'}</p>
                <p><strong>Tipo:</strong> ${alerta?.tipo || 'N/D'}</p>
                <p><strong>Severidad:</strong> ${alerta?.severidad || 'N/D'}</p>
                <p><strong>Mensaje:</strong> ${alerta?.mensaje || 'Sin detalle'}</p>
                <p><strong>Fecha:</strong> ${fechaTexto}</p>
            `,
        });

        console.log('Correo de alerta enviado:', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('Error enviando correo de alerta:', error.message || error);
        throw new Error('Error al enviar correo de alerta');
    }
}

module.exports = { enviarCorreo, enviarCorreoAlerta };