# Express MVP — Auth com Sessão + MySQL

MVP de API REST com Express contendo registro, login, logout e uma rota protegida por sessão, usando MySQL tanto para armazenar usuários quanto para armazenar as sessões.

## Fluxo de autenticação

1. **Registro** (`POST /auth/register`): o usuário envia nome, email e senha. A senha é transformada em hash com `bcrypt` antes de ser salva — nunca é guardada em texto puro. Após criar o usuário, a API já inicia uma sessão automaticamente (`req.session.userId = user.id`), então o usuário fica logado assim que se registra.

2. **Login** (`POST /auth/login`): o usuário envia email e senha. A API busca o usuário pelo email, compara a senha enviada com o hash salvo usando `bcrypt.compare`. Se bater, a sessão é **regenerada** (`req.session.regenerate`) — isso troca o ID da sessão para evitar um ataque chamado *session fixation* — e então `req.session.userId` é definido.

3. **Sessão via cookie**: a cada resposta de login/registro bem-sucedida, o Express envia um cookie (`connect.sid`) para o navegador/cliente. Esse cookie é um ID de sessão; os dados da sessão em si (como o `userId`) ficam guardados no MySQL, na tabela `sessions` (criada automaticamente pelo `express-mysql-session`). Nas próximas requisições, o cliente reenvia esse cookie, e o Express recupera a sessão correspondente no banco.

4. **Rota protegida** (`GET /api/profile`): antes de chegar no handler da rota, passa pelo middleware `isAuthenticated`, que verifica se `req.session.userId` existe. Se não existir (sem cookie válido ou sessão expirada), retorna `401`. Se existir, busca os dados do usuário no banco e devolve.

5. **Logout** (`POST /auth/logout`): destrói a sessão no MySQL (`req.session.destroy`) e limpa o cookie no cliente (`res.clearCookie`). A partir daí, o cookie antigo não corresponde a nenhuma sessão válida.

```
Cliente                          API                              MySQL
  │                               │                                 │
  │  POST /auth/register          │                                 │
  │ ─────────────────────────────>│  hash da senha (bcrypt)         │
  │                               │ ───────────────────────────────>│ INSERT INTO users
  │                               │  cria sessão (userId)           │
  │                               │ ───────────────────────────────>│ INSERT INTO sessions
  │ <───────────────────────────── │  Set-Cookie: connect.sid=...   │
  │  201 Created + dados do user  │                                 │
  │                               │                                 │
  │  GET /api/profile             │                                 │
  │  Cookie: connect.sid=...      │                                 │
  │ ─────────────────────────────>│  busca sessão pelo cookie       │
  │                               │ ───────────────────────────────>│ SELECT FROM sessions
  │                               │  busca usuário pelo userId      │
  │                               │ ───────────────────────────────>│ SELECT FROM users
  │ <───────────────────────────── │  200 OK + dados do user         │
```

## Endpoints

### `POST /auth/register`

Cria um novo usuário e já inicia a sessão.

**Payload de requisição:**
```json
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "password": "senha123"
}
```

**Resposta — 201 Created:**
```json
{
  "message": "Usuário registrado com sucesso.",
  "user": {
    "id": 1,
    "name": "Maria Silva",
    "email": "maria@example.com"
  }
}
```

**Erros possíveis:**
| Código | Motivo | Corpo da resposta |
|--------|--------|--------------------|
| 400 | Campos faltando, senha curta (<6 chars) ou email inválido | `{ "error": "..." }` |
| 409 | Email já cadastrado | `{ "error": "Este email já está cadastrado." }` |
| 500 | Erro interno / falha no banco | `{ "error": "Erro interno ao registrar usuário." }` |

---

### `POST /auth/login`

Autentica o usuário e cria uma nova sessão.

**Payload de requisição:**
```json
{
  "email": "maria@example.com",
  "password": "senha123"
}
```

