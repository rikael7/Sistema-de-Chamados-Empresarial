-- =====================================================================
-- SCHEMA DO BANCO DE DADOS — Sistema de Chamados
-- SGBD: PostgreSQL 13+
-- Compatível com Neon PostgreSQL
-- =====================================================================

BEGIN;

-- =====================================================================
-- EXTENSÕES
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =====================================================================
-- FUNÇÃO: atualiza automaticamente updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- FUNÇÃO: atualiza automaticamente atualizado_em
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
-- Usuários da plataforma
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(254) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    bio             TEXT,
    phone           VARCHAR(20),
    avatar_url      VARCHAR(255),
    adm             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- =====================================================================
-- TABELA: videos
-- Vídeos enviados pelo administrador
-- =====================================================================

CREATE TABLE IF NOT EXISTS videos (
    id              SERIAL PRIMARY KEY,
    titulo          VARCHAR(150) NOT NULL,
    descricao       TEXT,
    nome_arquivo    VARCHAR(255) NOT NULL,
    tipo_arquivo    VARCHAR(100) NOT NULL,
    tamanho         BIGINT NOT NULL,
    usuario_id      INTEGER NOT NULL
                    REFERENCES users(id)
                    ON DELETE CASCADE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_usuario_id
    ON videos (usuario_id);


-- =====================================================================
-- TABELA: chamados
-- Sistema de chamados / ordens de serviço
-- =====================================================================

CREATE TABLE IF NOT EXISTS chamados (
    id              SERIAL PRIMARY KEY,

    -- Exemplo: OS-0042
    -- Preenchido pelo backend após o INSERT
    numero          VARCHAR(20) UNIQUE,

    titulo          VARCHAR(150) NOT NULL,
    descricao       TEXT NOT NULL,
    categoria       VARCHAR(50) NOT NULL,

    prioridade      VARCHAR(10) NOT NULL DEFAULT 'media'
                    CHECK (
                        prioridade IN (
                            'baixa',
                            'media',
                            'alta',
                            'urgente'
                        )
                    ),

    status          VARCHAR(20) NOT NULL DEFAULT 'aberto'
                    CHECK (
                        status IN (
                            'aberto',
                            'andamento',
                            'resolvido'
                        )
                    ),

    usuario_id      INTEGER NOT NULL
                    REFERENCES users(id)
                    ON DELETE CASCADE,

    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chamados_status
    ON chamados (status);

CREATE INDEX IF NOT EXISTS idx_chamados_categoria
    ON chamados (categoria);

CREATE INDEX IF NOT EXISTS idx_chamados_prioridade
    ON chamados (prioridade);

CREATE INDEX IF NOT EXISTS idx_chamados_usuario_id
    ON chamados (usuario_id);


DROP TRIGGER IF EXISTS trg_chamados_atualizado_em ON chamados;

CREATE TRIGGER trg_chamados_atualizado_em
    BEFORE UPDATE ON chamados
    FOR EACH ROW
    EXECUTE FUNCTION set_atualizado_em();


-- =====================================================================
-- TABELA: chamado_anexos
-- Arquivos/fotos anexados a um chamado
-- =====================================================================

CREATE TABLE IF NOT EXISTS chamado_anexos (
    id              SERIAL PRIMARY KEY,

    chamado_id      INTEGER NOT NULL
                    REFERENCES chamados(id)
                    ON DELETE CASCADE,

    caminho_arquivo VARCHAR(255) NOT NULL,
    nome_original   VARCHAR(255) NOT NULL,

    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chamado_anexos_chamado_id
    ON chamado_anexos (chamado_id);


-- =====================================================================
-- TABELA: chamado_comentarios
-- Comentários/observações de acompanhamento
-- =====================================================================

CREATE TABLE IF NOT EXISTS chamado_comentarios (
    id              SERIAL PRIMARY KEY,

    chamado_id      INTEGER NOT NULL
                    REFERENCES chamados(id)
                    ON DELETE CASCADE,

    autor_id        INTEGER
                    REFERENCES users(id)
                    ON DELETE SET NULL,

    mensagem        TEXT NOT NULL,

    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chamado_comentarios_chamado_id
    ON chamado_comentarios (chamado_id);


-- =====================================================================
-- FINALIZAÇÃO
-- =====================================================================

COMMIT;
