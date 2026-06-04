-- ====================================================================
-- SCRIPT DE TRANSFORMAÇÃO DA BASE EM SAAS MULTI-TENANT (SUPABASE)
-- ====================================================================

-- 1. LIMPEZA DOS DADOS DE TESTE (Pronto para Produção)
TRUNCATE TABLE public.movimentacoes_estoque, public.encomendas, public.vendas, public.parcelas, public.logs_operacao, public.clientes, public.fornecedores, public.produtos CASCADE;

-- 2. CRIAÇÃO DA TABELA DE PLANOS
CREATE TABLE IF NOT EXISTS public.planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    preco NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    max_clientes INTEGER DEFAULT NULL, -- NULL significa ilimitado
    max_produtos INTEGER DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CRIAÇÃO DA TABELA DE LOJAS
CREATE TABLE IF NOT EXISTS public.lojas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plano_id UUID REFERENCES public.planos(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('ativo', 'bloqueado', 'expirado')) NOT NULL DEFAULT 'ativo',
    expiracao TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CRIAÇÃO DA TABELA DE TOKENS DE ATIVAÇÃO
CREATE TABLE IF NOT EXISTS public.tokens_ativacao (
    token TEXT PRIMARY KEY,
    dias_validade INTEGER NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    usado_por_loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL,
    usado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ADIÇÃO DE LOJA_ID E EXTENSÃO DO TIPO DE PERFIL PARA SUPERADMIN
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL;

-- Atualizar o CHECK de perfil
ALTER TABLE public.perfis DROP CONSTRAINT IF EXISTS perfis_perfil_check;
ALTER TABLE public.perfis ADD CONSTRAINT perfis_perfil_check CHECK (perfil IN ('superadmin', 'administrador', 'caixa', 'vendedor'));

-- 6. ADIÇÃO DA COLUNA LOJA_ID NAS TABELAS OPERACIONAIS
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE;
ALTER TABLE public.movimentacoes_estoque ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE;
ALTER TABLE public.encomendas ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE;
ALTER TABLE public.parcelas ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE;
ALTER TABLE public.logs_operacao ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE;

-- 7. PROMOVER O USUÁRIO ATUAL CADASTRADO PARA SUPERADMIN
UPDATE public.perfis SET perfil = 'superadmin';

-- 8. INSERÇÃO DOS PLANOS BÁSICOS DO SAAS
INSERT INTO public.planos (nome, preco, max_clientes, max_produtos) VALUES
('Plano Grátis', 0.00, 50, 100),
('Plano Mensal Gold', 99.90, NULL, NULL),
('Plano Anual Diamond', 899.90, NULL, NULL)
ON CONFLICT (nome) DO NOTHING;

-- 9. CRIAÇÃO DAS FUNÇÕES DE AJUDA DE SEGURANÇA E RLS
CREATE OR REPLACE FUNCTION public.get_minha_loja_id()
RETURNS UUID AS $$
  SELECT loja_id FROM public.perfis WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT perfil = 'superadmin' FROM public.perfis WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql SECURITY DEFINER;

-- 10. ATUALIZAÇÃO DO TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_loja_id UUID;
BEGIN
  BEGIN
    v_loja_id := (new.raw_user_meta_data->>'loja_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_loja_id := NULL;
  END;

  INSERT INTO public.perfis (id, nome, perfil, loja_id)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'perfil', 'vendedor'),
    v_loja_id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. FUNÇÃO TRANSACIONAL DE ATIVAÇÃO / RENOVAÇÃO VIA TOKEN
CREATE OR REPLACE FUNCTION public.resgatar_token_ativacao(p_token TEXT, p_loja_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_dias_validade INTEGER;
  v_usado BOOLEAN;
BEGIN
  -- Busca o token na tabela
  SELECT dias_validade, usado INTO v_dias_validade, v_usado
  FROM public.tokens_ativacao
  WHERE token = p_token;

  -- Validações básicas
  IF v_dias_validade IS NULL THEN
    RAISE EXCEPTION 'Token de ativação inexistente ou inválido.';
  END IF;

  IF v_usado THEN
    RAISE EXCEPTION 'Este token de ativação já foi utilizado.';
  END IF;

  -- Atualiza o token como usado
  UPDATE public.tokens_ativacao
  SET usado = TRUE,
      usado_por_loja_id = p_loja_id,
      usado_em = now()
  WHERE token = p_token;

  -- Atualiza o tempo de licença da loja e reativa se bloqueada/expirada
  UPDATE public.lojas
  SET expiracao = GREATEST(COALESCE(expiracao, now()), now()) + (v_dias_validade || ' days')::INTERVAL,
      status = 'ativo'
  WHERE id = p_loja_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. HABILITAR E ATUALIZAR POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens_ativacao ENABLE ROW LEVEL SECURITY;

-- Remover políticas gerais antigas para recriá-las isoladas
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.perfis;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.fornecedores;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.produtos;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.encomendas;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.vendas;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.parcelas;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.logs_operacao;

-- Limpar novas políticas caso já tenham sido parcialmente criadas
DROP POLICY IF EXISTS "Planos visíveis para autenticados" ON public.planos;
DROP POLICY IF EXISTS "Superadmin gerencia planos" ON public.planos;
DROP POLICY IF EXISTS "Lojas visíveis para membros ou superadmin" ON public.lojas;
DROP POLICY IF EXISTS "Lojas visíveis para todos" ON public.lojas;
DROP POLICY IF EXISTS "Qualquer um pode cadastrar loja" ON public.lojas;
DROP POLICY IF EXISTS "Superadmin e Admins da loja editam" ON public.lojas;
DROP POLICY IF EXISTS "Superadmin remove loja" ON public.lojas;
DROP POLICY IF EXISTS "Superadmin gerencia tokens" ON public.tokens_ativacao;
DROP POLICY IF EXISTS "Autenticados leem tokens" ON public.tokens_ativacao;
DROP POLICY IF EXISTS "Autenticados atualizam tokens para uso" ON public.tokens_ativacao;
DROP POLICY IF EXISTS "Isolamento perfis" ON public.perfis;
DROP POLICY IF EXISTS "Superadmin e Admin gerenciam perfis" ON public.perfis;
DROP POLICY IF EXISTS "Isolamento clientes" ON public.clientes;
DROP POLICY IF EXISTS "Isolamento fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Isolamento produtos" ON public.produtos;
DROP POLICY IF EXISTS "Isolamento movimentacoes" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Isolamento encomendas" ON public.encomendas;
DROP POLICY IF EXISTS "Isolamento vendas" ON public.vendas;
DROP POLICY IF EXISTS "Isolamento parcelas" ON public.parcelas;
DROP POLICY IF EXISTS "Isolamento logs" ON public.logs_operacao;

-- Políticas de RLS da nova estrutura SaaS

-- Planos
CREATE POLICY "Planos visíveis para autenticados" ON public.planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmin gerencia planos" ON public.planos FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- Lojas
CREATE POLICY "Lojas visíveis para todos" ON public.lojas FOR SELECT USING (true);
CREATE POLICY "Qualquer um pode cadastrar loja" ON public.lojas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Superadmin e Admins da loja editam" ON public.lojas FOR UPDATE TO authenticated USING (id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (id = public.get_minha_loja_id() OR public.is_superadmin());
CREATE POLICY "Superadmin remove loja" ON public.lojas FOR DELETE TO authenticated USING (public.is_superadmin());

-- Tokens de Ativação
CREATE POLICY "Superadmin gerencia tokens" ON public.tokens_ativacao FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
CREATE POLICY "Autenticados leem tokens" ON public.tokens_ativacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados atualizam tokens para uso" ON public.tokens_ativacao FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Perfis
CREATE POLICY "Isolamento perfis" ON public.perfis FOR SELECT TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin());
CREATE POLICY "Superadmin e Admin gerenciam perfis" ON public.perfis FOR ALL TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (loja_id = public.get_minha_loja_id() OR public.is_superadmin());

-- Isolamento das Tabelas Operacionais
CREATE POLICY "Isolamento clientes" ON public.clientes FOR ALL TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (loja_id = public.get_minha_loja_id() OR public.is_superadmin());
CREATE POLICY "Isolamento fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (loja_id = public.get_minha_loja_id() OR public.is_superadmin());
CREATE POLICY "Isolamento produtos" ON public.produtos FOR ALL TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (loja_id = public.get_minha_loja_id() OR public.is_superadmin());
CREATE POLICY "Isolamento movimentacoes" ON public.movimentacoes_estoque FOR ALL TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (loja_id = public.get_minha_loja_id() OR public.is_superadmin());
CREATE POLICY "Isolamento encomendas" ON public.encomendas FOR ALL TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (loja_id = public.get_minha_loja_id() OR public.is_superadmin());
CREATE POLICY "Isolamento vendas" ON public.vendas FOR ALL TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (loja_id = public.get_minha_loja_id() OR public.is_superadmin());
CREATE POLICY "Isolamento parcelas" ON public.parcelas FOR ALL TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (loja_id = public.get_minha_loja_id() OR public.is_superadmin());
CREATE POLICY "Isolamento logs" ON public.logs_operacao FOR ALL TO authenticated USING (loja_id = public.get_minha_loja_id() OR public.is_superadmin()) WITH CHECK (loja_id = public.get_minha_loja_id() OR public.is_superadmin());