**Resposta — 200 OK:**
```json
{
  "message": "Login realizado com sucesso.",
  "user": {
    "id": 1,
    "name": "Maria Silva",
    "email": "maria@example.com"
  }
}
```

**Erros possíveis:**
| Código | Motivo | Corpo da resposta |
|--------|--------|--------------------|
| 400 | Email ou senha ausentes | `{ "error": "Email e senha são obrigatórios." }` |
| 401 | Email não encontrado ou senha incorreta | `{ "error": "Email ou senha inválidos." }` |
| 500 | Erro interno / falha no banco | `{ "error": "Erro interno ao fazer login." }` |

---

### `POST /auth/logout`

Encerra a sessão atual do usuário.

**Payload de requisição:** nenhum (usa o cookie de sessão automaticamente).

**Resposta — 200 OK:**
```json
{
  "message": "Logout realizado com sucesso."
}
```

**Erros possíveis:**
| Código | Motivo | Corpo da resposta |
|--------|--------|--------------------|
| 500 | Erro ao destruir a sessão | `{ "error": "Erro ao encerrar sessão." }` |

---

### `GET /api/profile` 🔒 (rota protegida)

Retorna os dados do usuário autenticado. Exige sessão válida (middleware `isAuthenticated`).

**Payload de requisição:** nenhum (usa o cookie de sessão automaticamente).

**Resposta — 200 OK:**
```json
{
  "user": {
    "id": 1,
    "name": "Maria Silva",
    "email": "maria@example.com",
    "created_at": "2026-07-07T12:00:00.000Z"
  }
}
```

**Erros possíveis:**
| Código | Motivo | Corpo da resposta |
|--------|--------|--------------------|
| 401 | Sem sessão válida (não logado) | `{ "error": "Não autenticado. Faça login para continuar." }` |
| 404 | Usuário da sessão não existe mais no banco | `{ "error": "Usuário não encontrado." }` |
| 500 | Erro interno / falha no banco | `{ "error": "Erro interno." }` |

---

### `GET /`

Rota de health check simples, sem autenticação.

**Resposta — 200 OK:**
```json
{
  "status": "ok",
  "message": "API rodando."
}
```

## Instalação e execução

```bash
# 1. Instalar dependências
npm install

# 2. Criar banco e tabela de usuários
mysql -u root -p < schema.sql

# 3. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env com suas credenciais reais

# 4. Rodar
npm start
# ou, em desenvolvimento:
npm run dev
```

Ao subir, você deve ver no console:
```
✅ MySQL conectado com sucesso em localhost:3306/express_mvp
Servidor rodando em http://localhost:3000
```

## Testando com curl

```bash
# Registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"name":"Maria","email":"maria@example.com","password":"senha123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"maria@example.com","password":"senha123"}'

# Rota protegida (reenvia o cookie salvo)
curl http://localhost:3000/api/profile -b cookies.txt

# Logout
curl -X POST http://localhost:3000/auth/logout -b cookies.txt
```

## Estrutura do projeto

```
express-mvp/
├── config/
│   └── db.js               # Pool de conexões MySQL + debug de conexão
├── middleware/
│   └── authMiddleware.js   # Middleware isAuthenticated
├── models/
│   └── userModel.js        # Queries de usuário
├── routes/
│   ├── authRoutes.js       # /auth/register, /auth/login, /auth/logout
│   └── protectedRoutes.js  # /api/profile (protegida)
├── schema.sql               # Script de criação do banco/tabela
├── server.js                 # Ponto de entrada da aplicação
├── .env.example
└── .gitignore
```

## Notas de segurança para evoluir além do MVP

- Em produção, sirva atrás de HTTPS e mantenha `cookie.secure = true` (já ligado ao `NODE_ENV=production`).
- Adicione rate limiting nas rotas de login/registro (ex.: `express-rate-limit`) para mitigar força bruta.
- Adicione validação mais robusta de entrada (ex.: `zod` ou `joi`).
- Adicione CORS (`cors`) se o frontend rodar em outra origem, com `credentials: true`.