const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(email, name, token) {

    const verificationUrl =
        `${process.env.APP_URL}/auth/verify-email?token=${token}`;

    console.log("📨 Enviando e-mail para:", email);
    console.log("🔗 Link:", verificationUrl);

    try {

        const { data, error } = await resend.emails.send({

            from: process.env.EMAIL_FROM,

            to: [email],

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

        if (error) {
            console.error("❌ Erro retornado pelo Resend:");
            console.error(error);
            throw new Error(error.message || "Erro ao enviar e-mail.");
        }

        console.log("✅ E-mail enviado com sucesso!");
        console.log("📨 ID:", data.id);

        return data;

    } catch (error) {

        console.error("❌ Erro ao enviar e-mail:");
        console.error(error);

        throw error;
    }
}

module.exports = {
    sendVerificationEmail
};