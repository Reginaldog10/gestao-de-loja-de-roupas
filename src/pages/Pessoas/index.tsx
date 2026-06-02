import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Cliente, Fornecedor } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  UserPlus, 
  Building2, 
  Phone, 
  MapPin, 
  CreditCard, 
  FileText, 
  MessageSquare,
  AlertTriangle,
  Trash2,
  Edit3,
  X
} from 'lucide-react';
import { formatCurrency, formatDate, formatCPF, formatCNPJ, formatPhone } from '../../utils/formatters';

export const Pessoas: React.FC<{ filterText: string }> = ({ filterText }) => {
  const { 
    clientes, 
    fornecedores, 
    parcelas, 
    vendas,
    produtos,
    addCliente, 
    updateCliente, 
    deleteCliente,
    addFornecedor, 
    updateFornecedor, 
    deleteFornecedor 
  } = useApp();

  const { hasAccess } = useAuth();
  
  const [activeSubTab, setActiveSubTab] = useState<'clientes' | 'fornecedores'>('clientes');
  const [showModal, setShowModal] = useState<'none' | 'cliente' | 'fornecedor' | 'dossie'>('none');
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

  // Form states - Fornecedor
  const [fornRazao, setFornRazao] = useState('');
  const [fornFantasia, setFornFantasia] = useState('');
  const [fornCNPJ, setFornCNPJ] = useState('');
  const [fornTelefone, setFornTelefone] = useState('');
  const [fornWhatsapp, setFornWhatsapp] = useState('');
  const [fornEmail, setFornEmail] = useState('');
  const [fornEndereco, setFornEndereco] = useState('');
  const [fornObservacoes, setFornObservacoes] = useState('');

  // Reset forms
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

  const clearFornForm = () => {
    setFornRazao('');
    setFornFantasia('');
    setFornCNPJ('');
    setFornTelefone('');
    setFornWhatsapp('');
    setFornEmail('');
    setFornEndereco('');
    setFornObservacoes('');
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

  // --- ACTIONS FORNECEDOR ---
  const handleOpenNewFornecedor = () => {
    clearFornForm();
    setIsEditing(false);
    setShowModal('fornecedor');
  };

  const handleOpenEditFornecedor = (f: Fornecedor, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPessoaId(f.id);
    setFornRazao(f.razaoSocial);
    setFornFantasia(f.nomeFantasia);
    setFornCNPJ(f.cnpj);
    setFornTelefone(f.telefone);
    setFornWhatsapp(f.whatsapp);
    setFornEmail(f.email);
    setFornEndereco(f.endereco);
    setFornObservacoes(f.observacoes || '');
    setIsEditing(true);
    setShowModal('fornecedor');
  };

  const handleSaveFornecedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fornRazao || !fornFantasia || !fornCNPJ) {
      alert('Preencha os campos obrigatórios: Razão Social, Nome Fantasia e CNPJ');
      return;
    }

    const payload = {
      razaoSocial: fornRazao,
      nomeFantasia: fornFantasia,
      cnpj: formatCNPJ(fornCNPJ),
      telefone: formatPhone(fornTelefone),
      whatsapp: fornWhatsapp.replace(/\D/g, ''),
      email: fornEmail,
      endereco: fornEndereco,
      observacoes: fornObservacoes
    };

    if (isEditing && selectedPessoaId) {
      updateFornecedor(selectedPessoaId, payload);
    } else {
      addFornecedor(payload);
    }

    setShowModal('none');
    clearFornForm();
  };

  const handleDeleteFornecedor = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir o fornecedor ${name}?`)) {
      deleteFornecedor(id);
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

  const searchFornecedores = fornecedores.filter(f => 
    f.nomeFantasia.toLowerCase().includes(searchNormalized) ||
    f.razaoSocial.toLowerCase().includes(searchNormalized) ||
    f.cnpj.includes(searchNormalized)
  );

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

  return (
    <div className="pessoas-container">
      {/* ABAS SECUNDÁRIAS */}
      <div className="card glass" style={{ padding: '8px', marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setActiveSubTab('clientes')}
          className={`btn ${activeSubTab === 'clientes' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
        >
          <UserPlus size={18} />
          Clientes ({clientes.length})
        </button>
        <button
          onClick={() => setActiveSubTab('fornecedores')}
          className={`btn ${activeSubTab === 'fornecedores' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
        >
          <Building2 size={18} />
          Fornecedores ({fornecedores.length})
        </button>
      </div>

      {/* HEADER DA TELA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
          {activeSubTab === 'clientes' ? 'Gestão de Clientes' : 'Gestão de Fornecedores'}
        </h1>
        {activeSubTab === 'clientes' ? (
          <button onClick={handleOpenNewCliente} className="btn btn-primary btn-xs">
            <UserPlus size={16} /> Novo Cliente
          </button>
        ) : (
          <button onClick={handleOpenNewFornecedor} className="btn btn-primary btn-xs">
            <Building2 size={16} /> Novo Fornecedor
          </button>
        )}
      </div>

      {/* LISTA CLIENTES */}
      {activeSubTab === 'clientes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {searchClientes.length === 0 ? (
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
                        CPF: {c.cpf} | Tel: {c.telefone}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
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
          )}
        </div>
      )}

      {/* LISTA FORNECEDORES */}
      {activeSubTab === 'fornecedores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {searchFornecedores.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Nenhum fornecedor encontrado
            </div>
          ) : (
            searchFornecedores.map(f => {
              const fornecidoCount = produtos.filter(p => p.fornecedorId === f.id).length;

              return (
                <div key={f.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{f.nomeFantasia}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.razaoSocial}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={(e) => handleOpenEditFornecedor(f, e)} 
                        className="btn btn-secondary btn-icon" 
                        style={{ padding: '6px' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      {hasAccess('settings_view') && (
                        <button 
                          onClick={(e) => handleDeleteFornecedor(f.id, f.nomeFantasia, e)} 
                          className="btn btn-danger btn-icon" 
                          style={{ padding: '6px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} /> CNPJ: {f.cnpj}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} /> Tel: {f.telefone}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} /> {f.endereco}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: 'var(--radius-xs)', alignSelf: 'flex-start', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Produtos Fornecidos no Sistema: <span style={{ color: 'var(--primary-color)' }}>{fornecidoCount}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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

      {/* MODAL CADASTRO/EDIÇÃO FORNECEDOR */}
      {showModal === 'fornecedor' && (
        <div className="modal-overlay" onClick={() => setShowModal('none')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
              <button onClick={() => setShowModal('none')} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveFornecedor} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Razão Social da empresa"
                  value={fornRazao}
                  onChange={(e) => setFornRazao(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome comercial"
                  value={fornFantasia}
                  onChange={(e) => setFornFantasia(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CNPJ *</label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={fornCNPJ}
                    onChange={(e) => setFornCNPJ(formatCNPJ(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail Comercial</label>
                  <input
                    type="email"
                    placeholder="vendas@fornecedor.com"
                    value={fornEmail}
                    onChange={(e) => setFornEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    type="text"
                    placeholder="(00) 0000-0000"
                    value={fornTelefone}
                    onChange={(e) => setFornTelefone(formatPhone(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp Comercial</label>
                  <input
                    type="text"
                    placeholder="11900000000"
                    value={fornWhatsapp}
                    onChange={(e) => setFornWhatsapp(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Endereço Comercial</label>
                <input
                  type="text"
                  placeholder="Rua, número, galpão, cidade, estado"
                  value={fornEndereco}
                  onChange={(e) => setFornEndereco(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  placeholder="Produtos principais fornecidos, prazos de entrega, chaves pix, etc."
                  value={fornObservacoes}
                  onChange={(e) => setFornObservacoes(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Salvar Fornecedor
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
                  CPF: {selectedCliente.cpf} | WhatsApp: {formatPhone(selectedCliente.whatsapp || '')}
                </p>
              </div>
              <button onClick={() => setShowModal('none')} className="btn-secondary btn-icon" style={{ borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            {/* DADOS CADASTRAIS RÁPIDOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
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
