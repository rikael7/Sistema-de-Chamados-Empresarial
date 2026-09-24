const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "Gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendVerificationEmail(email, name, token) {

    const verificationUrl =
        `${process.env.APP_URL}/auth/verify-email?token=${token}`;

    await transporter.sendMail({
        from: `"Sistema de Chamados" <${process.env.EMAIL_USER}>`,

        to: email,

        subject: "Confirme seu e-mail",

        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">

                <h2>Olá, ${name}!</h2>

                <p>
                    Você iniciou um cadastro no Sistema de Chamados.
                </p>

                <p>
                    Para confirmar seu endereço de e-mail e finalizar
                    a criação da sua conta, clique no botão abaixo:
                </p>

                <p style="margin: 30px 0;">
                    <a
                        href="${verificationUrl}"
                        style="
                            background: #3b6df0;
                            color: white;
                            padding: 14px 22px;
                            text-decoration: none;
                            border-radius: 8px;
                            display: inline-block;
                        "
                    >
                        Confirmar meu e-mail
                    </a>
                </p>

                <p>
                    Este link expira em 30 minutos.
                </p>

                <p>
                    Se você não solicitou este cadastro, ignore este e-mail.
                </p>

            </div>
        `
    });
}

module.exports = {
    sendVerificationEmail
};