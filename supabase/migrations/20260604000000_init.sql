-- ====================================================================
-- SCRIPT DE CRIAÇÃO DA ESTRUTURA DO ERRP - LOJA DE ROUPAS (SUPABASE)
-- ====================================================================
-- Este script cria todas as tabelas necessárias, configura as políticas
-- de segurança (Row Level Security - RLS) e preenche os dados iniciais.
-- ====================================================================

-- 1. Limpeza prévia (Opcional, comente se já tiver dados em produção)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.logs_operacao CASCADE;
DROP TABLE IF EXISTS public.parcelas CASCADE;
DROP TABLE IF EXISTS public.vendas CASCADE;
DROP TABLE IF EXISTS public.encomendas CASCADE;
DROP TABLE IF EXISTS public.movimentacoes_estoque CASCADE;
DROP TABLE IF EXISTS public.produtos CASCADE;
DROP TABLE IF EXISTS public.fornecedores CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.perfis CASCADE;

-- 2. Tabela de Perfis de Usuários (Vinculada ao auth.users do Supabase)
CREATE TABLE public.perfis (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    nome TEXT NOT NULL,
    perfil TEXT CHECK (perfil IN ('administrador', 'caixa', 'vendedor')) NOT NULL DEFAULT 'vendedor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Clientes
CREATE TABLE public.clientes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf TEXT,
    rg TEXT,
    data_nascimento TEXT,
    telefone TEXT,
    whatsapp TEXT,
    endereco TEXT,
    cidade TEXT,
    limite_credito NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    observacoes TEXT,
    foto TEXT,
    total_comprado NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total_divida NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    cashback_saldo NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Fornecedores
CREATE TABLE public.fornecedores (
    id TEXT PRIMARY KEY,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT NOT NULL,
    cnpj TEXT,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT,
    endereco TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Produtos
CREATE TABLE public.produtos (
    id TEXT PRIMARY KEY,
    codigo_interno TEXT NOT NULL,
    codigo_barras TEXT,
    nome TEXT NOT NULL,
    categoria TEXT,
    marca TEXT,
    cor TEXT,
    tamanhos JSONB NOT NULL DEFAULT '[]'::jsonb,
    fornecedor_id TEXT REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    preco_custo NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    preco_venda NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    estoque_minimo NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    foto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Movimentações de Estoque
CREATE TABLE public.movimentacoes_estoque (
    id TEXT PRIMARY KEY,
    produto_id TEXT REFERENCES public.produtos(id) ON DELETE CASCADE,
    tamanho TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('entrada', 'saida')) NOT NULL,
    motivo TEXT CHECK (motivo IN ('cadastro', 'venda', 'compra', 'ajuste', 'perda', 'troca')) NOT NULL,
    quantidade NUMERIC(10, 2) NOT NULL,
    data TEXT NOT NULL,
    observacao TEXT,
    usuario TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Encomendas
CREATE TABLE public.encomendas (
    id TEXT PRIMARY KEY,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE CASCADE,
    produto_id TEXT REFERENCES public.produtos(id) ON DELETE CASCADE,
    tamanho TEXT NOT NULL,
    quantidade NUMERIC(10, 2) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    data_pedido TEXT NOT NULL,
    previsao_entrega TEXT,
    status TEXT CHECK (status IN ('aguardando_compra', 'comprado', 'em_transporte', 'disponivel_retirada', 'entregue')) NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Vendas
CREATE TABLE public.vendas (
    id TEXT PRIMARY KEY,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
    data TEXT NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    desconto NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    formas_pagamento JSONB NOT NULL DEFAULT '[]'::jsonb,
    produtos JSONB NOT NULL DEFAULT '[]'::jsonb,
    usuario TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Parcelas (Crediário)
CREATE TABLE public.parcelas (
    id TEXT PRIMARY KEY,
    venda_id TEXT NOT NULL,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    total_parcelas INTEGER NOT NULL,
    data_vencimento TEXT NOT NULL,
    valor_original NUMERIC(10, 2) NOT NULL,
    valor_restante NUMERIC(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('em_aberto', 'vencida', 'paga_parcial', 'paga')) NOT NULL,
    pagamentos JSONB NOT NULL DEFAULT '[]'::jsonb,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabela de Logs de Operações
CREATE TABLE public.logs_operacao (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    usuario TEXT NOT NULL,
    acao TEXT NOT NULL,
    detalhe TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_operacao ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- POLÍTICAS DE ACESSO (Permitir CRUD completo para usuários autenticados)
-- ====================================================================
CREATE POLICY "Permitir tudo para autenticados" ON public.perfis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.movimentacoes_estoque FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.encomendas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.vendas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.parcelas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para autenticados" ON public.logs_operacao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================================================
-- TRIGGER PARA CADASTRAR PERFIL AUTOMÁTICO
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, perfil)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'perfil', 'vendedor')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ====================================================================
-- DADOS INICIAIS (SEED DATA)
-- ====================================================================

-- Clientes Iniciais
INSERT INTO public.clientes (id, nome, cpf, rg, data_nascimento, telefone, whatsapp, endereco, cidade, limite_credito, observacoes, total_comprado, total_divida) VALUES
('CLI1', 'Ana Silva Mendonça', '123.456.789-00', '12.345.678-9', '1990-05-15', '(11) 98888-7777', '11988887777', 'Rua das Flores, 123', 'São Paulo', 1500.00, 'Excelente cliente. Prefere tons escuros.', 950.00, 320.00),
('CLI2', 'Carlos Eduardo Souza', '987.654.321-11', NULL, '1985-11-22', '(11) 97777-6666', '11977776666', 'Av. Paulista, 1500, Apto 42', 'São Paulo', 800.00, 'Cliente inadimplente frequente. Cobrar com cuidado.', 450.00, 280.00),
('CLI3', 'Mariana Costa Oliveira', '456.789.123-22', NULL, '1995-02-08', '(11) 96666-5555', '11966665555', 'Rua Augusta, 888', 'São Paulo', 2000.00, 'Compra muito para as filhas.', 1200.00, 0.00);

-- Fornecedores Iniciais
INSERT INTO public.fornecedores (id, razao_social, nome_fantasia, cnpj, telefone, whatsapp, email, endereco, observacoes) VALUES
('FOR1', 'Confecções Modas Brasil Ltda', 'Moda Brasil', '12.345.678/0001-99', '(11) 3333-4444', '11933334444', 'comercial@modabrasil.com.br', 'Rua do Brás, 500, São Paulo - SP', 'Fornecedor principal de camisetas e jeans.'),
('FOR2', 'Cosméticos e Fragrâncias S.A.', 'Bella Donna', '98.765.432/0001-88', '(21) 2222-3333', '21922223333', 'pedidos@belladonna.com', 'Av. Rio Branco, 100, Rio de Janeiro - RJ', 'Fragrâncias e maquiagens importadas.');

-- Produtos Iniciais
INSERT INTO public.produtos (id, codigo_interno, codigo_barras, nome, categoria, marca, cor, tamanhos, fornecedor_id, preco_custo, preco_venda, estoque_minimo, foto) VALUES
('PROD1', '1001', '7891001200345', 'Camiseta Básica Algodão Premium', 'Roupas', 'Moda Brasil', 'Preto', '[{"tamanho": "P", "estoque": 15}, {"tamanho": "M", "estoque": 22}, {"tamanho": "G", "estoque": 8}, {"tamanho": "GG", "estoque": 3}]'::jsonb, 'FOR1', 25.00, 59.90, 5.00, NULL),
('PROD2', '1002', '7891001200352', 'Calça Jeans Slim Fit', 'Roupas', 'Moda Brasil', 'Azul Escuro', '[{"tamanho": "38", "estoque": 4}, {"tamanho": "40", "estoque": 12}, {"tamanho": "42", "estoque": 0}, {"tamanho": "44", "estoque": 2}]'::jsonb, 'FOR1', 55.00, 139.90, 3.00, NULL),
('PROD3', '1003', '7891001200369', 'Perfume Bella Donna Gold 100ml', 'Cosméticos', 'Bella Donna', 'Única', '[{"tamanho": "U", "estoque": 6}]'::jsonb, 'FOR2', 110.00, 249.90, 2.00, NULL);

-- Movimentações de Estoque Iniciais
INSERT INTO public.movimentacoes_estoque (id, produto_id, tamanho, tipo, motivo, quantidade, data, observacao, usuario) VALUES
('MOV1', 'PROD1', 'P', 'entrada', 'cadastro', 15.00, '2026-05-24', NULL, 'Administrador'),
('MOV2', 'PROD1', 'M', 'entrada', 'cadastro', 22.00, '2026-05-24', NULL, 'Administrador'),
('MOV3', 'PROD1', 'G', 'entrada', 'cadastro', 8.00, '2026-05-24', NULL, 'Administrador'),
('MOV4', 'PROD1', 'GG', 'entrada', 'cadastro', 3.00, '2026-05-24', NULL, 'Administrador'),
('MOV5', 'PROD2', '40', 'entrada', 'compra', 12.00, '2026-05-29', 'Pedido FOR-092', 'Administrador');

-- Encomendas Iniciais
INSERT INTO public.encomendas (id, cliente_id, produto_id, tamanho, quantidade, valor, data_pedido, previsao_entrega, status, observacoes) VALUES
('ENC1', 'CLI1', 'PROD3', 'U', 1.00, 249.90, '2026-05-31', '2026-06-08', 'aguardando_compra', 'Cliente quer embalagem para presente.'),
('ENC2', 'CLI3', 'PROD2', '42', 1.00, 139.90, '2026-06-01', '2026-06-05', 'em_transporte', 'Reservado assim que chegar no estoque.');

-- Vendas Iniciais
INSERT INTO public.vendas (id, cliente_id, data, subtotal, desconto, total, formas_pagamento, produtos, usuario) VALUES
('VEN1', 'CLI1', '2026-05-14', 300.00, 20.00, 280.00, '[{"tipo": "crediario", "valor": 280.00}]'::jsonb, '[{"produtoId": "PROD1", "nome": "Camiseta Básica Algodão Premium", "tamanho": "M", "quantidade": 2, "precoVenda": 59.90}, {"produtoId": "PROD2", "nome": "Calça Jeans Slim Fit", "tamanho": "40", "quantidade": 1, "precoVenda": 139.90}]'::jsonb, 'Vendedor'),
('VEN2', 'CLI2', '2026-04-19', 500.00, 0.00, 500.00, '[{"tipo": "dinheiro", "valor": 100.00}, {"tipo": "crediario", "valor": 400.00}]'::jsonb, '[{"produtoId": "PROD3", "nome": "Perfume Bella Donna Gold 100ml", "tamanho": "U", "quantidade": 2, "precoVenda": 249.90}]'::jsonb, 'Caixa');

-- Parcelas Iniciais
INSERT INTO public.parcelas (id, venda_id, cliente_id, numero_parcela, total_parcelas, data_vencimento, valor_original, valor_restante, status, pagamentos, observacoes) VALUES
('PARC1', 'VEN1', 'CLI1', 1, 2, '2026-05-24', 140.00, 0.00, 'paga', '[{"data": "2026-05-24", "valorRecebido": 140.00, "tipoPagamento": "pix"}]'::jsonb, 'Paga no dia'),
('PARC2', 'VEN1', 'CLI1', 2, 2, '2026-06-13', 140.00, 140.00, 'em_aberto', '[]'::jsonb, ''),
('PARC3', 'VEN2', 'CLI2', 1, 4, '2026-05-19', 100.00, 100.00, 'vencida', '[]'::jsonb, 'Atrasado'),
('PARC4', 'VEN2', 'CLI2', 2, 4, '2026-05-19', 100.00, 100.00, 'vencida', '[]'::jsonb, 'Atrasado'),
('PARC5', 'VEN2', 'CLI2', 3, 4, '2026-06-03', 100.00, 80.00, 'paga_parcial', '[{"data": "2026-06-01", "valorRecebido": 20.00, "tipoPagamento": "dinheiro", "destinoSaldo": "manter"}]'::jsonb, 'Deu entrada de R$ 20'),
('PARC6', 'VEN2', 'CLI2', 4, 4, '2026-06-18', 100.00, 100.00, 'em_aberto', '[]'::jsonb, '');

-- Log Inicial
INSERT INTO public.logs_operacao (id, data, usuario, acao, detalhe) VALUES
('LOG1', '2026-05-24T00:00:00.000Z', 'Sistema', 'Inicialização', 'Sistema configurado com dados de demonstração no Supabase.');
