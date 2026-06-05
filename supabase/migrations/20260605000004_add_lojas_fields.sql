-- ====================================================================
-- MIGRAÇÃO PARA ADICIONAR DADOS COMERCIAIS À TABELA DE LOJAS (SAAS)
-- ====================================================================

-- 1. ADICIONAR COLUNAS DE INFORMAÇÕES DA EMPRESA NA TABELA DE LOJAS
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS cidade TEXT;
