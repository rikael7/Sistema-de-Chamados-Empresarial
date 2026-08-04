# 🚀 Sistema de Chamados Empresarial

> Plataforma empresarial com sistema de chamados (OS) integrado, permitindo cadastro/login de usuários, upload de arquivos, abertura e acompanhamento de chamados, e um painel administrativo completo.

Sistema web desenvolvido em Node.js/Express, com autenticação por sessão, upload de arquivos e um módulo de chamados técnicos com anexos, comentários, prioridades e status de atendimento.

---

# 📌 Sobre o Projeto

O Sistema de chamados nasceu com um sistema robusto de autenticação de usuarios visando a segurança e evoluiu para incluir um sistema de chamados/OS. A aplicação permite que usuários se cadastrem, façam login, enviem arquivos e abram chamados; enquanto administradires alteram prioridades e o status de cada atendimento.

## Funcionalidades

- ✅ Cadastro e autenticação de usuários (sessão + bcrypt)
- ✅ Sistema de login com regeneração de sessão (anti session-fixation)
- ✅ Controle de permissões (usuário comum x admin)
- ✅ Área administrativa (upload de vídeo, gestão de chamados)
- ✅ Criação e gerenciamento de chamados (OS) com prioridade e status
- ✅ Upload e armazenamento de arquivos ( anexos, vídeos, ZIP/PDF via Supabase)
- ✅ Validação de dados (nome, e-mail, senha, domínio MX)
- ✅ Sanitização anti-XSS em todas as entradas de texto
- ✅ Integração com banco de dados PostgreSQL

---

# 🖥️ Demonstração



Exemplo:

## Tela do Login/Register/Rota inexistente
![Telas](docs/telas.PNG)

## Tela do usuário 
![Tela de User](./docs/dashboarduser.PNG)

## Tela do admin 
![Tela de Admin](./docs/dashboardadmin.PNG)



---

# 🏗️ Arquitetura do Projeto

```
Usuário
   |
   ↓
Frontend (login, registro, upload, dashboard, admin)
   |
   ↓
API Backend (Express)
   |
   ├── Middlewares (auth, admin, sanitize, validators)
   |
   ├── Banco de Dados (PostgreSQL)
   |      ├── users
   |      ├── videos
   |      ├── chamados
   |      ├── chamado_anexos
   |      └── chamado_comentarios
   |
   └── Armazenamento de Arquivos
          ├── Disco local (multer) — avatares, vídeos, anexos de chamados
          └── Supabase Storage — ZIP/RAR/PDF/imagens
```

---

# 🛠️ Tecnologias Utilizadas

## Backend

- Node.js
- Express.js
- PostgreSQL (`pg`)
- Express Session
- Middleware de autenticação (`isAuthenticated`, `admin`, `authtrue`)
- Upload de arquivos (`multer`)
- Validação (`express-validator`)
- Sanitização anti-XSS (`xss`)
- Bcrypt para hash de senha
- Supabase Storage (SDK `@supabase/supabase-js`)

## Frontend

- HTML5
- CSS3
- JavaScript (vanilla)

## Ferramentas

- Git
- GitHub
- VS Code
- Postman

## Hospedagem

- Render / VPS / Cloud

---

# 📂 Estrutura de Pastas

```
InsideBox
│
├── backend
│   │
│   ├── controllers
│   │   └── chamadosController.js
│   │
│   ├── models
│   │   └── userModel.js
│   │
│   ├── routes
│   │   ├── authRoutes.js
│   │   ├── chamados.js
│   │   ├── protectedRoutes.js
│   │   └── publicupload.js
│   │
│   ├── middleware
│   │   ├── authMiddleware.js
│   │   ├── authtrue.js
│   │   ├── sanitize.js
│   │   └── validators.js
│   │
│   ├── config
│   │   ├── dbpg.js
│   │   └── supabase.js
│   │
│   ├── database
│   │   └── schema.sql
│   │
│   ├── uploads
│   └── server.js
│
├── frontend
│   │
│   ├── pages
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── upload.html
│   │   ├── dashboard.html
│   │   ├── admin.html
│   │   └── 404.html
│   │
│   ├── css
│   └── javascript
│
├── .env
├── package.json
└── README.md
```

---

# ⚙️ Instalação

## Pré-requisitos

Antes de iniciar, tenha instalado:

- Node.js 18+
- Git
- PostgreSQL 13+ configurado
- Conta/projeto no Supabase (para upload de ZIP/RAR/PDF)

---

## Clonar o projeto

```bash
git clone https://github.com/usuario/Sistema-de-Chamados-Empresarial.git
```

Acesse a pasta:

```bash
cd Sistema-de-Chamados-Empresarial
```

---

## Instalar dependências

```bash
npm install
```

Dependências principais usadas no projeto:

```bash
npm install express express-session pg bcrypt multer express-validator xss dotenv @supabase/supabase-js disposable-email-domains-js
```

---

# 🔐 Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000

DATABASE_URL=postgres://usuario:senha@localhost:5432/sistema-de-chamados

SESSION_SECRET=sua_chave_secreta

