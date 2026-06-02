import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Parcela } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  CreditCard, 
  Search, 
  AlertTriangle, 
  MessageSquare,
  X,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate, formatPhone } from '../../utils/formatters';

export const Crediario: React.FC<{ filterText: string }> = ({ filterText }) => {
  const { 
    parcelas, 
    clientes, 
    receberParcela, 
    renegociarDivida 
  } = useApp();

  const { hasAccess, currentProfile } = useAuth();

  // Estados principais
  const [activeSubTab, setActiveSubTab] = useState<'parcelas' | 'renegociacao' | 'inadimplencia'>('parcelas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos'); // todos, hoje, amanha, semana, mes, vencidas
  const [clienteBusca, setClienteBusca] = useState<string>(''); // busca interna por cliente

  // Modal Recebimento
  const [showRecebimentoModal, setShowRecebimentoModal] = useState<Parcela | null>(null);
  const [valorRecebido, setValorRecebido] = useState<number>(0);
  const [tipoPagamento, setTipoPagamento] = useState<'dinheiro' | 'pix' | 'debito' | 'credito'>('pix');
  const [destinoSaldo, setDestinoSaldo] = useState<'manter' | 'transferir' | 'diluir' | 'criar_nova'>('manter');

  // Estados Renegociação
  const [renegClienteId, setRenegClienteId] = useState<string>('');
  const [renegParcelasSelecionadas, setRenegParcelasSelecionadas] = useState<string[]>([]);
  const [renegValorTotal, setRenegValorTotal] = useState<number>(0);
  const [renegNumParcelas, setRenegNumParcelas] = useState<number>(2);
  const [renegPeriodicidade, setRenegPeriodicidade] = useState<'semanal' | 'quinzenal' | 'mensal'>('mensal');
  const [renegVencimentoInicial, setRenegVencimentoInicial] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // --- FILTRAGEM DE PARCELAS ---
  const getFiltroDatas = (p: Parcela): boolean => {
    const hojeStr = new Date().toISOString().split('T')[0];
    const dataVenc = p.dataVencimento;

    if (filtroStatus === 'todos') return true;

    if (filtroStatus === 'hoje') {
      return dataVenc === hojeStr;
    }

    if (filtroStatus === 'amanha') {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const amanhaStr = amanha.toISOString().split('T')[0];
      return dataVenc === amanhaStr;
    }

    if (filtroStatus === 'semana') {
      const hoje = new Date();
      const fimSemana = new Date();
      fimSemana.setDate(hoje.getDate() + 7);
      const fimSemanaStr = fimSemana.toISOString().split('T')[0];
      return dataVenc >= hojeStr && dataVenc <= fimSemanaStr;
    }

    if (filtroStatus === 'mes') {
      const mesAtual = hojeStr.substring(0, 7); // YYYY-MM
      return dataVenc.substring(0, 7) === mesAtual;
    }

    if (filtroStatus === 'vencidas') {
      return dataVenc < hojeStr && p.status !== 'paga';
    }

    return true;
  };



  // Filtragem final contendo busca por texto global e busca por cliente
  const searchNormalized = filterText.toLowerCase();
  const searchPessoaNormalized = clienteBusca.toLowerCase();

  const parcelasFiltradas = parcelas.filter(p => {
    const cli = clientes.find(c => c.id === p.clienteId);
    if (!cli) return false;
    
    const atendeFiltroText = 
      cli.nome.toLowerCase().includes(searchNormalized) || 
      cli.cpf.includes(searchNormalized) ||
      p.id.includes(searchNormalized);

    const atendeFiltroCliente = 
      clienteBusca.trim() === '' || 
      cli.nome.toLowerCase().includes(searchPessoaNormalized);

    const atendeFiltroDatas = getFiltroDatas(p);

    return atendeFiltroText && atendeFiltroCliente && atendeFiltroDatas;
  });

  // --- CONTROLE DE RECEBIMENTO ---
  const handleOpenReceber = (p: Parcela, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRecebimentoModal(p);
    setValorRecebido(p.valorRestante);
    setTipoPagamento('pix');
    setDestinoSaldo('manter');
  };

  const handleSaveReceber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRecebimentoModal || valorRecebido <= 0) return;

    if (valorRecebido > showRecebimentoModal.valorRestante) {
      alert('Erro: O valor informado para recebimento é maior do que o saldo devedor restante da parcela!');
      return;
    }

    receberParcela(
      showRecebimentoModal.id,
      valorRecebido,
      tipoPagamento,
      destinoSaldo,
      currentProfile === 'administrador' ? 'Administrador' : currentProfile === 'caixa' ? 'Caixa' : 'Vendedor'
    );

    setShowRecebimentoModal(null);
  };

  // --- CONTROLE DE RENEGOCIAÇÃO ---
  const handleSelecionarClienteReneg = (id: string) => {
    setRenegClienteId(id);
    setRenegParcelasSelecionadas([]);
    setRenegValorTotal(0);
  };

  const handleToggleParcelaReneg = (id: string, valorRestante: number) => {
    if (renegParcelasSelecionadas.includes(id)) {
      setRenegParcelasSelecionadas(renegParcelasSelecionadas.filter(p => p !== id));
      setRenegValorTotal(Math.max(0, Number((renegValorTotal - valorRestante).toFixed(2))));
    } else {
      setRenegParcelasSelecionadas([...renegParcelasSelecionadas, id]);
      setRenegValorTotal(Number((renegValorTotal + valorRestante).toFixed(2)));
    }
  };

  const handleSaveRenegociacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renegClienteId || renegParcelasSelecionadas.length === 0 || renegValorTotal <= 0) {
      alert('Selecione um cliente e marque as parcelas pendentes para renegociar.');
      return;
    }

    renegociarDivida(
      renegClienteId,
      renegParcelasSelecionadas,
      renegValorTotal,
      renegNumParcelas,
      renegPeriodicidade,
      renegVencimentoInicial,
      currentProfile === 'administrador' ? 'Administrador' : 'Caixa'
    );

    alert('Dívida renegociada com sucesso! As parcelas anteriores foram liquidadas e substituídas pela nova grade de parcelamento.');
    
    // Limpar estados
    setRenegClienteId('');
    setRenegParcelasSelecionadas([]);
    setRenegValorTotal(0);
    setActiveSubTab('parcelas');
  };

  // Cobrança inadimplente
  const handleSendCobranca = (p: Parcela, e: React.MouseEvent) => {
    e.stopPropagation();
    const cli = clientes.find(c => c.id === p.clienteId);
    if (!cli) return;

    const mensagem = `Olá ${cli.nome.split(' ')[0]}, tudo bem? Gostaria de lembrar que você possui uma parcela no crediário no valor de ${formatCurrency(p.valorRestante)} vencida em ${formatDate(p.dataVencimento)}. Podemos acertar hoje? Chave PIX: pix@glowpos.com. Obrigado!`;
    window.open(`https://wa.me/55${cli.whatsapp}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  // Clientes com parcelas vencidas para a aba de inadimplência
  const clientesInadimplentes = clientes.filter(c => {
    const vencidas = parcelas.filter(p => p.clienteId === c.id && p.status === 'vencida');
    return vencidas.length > 0;
  });

  return (
    <div className="crediario-container">
      {/* ABAS SECUNDÁRIAS */}
      <div className="card glass" style={{ padding: '8px', marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setActiveSubTab('parcelas')}
          className={`btn ${activeSubTab === 'parcelas' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
        >
          <CreditCard size={18} />
          Controle de Parcelas
        </button>
        <button
          onClick={() => setActiveSubTab('renegociacao')}
          className={`btn ${activeSubTab === 'renegociacao' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          disabled={!hasAccess('finance_modify')}
        >
          <RefreshCw size={18} />
          Renegociação de Dívidas
        </button>
        <button
          onClick={() => setActiveSubTab('inadimplencia')}
          className={`btn ${activeSubTab === 'inadimplencia' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
        >
          <AlertTriangle size={18} />
          Painel Inadimplência
        </button>
      </div>

      {/* --- ABA CONTROLE DE PARCELAS --- */}
      {activeSubTab === 'parcelas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* BARRA DE FILTROS E BUSCA INTERNA */}
          <div className="card glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Pesquisar por nome do cliente..."
                value={clienteBusca}
                onChange={(e) => setClienteBusca(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px', borderRadius: 'var(--radius-full)' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
            </div>

            {/* Filtros de Vencimento */}
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Filtros Rápidos por Vencimento:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { id: 'todos', label: 'Todas' },
                  { id: 'hoje', label: 'Vence Hoje' },
                  { id: 'amanha', label: 'Vence Amanhã' },
                  { id: 'semana', label: 'Próx. 7 Dias' },
                  { id: 'mes', label: 'Deste Mês' },
                  { id: 'vencidas', label: 'Apenas Vencidas' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFiltroStatus(f.id)}
                    className="btn btn-secondary btn-xs"
                    style={{
                      borderRadius: 'var(--radius-xs)',
                      background: filtroStatus === f.id ? 'var(--primary-color)' : 'transparent',
                      color: filtroStatus === f.id ? 'white' : 'var(--text-secondary)',
                      borderColor: filtroStatus === f.id ? 'var(--primary-color)' : 'var(--border-color)',
                      fontWeight: 600
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* LISTAGEM DE PARCELAS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {parcelasFiltradas.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nenhuma parcela encontrada para os filtros aplicados.
              </div>
            ) : (
              parcelasFiltradas.map(p => {
                const cli = clientes.find(c => c.id === p.clienteId);
                const isPaga = p.status === 'paga';
                const isVencida = p.status === 'vencida';
                const isParcial = p.status === 'paga_parcial';

                return (
                  <div 
                    key={p.id} 
                    className="card" 
                    style={{ 
                      padding: '12px 16px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      borderLeft: isPaga 
                        ? '4px solid var(--color-success)' 
                        : isVencida 
                          ? '4px solid var(--color-danger)' 
                          : isParcial
                            ? '4px solid var(--color-warning)'
                            : '4px solid var(--color-info)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{cli ? cli.nome : 'Cliente Desconhecido'}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CUPOM: {p.vendaId}</span>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Parcela {p.numeroParcela}/{p.totalParcelas} | Vence em: <strong style={{ color: isVencida ? 'var(--color-danger)' : 'var(--text-primary)' }}>{formatDate(p.dataVencimento)}</strong>
                      </div>
                      
                      {p.observacoes && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                          OBS: {p.observacoes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${isPaga ? 'badge-success' : isVencida ? 'badge-danger' : isParcial ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                          {p.status.replace('_', ' ')}
                        </span>
                        <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '2px' }}>
                          {formatCurrency(p.valorRestante)}
                        </div>
                        {isParcial && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            Original: {formatCurrency(p.valorOriginal)}
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      {!isPaga && hasAccess('finance_modify') && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={(e) => handleOpenReceber(p, e)} 
                            className="btn btn-success btn-xs"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            Receber
                          </button>
                          {isVencida && (
                            <button 
                              onClick={(e) => handleSendCobranca(p, e)} 
                              className="btn btn-secondary btn-icon"
                              style={{ padding: '6px', color: '#25D366' }}
                              title="Cobrar via WhatsApp"
                            >
                              <MessageSquare size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- ABA RENEGOCIAÇÃO DE DÍVIDAS --- */}
      {activeSubTab === 'renegociacao' && (
        <div className="card glass" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Renegociar Débitos de Crediário</h2>
          
          <form onSubmit={handleSaveRenegociacao} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Selecionar Cliente com Contas Pendentes *</label>
              <select
                value={renegClienteId}
                onChange={(e) => handleSelecionarClienteReneg(e.target.value)}
                className="form-input form-select"
              >
                <option value="">Selecione o cliente...</option>
                {clientes.filter(c => c.totalDivida > 0).map(c => (
                  <option key={c.id} value={c.id}>{c.nome} (Total em Dívida: {formatCurrency(c.totalDivida)})</option>
                ))}
              </select>
            </div>

            {/* SELEÇÃO DE PARCELAS PENDENTES DO CLIENTE */}
            {renegClienteId && (
              <div className="card" style={{ background: 'var(--bg-primary)', padding: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                  Selecione as Parcelas que serão Renegociadas / Reparceladas:
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {parcelas
                    .filter(p => p.clienteId === renegClienteId && p.status !== 'paga')
                    .map(p => {
                      const isSel = renegParcelasSelecionadas.includes(p.id);
                      return (
                        <label 
                          key={p.id} 
                          style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            background: 'var(--bg-secondary)', 
                            padding: '10px 12px', 
                            borderRadius: 'var(--radius-xs)', 
                            border: '1px solid var(--border-color)',
                            borderColor: isSel ? 'var(--primary-color)' : 'var(--border-color)',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input 
                              type="checkbox" 
                              checked={isSel} 
                              onChange={() => handleToggleParcelaReneg(p.id, p.valorRestante)}
                            />
                            <div>
                              <strong>Parc. #{p.numeroParcela} (Venda: {p.vendaId})</strong>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Venceu em: {formatDate(p.dataVencimento)}</div>
                            </div>
                          </div>
                          
                          <strong style={{ color: p.status === 'vencida' ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                            {formatCurrency(p.valorRestante)}
                          </strong>
                        </label>
                      );
                    })}
                </div>

                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Montante Total Renegociado:</span>
                  <span style={{ color: 'var(--primary-color)', fontSize: '1rem' }}>{formatCurrency(renegValorTotal)}</span>
                </div>
              </div>
            )}

            {/* CONFIGURAÇÃO DO NOVO RE-PARCELAMENTO */}
            {renegParcelasSelecionadas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Valor Total Negociado (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={renegValorTotal}
                      onChange={(e) => setRenegValorTotal(Number(e.target.value))}
                      className="form-input"
                      placeholder="Novo valor consolidado"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dividir em quantas vezes? *</label>
                    <select
                      value={renegNumParcelas}
                      onChange={(e) => setRenegNumParcelas(Number(e.target.value))}
                      className="form-input form-select"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Nova Periodicidade</label>
                    <select
                      value={renegPeriodicidade}
                      onChange={(e) => setRenegPeriodicidade(e.target.value as any)}
                      className="form-input form-select"
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data de Vencimento Inicial *</label>
                    <input
                      type="date"
                      required
                      value={renegVencimentoInicial}
                      onChange={(e) => setRenegVencimentoInicial(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="card" style={{ background: 'var(--color-success-light)', border: '1px solid var(--color-success)', padding: '10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-success)' }}>
                  * As novas parcelas serão geradas automaticamente baseadas no valor de {formatCurrency(renegValorTotal)} em {renegNumParcelas}x de {formatCurrency(renegValorTotal / renegNumParcelas)}. As parcelas anteriores marcadas serão arquivadas.
                </div>

                <button type="submit" className="btn btn-primary btn-block" style={{ padding: '12px' }}>
                  Salvar Nova Negociação de Dívida
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* --- ABA PAINEL DE INADIMPLÊNCIA --- */}
      {activeSubTab === 'inadimplencia' && (
        <div className="card glass" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', color: 'var(--color-danger)' }}>Painel de Cobrança e Inadimplência</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Lista de clientes que possuem parcelas com atraso no vencimento. Mande cobranças imediatas.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {clientesInadimplentes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                Nenhum cliente inadimplente! Ótimo desempenho financeiro.
              </div>
            ) : (
              clientesInadimplentes.map(c => {
                const vencidasCli = parcelas.filter(p => p.clienteId === c.id && p.status === 'vencida');
                const totalVencido = vencidasCli.reduce((sum, p) => sum + p.valorRestante, 0);

                return (
                  <div 
                    key={c.id} 
                    className="card" 
                    style={{
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'var(--color-danger-light)',
                      border: '1px solid var(--color-danger)',
                      padding: '12px 16px'
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{c.nome}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        WhatsApp: {formatPhone(c.whatsapp || '')} | CPF: {c.cpf}
                      </p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 700, marginTop: '4px' }}>
                        {vencidasCli.length} parcela(s) em atraso!
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>VALOR TOTAL ATRAZADO</span>
                        <strong style={{ color: 'var(--color-danger)', fontSize: '1.1rem' }}>{formatCurrency(totalVencido)}</strong>
                      </div>

                      <button
                        onClick={(e) => handleSendCobranca(vencidasCli[0], e)}
                        className="btn btn-success btn-xs"
                        style={{ background: '#25D366', color: 'white' }}
                      >
                        <MessageSquare size={12} /> Cobrar WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL RECEBIMENTO DE PARCELA COM AS 4 OPÇÕES DE SALDO (CORE PRINCIPAL!) */}
      {showRecebimentoModal && (
        <div className="modal-overlay" onClick={() => setShowRecebimentoModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Baixa de Crediário</h2>
              <button onClick={() => setShowRecebimentoModal(null)} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Receber parcela #{showRecebimentoModal.numeroParcela} do cliente: <strong>
                {clientes.find(c => c.id === showRecebimentoModal.clienteId)?.nome}
              </strong>
            </p>

            <form onSubmit={handleSaveReceber} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Saldo Restante na Parcela (R$)</label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrency(showRecebimentoModal.valorRestante)}
                    className="form-input"
                    style={{ background: 'var(--bg-primary)', fontWeight: 700 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Valor Pago Hoje (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={showRecebimentoModal.valorRestante}
                    required
                    value={valorRecebido || ''}
                    onChange={(e) => setValorRecebido(Number(e.target.value))}
                    className="form-input"
                    style={{ fontWeight: 700, color: 'var(--primary-color)' }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Forma de Recebimento *</label>
                  <select
                    value={tipoPagamento}
                    onChange={(e) => setTipoPagamento(e.target.value as any)}
                    className="form-input form-select"
                  >
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="debito">Cartão de Débito</option>
                    <option value="credito">Cartão de Crédito</option>
                  </select>
                </div>
              </div>

              {/* OPÇÕES DE SALDO RESTANTE - SE RECEBIMENTO PARCIAL */}
              {valorRecebido < showRecebimentoModal.valorRestante && valorRecebido > 0 && (
                <div className="card" style={{ background: 'var(--bg-primary)', padding: '16px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} />
                    RECEBIMENTO PARCIAL! Saldo residual: {formatCurrency(showRecebimentoModal.valorRestante - valorRecebido)}
                  </span>
                  
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                    O que deseja fazer com o saldo restante? (Escolha uma opção):
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                    <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="destinoSaldo" value="manter" checked={destinoSaldo === 'manter'} onChange={() => setDestinoSaldo('manter')} />
                      <span>Opção A: Manter saldo devedor na própria parcela.</span>
                    </label>
                    <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="destinoSaldo" value="transferir" checked={destinoSaldo === 'transferir'} onChange={() => setDestinoSaldo('transferir')} />
                      <span>Opção B: Quitar esta parcela e transferir o saldo devedor para a PROXIMA parcela em aberto.</span>
                    </label>
                    <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="destinoSaldo" value="diluir" checked={destinoSaldo === 'diluir'} onChange={() => setDestinoSaldo('diluir')} />
                      <span>Opção C: Quitar esta parcela e diluir a diferença igualmente em todas as parcelas FUTURAS.</span>
                    </label>
                    <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="destinoSaldo" value="criar_nova" checked={destinoSaldo === 'criar_nova'} onChange={() => setDestinoSaldo('criar_nova')} />
                      <span>Opção D: Quitar esta parcela e criar uma NOVA parcela adicional de crediário no final.</span>
                    </label>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Confirmar Recebimento de Valor
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
