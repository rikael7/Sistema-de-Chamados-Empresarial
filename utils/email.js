
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },

    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
});

async function sendVerificationEmail(email, name, token) {

    const verificationUrl =
        `${process.env.APP_URL}/auth/verify-email?token=${token}`;

    console.log("📨 Enviando e-mail para:", email);
    console.log("🔗 Link:", verificationUrl);

    try {

        const info = await transporter.sendMail({

            from: `"Sistema de Chamados" <${process.env.EMAIL_USER}>`,

            to: email,

            subject: "Confirme seu e-mail",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                ">

                    <h2>Olá, ${name}!</h2>

                    <p>
                        Seu cadastro no Sistema de Chamados foi iniciado.
                    </p>

                    <p>
                        Para confirmar seu endereço de e-mail,
                        clique no botão abaixo:
                    </p>

                    <p>
                        <a
                            href="${verificationUrl}"
                            style="
                                display: inline-block;
                                padding: 12px 20px;
                                background: #2563eb;
                                color: #ffffff;
                                text-decoration: none;
                                border-radius: 6px;
                            "
                        >
                            Confirmar meu e-mail
                        </a>
                    </p>

                    <p>
                        Este link expira em <strong>30 minutos</strong>.
                    </p>

                    <p>
                        Se você não realizou este cadastro,
                        simplesmente ignore este e-mail.
                    </p>

                </div>
            `
        });

        console.log("✅ E-mail enviado com sucesso!");
        console.log("📨 Message ID:", info.messageId);

        return info;

    } catch (error) {

        console.error("❌ Erro ao enviar e-mail:");
        console.error(error);

        throw error;
    }
}

module.exports = {
    sendVerificationEmail
};

