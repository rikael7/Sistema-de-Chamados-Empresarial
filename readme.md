# Sistema de Chamados Empresarial

> Plataforma empresarial com sistema de chamados (OS) integrado, permitindo cadastro com verificação de e-mail, login de usuários, upload de arquivos, abertura e acompanhamento de chamados e um painel administrativo completo.

🌐 [English version](readme.en.md)

Sistema web desenvolvido em Node.js/Express, com autenticação por sessão, verificação de e-mail via Resend, upload de arquivos (anexos de chamados armazenados no Supabase Storage) e um módulo de chamados técnicos com anexos, comentários, prioridades e status de atendimento.

## Demonstração

Quer testar o sistema em funcionamento?

**Acesse a versão de produção:**

**<https://sistema-de-chamados-3z1c.onrender.com/>**

> **Nota:** A aplicação está hospedada no Render e utiliza o Neon PostgreSQL no plano gratuito. No primeiro acesso, pode ser necessário aguardar alguns segundos para que o servidor do Render inicie e o banco de dados saia do estado de inatividade. Esse comportamento é esperado nos planos gratuitos.

> **Dica para recrutadores:** use o botão **"Login como recrutador"** na tela de login para explorar o sistema sem precisar criar uma conta. Veja também as [Limitações conhecidas](#limitações-conhecidas) sobre o cadastro com verificação de e-mail.

## 🚧 Projeto em Desenvolvimento

> **Este projeto está em constante evolução.**

Novas funcionalidades, melhorias, correções e refatorações são adicionadas frequentemente. Durante esse processo, algumas telas, recursos e imagens presentes na pasta `docs` podem sofrer alterações e estarem diferentes do projeto real, portanto peço compreensão.

Estou trabalhando continuamente para manter toda a documentação e as capturas de tela atualizadas, mas pode haver um pequeno intervalo entre as mudanças no código e a atualização da documentação. Por ser um projeto independente, pequenas divergências podem acontecer.

Agradeço a compreensão! =)

---

# Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Telas](#telas)
- [Arquitetura do Projeto](#arquitetura-do-projeto)
- [Fluxo da Aplicação](#fluxo-da-aplicação)
  - [Pipeline Base](#pipeline-base)
  - [Cadastro de Usuário](#cadastro-de-usuário)
  - [Verificação de E-mail](#verificação-de-e-mail)
  - [Login](#login)
  - [Logout](#logout)
  - [Consultar Chamados](#consultar-chamados)
  - [Buscar Chamado](#buscar-chamado)
  - [Criar Chamado](#criar-chamado)
  - [Enviar Anexos](#enviar-anexos)
  - [Rotas Administrativas](#rotas-administrativas)
- [Verificação de E-mail com Resend](#verificação-de-e-mail-com-resend)
- [Upload de Anexos com Supabase Storage](#upload-de-anexos-com-supabase-storage)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Instalação](#instalação)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Banco de Dados](#banco-de-dados)
- [Executando o Projeto](#executando-o-projeto)
- [Documentação da API](#documentação-da-api)
- [Segurança](#segurança)
- [Limitações conhecidas](#limitações-conhecidas)
- [Testes](#testes)
- [Melhorias Futuras](#melhorias-futuras)
- [Como Contribuir](#como-contribuir)
- [Licença](#licença)
- [Autor](#autor)

---

# Sobre o Projeto

O Sistema de Chamados nasceu como um sistema robusto de autenticação de usuários, voltado à segurança, e evoluiu para incluir um sistema de chamados/OS. A aplicação permite que usuários se cadastrem (confirmando o e-mail por link), façam login, enviem arquivos e abram chamados, enquanto administradores alteram prioridades e o status de cada atendimento.

## Funcionalidades

- ✔ Cadastro e autenticação de usuários (sessão + bcrypt)
- ✔ Verificação de e-mail por link, enviado via **Resend**
- ✔ Login com regeneração de sessão (anti session-fixation)
- ✔ Login com conta Google e acesso de demonstração ("Login como recrutador")
- ✔ Controle de permissões (usuário comum x admin)
- ✔ Área administrativa (upload de vídeo, gestão de chamados)
- ✔ Criação e gerenciamento de chamados (OS) com prioridade e status
- ✔ Upload de anexos de chamados direto para o **Supabase Storage** (bucket privado, sem passar pelo disco do servidor)
- ✔ Visualização de anexos via **signed URL** temporária, gerada sob demanda para qualquer usuário autenticado
- ✔ Upload e armazenamento de outros arquivos (avatares, vídeos, ZIP/PDF)
- ✔ Validação de dados (nome, e-mail, senha, e-mail descartável e domínio MX)
- ✔ Sanitização anti-XSS em todas as entradas de texto
- ✔ Integração com banco de dados PostgreSQL

---

# Telas

## Login recrutador

![Tela de login com acesso de recrutador](docs/teladelogin.png)

## Login / Registro / Rota inexistente

![Telas de login, registro e rota inexistente](docs/telas.png)

## Tela do usuário

![Tela do usuário](docs/dashboarduser.PNG)

## Bloqueio de abertura de chamados

![Sistema de bloqueio de chamados](docs/bloqueiodechamado.png)

## Tela do admin

![Tela do admin](docs/dashboardadmin.PNG)

---

# Arquitetura do Projeto

```
Usuário
   |
   ↓
Frontend (login, registro, upload, dashboard, admin)
   |
   ↓
API Backend (Express)
   |
   ├── Middlewares (auth, admin, sanitize, validators, upload/multer)
   |
   ├── Banco de Dados (PostgreSQL)
   |      ├── users
   |      ├── videos
   |      ├── chamados
   |      ├── chamado_anexos      (guarda apenas o path dentro do bucket)
   |      └── chamado_comentarios
   |
   ├── E-mail transacional
   |      └── Resend (e-mail de verificação de cadastro)
   |
   └── Armazenamento de Arquivos
          ├── Disco local (multer) — avatares e vídeos
          └── Supabase Storage — anexos de chamados (bucket privado) e ZIP/RAR/PDF
                 └── acesso sempre via signed URL, gerada na hora da leitura
```

---

# Fluxo da Aplicação

Fluxo de execução das principais requisições do sistema, da chegada da requisição até a resposta ao cliente.

## Pipeline Base

Toda requisição passa por esse núcleo comum antes da rota/controller específico. Os fluxos abaixo mostram só o que muda em relação a ele.

```
Cliente → Express (server.js) → Sanitize Middleware → Auth Middleware → Rota/Controller → Model → PostgreSQL → Resposta HTTP
```

---

## Cadastro de Usuário

`POST /auth/register`

```
Cliente → Sanitize → Auth Middleware (rota pública, `authtrue`)
   → Validação (express-validator: formato, e-mail descartável, MX)
   → Rota de autenticação (routes/authRoutes.js)
   → User Model → PostgreSQL (usuário + token de verificação)
   → sendVerificationEmail (utils/email.js) → Resend API → Resposta HTTP
```

---

## Verificação de E-mail

`GET /auth/verify-email?token=<token>`

```
Cliente (clica no link recebido por e-mail) → Sanitize
   → Rota de autenticação → confere o token no PostgreSQL
   → confirma o e-mail do usuário → Resposta HTTP
```

---

## Login

`POST /auth/login`

```
Cliente → Sanitize → Rota de autenticação → User Model → PostgreSQL
   → Comparação de senha (bcrypt) → Regeneração da Sessão → Session Cookie → Resposta HTTP
```

---

## Logout

`POST /auth/logout`

```
Cliente → Sanitize → Destruição da Sessão → Resposta HTTP
```

---

## Consultar Chamados

`GET /api/chamados`

```
Cliente → Sanitize → Auth Middleware
   → Chamados Controller (conta anexos via LEFT JOIN) → PostgreSQL → Resposta HTTP
```

---

## Buscar Chamado

`GET /api/chamados/:id`

```
Cliente → Sanitize → Auth Middleware → Chamados Controller
   → PostgreSQL (chamado + paths dos anexos)
   → Supabase Storage (signed URL por anexo, válida 1h)
   → Resposta HTTP (anexos já com "url" pronta)
```

---

## Criar Chamado

`POST /api/chamados` (multipart/form-data)

```
Cliente → Sanitize → Auth Middleware → Multer (memoryStorage, sem salvar em disco)
   → Chamados Controller:
        BEGIN transação
        → INSERT chamado
        → por anexo: upload Supabase Storage + createSignedUrl
        → INSERT chamado_anexos (salva só o path)
        → COMMIT (ou ROLLBACK + remoção dos arquivos, em caso de erro)
   → Resposta HTTP (anexos com "url" assinada)
```

---

## Enviar Anexos

`POST /api/chamados/:id/anexos` (multipart/form-data)

```
Cliente → Sanitize → Auth Middleware → Multer (memoryStorage)
   → Chamados Controller (reaproveita subirAnexo da criação de chamado)
   → Supabase Storage + PostgreSQL → Resposta HTTP
```

---

## Rotas Administrativas

```
Cliente → Sanitize → Auth Middleware → Verificação de Administrador → Controller → PostgreSQL → Resposta HTTP
```

> **Observação:** todas as rotas protegidas exigem sessão válida. As rotas administrativas fazem uma verificação adicional de privilégio de admin.

---

# Verificação de E-mail com Resend

No cadastro, o sistema confirma que o e-mail pertence ao usuário enviando um link de verificação com o [Resend](https://resend.com).

## Como funciona

1. O usuário preenche o formulário em `/register`.
2. O servidor valida os dados (formato do e-mail, bloqueio de domínios descartáveis e checagem de MX) e gera um token aleatório de 64 caracteres hexadecimais.
3. O token é salvo no banco e o servidor monta o link `https://<seu-dominio>/auth/verify-email?token=<token>`.
4. A função `sendVerificationEmail` (`utils/email.js`) envia o link ao usuário pela API do Resend.
5. O usuário clica no link, e a rota `GET /auth/verify-email` confere o token e confirma o e-mail.

Se o Resend recusar o envio, o erro é registrado no console do servidor e o cadastro retorna erro ao usuário.

## Modo de teste x produção

Enquanto nenhum domínio próprio estiver verificado no Resend, a conta funciona em **modo de teste**: o envio só é permitido para o e-mail da própria conta dona da chave de API. Qualquer outro destinatário recebe do Resend um erro `403 validation_error`.

Para enviar a qualquer destinatário:

1. Acesse [resend.com/domains](https://resend.com/domains) e adicione um domínio seu.
2. Crie no DNS os registros (SPF e DKIM) indicados pelo Resend e aguarde a verificação.
3. Altere o endereço `from` em `utils/email.js` para um e-mail desse domínio (por exemplo, `no-reply@seudominio.com`).

---

# Upload de Anexos com Supabase Storage

Os anexos de chamados **não** ficam no disco do servidor — eles vão direto para um bucket privado no Supabase Storage. Resumo do funcionamento:

1. O `multer` está configurado com `memoryStorage()`, então o arquivo enviado pelo formulário chega ao controller como `arquivo.buffer`, sem nunca tocar o disco.
2. `utils/supabaseAnexos.js` centraliza a lógica de Storage:
   - `subirAnexo(chamadoId, arquivo)` — sobe o buffer para o bucket `chamados-anexos`, com um nome único (`<chamadoId>/<uuid>.<extensão>`), e já retorna uma signed URL válida por 1 hora.
   - `removerAnexos(nomesArquivos)` — remove arquivos do bucket; usado em rollback quando a transação do Postgres falha.
   - `gerarUrlAssinada(nomeArquivo)` — gera uma nova signed URL sob demanda, usada sempre que um chamado é visualizado (a URL da criação já pode ter expirado).
3. O banco (`chamado_anexos.caminho_arquivo`) guarda **apenas o path interno do bucket**, nunca uma URL — assim a expiração da signed URL não corrompe nada, ela é sempre gerada de novo na leitura.
4. Como o bucket é privado, o backend usa a **service_role key** do Supabase (nunca a chave pública/`anon`), o que dá acesso total ao Storage sem depender de policies de RLS.
5. Qualquer usuário autenticado que acesse `GET /api/chamados/:id` recebe os anexos já com `url` pronta para uso direto em `<img src>` ou `<a href>`.

---

# Tecnologias Utilizadas

## Backend

- Node.js
- Express.js
- PostgreSQL (`pg`)
- Express Session
- Middleware de autenticação (`isAuthenticated`, `admin`, `authtrue`)
- Upload de arquivos (`multer`, com `memoryStorage` para anexos de chamados)
- Validação (`express-validator`)
- Sanitização anti-XSS (`xss`)
- Bloqueio de e-mails descartáveis (`disposable-email-domains-js`) e checagem de MX
- Bcrypt para hash de senha
- Resend (SDK `resend`) — envio do e-mail de verificação
- Supabase Storage (SDK `@supabase/supabase-js`) — anexos de chamados e ZIP/RAR/PDF, com signed URLs

## Frontend

- HTML5
- CSS3
- JavaScript (vanilla)

## Ferramentas

- Git
- GitHub
- VS Code
- Postman

## Hospedagem e serviços

- Render — aplicação Node.js
- Neon — PostgreSQL
- Supabase — Storage de anexos
- Resend — e-mail transacional

---

# Estrutura de Pastas

```
Sistema-de-Chamados-Empresarial
│
├── config
│   ├── dbpg.js
│   └── supabase.js
│
├── controllers
│   └── chamadosController.js
│
├── docs                          (capturas de tela usadas neste README)
│
├── middleware
│   ├── authMiddleware.js
│   ├── authtrue.js
│   ├── sanitize.js
│   ├── validators.js
│   └── upload.js                 (multer com memoryStorage, limite de 5 arquivos/10MB)
│
├── models
│   └── userModel.js
│
├── routes
│   ├── authRoutes.js
│   ├── chamados.js
│   ├── protectedRoutes.js
│   └── publicupload.js
│
├── utils
│   ├── email.js                  (sendVerificationEmail — envio via Resend)
│   └── supabaseAnexos.js         (subirAnexo, removerAnexos, gerarUrlAssinada)
│
├── views                         (páginas HTML: login, register, upload, dashboard, admin, 404)
│
├── .env.example
├── .gitignore
├── package.json
├── readme.md
├── readme.en.md
├── schema.sql
└── server.js
```

---

# Instalação

## Pré-requisitos

Antes de iniciar, tenha instalado:

- Node.js 18+
- Git
- PostgreSQL 13+ configurado (de preferência em nuvem)
- Conta/projeto no Supabase, com um bucket privado chamado `chamados-anexos` criado em Storage
- Conta no Resend, com uma chave de API (veja [Verificação de E-mail com Resend](#verificação-de-e-mail-com-resend))

---

## Clonar o projeto

```
git clone https://github.com/rikael7/Sistema-de-Chamados-Empresarial.git
```

Acesse a pasta:

```
cd Sistema-de-Chamados-Empresarial
```

---

## Instalar dependências

```
npm install
```

Dependências principais usadas no projeto:

```
npm install express express-session pg bcrypt multer express-validator xss dotenv @supabase/supabase-js disposable-email-domains-js resend
```

---

# Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base):

```
PORT=3000
DATABASE_URL=postgres://usuario:senha@localhost:5432/sistema-de-chamados
SESSION_SECRET=sua_chave_secreta
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_secret_key_do_supabase
RESEND_API_KEY=sua_chave_de_api_do_resend
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` é a chave **secret** (antiga `service_role`), não a `publishable`/`anon`. Ela dá acesso total ao projeto Supabase — nunca deve ir para o Git. Confirme que `.env` está no `.gitignore`.

> ⚠️ `RESEND_API_KEY` também é uma credencial secreta e nunca deve ser versionada.

> **Em produção (Render):** não há arquivo `.env`. Cadastre as mesmas variáveis no painel do serviço, em *Environment*.

> **Conexão SSL com o Neon:** as versões atuais do `pg` tratam `sslmode=require` como `verify-full` e exibem um aviso no console. Para manter o comportamento atual e silenciar o aviso, use `?sslmode=verify-full` no final da `DATABASE_URL`.

---

# Banco de Dados

O script completo de criação de tabelas está em [`schema.sql`](schema.sql), na raiz do projeto. Para aplicar:

```
psql -U seu_usuario -d sistema-de-chamados -f schema.sql
```

## Tabelas

| Tabela                | Descrição                                                                     |
| --------------------- | ----------------------------------------------------------------------------- |
| `users`               | Usuários, credenciais, flag de admin (`adm`) e dados da verificação de e-mail |
| `videos`              | Vídeos enviados pelo admin                                                    |
| `chamados`            | Chamados/OS (título, categoria, status, prioridade)                           |
| `chamado_anexos`      | Path dos arquivos no bucket do Supabase Storage (não é URL nem caminho local) |
| `chamado_comentarios` | Comentários/acompanhamento de um chamado                                      |

Todas as chaves estrangeiras usam `ON DELETE CASCADE` (exceto `autor_id` em `chamado_comentarios`, que usa `SET NULL`). As tabelas `users` e `chamados` possuem *triggers* que atualizam automaticamente `updated_at` / `atualizado_em`.

---

# Executando o Projeto

Modo desenvolvimento:

```
npm run dev
```

ou:

```
npm start
```

Servidor disponível em:

```
http://localhost:3000
```

---

# Documentação da API

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

Após validar os dados, o sistema envia um e-mail com o link de confirmação (veja [Verificação de E-mail com Resend](#verificação-de-e-mail-com-resend)).

### Verificar e-mail

```
GET /auth/verify-email?token=<token>
```

Rota aberta pelo link enviado por e-mail. Confere o token recebido e confirma o e-mail do usuário.

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

### Logout

```
POST /auth/logout
```

---

## Usuário (rotas protegidas)

| Método | Rota       | Descrição                       |
| ------ | ---------- | ------------------------------- |
| GET    | `/profile` | Retorna dados do usuário logado |
| POST   | `/avatar`  | Atualiza o avatar (máx. 2MB)    |

---

## Admin (rotas protegidas + permissão de admin)

| Método | Rota                           | Descrição                      |
| ------ | ------------------------------ | ------------------------------ |
| PATCH  | `/api/chamados/:id/status`     | Atualiza status do chamado     |
| PATCH  | `/api/chamados/:id/prioridade` | Atualiza prioridade do chamado |
| DELETE | `/api/chamados/:id`            | Exclui um chamado              |

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

Resposta inclui `anexos[]`, cada um já com `url` (signed URL do Supabase, válida por 1h).

### Listar chamados

```
GET /api/chamados?status=aberto&categoria=hardware&prioridade=alta
```

Cada item traz `anexos` como contagem (número).

### Detalhar chamado

```
GET /api/chamados/:id
```

Retorna o chamado completo, com `anexos[]` contendo `url` (signed URL gerada na hora) para cada arquivo — acessível por qualquer usuário autenticado, não só quem criou o chamado.

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

# Segurança

O projeto utiliza:

- Hash de senha com **bcrypt** (nunca texto puro)
- Verificação de e-mail por link com token aleatório
- Regeneração de sessão no login (proteção contra *session fixation*)
- Sanitização anti-XSS em todas as entradas de texto antes da validação
- Whitelist de caracteres no nome (bloqueia tags/scripts)
- Bloqueio de e-mails temporários/descartáveis e checagem de domínio (MX)
- Limite de tamanho de senha alinhado ao truncamento do bcrypt (72 bytes)
- `usuario_id` do chamado sempre extraído da sessão, nunca do corpo da requisição
- Validação de tipo MIME e extensão no upload de avatar e arquivos
- Anexos de chamados em bucket **privado** no Supabase Storage — nunca acessíveis por link direto, apenas via signed URL de curta duração (1h)
- Backend usa a **service_role key** do Supabase apenas no servidor, nunca exposta ao frontend
- Rollback de transação também limpa arquivos já enviados ao Storage, evitando anexos órfãos
- Variáveis de ambiente para credenciais e chaves sensíveis (Supabase, Resend, sessão e banco)
- Controle de permissões (usuário x admin)

---

# Limitações conhecidas

- **E-mail de verificação em modo de teste:** enquanto não houver um domínio verificado no Resend, o e-mail de verificação só é entregue ao e-mail da conta dona da chave de API. Cadastros com outros endereços falham no envio. Use o **"Login como recrutador"** para explorar a demonstração ou veja como [verificar um domínio](#modo-de-teste-x-produção).
- **Link de verificação no console:** o servidor imprime no log o destinatário e o link de verificação. Isso ajuda no desenvolvimento, mas deve ser removido em produção, pois o link permite confirmar a conta.
- **Documentação em evolução:** algumas telas e imagens da pasta `docs` podem estar diferentes da versão atual do projeto.

---

# Testes

Executar testes:

```
npm test
```

---

# Melhorias Futuras

- [ ] Implementar recuperação de senha
- [ ] Verificar um domínio próprio no Resend para enviar e-mails a qualquer destinatário
- [ ] Reenvio do e-mail de verificação e limpeza de cadastros não confirmados
- [ ] Criar sistema de notificações (novo comentário, mudança de status)
- [ ] Padronizar todas as queries para a sintaxe do PostgreSQL (`$1`, `$2`, ...)
- [ ] Implementar `adminController.js` dedicado
- [ ] Retornar respostas JSON consistentes no middleware `admin` (hoje faz `redirect`)
- [ ] Melhorar testes automatizados
- [ ] Criar aplicativo mobile
- [ ] Implementar logs do sistema

---

# Como Contribuir

Contribuições são bem-vindas.

1. Faça um fork do projeto

2. Crie uma branch:

```
git checkout -b minha-feature
```

3. Faça suas alterações

4. Commit:

```
git commit -m "feat: minha nova funcionalidade"
```

5. Envie para o GitHub:

```
git push origin minha-feature
```

6. Abra um Pull Request

---

# Licença

Este projeto está sob a licença MIT.

---

# Autor

**Rikael Ribeiro de Araújo Moraes**

- GitHub: <https://github.com/rikael7>
- LinkedIn: <https://linkedin.com/in/rikaeldev>

---

Se este projeto foi útil, considere deixar uma estrela no repositório.