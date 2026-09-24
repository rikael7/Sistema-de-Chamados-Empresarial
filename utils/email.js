const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,

    family: 4,

    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify()
    .then(() => {
        console.log("=================================");
        console.log("✅ SMTP FUNCIONANDO");
        console.log("=================================");
    })
    .catch((err) => {
        console.error("=================================");
        console.error("❌ ERRO SMTP");
        console.error(err);
        console.error("=================================");
    });

async function sendVerificationEmail(email, name, token) {

    const verificationUrl =
        `${process.env.APP_URL}/auth/verify-email?token=${token}`;

    console.log("📨 Enviando e-mail para:", email);

    const info = await transporter.sendMail({
        from: `"Sistema de Chamados" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Confirme seu e-mail",

        html: `
            <h2>Olá, ${name}!</h2>

            <p>
                Seu cadastro foi iniciado.
            </p>

            <p>
                Clique abaixo para confirmar seu e-mail:
            </p>

            <p>
                <a href="${verificationUrl}">
                    Confirmar e-mail
                </a>
            </p>

            <p>
                Este link expira em 30 minutos.
            </p>
        `
    });

    console.log("✅ E-mail enviado:", info.messageId);

    return info;
}

module.exports = {
    sendVerificationEmail
};