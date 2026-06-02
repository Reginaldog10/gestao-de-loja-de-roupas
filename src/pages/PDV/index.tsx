import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { Produto, Parcela, FormaPagamento, VendaItem } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingBag, 
  Trash2, 
  Search, 
  Plus, 
  Minus, 
  CreditCard, 
  UserPlus, 
  CheckCircle,
  Printer,
  AlertTriangle,
  X,
  Camera
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ScannerModal } from '../../components/Scanner/ScannerModal';

interface CarrinhoItem {
  produto: Produto;
  tamanho: string;
  quantidade: number;
  precoVenda: number;
}

export const PDV: React.FC = () => {
  const { 
    produtos, 
    clientes, 
    addCliente, 
    registrarVenda 
  } = useApp();

  const { currentProfile } = useAuth();

  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [consultarProduto, setConsultarProduto] = useState<Produto | null>(null);
  const [busca, setBusca] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [showTamanhoModal, setShowTamanhoModal] = useState<Produto | null>(null);
  
  // Modais de fechamento
  const [showCheckout, setShowCheckout] = useState(false);
  const [showComprovante, setShowComprovante] = useState<string | null>(null); // vendaId cadastrada

  // Estados de Pagamento
  const [pagamentos, setPagamentos] = useState<FormaPagamento[]>([
    { tipo: 'dinheiro', valor: 0 },
    { tipo: 'pix', valor: 0 },
    { tipo: 'debito', valor: 0 },
    { tipo: 'credito', valor: 0 },
    { tipo: 'crediario', valor: 0 },
  ]);

  // Estados específicos de Crediário
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [showNewClienteModal, setShowNewClienteModal] = useState(false);
  const [numParcelas, setNumParcelas] = useState(1);
  const [periodicidade, setPeriodicidade] = useState<'semanal' | 'quinzenal' | 'mensal'>('mensal');
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState(() => {
    const data = new Date();
    data.setDate(data.getDate() + 30);
    return data.toISOString().split('T')[0];
  });
  
  // Grade de parcelas geradas para edição manual
  const [parcelasGeradas, setParcelasGeradas] = useState<Omit<Parcela, 'id' | 'vendaId'>[]>([]);

  // Cadastro rápido de cliente in-loco
  const [newCliNome, setNewCliNome] = useState('');
  const [newCliCPF, setNewCliCPF] = useState('');
  const [newCliTelefone, setNewCliTelefone] = useState('');
  const [newCliLimite, setNewCliLimite] = useState(1000);

  // --- CÁLCULOS TOTAIS DO CARRINHO ---
  const subtotal = carrinho.reduce((sum, item) => sum + (item.precoVenda * item.quantidade), 0);
  const total = Math.max(0, subtotal - desconto);

  const totalPagoDigitado = pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const valorCrediario = pagamentos.find(p => p.tipo === 'crediario')?.valor || 0;
  
  // Limite disponível do cliente selecionado
  const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);
  const limiteDisponivel = clienteSelecionado ? (clienteSelecionado.limiteCredito - clienteSelecionado.totalDivida) : 0;
  const limiteEstourado = valorCrediario > limiteDisponivel;

  // --- BUSCA E FILTRO DE PRODUTOS ---
  const searchNormalized = busca.toLowerCase();
  const produtosFiltrados = busca.trim() === '' ? [] : produtos.filter(p => 
    p.nome.toLowerCase().includes(searchNormalized) || 
    p.codigoBarras.includes(searchNormalized) ||
    p.codigoInterno.includes(searchNormalized)
  );

  // --- OPERAÇÕES DO PDV ---
  const handleScanSuccess = (decodedText: string, mode: 'venda' | 'consulta') => {
    // 1. Identificar se é QR Code estruturado do GlowPOS: glowpos:id_produto:tamanho
    let prodId = '';
    let tamanhoLido = '';

    if (decodedText.startsWith('glowpos:')) {
      const parts = decodedText.split(':');
      prodId = parts[1];
      tamanhoLido = parts[2];
    }

    // 2. Localizar o produto pelo ID detectado ou pelo código de barras/interno (se for código comum)
    const prod = produtos.find(p => 
      (prodId && p.id === prodId) || 
      p.codigoBarras === decodedText || 
      p.codigoInterno === decodedText
    );

    if (!prod) {
      alert(`Produto não localizado com a leitura: "${decodedText}"`);
      return;
    }

    if (mode === 'venda') {
      setShowScanner(false);
      if (tamanhoLido) {
        handleAdicionarAoCarrinho(prod, tamanhoLido);
      } else {
        handleSelecionarProduto(prod);
      }
    } else {
      setShowScanner(false);
      setConsultarProduto(prod);
    }
  };

  const handleSelecionarProduto = (prod: Produto) => {
    // Se o produto tiver tamanho único (ex: cosméticos) ou apenas uma opção na grade, adiciona direto
    if (prod.tamanhos.length === 1) {
      handleAdicionarAoCarrinho(prod, prod.tamanhos[0].tamanho);
    } else {
      // Abre modal de seleção de tamanho
      setShowTamanhoModal(prod);
    }
    setBusca('');
  };

  const handleAdicionarAoCarrinho = (prod: Produto, tamanho: string) => {
    // Validar estoque disponível
    const gradeItem = prod.tamanhos.find(t => t.tamanho === tamanho);
    const estoqueDisponivel = gradeItem ? gradeItem.estoque : 0;

    const noCarrinho = carrinho.find(item => item.produto.id === prod.id && item.tamanho === tamanho);
    const qtdNoCarrinho = noCarrinho ? noCarrinho.quantidade : 0;

    if (qtdNoCarrinho + 1 > estoqueDisponivel) {
      alert(`Quantidade indisponível em estoque para o tamanho ${tamanho}! Estoque atual: ${estoqueDisponivel} un.`);
      return;
    }

    if (noCarrinho) {
      const novos = carrinho.map(item => 
        (item.produto.id === prod.id && item.tamanho === tamanho)
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      );
      setCarrinho(novos);
    } else {
      setCarrinho([...carrinho, { produto: prod, tamanho, quantidade: 1, precoVenda: prod.precoVenda }]);
    }
    setShowTamanhoModal(null);
  };

  const handleMudarQuantidade = (idx: number, delta: number) => {
    const item = carrinho[idx];
    const gradeItem = item.produto.tamanhos.find(t => t.tamanho === item.tamanho);
    const estoqueDisponivel = gradeItem ? gradeItem.estoque : 0;
    const novaQtd = item.quantidade + delta;

    if (novaQtd <= 0) {
      setCarrinho(carrinho.filter((_, i) => i !== idx));
      return;
    }

    if (novaQtd > estoqueDisponivel) {
      alert(`Quantidade insuficiente em estoque! Máximo disponível: ${estoqueDisponivel} un.`);
      return;
    }

    const novos = carrinho.map((c, i) => i === idx ? { ...c, quantidade: novaQtd } : c);
    setCarrinho(novos);
  };

  const handleRemoverItem = (idx: number) => {
    setCarrinho(carrinho.filter((_, i) => i !== idx));
  };

  // --- PROCESSAMENTO FINANCEIRO DE CHECKOUT ---
  const handleOpenCheckout = () => {
    if (carrinho.length === 0) {
      alert('O carrinho está vazio!');
      return;
    }
    // Inicializa valores de pagamentos: lança todo o valor no 'dinheiro' por padrão
    const novosPagamentos = pagamentos.map(p => 
      p.tipo === 'dinheiro' ? { ...p, valor: total } : { ...p, valor: 0 }
    );
    setPagamentos(novosPagamentos);
    setShowCheckout(true);
  };

  const handlePagamentoChange = (tipo: FormaPagamento['tipo'], valor: number) => {
    const novos = pagamentos.map(p => p.tipo === tipo ? { ...p, valor: Math.max(0, valor) } : p);
    setPagamentos(novos);
  };

  // --- AUTOMATIZAÇÃO DE PARCELAS DO CREDIÁRIO ---
  useEffect(() => {
    if (valorCrediario <= 0 || !selectedClienteId) {
      setParcelasGeradas([]);
      return;
    }

    const novas: Omit<Parcela, 'id' | 'vendaId'>[] = [];
    const valorCada = Number((valorCrediario / numParcelas).toFixed(2));

    for (let i = 1; i <= numParcelas; i++) {
      const dataVenc = new Date(dataPrimeiroVencimento);
      if (periodicidade === 'semanal') {
        dataVenc.setDate(dataVenc.getDate() + (i - 1) * 7);
      } else if (periodicidade === 'quinzenal') {
        dataVenc.setDate(dataVenc.getDate() + (i - 1) * 15);
      } else if (periodicidade === 'mensal') {
        dataVenc.setMonth(dataVenc.getMonth() + (i - 1));
      }

      // Ajusta dízimas na última parcela
      const valorParcela = i === numParcelas 
        ? Number((valorCrediario - (valorCada * (numParcelas - 1))).toFixed(2)) 
        : valorCada;

      novas.push({
        clienteId: selectedClienteId,
        numeroParcela: i,
        totalParcelas: numParcelas,
        dataVencimento: dataVenc.toISOString().split('T')[0],
        valorOriginal: valorParcela,
        valorRestante: valorParcela,
        status: 'em_aberto',
        pagamentos: [],
        observacoes: `Crediário ${i}/${numParcelas}`
      });
    }

    setParcelasGeradas(novas);
  }, [valorCrediario, numParcelas, periodicidade, dataPrimeiroVencimento, selectedClienteId]);

  // Edição manual de parcelas individuais
  const handleEditParcelaManual = (idx: number, field: 'dataVencimento' | 'valorOriginal', val: any) => {
    const novas = parcelasGeradas.map((p, i) => {
      if (i === idx) {
        if (field === 'valorOriginal') {
          const num = Number(val);
          return { ...p, valorOriginal: num, valorRestante: num };
        }
        return { ...p, [field]: val };
      }
      return p;
    });
    setParcelasGeradas(novas);
  };

  // --- FINALIZAR VENDA COMPLETA ---
  const handleFinalizarVenda = () => {
    // 1. Validar se o total pago bate com o total da compra
    if (Math.abs(totalPagoDigitado - total) > 0.02) {
      alert(`Erro: O total das formas de pagamento (${formatCurrency(totalPagoDigitado)}) difere do total da compra (${formatCurrency(total)})`);
      return;
    }

    // 2. Se houver crediário, validar cliente e limite
    if (valorCrediario > 0) {
      if (!selectedClienteId) {
        alert('Selecione um cliente para fechar a venda no Crediário.');
        return;
      }
      if (limiteEstourado) {
        const confirmar = confirm(`ATENÇÃO: O limite disponível do cliente é ${formatCurrency(limiteDisponivel)}, mas o valor financiado é ${formatCurrency(valorCrediario)} (Estouro de limite). Deseja autorizar a venda mesmo assim?`);
        if (!confirmar) return;
      }

      // Validar soma das parcelas geradas/editadas manualmente
      const somaParcelas = parcelasGeradas.reduce((sum, p) => sum + p.valorOriginal, 0);
      if (Math.abs(somaParcelas - valorCrediario) > 0.02) {
        alert(`Erro: A soma das parcelas editadas manualmente (${formatCurrency(somaParcelas)}) difere do valor financiado no crediário (${formatCurrency(valorCrediario)}). Corrija as parcelas.`);
        return;
      }
    }

    // 3. Montar dados
    const formasAtivas = pagamentos.filter(p => p.valor > 0);
    const produtosVenda: VendaItem[] = carrinho.map(item => ({
      produtoId: item.produto.id,
      nome: item.produto.nome,
      tamanho: item.tamanho,
      quantidade: item.quantidade,
      precoVenda: item.precoVenda
    }));

    // 4. Executar e registrar no banco
    const vendaId = registrarVenda(
      {
        clienteId: selectedClienteId || undefined,
        subtotal,
        desconto,
        total,
        formasPagamento: formasAtivas,
        produtos: produtosVenda,
        usuario: currentProfile
      },
      valorCrediario > 0 ? parcelasGeradas : undefined,
      currentProfile === 'administrador' ? 'Administrador' : currentProfile === 'caixa' ? 'Caixa' : 'Vendedor'
    );

    // 5. Limpar estado e exibir comprovante
    setCarrinho([]);
    setDesconto(0);
    setShowCheckout(false);
    setShowComprovante(vendaId);
  };

  // --- CADASTRO RÁPIDO DE CLIENTE IN-LOCO ---
  const handleSaveRapidoCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCliNome || !newCliCPF || !newCliTelefone) {
      alert('Preencha Nome, CPF e Telefone');
      return;
    }

    const newId = addCliente({
      nome: newCliNome,
      cpf: newCliCPF,
      dataNascimento: '',
      telefone: newCliTelefone,
      whatsapp: newCliTelefone.replace(/\D/g, ''),
      endereco: 'Não informado (Cadastro Rápido PDV)',
      cidade: 'São Paulo',
      limiteCredito: Number(newCliLimite),
      observacoes: 'Cadastrado no PDV'
    });

    setSelectedClienteId(newId);
    setShowNewClienteModal(false);
    setNewCliNome('');
    setNewCliCPF('');
    setNewCliTelefone('');
    setNewCliLimite(1000);
  };

  return (
    <div className="pdv-container" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', height: '100%' }}>
      {/* GRID DE LAYOUT DESKTOP */}
      <div className="pdv-grid-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* COLUNA ESQUERDA: PRODUTOS E BUSCA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card glass" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} className="text-secondary" />
              Pesquisa Rápida de Produtos
            </h3>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Busque por Nome, Código ou Bipe com leitor..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '40px', borderRadius: 'var(--radius-full)' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
              </div>
              
              <button 
                onClick={() => setShowScanner(true)}
                className="btn btn-primary btn-icon"
                style={{ borderRadius: 'var(--radius-full)', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Escanear com a câmera"
              >
                <Camera size={18} />
              </button>
            </div>

            {/* LISTA RESULTADO BUSCA */}
            {busca.trim() !== '' && (
              <div className="glass" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', maxHeight: '220px', overflowY: 'auto', marginTop: '8px', padding: '6px' }}>
                {produtosFiltrados.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Nenhum produto localizado
                  </div>
                ) : (
                  produtosFiltrados.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelecionarProduto(p)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-color)',
                        textAlign: 'left',
                        fontSize: '0.85rem'
                      }}
                      className="btn-secondary"
                    >
                      <div>
                        <strong>{p.nome}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cód: {p.codigoInterno} | Marca: {p.marca}</div>
                      </div>
                      <strong style={{ color: 'var(--primary-color)' }}>{formatCurrency(p.precoVenda)}</strong>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ITENS MAIS PROCURADOS RÁPIDOS */}
          <div className="card glass" style={{ padding: '16px', flex: 1 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Atalhos Rápidos de Venda
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {produtos.slice(0, 4).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelecionarProduto(p)}
                  className="card card-interactive"
                  style={{
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    background: 'var(--bg-secondary)',
                    minHeight: '75px'
                  }}
                >
                  <strong style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.nome.split(' ')[0]} {p.nome.split(' ')[1] || ''}
                  </strong>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 700, marginTop: '4px' }}>
                    {formatCurrency(p.precoVenda)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CARRINHO E SUBMIT */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Carrinho de Vendas</span>
            <span className="badge badge-info">{carrinho.reduce((sum, item) => sum + item.quantidade, 0)} itens</span>
          </h3>

          {/* LISTA CARRINHO */}
          <div style={{ flex: 1, minHeight: '180px', maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {carrinho.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', gap: '8px' }}>
                <ShoppingBag size={32} />
                <span style={{ fontSize: '0.85rem' }}>Nenhum produto adicionado ao carrinho</span>
              </div>
            ) : (
              carrinho.map((item, idx) => (
                <div key={`${item.produto.id}-${item.tamanho}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>{item.produto.nome}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Tamanho: <strong style={{ color: 'var(--primary-color)' }}>{item.tamanho}</strong> | Unit: {formatCurrency(item.precoVenda)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Controle Qtd */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-color)' }}>
                      <button type="button" onClick={() => handleMudarQuantidade(idx, -1)} style={{ padding: '2px' }} className="btn-secondary">
                        <Minus size={12} />
                      </button>
                      <strong style={{ minWidth: '18px', textAlign: 'center' }}>{item.quantidade}</strong>
                      <button type="button" onClick={() => handleMudarQuantidade(idx, 1)} style={{ padding: '2px' }} className="btn-secondary">
                        <Plus size={12} />
                      </button>
                    </div>

                    <strong style={{ minWidth: '65px', textAlign: 'right' }}>
                      {formatCurrency(item.precoVenda * item.quantidade)}
                    </strong>

                    <button onClick={() => handleRemoverItem(idx)} style={{ color: 'var(--color-danger)', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TOTALIZAÇÃO E DESCONTO */}
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Desconto Comercial (R$):</span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={desconto || ''}
                onChange={(e) => setDesconto(Math.min(subtotal, Number(e.target.value)))}
                className="form-input"
                style={{ width: '90px', padding: '6px 10px', fontSize: '0.85rem', textAlign: 'right' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
              <span>Total da Compra:</span>
              <span style={{ color: 'var(--primary-color)' }}>{formatCurrency(total)}</span>
            </div>
          </div>

          <button 
            onClick={handleOpenCheckout} 
            className="btn btn-primary btn-block" 
            style={{ padding: '14px', borderRadius: 'var(--radius-sm)', fontSize: '1rem', fontWeight: 700 }}
            disabled={carrinho.length === 0}
          >
            <CheckCircle size={18} /> Fechar Venda (Pagar)
          </button>
        </div>

      </div>

      {/* MODAL SELECIONAR TAMANHO DA GRADE */}
      {showTamanhoModal && (
        <div className="modal-overlay" onClick={() => setShowTamanhoModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Selecione o Tamanho da Grade</h2>
              <button onClick={() => setShowTamanhoModal(null)} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Produto: <strong>{showTamanhoModal.nome}</strong>
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {showTamanhoModal.tamanhos.map(item => {
                const isSemEstoque = item.estoque === 0;
                return (
                  <button
                    key={item.tamanho}
                    onClick={() => !isSemEstoque && handleAdicionarAoCarrinho(showTamanhoModal, item.tamanho)}
                    className={`btn ${isSemEstoque ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={isSemEstoque}
                    style={{
                      flex: 1,
                      minWidth: '70px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      background: isSemEstoque ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                      color: isSemEstoque ? 'var(--text-muted)' : 'var(--text-primary)',
                      borderColor: isSemEstoque ? 'transparent' : 'var(--border-color)',
                      boxShadow: 'none'
                    }}
                  >
                    <strong style={{ fontSize: '1rem' }}>{item.tamanho}</strong>
                    <span style={{ fontSize: '0.7rem', color: isSemEstoque ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                      {isSemEstoque ? 'Zerad.' : `${item.estoque} un`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FECHAMENTO E PAGAMENTO COMPLETO (CHECKOUT) */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Fechamento Financeiro</h2>
              <button onClick={() => setShowCheckout(false)} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* LADO A: VALORES E FORMAS */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-secondary)' }}>Formas de Pagamento</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pagamentos.map(p => (
                    <div key={p.tipo} style={{ display: 'flex', justifySelf: 'stretch', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '90px', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        {p.tipo}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={p.valor || ''}
                        onChange={(e) => handlePagamentoChange(p.tipo, Number(e.target.value))}
                        className="form-input"
                        style={{ textAlign: 'right', fontWeight: 700, color: p.valor > 0 ? 'var(--primary-color)' : 'var(--text-primary)' }}
                        placeholder="R$ 0,00"
                      />
                    </div>
                  ))}
                </div>

                <div className="card" style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Total a Receber:</span>
                    <strong>{formatCurrency(total)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Valor Informado:</span>
                    <strong style={{ color: Math.abs(totalPagoDigitado - total) < 0.02 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {formatCurrency(totalPagoDigitado)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
                    <span>Diferença / Saldo:</span>
                    <strong style={{ color: total - totalPagoDigitado === 0 ? 'var(--text-muted)' : 'var(--color-danger)' }}>
                      {formatCurrency(total - totalPagoDigitado)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* LADO B: PAINEL DE CREDIÁRIO SE O TIPO CREDIARIO FOR ATIVADO */}
              {valorCrediario > 0 && (
                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', color: 'var(--color-crediario)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={18} />
                    Módulo de Parcelamento de Crediário
                  </h3>

                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Selecionar Cliente *</label>
                      <button type="button" onClick={() => setShowNewClienteModal(true)} className="btn btn-secondary btn-xs" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                        <UserPlus size={10} /> + Cadastrar Rápido
                      </button>
                    </div>
                    <select
                      value={selectedClienteId}
                      onChange={(e) => setSelectedClienteId(e.target.value)}
                      className="form-input form-select"
                    >
                      <option value="">Selecione o Cliente do Crediário</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nome} ({c.cpf})</option>
                      ))}
                    </select>
                  </div>

                  {/* INFO DE LIMITE DO CLIENTE */}
                  {selectedClienteId && (
                    <div className="card" style={{ padding: '10px', background: limiteEstourado ? 'var(--color-danger-light)' : 'var(--color-success-light)', borderColor: limiteEstourado ? 'var(--color-danger)' : 'var(--color-success)', marginBottom: '12px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Limite Total de Crédito:</span>
                        <strong>{formatCurrency(clienteSelecionado?.limiteCredito || 0)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span>Limite Disponível Atual:</span>
                        <strong style={{ color: limiteDisponivel < valorCrediario ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {formatCurrency(limiteDisponivel)}
                        </strong>
                      </div>
                      {limiteEstourado && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-danger)', fontWeight: 700, marginTop: '6px', fontSize: '0.75rem' }}>
                          <AlertTriangle size={12} />
                          <span>EXCEDE O LIMITE EM {formatCurrency(valorCrediario - limiteDisponivel)}!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PARCELAMENTO CONFIGS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Qtd Parcelas</label>
                      <select
                        value={numParcelas}
                        onChange={(e) => setNumParcelas(Number(e.target.value))}
                        className="form-input form-select"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Periodicidade</label>
                      <select
                        value={periodicidade}
                        onChange={(e) => setPeriodicidade(e.target.value as any)}
                        className="form-input form-select"
                      >
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                        <option value="mensal">Mensal</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Primeiro Vencimento</label>
                    <input
                      type="date"
                      value={dataPrimeiroVencimento}
                      onChange={(e) => setDataPrimeiroVencimento(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  {/* GRID EDICAO MANUAL DAS PARCELAS GERADAS (REQUISITO ESPECIAL!) */}
                  {parcelasGeradas.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                        Visualização e Edição Manual de Parcelas (Opcional)
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)', padding: '6px' }}>
                        {parcelasGeradas.map((p, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.8rem' }}>
                            <span style={{ minWidth: '45px', fontWeight: 700 }}>#{p.numeroParcela}</span>
                            <input
                              type="date"
                              value={p.dataVencimento}
                              onChange={(e) => handleEditParcelaManual(idx, 'dataVencimento', e.target.value)}
                              className="form-input"
                              style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={p.valorOriginal}
                              onChange={(e) => handleEditParcelaManual(idx, 'valorOriginal', e.target.value)}
                              className="form-input"
                              style={{ padding: '4px 6px', fontSize: '0.75rem', textAlign: 'right', fontWeight: 700, width: '80px' }}
                            />
                          </div>
                        ))}
                      </div>
                      
                      {/* Validação de soma manual */}
                      {Math.abs(parcelasGeradas.reduce((sum, p) => sum + p.valorOriginal, 0) - valorCrediario) > 0.02 && (
                        <div style={{ color: 'var(--color-danger)', fontSize: '0.7rem', fontWeight: 700, marginTop: '4px' }}>
                          * A soma das parcelas ({formatCurrency(parcelasGeradas.reduce((sum, p) => sum + p.valorOriginal, 0))}) difere do valor total financiado ({formatCurrency(valorCrediario)}). Ajuste os centavos!
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* FECHAMENTO DE CHECKOUT BUTTON */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCheckout(false)} className="btn btn-secondary">
                Voltar
              </button>
              <button 
                onClick={handleFinalizarVenda} 
                className="btn btn-success"
                style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 700 }}
                disabled={
                  Math.abs(totalPagoDigitado - total) > 0.02 || 
                  (valorCrediario > 0 && (!selectedClienteId || Math.abs(parcelasGeradas.reduce((sum, p) => sum + p.valorOriginal, 0) - valorCrediario) > 0.02))
                }
              >
                Confirmar e Emitir Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPROVANTE TÉRMICO DE FECHAMENTO (MOCK CUPOM) */}
      {showComprovante && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', fontFamily: 'monospace', fontSize: '0.8rem', background: '#f8f9fa', color: '#000', border: '1px solid #ddd', padding: '16px' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900 }}>GLOW MODAS ERP</h2>
              <p>Av. Paulista, 1500 - São Paulo</p>
              <p>CNPJ: 12.345.678/0001-99</p>
              <p>Telefone: (11) 98888-7777</p>
            </div>

            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
              <p><strong>CUPOM DE VENDA DE PRODUTOS</strong></p>
              <p>VENDA ID: {showComprovante}</p>
              <p>DATA: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
              <p>OPERADOR: {currentProfile.toUpperCase()}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left' }}>Item (Qtd x Vl.Un)</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Aqui listaria os itens da última venda salva. Como já limpamos o carrinho, podemos puxar os itens simulados ou do state. Para facilitar exibimos um resumo. */}
                <tr>
                  <td>Itens diversos da compra</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(total)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px', textAlign: 'right' }}>
              <p>Subtotal: {formatCurrency(subtotal)}</p>
              <p>Desconto: {formatCurrency(desconto)}</p>
              <p><strong>TOTAL: {formatCurrency(total)}</strong></p>
            </div>

            {/* Crediário e parcelas no Cupom */}
            {valorCrediario > 0 && (
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
                <p><strong>CREDIÁRIO AUTORIZADO</strong></p>
                <p>CLIENTE: {clientes.find(c => c.id === selectedClienteId)?.nome}</p>
                <p>VALOR FINANCIADO: {formatCurrency(valorCrediario)}</p>
                <p>PARCELAS:</p>
                <div style={{ paddingLeft: '8px', fontSize: '0.7rem' }}>
                  {parcelasGeradas.map(p => (
                    <p key={p.numeroParcela}>
                      Parc. #{p.numeroParcela} - {formatDate(p.dataVencimento)} - <strong>{formatCurrency(p.valorOriginal)}</strong>
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <p>Obrigado pela preferência!</p>
              <p>Volte sempre.</p>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }} className="no-print">
                <button 
                  onClick={() => window.print()} 
                  className="btn btn-secondary btn-xs"
                  style={{ flex: 1, fontFamily: 'sans-serif' }}
                >
                  <Printer size={12} /> Imprimir
                </button>
                <button 
                  onClick={() => setShowComprovante(null)} 
                  className="btn btn-primary btn-xs"
                  style={{ flex: 1, fontFamily: 'sans-serif' }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CADASTRO RÁPIDO CLIENTE MODAL */}
      {showNewClienteModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Cadastro Rápido de Cliente</h2>
              <button onClick={() => setShowNewClienteModal(false)} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRapidoCliente} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={newCliNome}
                  onChange={(e) => setNewCliNome(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">CPF *</label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={newCliCPF}
                  onChange={(e) => setNewCliCPF(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="(00) 00000-0000"
                  value={newCliTelefone}
                  onChange={(e) => setNewCliTelefone(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Limite de Crédito Inicial (R$)</label>
                <input
                  type="number"
                  value={newCliLimite}
                  onChange={(e) => setNewCliLimite(Number(e.target.value))}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
                Salvar e Selecionar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SCANNER VIA CÂMERA INTEGRADO */}
      <ScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* MODAL CONSULTA DE PREÇO DO PRODUTO */}
      {consultarProduto && (
        <div className="modal-overlay" onClick={() => setConsultarProduto(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Consulta de Preço</h2>
              <button onClick={() => setConsultarProduto(null)} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Nome e Categoria */}
              <div style={{ textAlign: 'center' }}>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                  {consultarProduto.categoria}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '6px', color: 'var(--text-primary)' }}>
                  {consultarProduto.nome}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Marca: {consultarProduto.marca} │ Cor: {consultarProduto.cor}
                </span>
              </div>

              {/* Preço de Venda gigante com gradiente */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                textAlign: 'center',
                border: '1px dashed var(--primary-color)'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Preço de Venda
                </span>
                <strong style={{
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  background: 'var(--primary-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-block',
                  marginTop: '4px'
                }}>
                  {formatCurrency(consultarProduto.precoVenda)}
                </strong>
              </div>

              {/* Grade de Tamanhos & Estoques físicos */}
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Disponibilidade em Estoque
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
                  {consultarProduto.tamanhos.map(item => (
                    <div key={item.tamanho} style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-xs)',
                      background: item.estoque === 0 ? 'var(--color-danger-light)' : 'var(--bg-secondary)',
                      border: `1px solid ${item.estoque === 0 ? 'var(--color-danger)' : 'var(--border-color)'}`,
                      textAlign: 'center',
                      fontSize: '0.8rem'
                    }}>
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>{item.tamanho}</strong>
                      <span style={{ color: item.estoque === 0 ? 'var(--color-danger)' : 'var(--text-secondary)', fontWeight: 700 }}>
                        {item.estoque} un
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões Rápidos */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button 
                  onClick={() => setConsultarProduto(null)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Fechar Consulta
                </button>
                <button 
                  onClick={() => {
                    handleSelecionarProduto(consultarProduto);
                    setConsultarProduto(null);
                  }} 
                  className="btn btn-primary" 
                  style={{ flex: 1.5 }}
                >
                  Vender este Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
