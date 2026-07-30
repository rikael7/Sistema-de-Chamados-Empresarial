
Plataforma web construída em **Node.js/Express** com **PostgreSQL**, composta por um módulo de **autenticação/gerenciamento** 
o projeto é um **sistema de chamados (OS)** com anexos, comentários e painel administrativo.

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológica](#stack-tecnológica)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Rotas da API](#rotas-da-api)
- [Segurança](#segurança)
- [Pontos de atenção conhecidos](#pontos-de-atenção-conhecidos)
- [Licença](#licença)

---

## Visão geral

O projeto reúne dois módulos que compartilham a mesma base de usuários:

1. **Autenticação** — cadastro/login de usuários, Sistema de gerenciamento somente para admins .
2. **Sistema de Chamados** — abertura de chamados (OS) com anexos e comentários, painel administrativo para alterar prioridade/status e histórico de acompanhamento.

---

## Funcionalidades

**Autenticação**
- Registro e login com sessão (`express-session`)
- Hash de senha com `bcrypt`
- Regeneração de sessão no login (proteção contra *session fixation*)
- Middleware de rota protegida (`isAuthenticated`) e de admin (`admin`)
- Bloqueio de acesso a `/login` e `/register` para quem já está logado (`authtrue`)

**Validação e sanitização**
- `express-validator` para regras de nome, email e senha
- Bloqueio de e-mails temporários/descartáveis
- Verificação de domínio de e-mail via consulta MX/DNS
- Sanitização de campos string contra XSS (`xss`) antes das validações

**Upload de arquivos**
- Upload de vídeos (admin) via `multer` com streaming (suporte a `Range` para reprodução)
- Upload de arquivos comprimidos/documentos (ZIP, RAR, PDF, imagens) direto para o Supabase Storage

**Sistema de chamados**
- Criação de chamado com até 5 anexos
- Numeração automática (`OS-0001`, `OS-0002`, ...)
- Listagem com filtros (`status`, `categoria`, `prioridade`)
- Detalhe do chamado com anexos e comentários
- Atualização de status e prioridade (restrito a admin)
- Exclusão de chamado em cascata (remove anexos e comentários)

**Interface**
- Páginas de login, registro, upload e 404 com HTML/CSS próprios

---

## Stack tecnológica

| Camada          | Tecnologia                          |
|-----------------|--------------------------------------|
| Runtime         | Node.js + Express                    |
| Banco de dados  | PostgreSQL (`pg`)                    |
| Sessão          | `express-session`                    |
| Senhas          | `bcrypt`                             |
| Validação       | `express-validator`                  |
| Sanitização     | `xss`                                |
| Upload local    | `multer` (disk storage)              |
| Storage externo | Supabase Storage                     |
| Front-end       | HTML + CSS + JavaScript vanilla      |

---

## Estrutura do projeto

```
.
├── config/
│   ├── dbpg.js               # pool de conexão PostgreSQL
│   └── supabase.js           # client do Supabase
├── controllers/
│   └── chamadosController.js
├── middleware/
│   ├── authMiddleware.js     # isAuthenticated / admin
│   ├── authtrue.js           # bloqueia acesso logado a login/registro
│   ├── sanitize.js           # sanitizeBody (anti-XSS)
│   └── validators.js         # regras de registro/login
├── models/
│   └── userModel.js          # usuários + upload de vídeo
├── routes/
│   ├── authRoutes.js         # /auth/register, /auth/login, /auth/logout
│   ├── chamados.js           # /api/chamados
│   ├── protectedRoutes.js    # /profile, /avatar, /videos, /stream
│   └── publicupload.js       # /api/upload/zip (Supabase)
├── public/
│   ├── login.html
│   ├── register.html
│   ├── upload.html
│   ├── dashboard.html
│   ├── admin.html
│   └── 404.html
└── schema.sql                 # script de criação das tabelas
```

---

## Pré-requisitos

- Node.js 18+
- PostgreSQL 13+
- Conta/projeto no Supabase (para o upload de arquivos compactados)

---

## Instalação

```bash
git clone <url-do-repositorio>
cd Sistema de Chamados
npm install
```

Dependências esperadas (adicione ao `package.json` caso ainda não estejam listadas):

```bash
npm install express express-session pg bcrypt multer express-validator xss dotenv @supabase/supabase-js disposable-email-domains-js
```

---

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Servidor
PORT=3000
SESSION_SECRET=troque_por_um_valor_aleatorio_seguro

# PostgreSQL
DATABASE_URL=postgres://usuario:senha@localhost:5432/insidebox

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_service_role_ou_anon_key
```

---

## Banco de dados

O script completo de criação das tabelas está em [`schema.sql`](./schema.sql). Para aplicar:

```bash
psql -U seu_usuario -d insidebox -f schema.sql
```

### Tabelas

| Tabela                | Descrição                                              |
|------------------------|---------------------------------------------------------|
| `users`                | Usuários, credenciais e flag de admin (`adm`)           |
| `videos`               | Vídeos enviados pelo admin                              |
| `chamados`             | Chamados/OS (título, categoria, status, prioridade)     |
| `chamado_anexos`       | Arquivos anexados a um chamado                          |
| `chamado_comentarios`  | Comentários/acompanhamento de um chamado                |

Todas as chaves estrangeiras usam `ON DELETE CASCADE` (exceto `autor_id` em `chamado_comentarios`, que usa `SET NULL`), e as tabelas `users` e `chamados` possuem gatilhos (`trigger`) para atualizar automaticamente `updated_at` / `atualizado_em`.

---

## Rotas da API

### Autenticação (`/auth`)
| Método | Rota              | Descrição                        |
|--------|-------------------|------------------------------------|
| POST   | `/auth/register`  | Cria uma conta                     |
| POST   | `/auth/login`     | Autentica e cria sessão            |
| POST   | `/auth/logout`    | Encerra a sessão                   |

### Usuário (protegidas por `isAuthenticated`)
| Método | Rota              | Descrição                          |
|--------|-------------------|--------------------------------------|
| GET    | `/profile`        | Retorna dados do usuário logado      |
| POST   | `/avatar`         | Atualiza o avatar (máx. 2MB)         |
| GET    | `/stream/:video`  | Streaming de vídeo (suporte a Range) |

### Admin (protegidas por `isAuthenticated` + `admin`)
| Método | Rota                        | Descrição                       |
|--------|------------------------------|-----------------------------------|
| POST   | `/videos`                    | Upload de vídeo                  |
| PATCH  | `/api/chamados/:id/status`   | Atualiza status do chamado       |
| DELETE | `/api/chamados/:id`          | Exclui um chamado                |

### Chamados (`/api/chamados`)
| Método | Rota                             | Descrição                               |
|--------|-----------------------------------|--------------------------------------------|
| POST   | `/api/chamados`                   | Cria chamado (até 5 anexos)                |
| GET    | `/api/chamados`                   | Lista chamados (filtros por query string)  |
| GET    | `/api/chamados/:id`                | Detalhe (com anexos e comentários)         |
| POST   | `/api/chamados/:id/anexos`         | Adiciona anexos a um chamado existente     |
| POST   | `/api/chamados/:id/comentarios`    | Adiciona comentário de acompanhamento      |

### Upload público
| Método | Rota                | Descrição                                        |
|--------|----------------------|----------------------------------------------------|
| POST   | `/api/upload/zip`   | Envia ZIP/RAR/PDF/imagem para o Supabase Storage    |

---

## Segurança

- Senhas armazenadas com **bcrypt** (nunca em texto puro)
- Sessão regenerada no login para mitigar *session fixation*
- Sanitização de entradas contra XSS antes de qualquer persistência
- Whitelist de caracteres no nome (evita injeção de tags/scripts)
- Bloqueio de e-mails temporários/descartáveis e checagem de domínio válido (MX)
- Limite de tamanho de senha (8–15 caracteres) alinhado ao truncamento do bcrypt em 72 bytes
- `usuario_id` do chamado sempre extraído da sessão (`req.session.userId`), nunca do corpo da requisição — evita que o cliente forje o autor
- Validação de tipo MIME e extensão no upload de avatar

---

## Pontos de atenção conhecidos

Estes itens foram observados no código enviado e vale revisar antes de ir para produção:

- **`chamados.js`** usa `path.extname(...)` na configuração do `multer.diskStorage`, mas o módulo `path` não é importado no arquivo — adicione `const path = require('path');` no topo.
- **`protectedRoutes.js`**, na rota `/avatar`, o `UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?` usa a sintaxe de placeholders do MySQL (`?`). Como o projeto está em PostgreSQL, o correto é `$1`, `$2` (como usado no restante do `userModel.js`).
- **`adminController.js`** enviado está vazio — o `adminController` referenciado em `protectedRoutes.js` na prática aponta para `userModel.js` (`uploadVideo`); confirme se essa é a intenção ou se falta implementar o controller dedicado.
- **`authMiddleware.js`**: no bloco `admin`, quando o usuário não é admin, a rota é redirecionada (`res.redirect('/acesso-negado')`) em vez de retornar `403 JSON` — ok para páginas HTML, mas pode quebrar chamadas de API feitas via `fetch`.
- **Tabela `chamados`**: `numero` é preenchido em um segundo `UPDATE` logo após o `INSERT`; se preferir atomicidade total, considere uma *sequence* dedicada ou um trigger `AFTER INSERT`.

---

## Licença

Distribuído sob licença de sua escolha (ex.: MIT). Adicione um arquivo `LICENSE` na raiz do repositório.