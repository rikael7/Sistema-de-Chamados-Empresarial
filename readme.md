#  Sistema de Chamados Empresarial

> Plataforma empresarial com sistema de chamados (OS) integrado, permitindo cadastro/login de usuários, upload de arquivos, abertura e acompanhamento de chamados, e um painel administrativo completo.

Sistema web desenvolvido em Node.js/Express, com autenticação por sessão, upload de arquivos (com anexos de chamados armazenados no Supabase Storage) e um módulo de chamados técnicos com anexos, comentários, prioridades e status de atendimento.

##  Demonstração

Quer testar o sistema em funcionamento?

 **Acesse a versão em produção:**  
**https://Embreve.onrender.com**

> **Observação:** Na primeira visita o Render pode levar alguns segundos para iniciar o servidor, pois utiliza hibernação em planos gratuitos.

## 🚧 Projeto em Desenvolvimento

> **Este projeto está em constante evolução.**

Novas funcionalidades, melhorias, correções e refatorações são adicionadas frequentemente. Durante esse processo, algumas telas, recursos e imagens presentes na pasta `docs` podem sofrer alterações e estarem diferentes do projeto real, portanto peço compreensão.

Estou trabalhando continuamente para manter toda a documentação e as capturas de tela atualizadas, mas pode haver um pequeno intervalo entre as mudanças no código e a atualização da documentação, por ser um projeto independente pequenas divergências podem acontecer.

Agradeço a compreensão! =)

