import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Encomenda } from '../../context/AppContext';
import { 
  Truck, 
  Clock, 
  ShoppingBag, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  X, 
  Trash2 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const Encomendas: React.FC<{ filterText: string }> = ({ filterText }) => {
  const { 
    encomendas, 
    clientes, 
    produtos, 
    addEncomenda, 
    updateEncomendaStatus, 
    deleteEncomenda 
  } = useApp();

  const [showModal, setShowModal] = useState(false);

  // Form states - Encomenda
  const [encCliente, setEncCliente] = useState('');
  const [encProduto, setEncProduto] = useState('');
  const [encTamanho, setEncTamanho] = useState('');
  const [encQuantidade, setEncQuantidade] = useState(1);
  const [encValor, setEncValor] = useState(0);
  const [encPrevisao, setEncPrevisao] = useState('');
  const [encObservacoes, setEncObservacoes] = useState('');

  // Ao selecionar produto, atualiza o valor sugerido e a lista de tamanhos
  const handleProdutoChange = (prodId: string) => {
    setEncProduto(prodId);
    const p = produtos.find(item => item.id === prodId);
    if (p) {
      setEncValor(p.precoVenda);
      setEncTamanho(p.tamanhos[0]?.tamanho || '');
    }
  };

  const handleSaveEncomenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!encCliente || !encProduto || !encTamanho || encQuantidade <= 0 || !encPrevisao) {
      alert('Preencha os campos obrigatórios: Cliente, Produto, Tamanho e Previsão.');
      return;
    }

    addEncomenda({
      clienteId: encCliente,
      produtoId: encProduto,
      tamanho: encTamanho,
      quantidade: Number(encQuantidade),
      valor: Number(encValor) * Number(encQuantidade),
      previsaoEntrega: encPrevisao,
      status: 'aguardando_compra',
      observacoes: encObservacoes
    });

    setShowModal(false);
    // Limpar form
    setEncCliente('');
    setEncProduto('');
    setEncTamanho('');
    setEncQuantidade(1);
    setEncValor(0);
    setEncPrevisao('');
    setEncObservacoes('');
  };

  const handleDeleteEncomenda = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta encomenda?')) {
      deleteEncomenda(id);
    }
  };

  // Status Labels e Cores
  const STATUS_DETAILS: Record<Encomenda['status'], { label: string; badge: string; icon: any; color: string }> = {
    aguardando_compra: { label: 'Aguardando Compra', badge: 'badge-danger', icon: Clock, color: 'var(--color-danger)' },
    comprado: { label: 'Comprado', badge: 'badge-warning', icon: ShoppingBag, color: 'var(--color-warning)' },
    em_transporte: { label: 'Em Transporte', badge: 'badge-info', icon: Truck, color: 'var(--color-info)' },
    disponivel_retirada: { label: 'Disponível para Retirada', badge: 'badge-warning', icon: AlertCircle, color: 'var(--color-warning)' },
    entregue: { label: 'Entregue', badge: 'badge-success', icon: CheckCircle2, color: 'var(--color-success)' }
  };

  // FILTRAGEM
  const searchNormalized = filterText.toLowerCase();
  const searchEncomendas = encomendas.filter(e => {
    const cli = clientes.find(c => c.id === e.clienteId);
    const prod = produtos.find(p => p.id === e.produtoId);
    return (
      (cli && cli.nome.toLowerCase().includes(searchNormalized)) ||
      (prod && prod.nome.toLowerCase().includes(searchNormalized)) ||
      e.status.includes(searchNormalized)
    );
  });

  return (
    <div className="encomendas-container">
      {/* HEADER TELA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Encomendas Especiais</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-xs">
          <Plus size={16} /> Nova Encomenda
        </button>
      </div>

      {/* LISTA ENCOMENDAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {searchEncomendas.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Nenhuma encomenda registrada ou localizada.
          </div>
        ) : (
          searchEncomendas.map(e => {
            const cli = clientes.find(c => c.id === e.clienteId);
            const prod = produtos.find(p => p.id === e.produtoId);
            const statusDetail = STATUS_DETAILS[e.status];

            return (
              <div 
                key={e.id} 
                className="card" 
                style={{
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderLeft: `4px solid ${statusDetail.color}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${statusDetail.badge}`} style={{ fontSize: '0.65rem' }}>
                        {statusDetail.label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PREVISÃO: {formatDate(e.previsaoEntrega)}</span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '4px' }}>
                      {prod ? prod.nome : 'Produto não localizado'} (Grade: {e.tamanho})
                    </h3>
                  </div>

                  <button onClick={(event) => handleDeleteEncomenda(e.id, event)} className="btn btn-secondary btn-icon" style={{ padding: '6px', color: 'var(--color-danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>CLIENTE</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{cli ? cli.nome : 'Cliente não localizado'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>VALOR TOTAL ENCOMENDA</span>
                    <strong style={{ color: 'var(--primary-color)', fontWeight: 700 }}>{formatCurrency(e.valor)}</strong>
                  </div>
                </div>

                {e.observacoes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', fontStyle: 'italic' }}>
                    Obs: {e.observacoes}
                  </div>
                )}

                {/* BOTÕES DE MUDANÇA DE STATUS RÁPIDO */}
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Atualizar Status da Encomenda:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(Object.keys(STATUS_DETAILS) as Array<Encomenda['status']>).map(sKey => {
                      const detail = STATUS_DETAILS[sKey];
                      return (
                        <button
                          key={sKey}
                          onClick={() => updateEncomendaStatus(e.id, sKey)}
                          className={`btn btn-secondary btn-xs`}
                          style={{
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: e.status === sKey ? detail.color : 'transparent',
                            color: e.status === sKey ? 'white' : 'var(--text-secondary)',
                            borderColor: e.status === sKey ? detail.color : 'var(--border-color)'
                          }}
                        >
                          {detail.label.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL CADASTRO ENCOMENDA */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Encomenda</h2>
              <button onClick={() => setShowModal(false)} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEncomenda} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Cliente Solicitante *</label>
                <select
                  required
                  value={encCliente}
                  onChange={(e) => setEncCliente(e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.cpf})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Produto Encomendado *</label>
                <select
                  required
                  value={encProduto}
                  onChange={(e) => handleProdutoChange(e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">Selecione o produto</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} - Venda: {formatCurrency(p.precoVenda)}</option>
                  ))}
                </select>
              </div>

              {encProduto && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tamanho Desejado (Grade) *</label>
                    <select
                      required
                      value={encTamanho}
                      onChange={(e) => setEncTamanho(e.target.value)}
                      className="form-input form-select"
                    >
                      {produtos.find(p => p.id === encProduto)?.tamanhos.map(item => (
                        <option key={item.tamanho} value={item.tamanho}>
                          Tamanho: {item.tamanho} (Disponível em Estoque: {item.estoque} un)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantidade de Peças *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={encQuantidade}
                    onChange={(e) => setEncQuantidade(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Preço Sugerido Un. (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={encValor}
                    onChange={(e) => setEncValor(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Previsão Prometida de Entrega *</label>
                <input
                  type="date"
                  required
                  value={encPrevisao}
                  onChange={(e) => setEncPrevisao(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Anotações da Encomenda</label>
                <input
                  type="text"
                  placeholder="Ex: Cliente quer cor específica ou embalagem"
                  value={encObservacoes}
                  onChange={(e) => setEncObservacoes(e.target.value)}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Registrar Encomenda
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
