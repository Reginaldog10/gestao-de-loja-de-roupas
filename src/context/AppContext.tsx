import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateId } from '../utils/formatters';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

// --- DEFINIÇÕES DE INTERFACES ---

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  rg?: string;
  dataNascimento: string;
  telefone: string;
  whatsapp: string;
  endereco: string;
  cidade: string;
  limiteCredito: number;
  observacoes?: string;
  foto?: string;
  totalComprado: number;
  totalDivida: number;
  cashbackSaldo: number;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  observacoes?: string;
}

export interface GradeItem {
  tamanho: string;
  estoque: number;
}

export interface Produto {
  id: string;
  codigoInterno: string;
  codigoBarras: string;
  nome: string;
  categoria: string;
  marca: string;
  cor: string;
  tamanhos: GradeItem[];
  fornecedorId: string;
  precoCusto: number;
  precoVenda: number;
  estoqueMinimo: number;
  foto?: string;
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tamanho: string;
  tipo: 'entrada' | 'saida';
  motivo: 'cadastro' | 'venda' | 'compra' | 'ajuste' | 'perda' | 'troca';
  quantidade: number;
  data: string;
  observacao?: string;
  usuario: string;
}

export interface Encomenda {
  id: string;
  clienteId: string;
  produtoId: string;
  tamanho: string;
  quantidade: number;
  valor: number;
  dataPedido: string;
  previsaoEntrega: string;
  status: 'aguardando_compra' | 'comprado' | 'em_transporte' | 'disponivel_retirada' | 'entregue';
  observacoes?: string;
}

export interface FormaPagamento {
  tipo: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'crediario';
  valor: number;
}

export interface VendaItem {
  produtoId: string;
  nome: string;
  tamanho: string;
  quantidade: number;
  precoVenda: number;
}

export interface Venda {
  id: string;
  clienteId?: string;
  data: string;
  subtotal: number;
  desconto: number;
  total: number;
  formasPagamento: FormaPagamento[];
  produtos: VendaItem[];
  usuario: string;
}

export interface PagamentoParcela {
  data: string;
  valorRecebido: number;
  tipoPagamento: 'dinheiro' | 'pix' | 'debito' | 'credito';
  destinoSaldo?: 'manter' | 'transferir' | 'diluir' | 'criar_nova';
}

export interface Parcela {
  id: string;
  vendaId: string;
  clienteId: string;
  numeroParcela: number;
  totalParcelas: number;
  dataVencimento: string;
  valorOriginal: number;
  valorRestante: number;
  status: 'em_aberto' | 'vencida' | 'paga_parcial' | 'paga';
  pagamentos: PagamentoParcela[];
  observacoes?: string;
}

export interface LogOperacao {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  detalhe: string;
}

export interface SystemConfig {
  cashbackAtivo: boolean;
  cashbackPercentual: number;
  cashbackMinimoResgate: number;
  cashbackValidadeDias: number;
  mensagemAniversario: string;
}

// --- CONTEXTO & ESTADO GLOBAL ---

interface AppContextType {
  clientes: Cliente[];
  fornecedores: Fornecedor[];
  produtos: Produto[];
  movimentacoesEstoque: MovimentacaoEstoque[];
  encomendas: Encomenda[];
  vendas: Venda[];
  parcelas: Parcela[];
  logs: LogOperacao[];
  systemConfig: SystemConfig;
  updateSystemConfig: (updates: Partial<SystemConfig>) => void;
  
