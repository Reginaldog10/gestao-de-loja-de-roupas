import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Produto } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, 
  Copy, 
  Barcode, 
  Layers, 
  History, 
  AlertOctagon, 
  Trash2, 
  Edit3,
  X,
  QrCode
} from 'lucide-react';
import { formatCurrency, generateId } from '../../utils/formatters';
import { Encomendas } from '../Encomendas';
import { Etiquetas } from './Etiquetas';

export const Produtos: React.FC<{ filterText: string }> = ({ filterText }) => {
  const { 
    produtos, 
    fornecedores, 
    movimentacoesEstoque,
    addProduto, 
    updateProduto, 
    duplicateProduto, 
    deleteProduto,
    ajustarEstoqueManual 
  } = useApp();

  const { hasAccess, currentProfile } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'lista' | 'encomendas' | 'movimentacoes' | 'etiquetas'>('lista');
  const [showModal, setShowModal] = useState<'none' | 'produto' | 'ajuste' | 'scanner'>('none');
  const [selectedProdutoId, setSelectedProdutoId] = useState<string | null>(null);
  const [selectedTamanho, setSelectedTamanho] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Form states - Produto
  const [prodNome, setProdNome] = useState('');
  const [prodBarras, setProdBarras] = useState('');
  const [prodCategoria, setProdCategoria] = useState('');
  const [prodMarca, setProdMarca] = useState('');
  const [prodCor, setProdCor] = useState('');
  const [prodFornecedor, setProdFornecedor] = useState('');
  const [prodPrecoCusto, setProdPrecoCusto] = useState(0);
  const [prodPrecoVenda, setProdPrecoVenda] = useState(0);
  const [prodEstoqueMin, setProdEstoqueMin] = useState(2);
  const [gradeTamanhos, setGradeTamanhos] = useState<{ tamanho: string; estoque: number }[]>([
    { tamanho: 'P', estoque: 0 },
    { tamanho: 'M', estoque: 0 },
    { tamanho: 'G', estoque: 0 },
    { tamanho: 'GG', estoque: 0 }
  ]);

  // Form states - Ajuste manual
  const [ajustQuantidade, setAjustQuantidade] = useState(1);
  const [ajustTipo, setAjustTipo] = useState<'entrada' | 'saida'>('entrada');
  const [ajustMotivo, setAjustMotivo] = useState<'ajuste' | 'perda' | 'troca'>('ajuste');
  const [ajustObs, setAjustObs] = useState('');

  // Scanner Simulado
  const [scanCode, setScanCode] = useState('');

  const clearForm = () => {
    setProdNome('');
    setProdBarras('');
    setProdCategoria('');
    setProdMarca('');
    setProdCor('');
    setProdFornecedor(fornecedores[0]?.id || '');
    setProdPrecoCusto(0);
    setProdPrecoVenda(0);
    setProdEstoqueMin(2);
    setGradeTamanhos([
      { tamanho: 'P', estoque: 0 },
      { tamanho: 'M', estoque: 0 },
      { tamanho: 'G', estoque: 0 },
      { tamanho: 'GG', estoque: 0 }
    ]);
    setIsEditing(false);
  };

  // --- ACTIONS PRODUTO ---
  const handleOpenNewProduto = () => {
    clearForm();
    setIsEditing(false);
    setShowModal('produto');
  };

  const handleOpenEditProduto = (p: Produto, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProdutoId(p.id);
    setProdNome(p.nome);
    setProdBarras(p.codigoBarras);
    setProdCategoria(p.categoria);
    setProdMarca(p.marca);
    setProdCor(p.cor);
    setProdFornecedor(p.fornecedorId);
    setProdPrecoCusto(p.precoCusto);
    setProdPrecoVenda(p.precoVenda);
    setProdEstoqueMin(p.estoqueMinimo);
    setGradeTamanhos(p.tamanhos);
    setIsEditing(true);
    setShowModal('produto');
  };

  const handleSaveProduto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNome || !prodCategoria || !prodPrecoVenda) {
      alert('Preencha os campos obrigatórios: Nome, Categoria e Preço de Venda');
      return;
    }

    const payload = {
      codigoBarras: prodBarras || 'SEM-CODIGO-' + generateId(),
      nome: prodNome,
      categoria: prodCategoria,
      marca: prodMarca || 'GlowModas',
      cor: prodCor || 'Única',
      tamanhos: gradeTamanhos.filter(item => item.tamanho.trim() !== ''),
      fornecedorId: prodFornecedor || fornecedores[0]?.id || '',
      precoCusto: Number(prodPrecoCusto),
      precoVenda: Number(prodPrecoVenda),
      estoqueMinimo: Number(prodEstoqueMin)
    };

    if (isEditing && selectedProdutoId) {
      updateProduto(selectedProdutoId, payload);
    } else {
      addProduto(payload);
    }

    setShowModal('none');
    clearForm();
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = duplicateProduto(id);
    if (newId) {
      alert('Produto duplicado com sucesso! Os estoques foram inicializados zerados na cópia.');
    }
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir o produto ${name}?`)) {
      deleteProduto(id);
    }
  };

  // --- CONTROLE DE ESTOQUE ---
  const handleOpenAjuste = (produtoId: string, tamanho: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProdutoId(produtoId);
    setSelectedTamanho(tamanho);
    setAjustQuantidade(1);
    setAjustTipo('entrada');
    setAjustMotivo('ajuste');
    setAjustObs('');
    setShowModal('ajuste');
  };

  const handleSaveAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdutoId || !selectedTamanho || ajustQuantidade <= 0) return;

    ajustarEstoqueManual(
      selectedProdutoId,
      selectedTamanho,
      ajustQuantidade,
      ajustTipo,
      ajustMotivo,
      ajustObs,
      currentProfile === 'administrador' ? 'Administrador' : currentProfile === 'caixa' ? 'Caixa' : 'Vendedor'
    );

    setShowModal('none');
  };

  // --- SCANNER SIMULADO ---
  const handleSimulateScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanCode) return;
    
    // Busca o produto pelo código de barras no banco de dados local
    const p = produtos.find(item => item.codigoBarras === scanCode || item.codigoInterno === scanCode);
    if (p) {
      // Toca um bipe sonoro simulado (Web Audio API)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz beep
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (err) { }

      // Abre as informações do produto
      handleOpenEditProduto(p, { stopPropagation: () => {} } as any);
      setScanCode('');
      setShowModal('none');
    } else {
      alert('Produto não localizado com este código de barras ou interno.');
    }
  };

  // ADICIONAR TAMANHO À GRADE EM TEMPO REAL
  const handleAddTamanhoGrid = () => {
    setGradeTamanhos([...gradeTamanhos, { tamanho: '', estoque: 0 }]);
  };

  const handleRemoveTamanhoGrid = (idx: number) => {
    setGradeTamanhos(gradeTamanhos.filter((_, i) => i !== idx));
  };

  const handleGradeChange = (idx: number, field: 'tamanho' | 'estoque', val: any) => {
    const novos = gradeTamanhos.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setGradeTamanhos(novos);
  };

  // FILTRAGEM
  const searchNormalized = filterText.toLowerCase();
  const searchProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchNormalized) ||
    p.codigoBarras.includes(searchNormalized) ||
    p.codigoInterno.includes(searchNormalized) ||
    p.categoria.toLowerCase().includes(searchNormalized) ||
    p.marca.toLowerCase().includes(searchNormalized)
  );

  return (
    <div className="produtos-container">
      {/* ABAS SECUNDÁRIAS */}
      <div className="card glass" style={{ padding: '8px', marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('lista')}
          className={`btn ${activeSubTab === 'lista' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '120px' }}
        >
          <Layers size={18} />
          Catálogo & Estoque
        </button>
        <button
          onClick={() => setActiveSubTab('encomendas')}
          className={`btn ${activeSubTab === 'encomendas' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '120px' }}
        >
          <Barcode size={18} />
          Encomendas
        </button>
        <button
          onClick={() => setActiveSubTab('movimentacoes')}
          className={`btn ${activeSubTab === 'movimentacoes' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '120px' }}
        >
          <History size={18} />
          Histórico (Auditoria)
        </button>
        <button
          onClick={() => setActiveSubTab('etiquetas')}
          className={`btn ${activeSubTab === 'etiquetas' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '120px' }}
        >
          <QrCode size={18} />
          Etiquetas QR
        </button>
      </div>

      {/* HEADER DA TELA */}
      {activeSubTab !== 'encomendas' && activeSubTab !== 'etiquetas' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            {activeSubTab === 'lista' ? 'Produtos & Grade' : 'Movimentações de Estoque'}
          </h1>
          {activeSubTab === 'lista' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowModal('scanner')} className="btn btn-secondary btn-xs">
                <Barcode size={16} /> Scanner
              </button>
              {hasAccess('products_modify') && (
                <button onClick={handleOpenNewProduto} className="btn btn-primary btn-xs">
                  <Plus size={16} /> Novo Produto
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* CATÁLOGO DE PRODUTOS */}
      {activeSubTab === 'lista' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {searchProdutos.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Nenhum produto cadastrado ou encontrado
            </div>
          ) : (
            searchProdutos.map(p => {
              const totalEstoque = p.tamanhos.reduce((sum, item) => sum + item.estoque, 0);
              const forn = fornecedores.find(f => f.id === p.fornecedorId);
              const isBaixoEstoque = totalEstoque <= p.estoqueMinimo;
              const isSemEstoque = totalEstoque === 0;

              return (
                <div 
                  key={p.id} 
                  className={`card card-interactive ${isSemEstoque ? 'border-danger-custom' : isBaixoEstoque ? 'border-warning-custom' : ''}`}
                  onClick={(e) => hasAccess('products_modify') ? handleOpenEditProduto(p, e) : null}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    borderLeft: isSemEstoque 
                      ? '4px solid var(--color-danger)' 
                      : isBaixoEstoque 
                        ? '4px solid var(--color-warning)' 
                        : '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                          CÓD: {p.codigoInterno}
                        </span>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{p.categoria}</span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px' }}>{p.nome}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Marca: {p.marca} | Cor: {p.cor} | Forn: {forn?.nomeFantasia || 'Sem fornecedor'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleDuplicate(p.id, e)} 
                        className="btn btn-secondary btn-icon" 
                        style={{ padding: '6px' }}
                        title="Duplicar produto"
                      >
                        <Copy size={14} />
                      </button>
                      {hasAccess('products_modify') && (
                        <>
                          <button 
                            onClick={(e) => handleOpenEditProduto(p, e)} 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '6px' }}
                            title="Editar produto"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={(e) => handleDelete(p.id, p.nome, e)} 
                            className="btn btn-danger btn-icon" 
                            style={{ padding: '6px' }}
                            title="Excluir produto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* PREÇOS E ESTOQUE */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem' }}>
                    {hasAccess('finance_view') && (
                      <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>CUSTO</span>
                        <strong style={{ color: 'var(--text-secondary)' }}>{formatCurrency(p.precoCusto)}</strong>
                      </div>
                    )}
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>VENDA</span>
                      <strong style={{ color: 'var(--primary-color)', fontWeight: 700 }}>{formatCurrency(p.precoVenda)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>ESTOQUE TOTAL</span>
                      <strong style={{ color: isSemEstoque ? 'var(--color-danger)' : isBaixoEstoque ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {totalEstoque} un
                      </strong>
                    </div>
                  </div>

                  {/* GRADE DE TAMANHOS COM BOTOES DE AJUSTE DIRETO */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 700, marginBottom: '6px' }}>
                      Grade de Estoque (Clique no tamanho para reajustar estoque)
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {p.tamanhos.map(item => (
                        <button
                          key={item.tamanho}
                          onClick={(e) => handleOpenAjuste(p.id, item.tamanho, e)}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.8rem',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            background: item.estoque === 0 ? 'var(--color-danger-light)' : 'var(--bg-secondary)',
                            borderColor: item.estoque === 0 ? 'var(--color-danger)' : 'var(--border-color)'
                          }}
                        >
                          <strong>{item.tamanho}</strong>
                          <span style={{ color: item.estoque === 0 ? 'var(--color-danger)' : 'var(--text-secondary)', fontWeight: 700 }}>
                            {item.estoque}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ALERTA DE ESTOQUE MINIMO */}
                  {isBaixoEstoque && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSemEstoque ? 'var(--color-danger)' : 'var(--color-warning)', fontWeight: 700, fontSize: '0.75rem', background: isSemEstoque ? 'var(--color-danger-light)' : 'var(--color-warning-light)', padding: '6px 12px', borderRadius: 'var(--radius-xs)' }}>
                      <AlertOctagon size={12} />
                      <span>
                        {isSemEstoque 
                          ? 'PRODUTO FORA DE ESTOQUE!' 
                          : `ESTOQUE BAIXO! Mínimo configurado: ${p.estoqueMinimo} un.`
                        }
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ENCOMENDAS */}
      {activeSubTab === 'encomendas' && (
        <Encomendas filterText={filterText} />
      )}

      {/* HISTÓRICO / AUDITORIA DE MOVIMENTAÇÕES */}
      {activeSubTab === 'movimentacoes' && (
        <div className="card glass" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>Registro de Movimentações (Auditoria)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
            {movimentacoesEstoque.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                Nenhuma movimentação registrada.
              </div>
            ) : (
              movimentacoesEstoque.map(m => {
                const prod = produtos.find(p => p.id === m.produtoId);
                const isEntrada = m.tipo === 'entrada';

                return (
                  <div 
                    key={m.id} 
                    style={{
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'var(--bg-primary)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.85rem',
                      borderLeft: isEntrada ? '4px solid var(--color-success)' : '4px solid var(--color-danger)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${isEntrada ? 'badge-success' : 'badge-danger'}`}>
                          {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.data}</span>
                      </div>
                      <div style={{ fontWeight: 700, marginTop: '4px' }}>
                        {prod ? prod.nome : 'Produto Excluído'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Tam: {m.tamanho} | Motivo: <span style={{ fontWeight: 600 }}>{m.motivo.toUpperCase()}</span> | Operador: {m.usuario}
                      </div>
                      {m.observacao && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                          Obs: {m.observacao}
                        </div>
                      )}
                    </div>
                    
                    <strong style={{ fontSize: '1.05rem', color: isEntrada ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {isEntrada ? '+' : '-'}{m.quantidade}
                    </strong>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* GERADOR DE ETIQUETAS QR CODE */}
      {activeSubTab === 'etiquetas' && (
        <Etiquetas />
      )}

      {/* MODAL CADASTRO/EDIÇÃO PRODUTO */}
      {showModal === 'produto' && (
        <div className="modal-overlay" onClick={() => setShowModal('none')}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {isEditing ? 'Editar Produto' : 'Novo Produto em Grade'}
              </h2>
              <button onClick={() => setShowModal('none')} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduto} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Camiseta Básica Masculina"
                  value={prodNome}
                  onChange={(e) => setProdNome(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Código de Barras (EAN)</label>
                  <input
                    type="text"
                    placeholder="Código de barras para o leitor"
                    value={prodBarras}
                    onChange={(e) => setProdBarras(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Roupas, Cosméticos, Acessórios"
                    value={prodCategoria}
                    onChange={(e) => setProdCategoria(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input
                    type="text"
                    placeholder="Ex: Nike, Chanel, Modas"
                    value={prodMarca}
                    onChange={(e) => setProdMarca(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cor</label>
                  <input
                    type="text"
                    placeholder="Ex: Preto, Azul, Vermelho"
                    value={prodCor}
                    onChange={(e) => setProdCor(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                {hasAccess('finance_view') && (
                  <div className="form-group">
                    <label className="form-label">Preço de Custo (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={prodPrecoCusto}
                      onChange={(e) => setProdPrecoCusto(Number(e.target.value))}
                      className="form-input"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodPrecoVenda}
                    onChange={(e) => setProdPrecoVenda(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estoque Mínimo (Alertas)</label>
                  <input
                    type="number"
                    required
                    value={prodEstoqueMin}
                    onChange={(e) => setProdEstoqueMin(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Fornecedor Associado</label>
                <select
                  value={prodFornecedor}
                  onChange={(e) => setProdFornecedor(e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">Selecione um fornecedor</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>{f.nomeFantasia} ({f.razaoSocial})</option>
                  ))}
                </select>
              </div>

              {/* GRADE DE TAMANHOS DINÂMICA */}
              <div className="card" style={{ background: 'var(--bg-primary)', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    Grade de Tamanhos e Estoque Inicial
                  </h4>
                  <button type="button" onClick={handleAddTamanhoGrid} className="btn btn-secondary btn-xs" style={{ padding: '4px 8px' }}>
                    + Add Tamanho
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {gradeTamanhos.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Ex: P, M, 38, U"
                        value={item.tamanho}
                        onChange={(e) => handleGradeChange(idx, 'tamanho', e.target.value.toUpperCase())}
                        style={{ width: '120px' }}
                        className="form-input"
                        disabled={isEditing} // Não muda nome do tamanho na edição direta para evitar falhas de relacionamento
                      />
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={item.estoque}
                        onChange={(e) => handleGradeChange(idx, 'estoque', Number(e.target.value))}
                        className="form-input"
                        disabled={isEditing} // Estoques em edição devem ser alterados via Ajuste de auditoria
                      />
                      {!isEditing && gradeTamanhos.length > 1 && (
                        <button type="button" onClick={() => handleRemoveTamanhoGrid(idx)} className="btn btn-danger btn-icon" style={{ padding: '8px' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                      * Em edição de produto, ajustes de estoques devem ser feitos clicando diretamente sobre o tamanho no card principal do produto.
                    </span>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Salvar Produto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJUSTE MANUAL DE ESTOQUE */}
      {showModal === 'ajuste' && selectedProdutoId && selectedTamanho && (
        <div className="modal-overlay" onClick={() => setShowModal('none')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Ajustar Inventário</h2>
              <button onClick={() => setShowModal('none')} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Alterando estoque do produto: <strong style={{ color: 'var(--text-primary)' }}>
                {produtos.find(p => p.id === selectedProdutoId)?.nome} (Tamanho: {selectedTamanho})
              </strong>
            </p>

            <form onSubmit={handleSaveAjuste} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Movimentação *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '8px', cursor: 'pointer', background: ajustTipo === 'entrada' ? 'var(--color-success-light)' : 'transparent', borderColor: ajustTipo === 'entrada' ? 'var(--color-success)' : 'var(--border-color)', fontWeight: 600 }}>
                    <input type="radio" name="ajustTipo" value="entrada" checked={ajustTipo === 'entrada'} onChange={() => { setAjustTipo('entrada'); setAjustMotivo('ajuste'); }} style={{ display: 'none' }} />
                    <span style={{ color: ajustTipo === 'entrada' ? 'var(--color-success)' : 'var(--text-secondary)' }}>+ Entrada (Somar)</span>
                  </label>
                  <label style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '8px', cursor: 'pointer', background: ajustTipo === 'saida' ? 'var(--color-danger-light)' : 'transparent', borderColor: ajustTipo === 'saida' ? 'var(--color-danger)' : 'var(--border-color)', fontWeight: 600 }}>
                    <input type="radio" name="ajustTipo" value="saida" checked={ajustTipo === 'saida'} onChange={() => { setAjustTipo('saida'); setAjustMotivo('perda'); }} style={{ display: 'none' }} />
                    <span style={{ color: ajustTipo === 'saida' ? 'var(--color-danger)' : 'var(--text-secondary)' }}>- Saída (Subtrair)</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantidade de Itens *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={ajustQuantidade}
                    onChange={(e) => setAjustQuantidade(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Motivo da Ajustagem *</label>
                  <select
                    value={ajustMotivo}
                    onChange={(e) => setAjustMotivo(e.target.value as any)}
                    className="form-input form-select"
                  >
                    {ajustTipo === 'entrada' ? (
                      <>
                        <option value="ajuste">Ajuste de Balanço</option>
                        <option value="compra">Compra de Fornecedor</option>
                        <option value="troca">Retorno de Troca</option>
                      </>
                    ) : (
                      <>
                        <option value="perda">Perda / Avaria</option>
                        <option value="ajuste">Ajuste de Balanço</option>
                        <option value="troca">Retirada para Troca</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações de Auditoria</label>
                <input
                  type="text"
                  placeholder="Justificativa da alteração"
                  value={ajustObs}
                  onChange={(e) => setAjustObs(e.target.value)}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
                Confirmar Ajuste no Estoque
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SCANNER DE CÓDIGO DE BARRAS SIMULADO */}
      {showModal === 'scanner' && (
        <div className="modal-overlay" onClick={() => setShowModal('none')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Leitor de Código de Barras</h2>
              <button onClick={() => setShowModal('none')} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            {/* Simulação Visual do Scanner */}
            <div style={{ height: '140px', background: '#000', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', marginBottom: '20px', border: '2px solid var(--primary-color)' }}>
              <div style={{ width: '80%', height: '2px', background: '#ff0000', position: 'absolute', animation: 'fadeIn 1s infinite alternate', boxShadow: '0 0 10px #ff0000' }} />
              <Barcode size={48} color="#888" style={{ opacity: 0.5 }} />
              <span style={{ color: '#fff', fontSize: '0.75rem', marginTop: '12px', fontWeight: 600, letterSpacing: '1px' }}>
                SCANEANDO COM A CÂMERA...
              </span>
            </div>

            <form onSubmit={handleSimulateScan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Digite o EAN ou Código Interno para Simular</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 7891001200345"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary">
                    Bipar
                  </button>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  * Insira o código do produto (Ex: 7891001200345) e aperte 'Bipar' para simular a câmera lendo o código.
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
