require("dotenv").config();
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
const path = require("path");
// ==========
// GOOGLE AUTENTICAÇÃO
// =============
const passport = require("./config/passport");
//  --------------------

const app = express();
const PORT = process.env.PORT || 3000;

// ===============
// RATE LIMIT
// ===============
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 100, // máximo de 100 requisições por IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Muitas requisições. Tente novamente mais tarde.",
  },
});
// Aplica em TODAS as rotas
app.use(limiter);
//  --------------------

// =================
// IMPORT MIDDLEWARES
// =============
const { sanitizeBody, sanitizeQuery } = require("./middleware/sanitize");
const { isAuthenticated, admin } = require("./middleware/authMiddleware");
// middleware para bloquear usuario autenticado de entrar na rota get de register e em login
const authtrue = require("./middleware/authtrue");
//  --------------------

// =================
// IMPORT ROTAS
// =============
const authRoutes = require("./routes/authRoutes");
const publicupload = require("./routes/publicupload");
const protectedRoutes = require("./routes/protectedRoutes");
const chamados = require("./routes/chamados");
//  --------------------

// =================
// WEBSOCKET
// =============
const http = require("http");
const server = http.createServer(app);
//  --------------------

// =================
// POOL POSTGREE
// =============
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
//  --------------------

// =================
// BLOQUEAR PAYLOAD GIGANTE
// =============
app.use(express.json({ limit: "100kb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "100kb",
  }),
);
//  --------------------

// =================
// ENVIAR FRONTEND
// =============
app.use(express.static(path.join(__dirname, "public")));
//  --------------------

// =================
// SANITIZAÇÃO
// =============
app.use(sanitizeBody);
app.use(sanitizeQuery);
//  --------------------

// =================
// SESSÕES POSTGRES
// =============
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),

    key: "connect.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    },
  }),
);
//  --------------------

// ==========================****************************=============================
// ADICIONE AS FEATS ABAIXO
// ==========================****************************=============================

// =======================
// LOGIN COM GOOGLE
// ======================
// const session = require("express-session");
app.use(passport.initialize());
app.use(passport.session());

// manda para o google
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

// google retorna (webhook)
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    req.session.userId = req.user.id;

    req.session.save((err) => {
      if (err) {
        console.error("Erro ao salvar sessão:", err);
        return res.redirect("/login");
      }

      res.redirect("/");
    });
  },
);

// -------------

// =================
// FRONTEND PRIVADO
// =============

app.get("/", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

app.get("/admin", isAuthenticated, admin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin.html"));
});

//  --------------------

// =================
// FRONTEND PUBLICO
// =============

app.get("/login", authtrue, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/register", authtrue, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.get("/404", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "404.html"));
});

//  --------------------

// ===============
// ROTAS API
// ===============
app.use("/auth", authRoutes);
app.use("/api", chamados);
// -------------

// ===============
// ERRO GENERICO
// ===============
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({
    error: "Erro interno do servidor.",
  });
});

//  --------------------

// ===============
// NÃO ACHOU ROTAS
// Middleware 404 (sempre por último pois o node le de cima para baixo as rotas, caso não encontre nada vai cair nessa)
// ===============
app.use((req, res) => {
  res.redirect("/404");
});

//  --------------------

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
// ================