  // Operações
  addCliente: (cliente: Omit<Cliente, 'id' | 'totalComprado' | 'totalDivida' | 'cashbackSaldo'>) => string;
  updateCliente: (id: string, updates: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;
  
  addFornecedor: (fornecedor: Omit<Fornecedor, 'id'>) => string;
  updateFornecedor: (id: string, updates: Partial<Fornecedor>) => void;
  deleteFornecedor: (id: string) => void;
  
  addProduto: (produto: Omit<Produto, 'id' | 'codigoInterno'>) => string;
  updateProduto: (id: string, updates: Partial<Produto>) => void;
  duplicateProduto: (id: string) => string;
  deleteProduto: (id: string) => void;
  
  ajustarEstoqueManual: (produtoId: string, tamanho: string, quantidade: number, tipo: 'entrada' | 'saida', motivo: 'ajuste' | 'perda' | 'troca', obs?: string, usuario?: string) => void;
  
  addEncomenda: (encomenda: Omit<Encomenda, 'id' | 'dataPedido'>) => string;
  updateEncomendaStatus: (id: string, status: Encomenda['status']) => void;
  deleteEncomenda: (id: string) => void;
  
  registrarVenda: (venda: Omit<Venda, 'id' | 'data'>, parcelasPreviamenteGeradas?: Omit<Parcela, 'id' | 'vendaId'>[], usuario?: string, cashbackResgatado?: number) => string;
  
  receberParcela: (
    parcelaId: string, 
    valorRecebido: number, 
    tipoPagamento: PagamentoParcela['tipoPagamento'], 
    destinoSaldo: PagamentoParcela['destinoSaldo'],
    usuario?: string
  ) => void;
  
  renegociarDivida: (
    clienteId: string,
    parcelasIds: string[],
    novoValorTotal: number,
    numParcelas: number,
    periodicidade: 'semanal' | 'quinzenal' | 'mensal',
    vencimentoInicial: string,
    usuario?: string
  ) => void;

  registrarLog: (usuario: string, acao: string, detalhe: string) => void;
  
  // Utilidades do Sistema
  limparBanco: () => void;
  importarDados: (dadosJSON: string) => boolean;
  exportarDados: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- MASSA DE DADOS INICIAL FICTÍCIA ---

const getHojeOffset = (diasOffset: number): string => {
  const data = new Date();
  data.setDate(data.getDate() + diasOffset);
  return data.toISOString().split('T')[0];
};

const INITIAL_CLIENTES: Cliente[] = [
  {
    id: 'CLI1',
    nome: 'Ana Silva Mendonça',
    cpf: '123.456.789-00',
    rg: '12.345.678-9',
    dataNascimento: '1990-05-15',
    telefone: '(11) 98888-7777',
    whatsapp: '11988887777',
    endereco: 'Rua das Flores, 123',
    cidade: 'São Paulo',
    limiteCredito: 1500,
    observacoes: 'Excelente cliente. Prefere tons escuros.',
    totalComprado: 950.00,
    totalDivida: 320.00,
    cashbackSaldo: 0.00
  },
  {
    id: 'CLI2',
    nome: 'Carlos Eduardo Souza',
    cpf: '987.654.321-11',
    dataNascimento: '1985-11-22',
    telefone: '(11) 97777-6666',
    whatsapp: '11977776666',
    endereco: 'Av. Paulista, 1500, Apto 42',
    cidade: 'São Paulo',
    limiteCredito: 800,
    observacoes: 'Cliente inadimplente frequente. Cobrar com cuidado.',
    totalComprado: 450.00,
    totalDivida: 280.00,
    cashbackSaldo: 0.00
  },
  {
    id: 'CLI3',
    nome: 'Mariana Costa Oliveira',
    cpf: '456.789.123-22',
    dataNascimento: '1995-02-08',
    telefone: '(11) 96666-5555',
    whatsapp: '11966665555',
    endereco: 'Rua Augusta, 888',
    cidade: 'São Paulo',
    limiteCredito: 2000,
    observacoes: 'Compra muito para as filhas.',
    totalComprado: 1200.00,
    totalDivida: 0,
    cashbackSaldo: 0.00
  }
];

const INITIAL_FORNECEDORES: Fornecedor[] = [
  {
    id: 'FOR1',
    razaoSocial: 'Confecções Modas Brasil Ltda',
    nomeFantasia: 'Moda Brasil',
    cnpj: '12.345.678/0001-99',
    telefone: '(11) 3333-4444',
    whatsapp: '11933334444',
    email: 'comercial@modabrasil.com.br',
    endereco: 'Rua do Brás, 500, São Paulo - SP',
    observacoes: 'Fornecedor principal de camisetas e jeans.'
  },
  {
    id: 'FOR2',
    razaoSocial: 'Cosméticos e Fragrâncias S.A.',
    nomeFantasia: 'Bella Donna',
    cnpj: '98.765.432/0001-88',
    telefone: '(21) 2222-3333',
    whatsapp: '21922223333',
    email: 'pedidos@belladonna.com',
    endereco: 'Av. Rio Branco, 100, Rio de Janeiro - RJ',
    observacoes: 'Fragrâncias e maquiagens importadas.'
  }
];

const INITIAL_PRODUTOS: Produto[] = [
  {
    id: 'PROD1',
    codigoInterno: '1001',
    codigoBarras: '7891001200345',
    nome: 'Camiseta Básica Algodão Premium',
    categoria: 'Roupas',
    marca: 'Moda Brasil',
    cor: 'Preto',
    tamanhos: [
      { tamanho: 'P', estoque: 15 },
      { tamanho: 'M', estoque: 22 },
      { tamanho: 'G', estoque: 8 },
      { tamanho: 'GG', estoque: 3 }
    ],
    fornecedorId: 'FOR1',
    precoCusto: 25.00,
    precoVenda: 59.90,
    estoqueMinimo: 5
  },
  {
    id: 'PROD2',
    codigoInterno: '1002',
    codigoBarras: '7891001200352',
    nome: 'Calça Jeans Slim Fit',
    categoria: 'Roupas',
    marca: 'Moda Brasil',
    cor: 'Azul Escuro',
    tamanhos: [
      { tamanho: '38', estoque: 4 },
      { tamanho: '40', estoque: 12 },
      { tamanho: '42', estoque: 0 },
      { tamanho: '44', estoque: 2 }
    ],
    fornecedorId: 'FOR1',
    precoCusto: 55.00,
    precoVenda: 139.90,
    estoqueMinimo: 3
  },
  {
    id: 'PROD3',
    codigoInterno: '1003',
    codigoBarras: '7891001200369',
    nome: 'Perfume Bella Donna Gold 100ml',
    categoria: 'Cosméticos',
    marca: 'Bella Donna',
    cor: 'Única',
    tamanhos: [
      { tamanho: 'U', estoque: 6 }
    ],
    fornecedorId: 'FOR2',
    precoCusto: 110.00,
    precoVenda: 249.90,
    estoqueMinimo: 2
  }
];

const INITIAL_MOVIMENTACOES: MovimentacaoEstoque[] = [
  { id: 'MOV1', produtoId: 'PROD1', tamanho: 'P', tipo: 'entrada', motivo: 'cadastro', quantidade: 15, data: getHojeOffset(-10), usuario: 'Administrador' },
  { id: 'MOV2', produtoId: 'PROD1', tamanho: 'M', tipo: 'entrada', motivo: 'cadastro', quantidade: 22, data: getHojeOffset(-10), usuario: 'Administrador' },
  { id: 'MOV3', produtoId: 'PROD1', tamanho: 'G', tipo: 'entrada', motivo: 'cadastro', quantidade: 8, data: getHojeOffset(-10), usuario: 'Administrador' },
  { id: 'MOV4', produtoId: 'PROD1', tamanho: 'GG', tipo: 'entrada', motivo: 'cadastro', quantidade: 3, data: getHojeOffset(-10), usuario: 'Administrador' },
  { id: 'MOV5', produtoId: 'PROD2', tamanho: '40', tipo: 'entrada', motivo: 'compra', quantidade: 12, data: getHojeOffset(-5), observacao: 'Pedido FOR-092', usuario: 'Administrador' }
];

const INITIAL_ENCOMENDAS: Encomenda[] = [
  {
    id: 'ENC1',
    clienteId: 'CLI1',
    produtoId: 'PROD3',
    tamanho: 'U',
    quantidade: 1,
    valor: 249.90,
    dataPedido: getHojeOffset(-3),
    previsaoEntrega: getHojeOffset(5),
    status: 'aguardando_compra',
    observacoes: 'Cliente quer embalagem para presente.'
  },
  {
    id: 'ENC2',
    clienteId: 'CLI3',
    produtoId: 'PROD2',
    tamanho: '42',
    quantidade: 1,
    valor: 139.90,
    dataPedido: getHojeOffset(-2),
    previsaoEntrega: getHojeOffset(2),
    status: 'em_transporte',
    observacoes: 'Reservado assim que chegar no estoque.'
  }
];

const INITIAL_VENDAS: Venda[] = [
  {
    id: 'VEN1',
    clienteId: 'CLI1',
    data: getHojeOffset(-20),
    subtotal: 300.00,
    desconto: 20.00,
    total: 280.00,
    formasPagamento: [{ tipo: 'crediario', valor: 280.00 }],
    produtos: [
      { produtoId: 'PROD1', nome: 'Camiseta Básica Algodão Premium', tamanho: 'M', quantidade: 2, precoVenda: 59.90 },
      { produtoId: 'PROD2', nome: 'Calça Jeans Slim Fit', tamanho: '40', quantidade: 1, precoVenda: 139.90 }
    ],
    usuario: 'Vendedor'
  },
  {
    id: 'VEN2',
    clienteId: 'CLI2',
    data: getHojeOffset(-45),
    subtotal: 500.00,
    desconto: 0,
    total: 500.00,
    formasPagamento: [{ tipo: 'dinheiro', valor: 100.00 }, { tipo: 'crediario', valor: 400.00 }],
    produtos: [
      { produtoId: 'PROD3', nome: 'Perfume Bella Donna Gold 100ml', tamanho: 'U', quantidade: 2, precoVenda: 249.90 }
    ],
    usuario: 'Caixa'
  }
];

const INITIAL_PARCELAS: Parcela[] = [
  {
    id: 'PARC1',
    vendaId: 'VEN1',
    clienteId: 'CLI1',
    numeroParcela: 1,
    totalParcelas: 2,
    dataVencimento: getHojeOffset(-10),
    valorOriginal: 140.00,
    valorRestante: 0,
    status: 'paga',
    pagamentos: [{ data: getHojeOffset(-10), valorRecebido: 140.00, tipoPagamento: 'pix' }],
    observacoes: 'Paga no dia'
  },
  {
    id: 'PARC2',
    vendaId: 'VEN1',
    clienteId: 'CLI1',
    numeroParcela: 2,
    totalParcelas: 2,
    dataVencimento: getHojeOffset(10),
    valorOriginal: 140.00,
    valorRestante: 140.00,
    status: 'em_aberto',
    pagamentos: [],
    observacoes: ''
  },
  {
    id: 'PARC3',
    vendaId: 'VEN2',
    clienteId: 'CLI2',
    numeroParcela: 1,
    totalParcelas: 4,
    dataVencimento: getHojeOffset(-15),
    valorOriginal: 100.00,
    valorRestante: 100.00,
    status: 'vencida',
    pagamentos: [],
    observacoes: 'Atrasado'
  },
  {
    id: 'PARC4',
    vendaId: 'VEN2',
    clienteId: 'CLI2',
    numeroParcela: 2,
    totalParcelas: 4,
    dataVencimento: getHojeOffset(-15),
    valorOriginal: 100.00,
    valorRestante: 100.00,
    status: 'vencida',
    pagamentos: [],
    observacoes: 'Atrasado'
  },
  {
    id: 'PARC5',
    vendaId: 'VEN2',
    clienteId: 'CLI2',
    numeroParcela: 3,
    totalParcelas: 4,
    dataVencimento: getHojeOffset(0),
    valorOriginal: 100.00,
    valorRestante: 80.00,
    status: 'paga_parcial',
    pagamentos: [{ data: getHojeOffset(-2), valorRecebido: 20.00, tipoPagamento: 'dinheiro', destinoSaldo: 'manter' }],
    observacoes: 'Deu entrada de R$ 20'
  },
  {
    id: 'PARC6',
    vendaId: 'VEN2',
    clienteId: 'CLI2',
    numeroParcela: 4,
    totalParcelas: 4,
    dataVencimento: getHojeOffset(15),
    valorOriginal: 100.00,
    valorRestante: 100.00,
    status: 'em_aberto',
    pagamentos: [],
    observacoes: ''
  }
];

const INITIAL_LOGS: LogOperacao[] = [
  { id: 'LOG1', data: getHojeOffset(-10), usuario: 'Sistema', acao: 'Inicialização', detalhe: 'Sistema configurado com dados de demonstração.' }
];

// --- CONVERSORES DE MAPEAMENTO DE BANCO DE DADOS (SNAKE_CASE PARA CAMELCASE) ---

const mapClienteFromDB = (db: any): Cliente => ({
  id: db.id,
  nome: db.nome,
  cpf: db.cpf || '',
  rg: db.rg || '',
  dataNascimento: db.data_nascimento || '',
  telefone: db.telefone || '',
  whatsapp: db.whatsapp || '',
  endereco: db.endereco || '',
  cidade: db.cidade || '',
  limiteCredito: Number(db.limite_credito) || 0,
  observacoes: db.observacoes || '',
  foto: db.foto || '',
  totalComprado: Number(db.total_comprado) || 0,
  totalDivida: Number(db.total_divida) || 0,
  cashbackSaldo: Number(db.cashback_saldo) || 0
});

const mapClienteToDB = (c: Partial<Cliente>) => {
  const db: any = {};
  if (c.id !== undefined) db.id = c.id;
  if (c.nome !== undefined) db.nome = c.nome;
  if (c.cpf !== undefined) db.cpf = c.cpf;
  if (c.rg !== undefined) db.rg = c.rg;
  if (c.dataNascimento !== undefined) db.data_nascimento = c.dataNascimento;
  if (c.telefone !== undefined) db.telefone = c.telefone;
  if (c.whatsapp !== undefined) db.whatsapp = c.whatsapp;
  if (c.endereco !== undefined) db.endereco = c.endereco;
  if (c.cidade !== undefined) db.cidade = c.cidade;
  if (c.limiteCredito !== undefined) db.limite_credito = c.limiteCredito;
  if (c.observacoes !== undefined) db.observacoes = c.observacoes;
  if (c.foto !== undefined) db.foto = c.foto;
  if (c.totalComprado !== undefined) db.total_comprado = c.totalComprado;
  if (c.totalDivida !== undefined) db.total_divida = c.totalDivida;
  if (c.cashbackSaldo !== undefined) db.cashback_saldo = c.cashbackSaldo;
  return db;
};

const mapFornecedorFromDB = (db: any): Fornecedor => ({
  id: db.id,
  razaoSocial: db.razao_social,
  nomeFantasia: db.nome_fantasia,
  cnpj: db.cnpj || '',
  telefone: db.telefone || '',
  whatsapp: db.whatsapp || '',
  email: db.email || '',
  endereco: db.endereco || '',
  observacoes: db.observacoes || ''
});

const mapFornecedorToDB = (f: Partial<Fornecedor>) => {
  const db: any = {};
  if (f.id !== undefined) db.id = f.id;
  if (f.razaoSocial !== undefined) db.razao_social = f.razaoSocial;
  if (f.nomeFantasia !== undefined) db.nome_fantasia = f.nomeFantasia;
  if (f.cnpj !== undefined) db.cnpj = f.cnpj;
  if (f.telefone !== undefined) db.telefone = f.telefone;
  if (f.whatsapp !== undefined) db.whatsapp = f.whatsapp;
  if (f.email !== undefined) db.email = f.email;
  if (f.endereco !== undefined) db.endereco = f.endereco;
  if (f.observacoes !== undefined) db.observacoes = f.observacoes;
  return db;
};

const mapProdutoFromDB = (db: any): Produto => ({
  id: db.id,
  codigoInterno: db.codigo_interno,
  codigoBarras: db.codigo_barras || '',
  nome: db.nome,
  categoria: db.categoria || '',
  marca: db.marca || '',
  cor: db.cor || '',
  tamanhos: db.tamanhos || [],
  fornecedorId: db.fornecedor_id || '',
  precoCusto: Number(db.preco_custo) || 0,
  precoVenda: Number(db.preco_venda) || 0,
  estoqueMinimo: Number(db.estoque_minimo) || 0,
  foto: db.foto || ''
});

const mapProdutoToDB = (p: Partial<Produto>) => {
  const db: any = {};
  if (p.id !== undefined) db.id = p.id;
  if (p.codigoInterno !== undefined) db.codigo_interno = p.codigoInterno;
  if (p.codigoBarras !== undefined) db.codigo_barras = p.codigoBarras;
  if (p.nome !== undefined) db.nome = p.nome;
  if (p.categoria !== undefined) db.categoria = p.categoria;
  if (p.marca !== undefined) db.marca = p.marca;
  if (p.cor !== undefined) db.cor = p.cor;
  if (p.tamanhos !== undefined) db.tamanhos = p.tamanhos;
  if (p.fornecedorId !== undefined) db.fornecedor_id = p.fornecedorId;
  if (p.precoCusto !== undefined) db.preco_custo = p.precoCusto;
  if (p.precoVenda !== undefined) db.preco_venda = p.precoVenda;
  if (p.estoqueMinimo !== undefined) db.estoque_minimo = p.estoqueMinimo;
  if (p.foto !== undefined) db.foto = p.foto;
  return db;
};

const mapMovimentacaoFromDB = (db: any): MovimentacaoEstoque => ({
  id: db.id,
  produtoId: db.produto_id,
  tamanho: db.tamanho,
  tipo: db.tipo,
  motivo: db.motivo,
  quantidade: Number(db.quantidade),
  data: db.data,
  observacao: db.observacao || '',
  usuario: db.usuario
});

const mapMovimentacaoToDB = (m: Partial<MovimentacaoEstoque>) => {
  const db: any = {};
  if (m.id !== undefined) db.id = m.id;
  if (m.produtoId !== undefined) db.produto_id = m.produtoId;
  if (m.tamanho !== undefined) db.tamanho = m.tamanho;
  if (m.tipo !== undefined) db.tipo = m.tipo;
  if (m.motivo !== undefined) db.motivo = m.motivo;
  if (m.quantidade !== undefined) db.quantidade = m.quantidade;
  if (m.data !== undefined) db.data = m.data;
  if (m.observacao !== undefined) db.observacao = m.observacao;
  if (m.usuario !== undefined) db.usuario = m.usuario;
  return db;
};

const mapEncomendaFromDB = (db: any): Encomenda => ({
  id: db.id,
  clienteId: db.cliente_id,
  produtoId: db.produto_id,
  tamanho: db.tamanho,
  quantidade: Number(db.quantidade),
  valor: Number(db.valor),
  dataPedido: db.data_pedido,
  previsaoEntrega: db.previsao_entrega || '',
  status: db.status,
  observacoes: db.observacoes || ''
});

const mapEncomendaToDB = (e: Partial<Encomenda>) => {
  const db: any = {};
  if (e.id !== undefined) db.id = e.id;
  if (e.clienteId !== undefined) db.cliente_id = e.clienteId;
  if (e.produtoId !== undefined) db.produto_id = e.produtoId;
  if (e.tamanho !== undefined) db.tamanho = e.tamanho;
  if (e.quantidade !== undefined) db.quantidade = e.quantidade;
  if (e.valor !== undefined) db.valor = e.valor;
  if (e.dataPedido !== undefined) db.data_pedido = e.dataPedido;
  if (e.previsaoEntrega !== undefined) db.previsao_entrega = e.previsaoEntrega;
  if (e.status !== undefined) db.status = e.status;
  if (e.observacoes !== undefined) db.observacoes = e.observacoes;
  return db;
};

const mapVendaFromDB = (db: any): Venda => ({
  id: db.id,
  clienteId: db.cliente_id || undefined,
  data: db.data,
  subtotal: Number(db.subtotal),
  desconto: Number(db.desconto),
  total: Number(db.total),
  formasPagamento: db.formas_pagamento || [],
  produtos: db.produtos || [],
  usuario: db.usuario
});

const mapVendaToDB = (v: Partial<Venda>) => {
  const db: any = {};
  if (v.id !== undefined) db.id = v.id;
  if (v.clienteId !== undefined) db.cliente_id = v.clienteId || null;
  if (v.data !== undefined) db.data = v.data;
  if (v.subtotal !== undefined) db.subtotal = v.subtotal;
  if (v.desconto !== undefined) db.desconto = v.desconto;
  if (v.total !== undefined) db.total = v.total;
  if (v.formasPagamento !== undefined) db.formas_pagamento = v.formasPagamento;
  if (v.produtos !== undefined) db.produtos = v.produtos;
  if (v.usuario !== undefined) db.usuario = v.usuario;
  return db;
};

const mapParcelaFromDB = (db: any): Parcela => ({
  id: db.id,
  vendaId: db.venda_id,
  clienteId: db.cliente_id,
  numeroParcela: Number(db.numero_parcela),
  totalParcelas: Number(db.total_parcelas),
  dataVencimento: db.data_vencimento,
  valorOriginal: Number(db.valor_original),
  valorRestante: Number(db.valor_restante),
  status: db.status,
  pagamentos: db.pagamentos || [],
  observacoes: db.observacoes || ''
});

const mapParcelaToDB = (p: Partial<Parcela>) => {
  const db: any = {};
  if (p.id !== undefined) db.id = p.id;
  if (p.vendaId !== undefined) db.venda_id = p.vendaId;
  if (p.clienteId !== undefined) db.cliente_id = p.clienteId;
  if (p.numeroParcela !== undefined) db.numero_parcela = p.numeroParcela;
  if (p.totalParcelas !== undefined) db.total_parcelas = p.totalParcelas;
  if (p.dataVencimento !== undefined) db.data_vencimento = p.dataVencimento;
  if (p.valorOriginal !== undefined) db.valor_original = p.valorOriginal;
  if (p.valorRestante !== undefined) db.valor_restante = p.valorRestante;
  if (p.status !== undefined) db.status = p.status;
  if (p.pagamentos !== undefined) db.pagamentos = p.pagamentos;
  if (p.observacoes !== undefined) db.observacoes = p.observacoes;
  return db;
};

const mapLogFromDB = (db: any): LogOperacao => ({
  id: db.id,
  data: db.data,
  usuario: db.usuario,
  acao: db.acao,
  detalhe: db.detalhe || ''
});

const mapLogToDB = (l: Partial<LogOperacao>) => {
  const db: any = {};
  if (l.id !== undefined) db.id = l.id;
  if (l.data !== undefined) db.data = l.data;
  if (l.usuario !== undefined) db.usuario = l.usuario;
  if (l.acao !== undefined) db.acao = l.acao;
  if (l.detalhe !== undefined) db.detalhe = l.detalhe;
  return db;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, lojaId } = useAuth();
  
  // --- INICIALIZAÇÃO DE ESTADOS ---
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoesEstoque, setMovimentacoesEstoque] = useState<MovimentacaoEstoque[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [logs, setLogs] = useState<LogOperacao[]>([]);

  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem('erp_system_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      cashbackAtivo: false,
      cashbackPercentual: 5,
      cashbackMinimoResgate: 10,
      cashbackValidadeDias: 0,
      mensagemAniversario: "Olá {nome}, a Glow Modas deseja a você um feliz aniversário! Para comemorar, temos um presente especial para você na nossa loja. Venha nos visitar!"
    };
  });

  const updateSystemConfig = (updates: Partial<SystemConfig>) => {
    setSystemConfig(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('erp_system_config', JSON.stringify(next));
      return next;
    });
  };

  // Carregar dados a partir do Supabase ou Fallback para o localStorage/mocks
  useEffect(() => {
    if (!user) {
      setClientes([]);
      setFornecedores([]);
      setProdutos([]);
      setMovimentacoesEstoque([]);
      setEncomendas([]);
      setVendas([]);
      setParcelas([]);
      setLogs([]);
      return;
    }

    const carregarTudo = async () => {
      try {
        const [
          resClientes,
          resFornecedores,
          resProdutos,
          resMovimentacoes,
          resEncomendas,
          resVendas,
          resParcelas,
          resLogs
        ] = await Promise.all([
          supabase.from('clientes').select('*').order('nome'),
          supabase.from('fornecedores').select('*').order('nome_fantasia'),
          supabase.from('produtos').select('*').order('codigo_interno'),
          supabase.from('movimentacoes_estoque').select('*').order('created_at', { ascending: false }),
          supabase.from('encomendas').select('*').order('data_pedido', { ascending: false }),
          supabase.from('vendas').select('*').order('data', { ascending: false }),
          supabase.from('parcelas').select('*').order('data_vencimento'),
          supabase.from('logs_operacao').select('*').order('data', { ascending: false })
        ]);

        if (resClientes.error && resClientes.error.code === '42P01') {
          throw new Error('Banco de dados não estruturado. fallback local.');
        }

        setClientes((resClientes.data || []).map(mapClienteFromDB));
        setFornecedores((resFornecedores.data || []).map(mapFornecedorFromDB));
        setProdutos((resProdutos.data || []).map(mapProdutoFromDB));
        setMovimentacoesEstoque((resMovimentacoes.data || []).map(mapMovimentacaoFromDB));
        setEncomendas((resEncomendas.data || []).map(mapEncomendaFromDB));
        setVendas((resVendas.data || []).map(mapVendaFromDB));
        setParcelas((resParcelas.data || []).map(mapParcelaFromDB));
        setLogs((resLogs.data || []).map(mapLogFromDB));
        
        console.log('Dados carregados com sucesso do Supabase.');
      } catch (err) {
        console.warn('Banco offline ou não configurado. Utilizando localStorage.', err);
        
        const localGet = <T,>(key: string, initial: T): T => {
          const val = localStorage.getItem(key);
          return val ? JSON.parse(val) : initial;
        };

        if (!localStorage.getItem('erp_clientes')) {
          localStorage.setItem('erp_clientes', JSON.stringify(INITIAL_CLIENTES));
          localStorage.setItem('erp_fornecedores', JSON.stringify(INITIAL_FORNECEDORES));
          localStorage.setItem('erp_produtos', JSON.stringify(INITIAL_PRODUTOS));
          localStorage.setItem('erp_movimentacoes', JSON.stringify(INITIAL_MOVIMENTACOES));
          localStorage.setItem('erp_encomendas', JSON.stringify(INITIAL_ENCOMENDAS));
          localStorage.setItem('erp_vendas', JSON.stringify(INITIAL_VENDAS));
          localStorage.setItem('erp_parcelas', JSON.stringify(INITIAL_PARCELAS));
          localStorage.setItem('erp_logs', JSON.stringify(INITIAL_LOGS));
        }

        setClientes(localGet('erp_clientes', INITIAL_CLIENTES));
        setFornecedores(localGet('erp_fornecedores', INITIAL_FORNECEDORES));
        setProdutos(localGet('erp_produtos', INITIAL_PRODUTOS));
        setMovimentacoesEstoque(localGet('erp_movimentacoes', INITIAL_MOVIMENTACOES));
        setEncomendas(localGet('erp_encomendas', INITIAL_ENCOMENDAS));
        setVendas(localGet('erp_vendas', INITIAL_VENDAS));
        setParcelas(localGet('erp_parcelas', INITIAL_PARCELAS));
        setLogs(localGet('erp_logs', INITIAL_LOGS));
      }
    };

    carregarTudo();
  }, [user]);

  // Monitoramento e atualização automática do status das parcelas vencidas
  useEffect(() => {
    if (parcelas.length === 0) return;
    
    const hojeStr = new Date().toISOString().split('T')[0];
    let mudou = false;

    const novasParcelas = parcelas.map(p => {
      if ((p.status === 'em_aberto' || p.status === 'paga_parcial') && p.dataVencimento < hojeStr) {
        mudou = true;
        return { ...p, status: 'vencida' as const };
      }
      if (p.status === 'vencida' && p.dataVencimento >= hojeStr) {
        mudou = true;
        return { ...p, status: p.valorRestante < p.valorOriginal ? ('paga_parcial' as const) : ('em_aberto' as const) };
      }
      return p;
    });

    if (mudou) {
      setParcelas(novasParcelas);
      localStorage.setItem('erp_parcelas', JSON.stringify(novasParcelas));
      
      // Sincronizar atualizações no Supabase
      if (user) {
        const parcelasAfetadas = novasParcelas.filter((p, i) => p.status !== parcelas[i].status);
        const dbParcelas = parcelasAfetadas.map(p => {
          const dbP = mapParcelaToDB(p);
          if (lojaId) dbP.loja_id = lojaId;
          return dbP;
        });
        supabase.from('parcelas').upsert(dbParcelas).then(({ error }) => {
          if (error) console.error('Erro ao sincronizar parcelas vencidas:', error);
        });
      }
    }
  }, [parcelas, user]);

  // Sincronização auxiliar no localStorage (cache/fallback local)
  const saveAndSet = <T,>(key: string, data: T, setter: React.Dispatch<React.SetStateAction<T>>) => {
    setter(data);
    localStorage.setItem(key, JSON.stringify(data));
  };

  // --- LOGS DE OPERAÇÃO ---
  const registrarLog = (usuario: string, acao: string, detalhe: string) => {
    const novoLog: LogOperacao = {
      id: 'LOG_' + generateId(),
      data: new Date().toISOString(),
      usuario,
      acao,
      detalhe
    };
    saveAndSet('erp_logs', [novoLog, ...logs], setLogs);

    if (user) {
      const dbLog = mapLogToDB(novoLog);
      if (lojaId) dbLog.loja_id = lojaId;
      supabase.from('logs_operacao').insert(dbLog).then(({ error }) => {
        if (error) console.error('Erro ao registrar log no Supabase:', error);
      });
    }
  };

  // --- OPERAÇÕES CLIENTE ---
  const addCliente = (c: Omit<Cliente, 'id' | 'totalComprado' | 'totalDivida' | 'cashbackSaldo'>): string => {
    const id = 'CLI_' + generateId();
    const novo: Cliente = {
      ...c,
      id,
      totalComprado: 0,
      totalDivida: 0,
      cashbackSaldo: 0
    };
    saveAndSet('erp_clientes', [...clientes, novo], setClientes);

    if (user) {
      const dbCliente = mapClienteToDB(novo);
      if (lojaId) dbCliente.loja_id = lojaId;
      supabase.from('clientes').insert(dbCliente).then(({ error }) => {
        if (error) console.error('Erro ao salvar cliente no Supabase:', error);
      });
    }

    registrarLog('Usuário', 'Cadastro Cliente', `Cadastrou o cliente ${c.nome}`);
    return id;
  };

  const updateCliente = (id: string, updates: Partial<Cliente>) => {
    const novos = clientes.map(c => (c.id === id ? { ...c, ...updates } : c));
    saveAndSet('erp_clientes', novos, setClientes);

    if (user) {
      supabase.from('clientes').update(mapClienteToDB(updates)).eq('id', id).then(({ error }) => {
        if (error) console.error('Erro ao atualizar cliente no Supabase:', error);
      });
    }

    const cli = clientes.find(c => c.id === id);
    registrarLog('Usuário', 'Alteração Cliente', `Alterou dados do cliente ${cli?.nome}`);
  };

  const deleteCliente = (id: string) => {
    const cli = clientes.find(c => c.id === id);
    saveAndSet('erp_clientes', clientes.filter(c => c.id !== id), setClientes);

    if (user) {
      supabase.from('clientes').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Erro ao deletar cliente no Supabase:', error);
      });
    }

    registrarLog('Usuário', 'Exclusão Cliente', `Excluiu o cliente ${cli?.nome}`);
  };

  // --- OPERAÇÕES FORNECEDOR ---
  const addFornecedor = (f: Omit<Fornecedor, 'id'>): string => {
    const id = 'FOR_' + generateId();
    const novo: Fornecedor = { ...f, id };
    saveAndSet('erp_fornecedores', [...fornecedores, novo], setFornecedores);

    if (user) {
      const dbFornecedor = mapFornecedorToDB(novo);
      if (lojaId) dbFornecedor.loja_id = lojaId;
      supabase.from('fornecedores').insert(dbFornecedor).then(({ error }) => {
        if (error) console.error('Erro ao salvar fornecedor no Supabase:', error);
      });
    }

    registrarLog('Usuário', 'Cadastro Fornecedor', `Cadastrou fornecedor ${f.nomeFantasia}`);
    return id;
  };

  const updateFornecedor = (id: string, updates: Partial<Fornecedor>) => {
    const novos = fornecedores.map(f => (f.id === id ? { ...f, ...updates } : f));
    saveAndSet('erp_fornecedores', novos, setFornecedores);

    if (user) {
      supabase.from('fornecedores').update(mapFornecedorToDB(updates)).eq('id', id).then(({ error }) => {
        if (error) console.error('Erro ao atualizar fornecedor no Supabase:', error);
      });
    }

    const forn = fornecedores.find(f => f.id === id);
    registrarLog('Usuário', 'Alteração Fornecedor', `Alterou dados do fornecedor ${forn?.nomeFantasia}`);
  };

  const deleteFornecedor = (id: string) => {
    const forn = fornecedores.find(f => f.id === id);
    saveAndSet('erp_fornecedores', fornecedores.filter(f => f.id !== id), setFornecedores);

    if (user) {
      supabase.from('fornecedores').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Erro ao deletar fornecedor no Supabase:', error);
      });
    }

    registrarLog('Usuário', 'Exclusão Fornecedor', `Excluiu fornecedor ${forn?.nomeFantasia}`);
  };

  // --- OPERAÇÕES PRODUTO ---
  const addProduto = (p: Omit<Produto, 'id' | 'codigoInterno'>): string => {
    const id = 'PROD_' + generateId();
    const maxCod = produtos.reduce((max, prod) => Math.max(max, parseInt(prod.codigoInterno) || 0), 1000);
    const codigoInterno = (maxCod + 1).toString();

    const novo: Produto = { ...p, id, codigoInterno };
    saveAndSet('erp_produtos', [...produtos, novo], setProdutos);

    if (user) {
      const dbProduto = mapProdutoToDB(novo);
      if (lojaId) dbProduto.loja_id = lojaId;
      supabase.from('produtos').insert(dbProduto).then(({ error }) => {
        if (error) console.error('Erro ao salvar produto no Supabase:', error);
      });
    }

    // Gerar movimentações de estoque iniciais para cada tamanho
    const novasMovs: MovimentacaoEstoque[] = [];
    p.tamanhos.forEach(t => {
      if (t.estoque > 0) {
        const novaMov: MovimentacaoEstoque = {
          id: 'MOV_' + generateId(),
          produtoId: id,
          tamanho: t.tamanho,
          tipo: 'entrada',
          motivo: 'cadastro',
          quantidade: t.estoque,
          data: new Date().toISOString().split('T')[0],
          observacao: 'Carga inicial no cadastro',
          usuario: 'Usuário'
        };
        novasMovs.push(novaMov);

        if (user) {
          const dbMov = mapMovimentacaoToDB(novaMov);
          if (lojaId) dbMov.loja_id = lojaId;
          supabase.from('movimentacoes_estoque').insert(dbMov).then(({ error }) => {
            if (error) console.error('Erro ao salvar movimentação inicial no Supabase:', error);
          });
        }
      }
    });

    if (novasMovs.length > 0) {
      saveAndSet('erp_movimentacoes', [...novasMovs, ...movimentacoesEstoque], setMovimentacoesEstoque);
    }

    registrarLog('Usuário', 'Cadastro Produto', `Cadastrou o produto ${p.nome} (Código: ${codigoInterno})`);
    return id;
  };

  const updateProduto = (id: string, updates: Partial<Produto>) => {
    const novos = produtos.map(p => (p.id === id ? { ...p, ...updates } : p));
    saveAndSet('erp_produtos', novos, setProdutos);

    if (user) {
      supabase.from('produtos').update(mapProdutoToDB(updates)).eq('id', id).then(({ error }) => {
        if (error) console.error('Erro ao atualizar produto no Supabase:', error);
      });
    }

    const prod = produtos.find(p => p.id === id);
    registrarLog('Usuário', 'Alteração Produto', `Alterou dados do produto ${prod?.nome}`);
  };

  const duplicateProduto = (id: string): string => {
    const original = produtos.find(p => p.id === id);
    if (!original) return '';

    const { id: _, codigoInterno: __, ...resto } = original;
    const novosResto = {
      ...resto,
      nome: `${original.nome} (Cópia)`,
      codigoBarras: original.codigoBarras ? `${original.codigoBarras}-C` : '',
      tamanhos: original.tamanhos.map(t => ({ tamanho: t.tamanho, estoque: 0 }))
    };

    return addProduto(novosResto);
  };

  const deleteProduto = (id: string) => {
    const prod = produtos.find(p => p.id === id);
    saveAndSet('erp_produtos', produtos.filter(p => p.id !== id), setProdutos);

    if (user) {
      supabase.from('produtos').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Erro ao deletar produto no Supabase:', error);
      });
    }

    registrarLog('Usuário', 'Exclusão Produto', `Excluiu o produto ${prod?.nome}`);
  };

  // --- MOVIMENTAÇÃO DE ESTOQUE MANUAL ---
  const ajustarEstoqueManual = (
    produtoId: string, 
    tamanho: string, 
    quantidade: number, 
    tipo: 'entrada' | 'saida', 
    motivo: 'ajuste' | 'perda' | 'troca', 
    obs?: string,
    usuario: string = 'Usuário'
  ) => {
    const novosProdutos = produtos.map(p => {
      if (p.id !== produtoId) return p;
      const novosTamanhos = p.tamanhos.map(t => {
        if (t.tamanho !== tamanho) return t;
        const diff = tipo === 'entrada' ? quantidade : -quantidade;
        return { ...t, estoque: Math.max(0, t.estoque + diff) };
      });
      return { ...p, tamanhos: novosTamanhos };
    });
    
    saveAndSet('erp_produtos', novosProdutos, setProdutos);

    const prod = novosProdutos.find(p => p.id === produtoId);
    if (user && prod) {
      supabase.from('produtos').update({ tamanhos: prod.tamanhos }).eq('id', produtoId).then(({ error }) => {
        if (error) console.error('Erro ao atualizar tamanhos do produto no Supabase:', error);
      });
    }

    const novaMov: MovimentacaoEstoque = {
      id: 'MOV_' + generateId(),
      produtoId,
      tamanho,
      tipo,
      motivo,
      quantidade,
      data: new Date().toISOString().split('T')[0],
      observacao: obs,
      usuario
    };

    saveAndSet('erp_movimentacoes', [novaMov, ...movimentacoesEstoque], setMovimentacoesEstoque);

    if (user) {
      const dbMov = mapMovimentacaoToDB(novaMov);
      if (lojaId) dbMov.loja_id = lojaId;
      supabase.from('movimentacoes_estoque').insert(dbMov).then(({ error }) => {
        if (error) console.error('Erro ao salvar movimentação no Supabase:', error);
      });
    }

    registrarLog(usuario, 'Ajuste Estoque', `Ajuste manual (${tipo === 'entrada' ? '+' : '-'}${quantidade}) no produto ${prod?.nome} (Tamanho: ${tamanho})`);
  };

  // --- OPERAÇÕES ENCOMENDAS ---
  const addEncomenda = (e: Omit<Encomenda, 'id' | 'dataPedido'>): string => {
    const id = 'ENC_' + generateId();
    const nova: Encomenda = {
      ...e,
      id,
      dataPedido: new Date().toISOString().split('T')[0]
    };
    saveAndSet('erp_encomendas', [...encomendas, nova], setEncomendas);

    if (user) {
      const dbEncomenda = mapEncomendaToDB(nova);
      if (lojaId) dbEncomenda.loja_id = lojaId;
      supabase.from('encomendas').insert(dbEncomenda).then(({ error }) => {
        if (error) console.error('Erro ao salvar encomenda no Supabase:', error);
      });
    }

    const cli = clientes.find(c => c.id === e.clienteId);
    const prod = produtos.find(p => p.id === e.produtoId);
    registrarLog('Usuário', 'Encomenda Criada', `Encomenda criada para ${cli?.nome} - Produto ${prod?.nome}`);
    return id;
  };

  const updateEncomendaStatus = (id: string, status: Encomenda['status']) => {
    const novas = encomendas.map(e => (e.id === id ? { ...e, status } : e));
    saveAndSet('erp_encomendas', novas, setEncomendas);

    if (user) {
      supabase.from('encomendas').update({ status }).eq('id', id).then(({ error }) => {
        if (error) console.error('Erro ao atualizar status da encomenda no Supabase:', error);
      });
    }

    const enc = encomendas.find(e => e.id === id);
    const cli = clientes.find(c => c.id === enc?.clienteId);
    registrarLog('Usuário', 'Alteração Status Encomenda', `Encomenda do cliente ${cli?.nome} alterada para: ${status.replace('_', ' ')}`);
  };

  const deleteEncomenda = (id: string) => {
    saveAndSet('erp_encomendas', encomendas.filter(e => e.id !== id), setEncomendas);

    if (user) {
      supabase.from('encomendas').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Erro ao deletar encomenda no Supabase:', error);
      });
    }

    registrarLog('Usuário', 'Exclusão Encomenda', `Excluiu encomenda ID ${id}`);
  };

  // --- VENDAS & CREDIÁRIO (CORE) ---
  const registrarVenda = (
    v: Omit<Venda, 'id' | 'data'>, 
    parcelasPreviamenteGeradas?: Omit<Parcela, 'id' | 'vendaId'>[],
    usuario: string = 'Vendedor',
    cashbackResgatado: number = 0
  ): string => {
    const vendaId = 'VEN_' + generateId();
    const dataVenda = new Date().toISOString().split('T')[0];

    const novaVenda: Venda = {
      ...v,
      id: vendaId,
      data: dataVenda,
      usuario
    };

    saveAndSet('erp_vendas', [novaVenda, ...vendas], setVendas);

    if (user) {
      const dbVenda = mapVendaToDB(novaVenda);
      if (lojaId) dbVenda.loja_id = lojaId;
      supabase.from('vendas').insert(dbVenda).then(({ error }) => {
        if (error) console.error('Erro ao salvar venda no Supabase:', error);
      });
    }

    // Abater Estoque e Registrar Movimentação para cada produto vendido
    const novosProdutos = [...produtos];
    const novasMovs: MovimentacaoEstoque[] = [];

    v.produtos.forEach(item => {
      const prodIdx = novosProdutos.findIndex(p => p.id === item.produtoId);
      if (prodIdx !== -1) {
        const prod = novosProdutos[prodIdx];
        const novosTamanhos = prod.tamanhos.map(t => {
          if (t.tamanho === item.tamanho) {
            return { ...t, estoque: Math.max(0, t.estoque - item.quantidade) };
          }
          return t;
        });
        novosProdutos[prodIdx] = { ...prod, tamanhos: novosTamanhos };

        const novaMov: MovimentacaoEstoque = {
          id: 'MOV_' + generateId(),
          produtoId: item.produtoId,
          tamanho: item.tamanho,
          tipo: 'saida',
          motivo: 'venda',
          quantidade: item.quantidade,
          data: dataVenda,
          observacao: `Venda ${vendaId}`,
          usuario
        };
        novasMovs.push(novaMov);

        if (user) {
          const dbMov = mapMovimentacaoToDB(novaMov);
          if (lojaId) dbMov.loja_id = lojaId;
          supabase.from('movimentacoes_estoque').insert(dbMov).then(({ error }) => {
            if (error) console.error('Erro ao salvar movimentação de venda no Supabase:', error);
          });
        }
      }
    });

    setProdutos(novosProdutos);
    localStorage.setItem('erp_produtos', JSON.stringify(novosProdutos));

    const novasMovimentacoes = [...novasMovs, ...movimentacoesEstoque];
    setMovimentacoesEstoque(novasMovimentacoes);
    localStorage.setItem('erp_movimentacoes', JSON.stringify(novasMovimentacoes));

    // Processar Crediário se aplicável
    let valorFinanciadoCrediario = 0;
    const credForma = v.formasPagamento.find(f => f.tipo === 'crediario');
    
    if (credForma && credForma.valor > 0 && v.clienteId && parcelasPreviamenteGeradas) {
      valorFinanciadoCrediario = credForma.valor;
      
      const novasParcelasSalvas: Parcela[] = parcelasPreviamenteGeradas.map(p => ({
        ...p,
        id: 'PARC_' + generateId(),
        vendaId
      }));

      saveAndSet('erp_parcelas', [...novasParcelasSalvas, ...parcelas], setParcelas);

      if (user) {
        const dbParcelas = novasParcelasSalvas.map(p => {
          const dbP = mapParcelaToDB(p);
          if (lojaId) dbP.loja_id = lojaId;
          return dbP;
        });
        supabase.from('parcelas').insert(dbParcelas).then(({ error }) => {
          if (error) console.error('Erro ao salvar parcelas no Supabase:', error);
        });
      }
    }

    // Atualizar Total Comprado, Dívida e Saldo de Cashback do Cliente
    if (v.clienteId) {
      const valorInstantaneo = v.formasPagamento
        .filter(f => f.tipo !== 'crediario')
        .reduce((sum, f) => sum + f.valor, 0);

      const cashbackGanho = systemConfig.cashbackAtivo
        ? Number((valorInstantaneo * (systemConfig.cashbackPercentual / 100)).toFixed(2))
        : 0;

      const novosClientes = clientes.map(c => {
        if (c.id === v.clienteId) {
          const novoCli = {
            ...c,
            totalComprado: c.totalComprado + v.total,
            totalDivida: c.totalDivida + valorFinanciadoCrediario,
            cashbackSaldo: Math.max(0, Number((c.cashbackSaldo + cashbackGanho - cashbackResgatado).toFixed(2)))
          };
          
          if (user) {
            supabase.from('clientes').update(mapClienteToDB(novoCli)).eq('id', c.id).then(({ error }) => {
              if (error) console.error('Erro ao atualizar totais e cashback do cliente no Supabase:', error);
            });
          }
          return novoCli;
        }
        return c;
      });
      saveAndSet('erp_clientes', novosClientes, setClientes);
    }

    registrarLog(usuario, 'Venda Realizada', `Venda ${vendaId} no valor total de R$ ${v.total.toFixed(2)}`);
    return vendaId;
  };

  // --- RECEBIMENTO PARCIAL AVANÇADO (COM SINCRONIZAÇÃO PONTUAL SUPABASE) ---
  const receberParcela = (
    parcelaId: string, 
    valorRecebido: number, 
    tipoPagamento: PagamentoParcela['tipoPagamento'], 
    destinoSaldo: PagamentoParcela['destinoSaldo'],
    usuario: string = 'Caixa'
  ) => {
    const hojeStr = new Date().toISOString().split('T')[0];
    const parcelasAtuais = [...parcelas];
    const idx = parcelasAtuais.findIndex(p => p.id === parcelaId);
    
    if (idx === -1) return;
    
    const parcela = parcelasAtuais[idx];
    const valorOriginalRestante = parcela.valorRestante;
    const parcelasParaSincronizar: Parcela[] = [];

    // Se o valor recebido for igual ou maior que o valor restante (integral ou super-pago)
    if (valorRecebido >= valorOriginalRestante) {
      const pagoReal = valorOriginalRestante;
      const cashbackGanhoParcelaIntegral = systemConfig.cashbackAtivo
        ? Number((pagoReal * (systemConfig.cashbackPercentual / 100)).toFixed(2))
        : 0;

      const novoPagamento: PagamentoParcela = {
        data: hojeStr,
        valorRecebido: pagoReal,
        tipoPagamento
      };

      const parcelaPaga = {
        ...parcela,
        valorRestante: 0,
        status: 'paga' as const,
        pagamentos: [...parcela.pagamentos, novoPagamento]
      };
      parcelasAtuais[idx] = parcelaPaga;
      parcelasParaSincronizar.push(parcelaPaga);

      // Atualizar dívida do cliente (diminuindo pelo valor pago) e somar cashback ganho
      const novosClientes = clientes.map(c => {
        if (c.id === parcela.clienteId) {
          const novoCli = { 
            ...c, 
            totalDivida: Math.max(0, c.totalDivida - pagoReal),
            cashbackSaldo: Number((c.cashbackSaldo + cashbackGanhoParcelaIntegral).toFixed(2))
          };
          if (user) {
            supabase.from('clientes').update(mapClienteToDB(novoCli)).eq('id', c.id).then(({ error }) => {
              if (error) console.error('Erro ao atualizar dívida no Supabase:', error);
            });
          }
          return novoCli;
        }
        return c;
      });
      saveAndSet('erp_clientes', novosClientes, setClientes);
      saveAndSet('erp_parcelas', parcelasAtuais, setParcelas);

      if (user) {
        supabase.from('parcelas').upsert(parcelasParaSincronizar.map(mapParcelaToDB)).then(({ error }) => {
          if (error) console.error('Erro ao sincronizar parcela no Supabase:', error);
        });
      }
      
      const cli = clientes.find(c => c.id === parcela.clienteId);
      registrarLog(usuario, 'Recebimento Parcela', `Recebimento integral (R$ ${pagoReal.toFixed(2)}) da parcela ${parcela.numeroParcela}/${parcela.totalParcelas} do cliente ${cli?.nome}`);
    } 
    // --- RECEBIMENTO PARCIAL ---
    else {
      const saldoDevedorRestante = valorOriginalRestante - valorRecebido;
      const cashbackGanhoParcelaParcial = systemConfig.cashbackAtivo
        ? Number((valorRecebido * (systemConfig.cashbackPercentual / 100)).toFixed(2))
        : 0;
      
      const novoPagamento: PagamentoParcela = {
        data: hojeStr,
        valorRecebido,
        tipoPagamento,
        destinoSaldo
      };

      // Passo Inicial: Baixar a parcela pelo valor recebido (parcialmente paga temporariamente)
      parcelasAtuais[idx] = {
        ...parcela,
        valorRestante: saldoDevedorRestante,
        status: 'paga_parcial',
        pagamentos: [...parcela.pagamentos, novoPagamento]
      };

      const cli = clientes.find(c => c.id === parcela.clienteId);

      // REGRA A: Manter saldo na mesma parcela
      if (destinoSaldo === 'manter') {
        parcelasParaSincronizar.push(parcelasAtuais[idx]);
        registrarLog(usuario, 'Recebimento Parcial A', `Recebido R$ ${valorRecebido.toFixed(2)} da parc. ${parcela.numeroParcela}/${parcela.totalParcelas} de ${cli?.nome}. Saldo mantido na mesma parcela.`);
      } 
      
      // REGRA B: Transferir saldo para a próxima parcela
      else if (destinoSaldo === 'transferir') {
        // A parcela atual é quitada
        parcelasAtuais[idx] = {
          ...parcela,
          valorRestante: 0,
          status: 'paga',
          pagamentos: [...parcela.pagamentos, novoPagamento]
        };
        parcelasParaSincronizar.push(parcelasAtuais[idx]);

        const parcelasClienteFuturas = parcelasAtuais
          .filter(p => p.clienteId === parcela.clienteId && p.id !== parcelaId && (p.status === 'em_aberto' || p.status === 'paga_parcial' || p.status === 'vencida'))
          .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

        if (parcelasClienteFuturas.length > 0) {
          const proxParcela = parcelasClienteFuturas[0];
          const proxIdx = parcelasAtuais.findIndex(p => p.id === proxParcela.id);
          
          const proxParcelaAtualizada = {
            ...proxParcela,
            valorOriginal: proxParcela.valorOriginal + saldoDevedorRestante,
            valorRestante: proxParcela.valorRestante + saldoDevedorRestante,
            observacoes: (proxParcela.observacoes ? proxParcela.observacoes + ' | ' : '') + `+R$ ${saldoDevedorRestante.toFixed(2)} transferidos da parc. ${parcela.numeroParcela}`
          };
          parcelasAtuais[proxIdx] = proxParcelaAtualizada;
          parcelasParaSincronizar.push(proxParcelaAtualizada);
          
          registrarLog(usuario, 'Recebimento Parcial B', `Recebido R$ ${valorRecebido.toFixed(2)} (parc. ${parcela.numeroParcela}). Saldo R$ ${saldoDevedorRestante.toFixed(2)} transferido para parc. ${proxParcela.numeroParcela}.`);
        } else {
          destinoSaldo = 'criar_nova';
        }
      } 
      
      // REGRA C: Diluir saldo entre parcelas futuras
      else if (destinoSaldo === 'diluir') {
        parcelasAtuais[idx] = {
          ...parcela,
          valorRestante: 0,
          status: 'paga',
          pagamentos: [...parcela.pagamentos, novoPagamento]
        };
        parcelasParaSincronizar.push(parcelasAtuais[idx]);

        const parcelasFuturas = parcelasAtuais
          .filter(p => p.clienteId === parcela.clienteId && p.id !== parcelaId && (p.status === 'em_aberto' || p.status === 'paga_parcial' || p.status === 'vencida'));

        if (parcelasFuturas.length > 0) {
          const valorAdicionalPorParcela = saldoDevedorRestante / parcelasFuturas.length;
          
          parcelasFuturas.forEach(pf => {
            const fIdx = parcelasAtuais.findIndex(p => p.id === pf.id);
            const pfAtualizada = {
              ...pf,
              valorOriginal: pf.valorOriginal + valorAdicionalPorParcela,
              valorRestante: pf.valorRestante + valorAdicionalPorParcela,
              observacoes: (pf.observacoes ? pf.observacoes + ' | ' : '') + `+R$ ${valorAdicionalPorParcela.toFixed(2)} diluídos da parc. ${parcela.numeroParcela}`
            };
            parcelasAtuais[fIdx] = pfAtualizada;
            parcelasParaSincronizar.push(pfAtualizada);
          });
          registrarLog(usuario, 'Recebimento Parcial C', `Recebido R$ ${valorRecebido.toFixed(2)} (parc. ${parcela.numeroParcela}). Saldo R$ ${saldoDevedorRestante.toFixed(2)} diluído em ${parcelasFuturas.length} parcelas futuras.`);
        } else {
          destinoSaldo = 'criar_nova';
        }
      }

      // REGRA D: Criar nova parcela com o saldo
      if (destinoSaldo === 'criar_nova') {
        parcelasAtuais[idx] = {
          ...parcela,
          valorRestante: 0,
          status: 'paga',
          pagamentos: [...parcela.pagamentos, novoPagamento]
        };
        parcelasParaSincronizar.push(parcelasAtuais[idx]);

        const parcelasTodasCliente = parcelasAtuais.filter(p => p.clienteId === parcela.clienteId);
        
        let ultimaDataStr = hojeStr;
        if (parcelasTodasCliente.length > 0) {
          const datasValidas = parcelasTodasCliente.map(p => p.dataVencimento).sort();
          ultimaDataStr = datasValidas[datasValidas.length - 1];
        }

        const dataRef = new Date(ultimaDataStr);
        dataRef.setDate(dataRef.getDate() + 30);
        const novaDataVencimento = dataRef.toISOString().split('T')[0];

        const novaParcela: Parcela = {
          id: 'PARC_' + generateId(),
          vendaId: parcela.vendaId,
          clienteId: parcela.clienteId,
          numeroParcela: parcelasTodasCliente.length + 1,
          totalParcelas: parcelasTodasCliente.length + 1,
          dataVencimento: novaDataVencimento,
          valorOriginal: saldoDevedorRestante,
          valorRestante: saldoDevedorRestante,
          status: 'em_aberto',
          pagamentos: [],
          observacoes: `Criada devido ao saldo residual da parc. ${parcela.numeroParcela}`
        };
        parcelasAtuais.push(novaParcela);
        parcelasParaSincronizar.push(novaParcela);
        
        // Atualiza o total de parcelas de todas do mesmo vendaId para bater a contagem
        const novasParcelasContagem = parcelasAtuais.map(p => {
          if (p.vendaId === parcela.vendaId) {
            const pac = { ...p, totalParcelas: parcelasTodasCliente.length + 1 };
            parcelasParaSincronizar.push(pac);
            return pac;
          }
          return p;
        });

        saveAndSet('erp_parcelas', novasParcelasContagem, setParcelas);
        registrarLog(usuario, 'Recebimento Parcial D', `Recebido R$ ${valorRecebido.toFixed(2)} (parc. ${parcela.numeroParcela}). Criada nova parcela de R$ ${saldoDevedorRestante.toFixed(2)} para ${novaDataVencimento}.`);
        
        // Atualiza a dívida do cliente e somar cashback
        const novosClientes = clientes.map(c => {
          if (c.id === parcela.clienteId) {
            const novoCli = { 
              ...c, 
              totalDivida: Math.max(0, c.totalDivida - valorRecebido),
              cashbackSaldo: Number((c.cashbackSaldo + cashbackGanhoParcelaParcial).toFixed(2))
            };
            if (user) {
              supabase.from('clientes').update(mapClienteToDB(novoCli)).eq('id', c.id).then(({ error }) => {
                if (error) console.error('Erro ao atualizar dívida do cliente no Supabase:', error);
              });
            }
            return novoCli;
          }
          return c;
        });
        saveAndSet('erp_clientes', novosClientes, setClientes);

        if (user) {
          supabase.from('parcelas').upsert(parcelasParaSincronizar.map(mapParcelaToDB)).then(({ error }) => {
            if (error) console.error('Erro ao sincronizar parcelas no Supabase (Regra D):', error);
          });
        }
        return;
      }

      // Salvar parcelas (Regras A, B e C)
      saveAndSet('erp_parcelas', parcelasAtuais, setParcelas);

      // Atualizar a dívida total do cliente e somar cashback
      const novosClientes = clientes.map(c => {
        if (c.id === parcela.clienteId) {
          const novoCli = { 
            ...c, 
            totalDivida: Math.max(0, c.totalDivida - valorRecebido),
            cashbackSaldo: Number((c.cashbackSaldo + cashbackGanhoParcelaParcial).toFixed(2))
          };
          if (user) {
            supabase.from('clientes').update(mapClienteToDB(novoCli)).eq('id', c.id).then(({ error }) => {
              if (error) console.error('Erro ao atualizar dívida do cliente no Supabase:', error);
            });
          }
          return novoCli;
        }
        return c;
      });
      saveAndSet('erp_clientes', novosClientes, setClientes);

      if (user && parcelasParaSincronizar.length > 0) {
        supabase.from('parcelas').upsert(parcelasParaSincronizar.map(mapParcelaToDB)).then(({ error }) => {
          if (error) console.error('Erro ao sincronizar parcelas no Supabase:', error);
        });
      }
    }
  };

  // --- RENEGOCIAÇÃO DE DÍVIDAS ---
  const renegociarDivida = (
    clienteId: string,
    parcelasIds: string[],
    novoValorTotal: number,
    numParcelas: number,
    periodicidade: 'semanal' | 'quinzenal' | 'mensal',
    vencimentoInicial: string,
    usuario: string = 'Caixa'
  ) => {
    const hojeStr = new Date().toISOString().split('T')[0];
    const parcelasAlteradasParaDB: Parcela[] = [];
    
    // 1. Quitar (Cancelar/Substituir) parcelas antigas renegociadas
    const valorOriginalDevedor = parcelas
      .filter(p => parcelasIds.includes(p.id))
      .reduce((sum, p) => sum + p.valorRestante, 0);

    const parcelasAtuais = parcelas.map(p => {
      if (parcelasIds.includes(p.id)) {
        const pac = {
          ...p,
          valorRestante: 0,
          status: 'paga' as const,
          observacoes: (p.observacoes ? p.observacoes + ' | ' : '') + `RENEGOCIADA em ${hojeStr}`
        };
        parcelasAlteradasParaDB.push(pac);
        return pac;
      }
      return p;
    });

    // 2. Gerar as novas parcelas da renegociação
    const novasParcelas: Parcela[] = [];
    const valorCadaParcela = Number((novoValorTotal / numParcelas).toFixed(2));
    const refVendaId = 'RENEG_' + generateId();

    for (let i = 1; i <= numParcelas; i++) {
      const dataVenc = new Date(vencimentoInicial);
      if (periodicidade === 'semanal') {
        dataVenc.setDate(dataVenc.getDate() + (i - 1) * 7);
      } else if (periodicidade === 'quinzenal') {
        dataVenc.setDate(dataVenc.getDate() + (i - 1) * 15);
      } else if (periodicidade === 'mensal') {
        dataVenc.setMonth(dataVenc.getMonth() + (i - 1));
      }

      const valorOriginal = i === numParcelas 
        ? Number((novoValorTotal - (valorCadaParcela * (numParcelas - 1))).toFixed(2)) 
        : valorCadaParcela;

      const novaParcela: Parcela = {
        id: 'PARC_' + generateId(),
        vendaId: refVendaId,
        clienteId,
        numeroParcela: i,
        totalParcelas: numParcelas,
        dataVencimento: dataVenc.toISOString().split('T')[0],
        valorOriginal,
        valorRestante: valorOriginal,
        status: 'em_aberto',
        pagamentos: [],
        observacoes: `Gerada da renegociação de ${parcelasIds.length} parcelas em ${hojeStr}`
      };
      novasParcelas.push(novaParcela);
      parcelasAlteradasParaDB.push(novaParcela);
    }

    const todasParcelas = [...parcelasAtuais, ...novasParcelas];
    saveAndSet('erp_parcelas', todasParcelas, setParcelas);

    if (user && parcelasAlteradasParaDB.length > 0) {
      supabase.from('parcelas').upsert(parcelasAlteradasParaDB.map(mapParcelaToDB)).then(({ error }) => {
        if (error) console.error('Erro ao salvar parcelas renegociadas no Supabase:', error);
      });
    }

    // 3. Atualizar dívida do cliente
    const novosClientes = clientes.map(c => {
      if (c.id === clienteId) {
        const novoCli = {
          ...c,
          totalDivida: Math.max(0, c.totalDivida - valorOriginalDevedor + novoValorTotal)
        };
        if (user) {
          supabase.from('clientes').update(mapClienteToDB(novoCli)).eq('id', c.id).then(({ error }) => {
            if (error) console.error('Erro ao atualizar totais do cliente renegociado no Supabase:', error);
          });
        }
        return novoCli;
      }
      return c;
    });
    saveAndSet('erp_clientes', novosClientes, setClientes);

    const cli = clientes.find(c => c.id === clienteId);
    registrarLog(usuario, 'Renegociação Dívida', `Negociada dívida de ${cli?.nome}. Substituídas ${parcelasIds.length} parcelas (R$ ${valorOriginalDevedor.toFixed(2)}) por ${numParcelas}x no total de R$ ${novoValorTotal.toFixed(2)}`);
  };

  // --- FERRAMENTAS DO SISTEMA ---

  const limparBanco = () => {
    localStorage.clear();
    setClientes([]);
    setFornecedores([]);
    setProdutos([]);
    setMovimentacoesEstoque([]);
    setEncomendas([]);
    setVendas([]);
    setParcelas([]);
    setLogs([]);
    
    if (user) {
      Promise.all([
        supabase.from('clientes').delete().neq('id', ''),
        supabase.from('fornecedores').delete().neq('id', ''),
        supabase.from('produtos').delete().neq('id', ''),
        supabase.from('movimentacoes_estoque').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('encomendas').delete().neq('id', ''),
        supabase.from('vendas').delete().neq('id', ''),
        supabase.from('parcelas').delete().neq('id', ''),
        supabase.from('logs_operacao').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]).catch(err => {
        console.error('Erro ao limpar tabelas no Supabase:', err);
      });
    }

    registrarLog('Sistema', 'Banco Resetado', 'O banco de dados foi completamente resetado e limpo.');
  };

  const exportarDados = (): string => {
    const backupObj = {
      version: 1.0,
      createdAt: new Date().toISOString(),
      clientes,
      fornecedores,
      produtos,
      movimentacoesEstoque,
      encomendas,
      vendas,
      parcelas,
      logs
    };
    return JSON.stringify(backupObj, null, 2);
  };

  const importarDados = (dadosJSON: string): boolean => {
    try {
      const parsed = JSON.parse(dadosJSON);
      if (!parsed.clientes || !parsed.produtos || !parsed.parcelas) {
        return false;
      }
      
      saveAndSet('erp_clientes', parsed.clientes, setClientes);
      saveAndSet('erp_fornecedores', parsed.fornecedores || [], setFornecedores);
      saveAndSet('erp_produtos', parsed.produtos, setProdutos);
      saveAndSet('erp_movimentacoes', parsed.movimentacoesEstoque || [], setMovimentacoesEstoque);
      saveAndSet('erp_encomendas', parsed.encomendas || [], setEncomendas);
      saveAndSet('erp_vendas', parsed.vendas || [], setVendas);
      saveAndSet('erp_parcelas', parsed.parcelas, setParcelas);
      saveAndSet('erp_logs', parsed.logs || [], setLogs);

      if (user) {
        supabase.from('clientes').upsert(parsed.clientes.map(mapClienteToDB)).then(({ error }) => { if (error) console.error(error); });
        supabase.from('fornecedores').upsert((parsed.fornecedores || []).map(mapFornecedorToDB)).then(({ error }) => { if (error) console.error(error); });
        supabase.from('produtos').upsert(parsed.produtos.map(mapProdutoToDB)).then(({ error }) => { if (error) console.error(error); });
        supabase.from('movimentacoes_estoque').upsert((parsed.movimentacoesEstoque || []).map(mapMovimentacaoToDB)).then(({ error }) => { if (error) console.error(error); });
        supabase.from('encomendas').upsert((parsed.encomendas || []).map(mapEncomendaToDB)).then(({ error }) => { if (error) console.error(error); });
        supabase.from('vendas').upsert((parsed.vendas || []).map(mapVendaToDB)).then(({ error }) => { if (error) console.error(error); });
        supabase.from('parcelas').upsert(parsed.parcelas.map(mapParcelaToDB)).then(({ error }) => { if (error) console.error(error); });
        supabase.from('logs_operacao').upsert((parsed.logs || []).map(mapLogToDB)).then(({ error }) => { if (error) console.error(error); });
      }
      
      registrarLog('Administrador', 'Restauração Backup', 'Backup restaurado com sucesso e dados recarregados.');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      clientes, fornecedores, produtos, movimentacoesEstoque, encomendas, vendas, parcelas, logs,
      systemConfig, updateSystemConfig,
      addCliente, updateCliente, deleteCliente,
      addFornecedor, updateFornecedor, deleteFornecedor,
      addProduto, updateProduto, duplicateProduto, deleteProduto,
      ajustarEstoqueManual,
      addEncomenda, updateEncomendaStatus, deleteEncomenda,
      registrarVenda, receberParcela, renegociarDivida,
      registrarLog, limparBanco, importarDados, exportarDados
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
