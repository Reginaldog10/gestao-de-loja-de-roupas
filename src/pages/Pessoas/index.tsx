import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Cliente } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  UserPlus, 
  CreditCard, 
  FileText, 
  MessageSquare,
  AlertTriangle,
  Trash2,
  Edit3,
  X,
  Cake,
  Gift
} from 'lucide-react';
import { formatCurrency, formatDate, formatCPF, formatPhone } from '../../utils/formatters';

// Função auxiliar para calcular quantos dias faltam para o aniversário do cliente
const getDiasAteAniversario = (dataNascimentoStr: string): number => {
  if (!dataNascimentoStr) return 999;
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  try {
    const partes = dataNascimentoStr.split('-');
    if (partes.length < 3) return 999;
    const nascMes = parseInt(partes[1]) - 1;
    const nascDia = parseInt(partes[2]);
    
    const anoAtual = hoje.getFullYear();
    const dataNiverEsteAno = new Date(anoAtual, nascMes, nascDia);
    dataNiverEsteAno.setHours(0, 0, 0, 0);
    
    if (dataNiverEsteAno.getTime() < hoje.getTime()) {
      // Já passou este ano, calcula para o próximo ano
      const dataNiverProximoAno = new Date(anoAtual + 1, nascMes, nascDia);
      dataNiverProximoAno.setHours(0, 0, 0, 0);
      const diffTime = dataNiverProximoAno.getTime() - hoje.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      const diffTime = dataNiverEsteAno.getTime() - hoje.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  } catch (e) {
    return 999;
  }
};

export const Pessoas: React.FC<{ filterText: string }> = ({ filterText }) => {
  const { 
    clientes, 
    parcelas, 
    vendas,
    addCliente, 
    updateCliente, 
    deleteCliente,
    systemConfig
  } = useApp();

  const { hasAccess } = useAuth();
  
  const [activeSubTab, setActiveSubTab] = useState<'todos' | 'aniversariantes'>('todos');
  const [showModal, setShowModal] = useState<'none' | 'cliente' | 'dossie'>('none');
  const [selectedPessoaId, setSelectedPessoaId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form states - Cliente
  const [cliNome, setCliNome] = useState('');
  const [cliCPF, setCliCPF] = useState('');
  const [cliRG, setCliRG] = useState('');
  const [cliNascimento, setCliNascimento] = useState('');
  const [cliTelefone, setCliTelefone] = useState('');
  const [cliWhatsapp, setCliWhatsapp] = useState('');
  const [cliEndereco, setCliEndereco] = useState('');
  const [cliCidade, setCliCidade] = useState('');
  const [cliLimite, setCliLimite] = useState(1000);
  const [cliObservacoes, setCliObservacoes] = useState('');

  // Reset form
  const clearCliForm = () => {
    setCliNome('');
    setCliCPF('');
    setCliRG('');
    setCliNascimento('');
    setCliTelefone('');
    setCliWhatsapp('');
    setCliEndereco('');
    setCliCidade('');
    setCliLimite(1000);
    setCliObservacoes('');
    setIsEditing(false);
  };

  // --- ACTIONS CLIENTE ---
  const handleOpenNewCliente = () => {
    clearCliForm();
    setIsEditing(false);
    setShowModal('cliente');
  };

  const handleOpenEditCliente = (c: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPessoaId(c.id);
    setCliNome(c.nome);
    setCliCPF(c.cpf);
    setCliRG(c.rg || '');
    setCliNascimento(c.dataNascimento);
    setCliTelefone(c.telefone);
    setCliWhatsapp(c.whatsapp);
    setCliEndereco(c.endereco);
    setCliCidade(c.cidade);
    setCliLimite(c.limiteCredito);
    setCliObservacoes(c.observacoes || '');
    setIsEditing(true);
    setShowModal('cliente');
  };

  const handleSaveCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliNome || !cliCPF || !cliTelefone) {
      alert('Preencha os campos obrigatórios: Nome, CPF e Telefone');
      return;
    }

    const payload = {
      nome: cliNome,
      cpf: formatCPF(cliCPF),
      rg: cliRG,
      dataNascimento: cliNascimento,
      telefone: formatPhone(cliTelefone),
      whatsapp: cliWhatsapp.replace(/\D/g, ''),
      endereco: cliEndereco,
      cidade: cliCidade,
      limiteCredito: Number(cliLimite),
      observacoes: cliObservacoes
    };

    if (isEditing && selectedPessoaId) {
      updateCliente(selectedPessoaId, payload);
    } else {
      addCliente(payload);
    }

    setShowModal('none');
    clearCliForm();
  };

  const handleDeleteCliente = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) {
      deleteCliente(id);
    }
  };

  // --- DOSSIE CLIENTE ---
  const handleOpenDossie = (id: string) => {
    setSelectedPessoaId(id);
    setShowModal('dossie');
  };

  // FILTRAGEM
  const searchNormalized = filterText.toLowerCase();
  
  const searchClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchNormalized) ||
    c.cpf.includes(searchNormalized) ||
    c.telefone.includes(searchNormalized)
  );

  // Filtro de Aniversariantes da Semana (próximos 7 dias, incluindo hoje)
  const aniversariantesSemana = clientes
    .map(c => ({
      cliente: c,
      diasAteNiver: getDiasAteAniversario(c.dataNascimento)
    }))
    .filter(item => item.diasAteNiver <= 6 && item.cliente.nome.toLowerCase().includes(searchNormalized))
    .sort((a, b) => a.diasAteNiver - b.diasAteNiver);

  // Seleção de dados específicos para dossiê
  const selectedCliente = clientes.find(c => c.id === selectedPessoaId);
  const clienteParcelas = parcelas.filter(p => p.clienteId === selectedPessoaId);
  const clienteVendas = vendas.filter(v => v.clienteId === selectedPessoaId);
  
  const parcelasAbertas = clienteParcelas.filter(p => p.status === 'em_aberto' || p.status === 'paga_parcial' || p.status === 'vencida');
  const parcelasVencidas = clienteParcelas.filter(p => p.status === 'vencida');
  const totalDividaReal = parcelasAbertas.reduce((sum, p) => sum + p.valorRestante, 0);

  // Cobrança WhatsApp
  const handleSendCobrancaWhatsApp = (c: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    const parcelasAtrasadas = parcelas.filter(p => p.clienteId === c.id && p.status === 'vencida');
    if (parcelasAtrasadas.length === 0) {
      alert('Este cliente não possui parcelas em atraso para cobrança!');
      return;
    }

    const valorAtrasado = parcelasAtrasadas.reduce((sum, p) => sum + p.valorRestante, 0);
    const mensagem = `Olá ${c.nome.split(' ')[0]}, tudo bem? Gostaria de lembrar que você possui ${parcelasAtrasadas.length} parcela(s) pendente(s) no crediário da nossa loja, totalizando ${formatCurrency(valorAtrasado)}. Podemos agendar o acerto? Chave PIX da loja: pix@glowpos.com. Obrigado!`;
    const encoded = encodeURIComponent(mensagem);
    
    // Redireciona para o WhatsApp
    window.open(`https://wa.me/55${c.whatsapp}?text=${encoded}`, '_blank');
  };

  // Enviar Mensagem de Aniversário WhatsApp
  const handleSendParabensWhatsApp = (c: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    const template = systemConfig.mensagemAniversario || "Olá {nome}, a Glow Modas deseja a você um feliz aniversário! Para comemorar, temos um presente especial para você na nossa loja. Venha nos visitar!";
    const primeiroNome = c.nome.split(' ')[0];
    const mensagem = template.replace(/{nome}/g, primeiroNome);
    const encoded = encodeURIComponent(mensagem);
    
    window.open(`https://wa.me/55${c.whatsapp}?text=${encoded}`, '_blank');
  };

  return (
    <div className="pessoas-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* HEADER DA TELA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={24} style={{ color: 'var(--primary-color)' }} />
            Gestão de Clientes
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Cadastre e gerencie a carteira de clientes, limites de crediário e cashback.
          </p>
        </div>
        <button onClick={handleOpenNewCliente} className="btn btn-primary btn-xs">
          <UserPlus size={16} /> Novo Cliente
        </button>
      </div>

      {/* SELETOR DE ABAS */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '8px',
        marginBottom: '5px'
      }}>
        <button 
          onClick={() => setActiveSubTab('todos')} 
          className={`btn ${activeSubTab === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          Todos os Clientes ({searchClientes.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('aniversariantes')} 
          className={`btn ${activeSubTab === 'aniversariantes' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Cake size={16} /> Aniversariantes da Semana ({aniversariantesSemana.length})
        </button>
      </div>

      {/* RENDERIZADOR DAS LISTAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeSubTab === 'todos' ? (
          searchClientes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Nenhum cliente encontrado
            </div>
          ) : (
            searchClientes.map(c => {
              const cliPars = parcelas.filter(p => p.clienteId === c.id);
              const cliVencidas = cliPars.filter(p => p.status === 'vencida');
              const cliDivida = cliPars.filter(p => p.status !== 'paga').reduce((sum, p) => sum + p.valorRestante, 0);
              const isInadimplente = cliVencidas.length > 0;

              return (
                <div 
                  key={c.id} 
                  className={`card card-interactive ${isInadimplente ? 'border-danger-custom' : ''}`}
                  onClick={() => handleOpenDossie(c.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderLeft: isInadimplente ? '4px solid var(--color-danger)' : '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{c.nome}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        CPF: {c.cpf} | Tel: {c.telefone} {c.dataNascimento && `| Nasc: ${formatDate(c.dataNascimento)}`}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={(e) => handleOpenEditCliente(c, e)} 
                        className="btn btn-secondary btn-icon" 
                        style={{ padding: '6px' }}
                        title="Editar cadastro"
                      >
                        <Edit3 size={14} />
                      </button>
                      {hasAccess('settings_view') && (
                        <button 
                          onClick={(e) => handleDeleteCliente(c.id, c.nome, e)} 
                          className="btn btn-danger btn-icon" 
                          style={{ padding: '6px' }}
                          title="Excluir cliente"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>LIMITE DE CRÉDITO</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatCurrency(c.limiteCredito)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>DÍVIDA EM ABERTO</span>
                      <strong style={{ fontSize: '0.9rem', color: cliDivida > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                        {formatCurrency(cliDivida)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>SALDO CASHBACK</span>
                      <strong style={{ fontSize: '0.9rem', color: (c.cashbackSaldo || 0) > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
                        {formatCurrency(c.cashbackSaldo || 0)}
                      </strong>
                    </div>
                  </div>

                  {isInadimplente && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-danger-light)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.8rem' }}>
                        <AlertTriangle size={14} />
                        <span>INADIMPLENTE ({cliVencidas.length} parcelas vencidas!)</span>
                      </div>
                      <button
                        onClick={(e) => handleSendCobrancaWhatsApp(c, e)}
                        className="btn btn-success btn-xs"
                        style={{ background: '#25D366', color: 'white', padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <MessageSquare size={12} /> Cobrar WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          aniversariantesSemana.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Nenhum aniversariante nesta semana
            </div>
          ) : (
            aniversariantesSemana.map(({ cliente: c, diasAteNiver }) => {
              const eHoje = diasAteNiver === 0;
              const eAmanha = diasAteNiver === 1;

              return (
                <div 
                  key={c.id} 
                  className="card card-interactive"
                  onClick={() => handleOpenDossie(c.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderLeft: eHoje ? '4px solid #a855f7' : '1px solid var(--border-color)',
                    background: eHoje 
                      ? 'linear-gradient(135deg, var(--card-bg) 70%, rgba(168, 85, 247, 0.08) 100%)' 
                      : 'var(--card-bg)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{c.nome}</h3>
                        {eHoje ? (
                          <span style={{ 
                            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', 
                            color: 'white', 
                            padding: '2px 8px', 
                            borderRadius: '20px', 
                            fontSize: '0.7rem', 
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)'
                          }}>
                            É HOJE! 🎉
                          </span>
                        ) : eAmanha ? (
                          <span style={{ 
                            background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', 
                            color: 'white', 
                            padding: '2px 8px', 
                            borderRadius: '20px', 
                            fontSize: '0.7rem', 
                            fontWeight: 700 
                          }}>
                            Amanhã! 🎂
                          </span>
                        ) : (
                          <span style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-secondary)', 
                            padding: '2px 8px', 
                            borderRadius: '20px', 
                            fontSize: '0.7rem', 
                            fontWeight: 600 
                          }}>
                            Em {diasAteNiver} dias
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Nascimento: {formatDate(c.dataNascimento)} | WhatsApp: {formatPhone(c.whatsapp)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleSendParabensWhatsApp(c, e)}
                      className="btn btn-success btn-xs"
                      style={{ 
                        background: '#25D366', 
                        color: 'white', 
                        padding: '6px 12px', 
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        border: 'none',
                        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.2)'
                      }}
                    >
                      <Gift size={14} /> Dar Parabéns
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>SALDO DE CASHBACK</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-success)' }}>{formatCurrency(c.cashbackSaldo || 0)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>TELEFONE CONTATO</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.telefone}</strong>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* MODAL CADASTRO/EDIÇÃO CLIENTE */}
      {showModal === 'cliente' && (
        <div className="modal-overlay" onClick={() => setShowModal('none')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setShowModal('none')} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCliente} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={cliNome}
                  onChange={(e) => setCliNome(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CPF *</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cliCPF}
                    onChange={(e) => setCliCPF(formatCPF(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">RG (Opcional)</label>
                  <input
                    type="text"
                    placeholder="RG do cliente"
                    value={cliRG}
                    onChange={(e) => setCliRG(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data de Nascimento</label>
                  <input
                    type="date"
                    value={cliNascimento}
                    onChange={(e) => setCliNascimento(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Limite de Crédito *</label>
                  <input
                    type="number"
                    required
                    value={cliLimite}
                    onChange={(e) => setCliLimite(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={cliTelefone}
                    onChange={(e) => setCliTelefone(formatPhone(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp (Apenas números com DDD)</label>
                  <input
                    type="text"
                    placeholder="11900000000"
                    value={cliWhatsapp}
                    onChange={(e) => setCliWhatsapp(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Endereço Residencial</label>
                <input
                  type="text"
                  placeholder="Rua, número, apto"
                  value={cliEndereco}
                  onChange={(e) => setCliEndereco(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={cliCidade}
                  onChange={(e) => setCliCidade(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações Internas</label>
                <textarea
                  placeholder="Anotações de limite, preferências, etc."
                  value={cliObservacoes}
                  onChange={(e) => setCliObservacoes(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Salvar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / GAVETA: DOSSIÊ DO CLIENTE COMPLETO */}
      {showModal === 'dossie' && selectedCliente && (
        <div className="modal-overlay" onClick={() => setShowModal('none')}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '6px' }}>Dossiê Financeiro</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{selectedCliente.nome}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  CPF: {selectedCliente.cpf} | WhatsApp: {formatPhone(selectedCliente.whatsapp || '')} {selectedCliente.dataNascimento && `| Nasc: ${formatDate(selectedCliente.dataNascimento)}`}
                </p>
              </div>
              <button onClick={() => setShowModal('none')} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            {/* DADOS CADASTRAIS RÁPIDOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <div className="card" style={{ padding: '12px', background: 'var(--bg-primary)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>LIMITE UTILIZADO</span>
                <strong style={{ fontSize: '1.1rem', color: totalDividaReal > selectedCliente.limiteCredito ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                  {formatCurrency(totalDividaReal)} / {formatCurrency(selectedCliente.limiteCredito)}
                </strong>
              </div>
              <div className="card" style={{ padding: '12px', background: 'var(--bg-primary)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>TOTAL COMPRADO</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--color-success)' }}>{formatCurrency(selectedCliente.totalComprado)}</strong>
              </div>
              <div className="card" style={{ padding: '12px', background: 'var(--bg-primary)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>PARCELAS ATRASADAS</span>
                <strong style={{ fontSize: '1.1rem', color: parcelasVencidas.length > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                  {parcelasVencidas.length}
                </strong>
              </div>
              <div className="card" style={{ padding: '12px', background: 'var(--bg-primary)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>SALDO CASHBACK</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--color-success)' }}>{formatCurrency(selectedCliente.cashbackSaldo || 0)}</strong>
              </div>
            </div>

            {/* DETALHES DE PARCELAS EM ABERTO */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} className="text-secondary" />
                Contas a Receber / Crediários ({parcelasAbertas.length})
              </h3>
              
              {parcelasAbertas.length === 0 ? (
                <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nenhuma conta em aberto para este cliente.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {parcelasAbertas.map(p => (
                    <div key={p.id} className="card" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', fontSize: '0.85rem' }}>
                      <div>
                        <strong>Parcela {p.numeroParcela}/{p.totalParcelas}</strong>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '12px' }}>
                          Vence em: {formatDate(p.dataVencimento)}
                        </span>
                        {p.observacoes && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {p.observacoes}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`badge ${p.status === 'vencida' ? 'badge-danger' : p.status === 'paga_parcial' ? 'badge-warning' : 'badge-info'}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                        <strong style={{ fontSize: '0.9rem' }}>{formatCurrency(p.valorRestante)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTÓRICO DE COMPRAS (VENDAS REALIZADAS) */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} className="text-secondary" />
                Histórico de Compras ({clienteVendas.length})
              </h3>

              {clienteVendas.length === 0 ? (
                <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nenhuma compra registrada.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {clienteVendas.map(v => (
                    <div key={v.id} className="card" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-secondary)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>Código Venda: {v.id}</span>
                        <span>{formatCurrency(v.total)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        <span>Data: {formatDate(v.data)} | Operador: {v.usuario}</span>
                        <span>Pagamento: {v.formasPagamento.map(fp => `${fp.tipo.toUpperCase()} (${formatCurrency(fp.valor)})`).join(', ')}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', borderTop: '1px dashed var(--border-color)', paddingTop: '4px', marginTop: '2px', color: 'var(--text-secondary)' }}>
                        {v.produtos.map(p => `${p.quantidade}x ${p.nome} (Tam: ${p.tamanho})`).join(' | ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
