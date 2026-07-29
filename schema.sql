-- ============================================================
-- Central de Chamados — schema PostgreSQL
-- ============================================================

CREATE TABLE IF NOT EXISTS chamados (
    id              SERIAL PRIMARY KEY,
    numero          VARCHAR(20) UNIQUE,                 -- ex: OS-0042 (preenchido após o insert)
    titulo          VARCHAR(255) NOT NULL,
    descricao       TEXT NOT NULL,
    categoria       VARCHAR(30) NOT NULL
                    CHECK (categoria IN ('ti','infraestrutura','manutencao','rh','financeiro','outros')),
    prioridade      VARCHAR(20) NOT NULL
                    CHECK (prioridade IN ('baixa','media','alta','urgente')),
    status          VARCHAR(20) NOT NULL DEFAULT 'aberto'
                    CHECK (status IN ('aberto','andamento','resolvido')),
    usuario_id      INTEGER,                             -- FK opcional -> tabela de usuários, se existir
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chamado_anexos (
    id              SERIAL PRIMARY KEY,
    chamado_id      INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
    caminho_arquivo VARCHAR(500) NOT NULL,   -- caminho/URL onde o arquivo foi salvo
    nome_original   VARCHAR(255),
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chamado_comentarios (
    id              SERIAL PRIMARY KEY,
    chamado_id      INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
    autor_id        INTEGER,                 -- FK opcional -> tabela de usuários
    mensagem        TEXT NOT NULL,
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices úteis para os filtros do dashboard
CREATE INDEX IF NOT EXISTS idx_chamados_status     ON chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_categoria   ON chamados(categoria);
CREATE INDEX IF NOT EXISTS idx_chamados_prioridade  ON chamados(prioridade);
CREATE INDEX IF NOT EXISTS idx_anexos_chamado_id    ON chamado_anexos(chamado_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_chamado_id ON chamado_comentarios(chamado_id);

-- Mantém "atualizado_em" sempre em dia
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chamados_atualizado_em ON chamados;
CREATE TRIGGER trg_chamados_atualizado_em
    BEFORE UPDATE ON chamados
    FOR EACH ROW
    EXECUTE FUNCTION set_atualizado_em();
