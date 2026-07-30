require('dotenv').config();

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const { sanitizeBody } = require('./middleware/sanitize');
const { isAuthenticated, admin } = require('./middleware/authMiddleware');

// middleware para bloquear usuario autenticado de entrar na rota get de register e em login
const authtrue  = require('./middleware/authtrue');

const authRoutes = require('./routes/authRoutes');
const publicupload = require('./routes/publicupload');
const protectedRoutes = require('./routes/protectedRoutes');
const chamados = require('./routes/chamados');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// =================
// websocket
// =============
const http = require ('http');

const { initDb } = require('./config/dbpg');


const server = http.createServer(app);
// setupWebSocket(server)

// ============



// PostgreSQL pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


// Middlewares
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '100kb' 
}));

app.use(express.static(path.join(__dirname, 'public')));


// Sanitização
app.use(sanitizeBody);


// Sessões PostgreSQL
app.use(
    session({
        store: new pgSession({
            pool: pool,
            tableName: 'sessions',
            createTableIfMissing: true
        }),

        key: 'connect.sid',

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure: process.env.NODE_ENV === 'production',

            maxAge: 1000 * 60 * 60 * 24 // 1 dia
        }
    })
);


// FRONT END PRIVADO

app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/admin', isAuthenticated, admin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});



// FRONT END PÚBLICO

app.get('/login', authtrue, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});



app.get('/register', authtrue, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});


app.get('/404', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', '404.html'));
});



// ROTAS API

app.use('/auth', authRoutes);
app.use('/api', publicupload);
app.use('/api', protectedRoutes);
app.use('/api/profile', protectedRoutes);
app.use('/api', chamados);



// Erro genérico
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor.'
    });
});



// se não encontrar nenhuma rota

// Middleware 404 (sempre por último pois o node le de cima para baixo as rotas, caso não encontre nada vai cair nessa)
app.use((req, res) => {
    res.redirect("/404");
});




initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao iniciar:", err);
    process.exit(1);
  });
// ================



// 
// app.listen(PORT, () => {
//     console.log(`Servidor rodando na porta ${PORT}`);
// });