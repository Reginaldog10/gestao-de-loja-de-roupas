-- Adiciona a coluna cashback_saldo à tabela de clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cashback_saldo NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;
