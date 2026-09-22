
-- =====================================================================
-- SCHEMA DO BANCO DE DADOS — Sistema de Chamados Empresarial
-- PostgreSQL 13+
--
-- Este schema contempla:
--   - Cadastro/login tradicional com bcrypt
--   - Login com Google OAuth
--   - Sessões do Express via connect-pg-simple
--   - Usuários/admin
--   - Limite de abertura de chamados
--   - Vídeos
--   - Chamados
--   - Anexos de chamados
--   - Comentários
--   - Messages
-- =====================================================================

BEGIN;


-- =====================================================================
-- EXTENSÃO
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =====================================================================
-- FUNÇÃO: atualiza updated_at automaticamente
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- FUNÇÃO: atualiza atualizado_em automaticamente
-- =====================================================================

CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- TABELA: users
-- =====================================================================
--
-- password_hash:
--   NULL é permitido para usuários que utilizam exclusivamente
--   autenticação via Google.
--
-- google_id:
--   Identificador único fornecido pelo Google OAuth.
--
-- avatar_url:
--   Continua sendo a coluna oficial de avatar do projeto.
--
-- chamado_bloqueado_ate:
--   Utilizado pelo middleware Limitechamados.js.
--
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (

    id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(254) NOT NULL UNIQUE,

    -- NULL para contas autenticadas exclusivamente pelo Google.
    password_hash VARCHAR(255),

    bio TEXT,

    phone VARCHAR(20),

    avatar_url VARCHAR(255),

    adm BOOLEAN NOT NULL DEFAULT FALSE,

    -- Google OAuth 2.0
    google_id VARCHAR(255) UNIQUE,

    -- Limite de abertura de chamados
    chamado_bloqueado_ate TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- =====================================================================
-- ÍNDICES: users
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_users_email
ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_google_id
ON users (google_id);


-- =====================================================================
-- TRIGGER: users.updated_at
-- =====================================================================

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- =====================================================================
-- TABELA: videos
-- =====================================================================

CREATE TABLE IF NOT EXISTS videos (

    id SERIAL PRIMARY KEY,

    titulo VARCHAR(150) NOT NULL,

    descricao TEXT,

    nome_arquivo VARCHAR(255) NOT NULL,

    tipo_arquivo VARCHAR(100) NOT NULL,

    tamanho BIGINT NOT NULL,

    usuario_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- =====================================================================
-- ÍNDICE: videos.usuario_id
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_videos_usuario_id
ON videos (usuario_id);


-- =====================================================================
-- TABELA: chamados
-- =====================================================================

CREATE TABLE IF NOT EXISTS chamados (

    id SERIAL PRIMARY KEY,

    -- Exemplo: OS-0042
    -- Preenchido pelo backend após o INSERT.
    numero VARCHAR(20) UNIQUE,

    titulo VARCHAR(150) NOT NULL,

    descricao TEXT NOT NULL,

    categoria VARCHAR(50) NOT NULL,

    prioridade VARCHAR(10) NOT NULL DEFAULT 'media'
        CHECK (
            prioridade IN (
                'baixa',
                'media',
                'alta',
                'urgente'
            )
        ),

    status VARCHAR(20) NOT NULL DEFAULT 'aberto'
        CHECK (
            status IN (
                'aberto',
                'andamento',
                'resolvido'
            )
        ),

    usuario_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- =====================================================================
-- ÍNDICES: chamados
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_chamados_status
ON chamados (status);

CREATE INDEX IF NOT EXISTS idx_chamados_categoria
ON chamados (categoria);

CREATE INDEX IF NOT EXISTS idx_chamados_prioridade
ON chamados (prioridade);

CREATE INDEX IF NOT EXISTS idx_chamados_usuario_id
ON chamados (usuario_id);


-- =====================================================================
-- TRIGGER: chamados.atualizado_em
-- =====================================================================

DROP TRIGGER IF EXISTS trg_chamados_atualizado_em ON chamados;

CREATE TRIGGER trg_chamados_atualizado_em
BEFORE UPDATE ON chamados
FOR EACH ROW
EXECUTE FUNCTION set_atualizado_em();


-- =====================================================================
-- TABELA: chamado_anexos
-- =====================================================================

CREATE TABLE IF NOT EXISTS chamado_anexos (

    id SERIAL PRIMARY KEY,

    chamado_id INTEGER NOT NULL
        REFERENCES chamados(id)
        ON DELETE CASCADE,

    -- Path interno do arquivo no Supabase Storage.
    -- Não armazena signed URL.
    caminho_arquivo VARCHAR(255) NOT NULL,

    nome_original VARCHAR(255) NOT NULL,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- =====================================================================
-- ÍNDICE: chamado_anexos.chamado_id
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_chamado_anexos_chamado_id
ON chamado_anexos (chamado_id);


-- =====================================================================
-- TABELA: chamado_comentarios
-- =====================================================================

CREATE TABLE IF NOT EXISTS chamado_comentarios (

    id SERIAL PRIMARY KEY,

    chamado_id INTEGER NOT NULL
        REFERENCES chamados(id)
        ON DELETE CASCADE,

    autor_id INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,

    mensagem TEXT NOT NULL,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- =====================================================================
-- ÍNDICE: chamado_comentarios.chamado_id
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_chamado_comentarios_chamado_id
ON chamado_comentarios (chamado_id);


-- =====================================================================
-- TABELA: messages
-- =====================================================================
--
-- Esta tabela é criada atualmente pelo config/dbpg.js.
-- Mantida aqui também para que um banco reconstruído pelo schema.sql
-- possua a mesma estrutura.
--
-- =====================================================================

CREATE TABLE IF NOT EXISTS messages (

    id SERIAL PRIMARY KEY,

    room VARCHAR(100) NOT NULL DEFAULT 'geral',

    username VARCHAR(100) NOT NULL,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- =====================================================================
-- ÍNDICES: messages
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_messages_room
ON messages (room);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
ON messages (created_at);


-- =====================================================================
-- TABELA: sessions
-- =====================================================================
--
-- Utilizada pelo connect-pg-simple / express-session.
--
-- O server.js atualmente utiliza:
--
--   tableName: 'sessions'
--
-- =====================================================================

CREATE TABLE IF NOT EXISTS sessions (

    sid VARCHAR(255) PRIMARY KEY,

    sess JSON NOT NULL,

    expire TIMESTAMP(6) NOT NULL

);


-- =====================================================================
-- ÍNDICE: sessions.expire
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_session_expire
ON sessions (expire);


-- =====================================================================
-- FINALIZAÇÃO
-- =====================================================================

COMMIT;

