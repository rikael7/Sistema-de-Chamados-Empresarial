const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("./dbpg");

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },

        async (accessToken, refreshToken, profile, done) => {

            try {

                const googleId = profile.id;
                const nome = profile.displayName;
                const email = profile.emails?.[0]?.value;
                const foto = profile.photos?.[0]?.value;

                const resultado = await pool.query(
                    "SELECT * FROM usuarios WHERE google_id = $1",
                    [googleId]
                );

                if (resultado.rows.length > 0) {

                    return done(null, resultado.rows[0]);

                }

                const novoUsuario = await pool.query(
                    `INSERT INTO usuarios
                    (google_id, nome, email, foto)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *`,
                    [googleId, nome, email, foto]
                );

                return done(null, novoUsuario.rows[0]);

            } catch (erro) {

                return done(erro);

            }
        }
    )
);

passport.serializeUser((usuario, done) => {
    done(null, usuario.id);
});

passport.deserializeUser(async (id, done) => {

    try {

        const resultado = await pool.query(
            "SELECT * FROM usuarios WHERE id = $1",
            [id]
        );

        done(null, resultado.rows[0]);

    } catch (erro) {

        done(erro);

    }
});

module.exports = passport;