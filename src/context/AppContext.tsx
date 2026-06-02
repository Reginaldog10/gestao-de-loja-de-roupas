import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateId } from '../utils/formatters';

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
  
  // Operações
  addCliente: (cliente: Omit<Cliente, 'id' | 'totalComprado' | 'totalDivida'>) => string;
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
  
  registrarVenda: (venda: Omit<Venda, 'id' | 'data'>, parcelasPreviamenteGeradas?: Omit<Parcela, 'id' | 'vendaId'>[], usuario?: string) => string;
  
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
    totalDivida: 320.00
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
    totalDivida: 280.00
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
    totalDivida: 0
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
      { tamanho: '42', estoque: 0 }, // Sem estoque
      { tamanho: '44', estoque: 2 } // Baixo estoque
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
  // Parcelas da VEN1 (Ana Silva - R$ 280 em 2 parcelas - Paga e Paga Parcial)
  {
    id: 'PARC1',
    vendaId: 'VEN1',
    clienteId: 'CLI1',
    numeroParcela: 1,
    totalParcelas: 2,
    dataVencimento: getHojeOffset(-10), // Venceu há 10 dias
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
    dataVencimento: getHojeOffset(10), // Vence daqui a 10 dias
    valorOriginal: 140.00,
    valorRestante: 140.00,
    status: 'em_aberto',
    pagamentos: [],
    observacoes: ''
  },
  // Parcelas da VEN2 (Carlos Eduardo - R$ 400 em 4 parcelas de R$ 100 - Inadimplente)
  {
    id: 'PARC3',
    vendaId: 'VEN2',
    clienteId: 'CLI2',
    numeroParcela: 1,
    totalParcelas: 4,
    dataVencimento: getHojeOffset(-15), // Vencida
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
    dataVencimento: getHojeOffset(-15), // Vencida
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
    dataVencimento: getHojeOffset(0), // Vence hoje
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
    dataVencimento: getHojeOffset(15), // A vencer
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // --- INICIALIZAÇÃO DE ESTADOS ---
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoesEstoque, setMovimentacoesEstoque] = useState<MovimentacaoEstoque[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [logs, setLogs] = useState<LogOperacao[]>([]);

  // Carregar dados no primeiro boot
  useEffect(() => {
    const localGet = <T,>(key: string, initial: T): T => {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : initial;
    };

    // Se o localStorage estiver vazio de dados essenciais, inicializa com a massa fictícia
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
  }, []);

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
    }
  }, [parcelas]);

  // Sincronização automática para o localStorage
  const saveAndSet = <T,>(key: string, data: T, setter: React.Dispatch<React.SetStateAction<T>>) => {
    setter(data);
    localStorage.setItem(key, JSON.stringify(data));
  };

  // --- LOGS DE OPERAÇÃO ---
  const registrarLog = (usuario: string, acao: string, detalhe: string) => {
    const novoLog: LogOperacao = {
      id: generateId(),
      data: new Date().toISOString(),
      usuario,
      acao,
      detalhe
    };
    saveAndSet('erp_logs', [novoLog, ...logs], setLogs);
  };

  // --- OPERAÇÕES CLIENTE ---
  const addCliente = (c: Omit<Cliente, 'id' | 'totalComprado' | 'totalDivida'>): string => {
    const id = 'CLI_' + generateId();
    const novo: Cliente = {
      ...c,
      id,
      totalComprado: 0,
      totalDivida: 0
    };
    saveAndSet('erp_clientes', [...clientes, novo], setClientes);
    registrarLog('Usuário', 'Cadastro Cliente', `Cadastrou o cliente ${c.nome}`);
    return id;
  };

  const updateCliente = (id: string, updates: Partial<Cliente>) => {
    const novos = clientes.map(c => (c.id === id ? { ...c, ...updates } : c));
    saveAndSet('erp_clientes', novos, setClientes);
    const cli = clientes.find(c => c.id === id);
    registrarLog('Usuário', 'Alteração Cliente', `Alterou dados do cliente ${cli?.nome}`);
  };

  const deleteCliente = (id: string) => {
    const cli = clientes.find(c => c.id === id);
    saveAndSet('erp_clientes', clientes.filter(c => c.id !== id), setClientes);
    registrarLog('Usuário', 'Exclusão Cliente', `Excluiu o cliente ${cli?.nome}`);
  };

  // --- OPERAÇÕES FORNECEDOR ---
  const addFornecedor = (f: Omit<Fornecedor, 'id'>): string => {
    const id = 'FOR_' + generateId();
    const novo: Fornecedor = { ...f, id };
    saveAndSet('erp_fornecedores', [...fornecedores, novo], setFornecedores);
    registrarLog('Usuário', 'Cadastro Fornecedor', `Cadastrou fornecedor ${f.nomeFantasia}`);
    return id;
  };

  const updateFornecedor = (id: string, updates: Partial<Fornecedor>) => {
    const novos = fornecedores.map(f => (f.id === id ? { ...f, ...updates } : f));
    saveAndSet('erp_fornecedores', novos, setFornecedores);
    const forn = fornecedores.find(f => f.id === id);
    registrarLog('Usuário', 'Alteração Fornecedor', `Alterou dados do fornecedor ${forn?.nomeFantasia}`);
  };

  const deleteFornecedor = (id: string) => {
    const forn = fornecedores.find(f => f.id === id);
    saveAndSet('erp_fornecedores', fornecedores.filter(f => f.id !== id), setFornecedores);
    registrarLog('Usuário', 'Exclusão Fornecedor', `Excluiu fornecedor ${forn?.nomeFantasia}`);
  };

  // --- OPERAÇÕES PRODUTO ---
  const addProduto = (p: Omit<Produto, 'id' | 'codigoInterno'>): string => {
    const id = 'PROD_' + generateId();
    // Gerar código interno automático simples incremental
    const maxCod = produtos.reduce((max, prod) => Math.max(max, parseInt(prod.codigoInterno) || 0), 1000);
    const codigoInterno = (maxCod + 1).toString();

    const novo: Produto = { ...p, id, codigoInterno };
    saveAndSet('erp_produtos', [...produtos, novo], setProdutos);

    // Gerar movimentações de estoque iniciais para cada tamanho
    const novasMovs: MovimentacaoEstoque[] = [];
    p.tamanhos.forEach(t => {
      if (t.estoque > 0) {
        novasMovs.push({
          id: generateId(),
          produtoId: id,
          tamanho: t.tamanho,
          tipo: 'entrada',
          motivo: 'cadastro',
          quantidade: t.estoque,
          data: new Date().toISOString().split('T')[0],
          observacao: 'Carga inicial no cadastro',
          usuario: 'Usuário'
        });
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
      // Clonar estoques zerados para cópia
      tamanhos: original.tamanhos.map(t => ({ tamanho: t.tamanho, estoque: 0 }))
    };

    return addProduto(novosResto);
  };

  const deleteProduto = (id: string) => {
    const prod = produtos.find(p => p.id === id);
    saveAndSet('erp_produtos', produtos.filter(p => p.id !== id), setProdutos);
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
    // Atualizar estoque no produto
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

    // Criar histórico
    const novaMov: MovimentacaoEstoque = {
      id: generateId(),
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

    const prod = produtos.find(p => p.id === produtoId);
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
    const cli = clientes.find(c => c.id === e.clienteId);
    const prod = produtos.find(p => p.id === e.produtoId);
    registrarLog('Usuário', 'Encomenda Criada', `Encomenda criada para ${cli?.nome} - Produto ${prod?.nome}`);
    return id;
  };

  const updateEncomendaStatus = (id: string, status: Encomenda['status']) => {
    const novas = encomendas.map(e => (e.id === id ? { ...e, status } : e));
    saveAndSet('erp_encomendas', novas, setEncomendas);
    const enc = encomendas.find(e => e.id === id);
    const cli = clientes.find(c => c.id === enc?.clienteId);
    registrarLog('Usuário', 'Alteração Status Encomenda', `Encomenda do cliente ${cli?.nome} alterada para: ${status.replace('_', ' ')}`);
  };

  const deleteEncomenda = (id: string) => {
    saveAndSet('erp_encomendas', encomendas.filter(e => e.id !== id), setEncomendas);
    registrarLog('Usuário', 'Exclusão Encomenda', `Excluiu encomenda ID ${id}`);
  };

  // --- VENDAS & CREDIÁRIO (CORE) ---
  const registrarVenda = (
    v: Omit<Venda, 'id' | 'data'>, 
    parcelasPreviamenteGeradas?: Omit<Parcela, 'id' | 'vendaId'>[],
    usuario: string = 'Vendedor'
  ): string => {
    const vendaId = 'VEN_' + generateId();
    const dataVenda = new Date().toISOString().split('T')[0];

    const novaVenda: Venda = {
      ...v,
      id: vendaId,
      data: dataVenda,
      usuario
    };

    // 1. Gravar Venda
    saveAndSet('erp_vendas', [novaVenda, ...vendas], setVendas);

    // 2. Abater Estoque e Registrar Movimentação para cada produto vendido
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

        // Lançar movimentação
        novasMovs.push({
          id: generateId(),
          produtoId: item.produtoId,
          tamanho: item.tamanho,
          tipo: 'saida',
          motivo: 'venda',
          quantidade: item.quantidade,
          data: dataVenda,
          observacao: `Venda ${vendaId}`,
          usuario
        });
      }
    });

    saveAndSet('erp_produtos', novosProdutos, setProdutos);
    saveAndSet('erp_movimentacoes', [...novasMovs, ...movimentacoesEstoque], setMovimentacoesEstoque);

    // 3. Processar Crediário se aplicável
    let valorFinanciadoCrediario = 0;
    const credForma = v.formasPagamento.find(f => f.tipo === 'crediario');
    
    if (credForma && credForma.valor > 0 && v.clienteId && parcelasPreviamenteGeradas) {
      valorFinanciadoCrediario = credForma.valor;
      
      // Salvar parcelas geradas
      const novasParcelasSalvas: Parcela[] = parcelasPreviamenteGeradas.map(p => ({
        ...p,
        id: 'PARC_' + generateId(),
        vendaId
      }));

      saveAndSet('erp_parcelas', [...novasParcelasSalvas, ...parcelas], setParcelas);
    }

    // 4. Atualizar Total Comprado e Dívida do Cliente
    if (v.clienteId) {
      const novosClientes = clientes.map(c => {
        if (c.id === v.clienteId) {
          return {
            ...c,
            totalComprado: c.totalComprado + v.total,
            totalDivida: c.totalDivida + valorFinanciadoCrediario
          };
        }
        return c;
      });
      saveAndSet('erp_clientes', novosClientes, setClientes);
    }

    registrarLog(usuario, 'Venda Realizada', `Venda ${vendaId} no valor total de R$ ${v.total.toFixed(2)}`);
    return vendaId;
  };

  // --- RECEBIMENTO PARCIAL AVANÇADO (AS 4 REGRAS) ---
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

    // Se o valor recebido for igual ou maior que o valor restante (integral ou super-pago)
    if (valorRecebido >= valorOriginalRestante) {
      const pagoReal = valorOriginalRestante;
      const novoPagamento: PagamentoParcela = {
        data: hojeStr,
        valorRecebido: pagoReal,
        tipoPagamento
      };

      parcelasAtuais[idx] = {
        ...parcela,
        valorRestante: 0,
        status: 'paga',
        pagamentos: [...parcela.pagamentos, novoPagamento]
      };

      // Atualizar dívida do cliente (diminuindo pelo valor pago)
      const novosClientes = clientes.map(c => {
        if (c.id === parcela.clienteId) {
          return { ...c, totalDivida: Math.max(0, c.totalDivida - pagoReal) };
        }
        return c;
      });
      saveAndSet('erp_clientes', novosClientes, setClientes);
      saveAndSet('erp_parcelas', parcelasAtuais, setParcelas);
      
      const cli = clientes.find(c => c.id === parcela.clienteId);
      registrarLog(usuario, 'Recebimento Parcela', `Recebimento integral (R$ ${pagoReal.toFixed(2)}) da parcela ${parcela.numeroParcela}/${parcela.totalParcelas} do cliente ${cli?.nome}`);
    } 
    // --- RECEBIMENTO PARCIAL ---
    else {
      const saldoDevedorRestante = valorOriginalRestante - valorRecebido;
      
      const novoPagamento: PagamentoParcela = {
        data: hojeStr,
        valorRecebido,
        tipoPagamento,
        destinoSaldo
      };

      // Passo Inicial: Baixar a parcela pelo valor recebido
      parcelasAtuais[idx] = {
        ...parcela,
        valorRestante: saldoDevedorRestante,
        status: 'paga_parcial',
        pagamentos: [...parcela.pagamentos, novoPagamento]
      };

      const cli = clientes.find(c => c.id === parcela.clienteId);

      // APLICAR AS REGRAS DE NEGÓCIO PARA O SALDO DEVEDOR
      
      // REGRA A: Manter saldo na mesma parcela
      if (destinoSaldo === 'manter') {
        // Nada muda além do que já foi feito (parcela fica marcada como parcialmente paga e o valorRestante foi atualizado)
        registrarLog(usuario, 'Recebimento Parcial A', `Recebido R$ ${valorRecebido.toFixed(2)} da parc. ${parcela.numeroParcela}/${parcela.totalParcelas} de ${cli?.nome}. Saldo mantido na mesma parcela.`);
      } 
      
      // REGRA B: Transferir saldo para a próxima parcela
      else if (destinoSaldo === 'transferir') {
        // A parcela atual é quitada (marcada como paga com o recebimento de hoje)
        parcelasAtuais[idx] = {
          ...parcela,
          valorRestante: 0,
          status: 'paga',
          pagamentos: [...parcela.pagamentos, novoPagamento]
        };

        // Encontrar a próxima parcela em aberto do mesmo cliente
        const parcelasClienteFuturas = parcelasAtuais
          .filter(p => p.clienteId === parcela.clienteId && p.id !== parcelaId && (p.status === 'em_aberto' || p.status === 'paga_parcial' || p.status === 'vencida'))
          .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

        if (parcelasClienteFuturas.length > 0) {
          const proxParcela = parcelasClienteFuturas[0];
          const proxIdx = parcelasAtuais.findIndex(p => p.id === proxParcela.id);
          
          parcelasAtuais[proxIdx] = {
            ...proxParcela,
            valorOriginal: proxParcela.valorOriginal + saldoDevedorRestante,
            valorRestante: proxParcela.valorRestante + saldoDevedorRestante,
            observacoes: (proxParcela.observacoes ? proxParcela.observacoes + ' | ' : '') + `+R$ ${saldoDevedorRestante.toFixed(2)} transferidos da parc. ${parcela.numeroParcela}`
          };
          registrarLog(usuario, 'Recebimento Parcial B', `Recebido R$ ${valorRecebido.toFixed(2)} (parc. ${parcela.numeroParcela}). Saldo R$ ${saldoDevedorRestante.toFixed(2)} transferido para parc. ${proxParcela.numeroParcela}.`);
        } else {
          // Se não houver próxima parcela, age como Regra D (cria nova parcela)
          destinoSaldo = 'criar_nova';
        }
      } 
      
      // REGRA C: Diluir saldo entre parcelas futuras
      else if (destinoSaldo === 'diluir') {
        // Quita a parcela atual
        parcelasAtuais[idx] = {
          ...parcela,
          valorRestante: 0,
          status: 'paga',
          pagamentos: [...parcela.pagamentos, novoPagamento]
        };

        // Encontrar todas as parcelas futuras em aberto/vencidas
        const parcelasFuturas = parcelasAtuais
          .filter(p => p.clienteId === parcela.clienteId && p.id !== parcelaId && (p.status === 'em_aberto' || p.status === 'paga_parcial' || p.status === 'vencida'));

        if (parcelasFuturas.length > 0) {
          const valorAdicionalPorParcela = saldoDevedorRestante / parcelasFuturas.length;
          
          parcelasFuturas.forEach(pf => {
            const fIdx = parcelasAtuais.findIndex(p => p.id === pf.id);
            parcelasAtuais[fIdx] = {
              ...pf,
              valorOriginal: pf.valorOriginal + valorAdicionalPorParcela,
              valorRestante: pf.valorRestante + valorAdicionalPorParcela,
              observacoes: (pf.observacoes ? pf.observacoes + ' | ' : '') + `+R$ ${valorAdicionalPorParcela.toFixed(2)} diluídos da parc. ${parcela.numeroParcela}`
            };
          });
          registrarLog(usuario, 'Recebimento Parcial C', `Recebido R$ ${valorRecebido.toFixed(2)} (parc. ${parcela.numeroParcela}). Saldo R$ ${saldoDevedorRestante.toFixed(2)} diluído em ${parcelasFuturas.length} parcelas futuras.`);
        } else {
          destinoSaldo = 'criar_nova';
        }
      }

      // REGRA D: Criar nova parcela com o saldo
      if (destinoSaldo === 'criar_nova') {
        // Quita a parcela atual
        parcelasAtuais[idx] = {
          ...parcela,
          valorRestante: 0,
          status: 'paga',
          pagamentos: [...parcela.pagamentos, novoPagamento]
        };

        // Descobrir a data de vencimento projetada (pegar a última data de vencimento das parcelas deste cliente e somar 30 dias)
        const parcelasTodasCliente = parcelasAtuais.filter(p => p.clienteId === parcela.clienteId);
        
        let ultimaDataStr = hojeStr;
        if (parcelasTodasCliente.length > 0) {
          const datasValidas = parcelasTodasCliente.map(p => p.dataVencimento).sort();
          ultimaDataStr = datasValidas[datasValidas.length - 1];
        }

        const dataRef = new Date(ultimaDataStr);
        dataRef.setDate(dataRef.getDate() + 30); // Vencimento 30 dias após a última parcela
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
        
        // Atualiza o total de parcelas de todas do mesmo vendaId para bater a contagem
        const novasParcelasContagem = parcelasAtuais.map(p => {
          if (p.vendaId === parcela.vendaId) {
            return { ...p, totalParcelas: parcelasTodasCliente.length + 1 };
          }
          return p;
        });

        saveAndSet('erp_parcelas', novasParcelasContagem, setParcelas);
        registrarLog(usuario, 'Recebimento Parcial D', `Recebido R$ ${valorRecebido.toFixed(2)} (parc. ${parcela.numeroParcela}). Criada nova parcela de R$ ${saldoDevedorRestante.toFixed(2)} para ${novaDataVencimento}.`);
        
        // Atualiza a dívida do cliente (diminui apenas pelo recebido real de hoje)
        const novosClientes = clientes.map(c => {
          if (c.id === parcela.clienteId) {
            return { ...c, totalDivida: Math.max(0, c.totalDivida - valorRecebido) };
          }
          return c;
        });
        saveAndSet('erp_clientes', novosClientes, setClientes);
        return;
      }

      // Salvar parcelas (Regras A, B e C que não criaram nova parcela direta no seu escopo)
      saveAndSet('erp_parcelas', parcelasAtuais, setParcelas);

      // Atualizar a dívida total do cliente (diminuindo pelo valor recebido hoje)
      const novosClientes = clientes.map(c => {
        if (c.id === parcela.clienteId) {
          return { ...c, totalDivida: Math.max(0, c.totalDivida - valorRecebido) };
        }
        return c;
      });
      saveAndSet('erp_clientes', novosClientes, setClientes);
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
    
    // 1. Quitar (Cancelar/Substituir) parcelas antigas renegociadas
    const valorOriginalDevedor = parcelas
      .filter(p => parcelasIds.includes(p.id))
      .reduce((sum, p) => sum + p.valorRestante, 0);

    const parcelasAtuais = parcelas.map(p => {
      if (parcelasIds.includes(p.id)) {
        return {
          ...p,
          valorRestante: 0,
          status: 'paga' as const,
          observacoes: (p.observacoes ? p.observacoes + ' | ' : '') + `RENEGOCIADA em ${hojeStr}`
        };
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

      // Ajustar última parcela por dízimas centesimais
      const valorOriginal = i === numParcelas 
        ? Number((novoValorTotal - (valorCadaParcela * (numParcelas - 1))).toFixed(2)) 
        : valorCadaParcela;

      novasParcelas.push({
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
      });
    }

    // 3. Salvar tudo
    const todasParcelas = [...parcelasAtuais, ...novasParcelas];
    saveAndSet('erp_parcelas', todasParcelas, setParcelas);

    // 4. Atualizar dívida do cliente: remove valor original das antigas e soma o novo valor negociado
    const novosClientes = clientes.map(c => {
      if (c.id === clienteId) {
        return {
          ...c,
          totalDivida: Math.max(0, c.totalDivida - valorOriginalDevedor + novoValorTotal)
        };
      }
      return c;
    });
    saveAndSet('erp_clientes', novosClientes, setClientes);

    const cli = clientes.find(c => c.id === clienteId);
    registrarLog(usuario, 'Renegociação Dívida', `Negociada dívida de ${cli?.nome}. Subtituídas ${parcelasIds.length} parcelas (R$ ${valorOriginalDevedor.toFixed(2)}) por ${numParcelas}x no total de R$ ${novoValorTotal.toFixed(2)}`);
  };

  // --- FERRAMENTAS DO SISTEMA (BACKUP E RESTAURACAO) ---

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