---
#  Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [ Demonstração](#️-demonstração-1)
- [ Arquitetura do Projeto](#️-arquitetura-do-projeto)
- [ Fluxo da Aplicação](#-fluxo-da-aplicação)
  - [ Cadastro de Usuário](#-cadastro-de-usuário)
  - [ Login](#-login)
  - [ Logout](#-logout)
  - [ Consultar Chamados](#-consultar-chamados)
  - [ Buscar Chamado](#-buscar-chamado)
  - [ Criar Chamado](#-criar-chamado)
  - [ Enviar Anexos](#-enviar-anexos)
  - [ Fluxo das Rotas Administrativas](#-fluxo-das-rotas-administrativas)
- [ Upload de Anexos com Supabase Storage](#-upload-de-anexos-com-supabase-storage)
- [ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [ Estrutura de Pastas](#-estrutura-de-pastas)
- [ Instalação](#️-instalação)
- [ Configuração do Ambiente](#-configuração-do-ambiente)
- [ Banco de Dados](#️-banco-de-dados)
- [ Executando o Projeto](#️-executando-o-projeto)
- [ Documentação da API](#-documentação-da-api)
  - [Autenticação](#autenticação)
  - [Usuário](#usuário-rotas-protegidas)
  - [Admin](#admin-rotas-protegidas--permissão-de-admin)
  - [Chamados](#chamados)
  - [Upload Público](#upload-público)
- [ Segurança](#-segurança)
- [ Testes](#-testes)
- [ Melhorias Futuras](#-melhorias-futuras)
- [ Como Contribuir](#-como-contribuir)
- [ Licença](#-licença)
- [ Autor](#-autor)




#  Sobre o Projeto

O Sistema de chamados nasceu com um sistema robusto de autenticação de usuarios visando a segurança e evoluiu para incluir um sistema de chamados/OS. A aplicação permite que usuários se cadastrem, façam login, enviem arquivos e abram chamados; enquanto administradires alteram prioridades e o status de cada atendimento.

## Funcionalidades

- ✔ Cadastro e autenticação de usuários (sessão + bcrypt)
- ✔ Sistema de login com regeneração de sessão (anti session-fixation)
- ✔ Controle de permissões (usuário comum x admin)
- ✔ Área administrativa (upload de vídeo, gestão de chamados)
- ✔ Criação e gerenciamento de chamados (OS) com prioridade e status
- ✔ Upload de anexos de chamados direto para o **Supabase Storage** (bucket privado, sem passar pelo disco do servidor)
- ✔ Visualização de anexos via **signed URL** temporária, gerada sob demanda para qualquer usuário autenticado
- ✔ Upload e armazenamento de outros arquivos (avatares, vídeos, ZIP/PDF)
- ✔ Validação de dados (nome, e-mail, senha, domínio MX)
- ✔ Sanitização anti-XSS em todas as entradas de texto
- ✔ Integração com banco de dados PostgreSQL

---

#  Demonstração



Exemplo:

## Login recrutador
![Telas](./docs/teladelogin.png)

## Tela do Login/Register/Rota inexistente
![Telas](./docs/telas.png)

## Tela do usuário 
![Tela de User](./docs/dashboarduser.PNG)

## Tela do usuário 
![Sistema de bloqueio de chamados](./docs/bloqueiodechamado.png)

## Tela do admin 
![Tela de Admin](./docs/dashboardadmin.PNG)


---

#  Arquitetura do Projeto

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
   └── Armazenamento de Arquivos
          ├── Disco local (multer) — avatares e vídeos
          └── Supabase Storage — anexos de chamados (bucket privado) e ZIP/RAR/PDF
                 └── acesso sempre via signed URL, gerada na hora da leitura
```

---
---

#  Fluxo da Aplicação

Abaixo está o fluxo de execução das principais requisições do sistema, desde a chegada da requisição até a resposta enviada ao cliente.

---

##  Cadastro de Usuário

```text
Cliente
   │
   ▼
POST /auth/register
   │
   ▼
Express (app.js)
   │
   ▼
Sanitize Middleware
   │
   ▼
Auth Middleware (authtrue)
   │
   ▼
Validação dos Dados
(express-validator)
   │
   ▼
Auth Controller
(createUser)
   │
   ▼
User Model
   │
   ▼
PostgreSQL
   │
   ▼
Resposta HTTP
```

---

##  Login

```text
Cliente
   │
   ▼
POST /auth/login
   │
   ▼
Express (app.js)
   │
   ▼
Sanitize Middleware
   │
   ▼
Auth Controller
   │
   ▼
User Model
   │
   ▼
PostgreSQL
   │
   ▼
Comparação da senha (bcrypt)
   │
   ▼
Regeneração da Sessão
   │
   ▼
Session Cookie
   │
   ▼
Resposta HTTP
```

---

##  Logout

```text
Cliente
   │
   ▼
POST /auth/logout
   │
   ▼
Express (app.js)
   │
   ▼
Sanitize Middleware
   │
   ▼
Destruição da Sessão
   │
   ▼
Resposta HTTP
```

---

##  Consultar Chamados

```text
Cliente
   │
   ▼
GET /api/chamados
   │
   ▼
Express (app.js)
   │
   ▼
Sanitize Middleware
   │
   ▼
Auth Middleware
   │
   ▼
Chamados Controller
(conta anexos por chamado via LEFT JOIN)
   │
   ▼
PostgreSQL
   │
   ▼
Resposta HTTP
```

---

##  Buscar Chamado

```text
Cliente
   │
   ▼
GET /api/chamados/:id
   │
   ▼
Express (app.js)
   │
   ▼
Sanitize Middleware
   │
   ▼
Auth Middleware
   │
   ▼
Chamados Controller
   │
   ▼
PostgreSQL (busca chamado + paths dos anexos)
   │
   ▼
Supabase Storage
(gera 1 signed URL por anexo, válida por 1h)
   │
   ▼
Resposta HTTP (anexos já com "url" pronta)
```

---

##  Criar Chamado

```text
Cliente
   │
   ▼
POST /api/chamados  (multipart/form-data)
   │
   ▼
Express (app.js)
   │
   ▼
Sanitize Middleware
   │
   ▼
Auth Middleware
   │
   ▼
Multer (memoryStorage — gera arquivo.buffer, nada é salvo em disco)
   │
   ▼
Chamados Controller
   │
   ├── BEGIN transação Postgres
   ├── INSERT chamado
   ├── Para cada anexo: upload no Supabase Storage + createSignedUrl
   ├── INSERT chamado_anexos (salva apenas o path do bucket)
   └── COMMIT (ou ROLLBACK + remoção dos arquivos já enviados, em caso de erro)
   │
   ▼
Resposta HTTP (anexos já com "url" assinada)
```

---

##  Enviar Anexos

```text
Cliente
   │
   ▼
POST /api/chamados/:id/anexos  (multipart/form-data)
   │
   ▼
Express (app.js)
   │
   ▼
Sanitize Middleware
   │
   ▼
Auth Middleware
   │
   ▼
Multer (memoryStorage)
   │
   ▼
Chamados Controller
(mesma função subirAnexo usada na criação do chamado)
   │
   ▼
Supabase Storage + PostgreSQL
   │
   ▼
Resposta HTTP
```

---

##  Fluxo das Rotas Administrativas

```text
Cliente
   │
   ▼
Requisição
   │
   ▼
Express (app.js)
   │
   ▼
Sanitize Middleware
   │
   ▼
Auth Middleware
   │
   ▼
Verificação de Administrador
   │
   ▼
Controller
   │
   ▼
PostgreSQL
   │
   ▼
Resposta HTTP
```

> **Observação:** Todas as rotas protegidas exigem uma sessão válida. As rotas administrativas executam uma verificação adicional para confirmar que o usuário possui privilégios de administrador.

---

#  Upload de Anexos com Supabase Storage

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

----

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
- Bcrypt para hash de senha
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

## Hospedagem

- Render / VPS / Cloud

---

#  Estrutura de Pastas

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
│   │   ├── validators.js
│   │   └── upload.js              (multer com memoryStorage, limite de 5 arquivos/10MB)
│   │
│   ├── utils
│   │   └── supabaseAnexos.js      (subirAnexo, removerAnexos, gerarUrlAssinada)
│   │
│   ├── config
│   │   ├── dbpg.js
│   │   └── supabase.js
│   │
│   ├── database
│   │   └── schema.sql
│   │
│   ├── uploads                    (avatares e vídeos — anexos de chamados não usam mais esta pasta)
│   └── server.js
│
├── frontend
│   │
│   ├── pages
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── upload.html
│   │   ├── dashboard.html          (lista de chamados + modal de detalhe com anexos)
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

#  Instalação

## Pré-requisitos

Antes de iniciar, tenha instalado:

- Node.js 18+
- Git
- PostgreSQL 13+ configurado (De preferência em Cloud)
- Conta/projeto no Supabase, com um bucket privado chamado `chamados-anexos` criado em Storage

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

#  Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
DATABASE_URL=postgres://usuario:senha@localhost:5432/sistema-de-chamados
SESSION_SECRET=sua_chave_secreta
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_secret_key_do_supabase
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` é a chave **secret** (antiga `service_role`), não a `publishable`/`anon`. Ela dá acesso total ao projeto Supabase — nunca deve ir para o Git. Confirme que `.env` está no `.gitignore`.

---

# Banco de Dados

O script completo de criação de tabelas está em [`database/schema.sql`](./schema.sql). Para aplicar:

```bash
psql -U seu_usuario -d insidebox -f schema.sql
```

## Tabelas

| Tabela                | Descrição                                              |
|------------------------|---------------------------------------------------------|
| `users`                | Usuários, credenciais e flag de admin (`adm`)           |
| `videos`               | Vídeos enviados pelo admin                              |
| `chamados`             | Chamados/OS (título, categoria, status,    	prioridade)     
| `chamado_anexos`       | Path dos arquivos no bucket do Supabase Storage (não é URL nem caminho local) |
| `chamado_comentarios`  | Comentários/acompanhamento de um chamado                |

Todas as chaves estrangeiras usam `ON DELETE CASCADE` (exceto `autor_id` em `chamado_comentarios`, que usa `SET NULL`). As tabelas `users` e `chamados` possuem *triggers* que atualizam automaticamente `updated_at` / `atualizado_em`.

---

#  Executando o Projeto

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

#  Documentação da API

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

---

## Admin (rotas protegidas + permissão de admin)

| Método | Rota                        | Descrição                       |
|--------|------------------------------|-----------------------------------|
| PATCH  | `/api/chamados/:id/status`   | Atualiza status do chamado       |
| PATCH  | `/api/chamados/:id/prioridade` | Atualiza prioridade do chamado |
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

#  Segurança

O projeto utiliza:

- Hash de senha com **bcrypt** (nunca texto puro)
- Regeneração de sessão no login (proteção contra *session fixation*)
- Sanitização anti-XSS em todas as entradas de texto antes da validação
- Whitelist de caracteres no nome (bloqueia tags/scripts)
- Bloqueio de e-mails temporários/descartáveis e checagem de domínio (MX)
- Limite de tamanho de senha alinhado ao truncamento do bcrypt (72 bytes)
- `usuario_id` do chamado sempre extraído da sessão, nunca do corpo da requisição
- Validação de tipo MIME e extensão no upload de avatar e arquivos
- Anexos de chamados ficam em bucket **privado** no Supabase Storage — nunca acessíveis por link direto, apenas via signed URL de curta duração (1h)
- Backend usa a **service_role key** do Supabase apenas no servidor, nunca exposta ao frontend
- Rollback de transação também limpa arquivos já enviados ao Storage, evitando anexos órfãos
- Variáveis de ambiente para credenciais e chaves sensíveis
- Controle de permissões (usuário x admin)

---

#  Testes

Executar testes:

```bash
npm test
```

---

#  Melhorias Futuras

- [ ] Implementar recuperação de senha
- [ ] Criar sistema de notificações (novo comentário, mudança de status)
- [ ] Padronizar todas as queries para a sintaxe do PostgreSQL (`$1`, `$2`, ...)
- [ ] Implementar `adminController.js` dedicado
- [ ] Retornar respostas JSON consistentes no middleware `admin` (hoje faz `redirect`)
- [ ] Melhorar testes automatizados
- [ ] Criar aplicativo mobile
- [ ] Implementar logs do sistema

---

#  Como Contribuir

Contribuições são bem-vindas.

1. Faça um fork do projeto

2. Crie uma branch:

```bash
git checkout -b minha-feature
```

3. Faça suas alterações

4. Commit:

```bash
git commit -m "feat:Minha nova funcionalidade"
```

5. Envie para o GitHub:

```bash
git push origin minha-feature
```

6. Abra um Pull Request

---

#  Licença

Este projeto está sob a licença MIT.

---

#  Autor

**Rikael Ribeiro de Araújo Moraes**

- GitHub: https://github.com/rikaeldev
- LinkedIn: https://linkedin.com/in/rikaeldev

---

Se este projeto foi útil, considere deixar uma estrela no repositório.