STORAGE_URL=https://seu-projeto.supabase.co
STORAGE_KEY=sua_service_role_ou_anon_key
```

---

# 🗄️ Banco de Dados

O script completo de criação de tabelas está em [`database/schema.sql`](./schema.sql). Para aplicar:

```bash
psql -U seu_usuario -d insidebox -f schema.sql
```

## Tabelas

| Tabela                | Descrição                                              |
|------------------------|---------------------------------------------------------|
| `users`                | Usuários, credenciais e flag de admin (`adm`)           |
| `videos`               | Vídeos enviados pelo admin                              |
| `chamados`             | Chamados/OS (título, categoria, status, prioridade)     |
| `chamado_anexos`       | Arquivos anexados a um chamado                          |
| `chamado_comentarios`  | Comentários/acompanhamento de um chamado                |

Todas as chaves estrangeiras usam `ON DELETE CASCADE` (exceto `autor_id` em `chamado_comentarios`, que usa `SET NULL`). As tabelas `users` e `chamados` possuem *triggers* que atualizam automaticamente `updated_at` / `atualizado_em`.

---

# ▶️ Executando o Projeto

Modo desenvolvimento:

```bash
npm run dev
```

ou:

```bash
npm start
```

Servidor disponível em:

```
http://localhost:3000
```

---

# 📚 Documentação da API

## Autenticação

### Criar usuário

```
POST /auth/register
```

Exemplo de envio:

```json
{
  "name": "Usuário Teste",
  "email": "usuario@email.com",
  "password": "Senha123"
}
```

---

### Login

```
POST /auth/login
```

Exemplo de envio:

```json
{
  "email": "usuario@email.com",
  "password": "Senha123"
}
```

Resposta:

```json
{
  "message": "Login realizado com sucesso.",
  "user": { "id": 1, "name": "Usuário Teste", "email": "usuario@email.com" }
}
```

---

### Logout

```
POST /auth/logout
```

---

## Usuário (rotas protegidas)

| Método | Rota              | Descrição                          |
|--------|-------------------|--------------------------------------|
| GET    | `/profile`        | Retorna dados do usuário logado      |
| POST   | `/avatar`         | Atualiza o avatar (máx. 2MB)         |
| GET    | `/stream/:video`  | Streaming de vídeo (suporte a Range) |

---

## Admin (rotas protegidas + permissão de admin)

| Método | Rota                        | Descrição                       |
|--------|------------------------------|-----------------------------------|
| POST   | `/videos`                    | Upload de vídeo                  |
| PATCH  | `/api/chamados/:id/status`   | Atualiza status do chamado       |
| DELETE | `/api/chamados/:id`          | Exclui um chamado                |

---

## Chamados

### Criar chamado

```
POST /api/chamados
```

Exemplo de envio (multipart/form-data, até 5 anexos em `anexos`):

```json
{
  "titulo": "Impressora não liga",
  "categoria": "hardware",
  "descricao": "A impressora do setor financeiro não liga."
}
```

### Listar chamados

```
GET /api/chamados?status=aberto&categoria=hardware&prioridade=alta
```

### Detalhar chamado

```
GET /api/chamados/:id
```

### Adicionar anexos

```
POST /api/chamados/:id/anexos
```

### Adicionar comentário

```
POST /api/chamados/:id/comentarios
```

```json
{
  "mensagem": "Técnico a caminho.",
  "autor_id": 1
}
```

---

## Upload público

```
POST /api/upload/zip
```

Envia ZIP/RAR/PDF/imagem para o Supabase Storage (multipart/form-data, campo `arquivo`).

---

# 🔒 Segurança

O projeto utiliza:

- Hash de senha com **bcrypt** (nunca texto puro)
- Regeneração de sessão no login (proteção contra *session fixation*)
- Sanitização anti-XSS em todas as entradas de texto antes da validação
- Whitelist de caracteres no nome (bloqueia tags/scripts)
- Bloqueio de e-mails temporários/descartáveis e checagem de domínio (MX)
- Limite de tamanho de senha alinhado ao truncamento do bcrypt (72 bytes)
- `usuario_id` do chamado sempre extraído da sessão, nunca do corpo da requisição
- Validação de tipo MIME e extensão no upload de avatar e arquivos
- Variáveis de ambiente para credenciais e chaves sensíveis
- Controle de permissões (usuário x admin)

---

# 🧪 Testes

Executar testes:

```bash
npm test
```

---

# 📈 Melhorias Futuras

- [ ] Implementar recuperação de senha
- [ ] Criar sistema de notificações (novo comentário, mudança de status)
- [ ] Corrigir uso de `path` não importado em `routes/chamados.js`
- [ ] Padronizar todas as queries para a sintaxe do PostgreSQL (`$1`, `$2`, ...)
- [ ] Implementar `adminController.js` dedicado
- [ ] Retornar respostas JSON consistentes no middleware `admin` (hoje faz `redirect`)
- [ ] Melhorar testes automatizados
- [ ] Criar aplicativo mobile
- [ ] Implementar logs do sistema

---

# 🤝 Como Contribuir

Contribuições são bem-vindas.

1. Faça um fork do projeto

2. Crie uma branch:

```bash
git checkout -b minha-feature
```

3. Faça suas alterações

4. Commit:

```bash
git commit -m "Minha nova funcionalidade"
```

5. Envie para o GitHub:

```bash
git push origin minha-feature
```

6. Abra um Pull Request

---

# 📄 Licença

Este projeto está sob a licença MIT.

---

# 👨‍💻 Autor

**Rikael Ribeiro de Araújo Moraes**

- GitHub: https://github.com/rikaeldev
- LinkedIn: https://linkedin.com/in/rikaeldev

---

⭐ Se este projeto foi útil, considere deixar uma estrela no repositório.