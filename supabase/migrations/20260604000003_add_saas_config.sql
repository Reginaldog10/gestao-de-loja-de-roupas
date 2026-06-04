-- ====================================================================
-- MIGRAÇÃO PARA ADICIONAR CONFIGURAÇÕES GLOBAIS DO SAAS (PERÍODO DE TESTES)
-- ====================================================================

-- 1. CRIAÇÃO DA TABELA DE CONFIGURAÇÕES DO SAAS
CREATE TABLE IF NOT EXISTS public.saas_config (
    id TEXT PRIMARY KEY DEFAULT 'global',
    dias_teste_padrao INTEGER NOT NULL DEFAULT 30 CHECK (dias_teste_padrao IN (7, 15, 30))
);

-- 2. INSERÇÃO DO REGISTRO PADRÃO INICIAL (30 dias)
INSERT INTO public.saas_config (id, dias_teste_padrao)
VALUES ('global', 30)
ON CONFLICT (id) DO NOTHING;

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.saas_config ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACESSO
-- Qualquer pessoa (autenticada ou não) pode ler as configurações para saber o período de testes no cadastro
DROP POLICY IF EXISTS "Acesso público saas_config" ON public.saas_config;
CREATE POLICY "Acesso público saas_config" ON public.saas_config FOR SELECT USING (true);

-- Apenas o superadmin pode gerenciar (inserir, atualizar, deletar) as configurações
DROP POLICY IF EXISTS "Superadmin gerencia saas_config" ON public.saas_config;
CREATE POLICY "Superadmin gerencia saas_config" ON public.saas_config FOR ALL TO authenticated 
USING (public.is_superadmin()) 
WITH CHECK (public.is_superadmin());
