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

module.exports = { enviarCorreo };