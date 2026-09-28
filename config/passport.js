const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { pool } = require("./dbpg");

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },

        async (accessToken, refreshToken, profile, done) => {
            try {
                const googleId = profile.id;
                const nome = profile.displayName;
                const email = profile.emails?.[0]?.value;
                const foto = profile.photos?.[0]?.value;

                if (!email) {
                    return done(
                        new Error("O Google não retornou um endereço de email.")
                    );
                }

                // 1. Procura pelo Google ID
                const usuarioGoogle = await pool.query(
                    `
                    SELECT *
                    FROM users
                    WHERE google_id = $1
                    LIMIT 1
                    `,
                    [googleId]
                );

                if (usuarioGoogle.rows.length > 0) {
                    return done(null, usuarioGoogle.rows[0]);
                }

                // 2. Procura pelo email
                const usuarioEmail = await pool.query(
                    `
                    SELECT *
                    FROM users
                    WHERE email = $1
                    LIMIT 1
                    `,
                    [email]
                );

                if (usuarioEmail.rows.length > 0) {
                    const usuario = usuarioEmail.rows[0];

                    // Vincula a conta existente ao Google
                    const usuarioAtualizado = await pool.query(
                        `
                        UPDATE users
                        SET
                            google_id = $1,
                            foto = $2
                        WHERE id = $3
                        RETURNING *
                        `,
                        [
                            googleId,
                            foto,
                            usuario.id
                        ]
                    );

                    return done(null, usuarioAtualizado.rows[0]);
                }

                // 3. Usuário realmente novo
                const novoUsuario = await pool.query(
                    `
                    INSERT INTO users
                    (
                        google_id,
                        name,
                        email,
                        foto,
                        password_hash
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )
                    RETURNING *
                    `,
                    [
                        googleId,
                        nome,
                        email,
                        foto,
                        "GOOGLE_AUTH"
                    ]
                );

                return done(null, novoUsuario.rows[0]);

            } catch (erro) {
                return done(erro);
            }
        }
    )
);


// Serialização
passport.serializeUser((usuario, done) => {
    done(null, usuario.id);
});


// Desserialização
passport.deserializeUser(async (id, done) => {
    try {
        const resultado = await pool.query(
            `
            SELECT *
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [id]
        );

        if (resultado.rows.length === 0) {
            return done(null, false);
        }

        done(null, resultado.rows[0]);

    } catch (erro) {
        done(erro);
    }
});


module.exports = passport;