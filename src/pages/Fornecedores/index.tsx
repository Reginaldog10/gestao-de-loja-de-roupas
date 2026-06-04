import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Fornecedor } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Phone, 
  MapPin, 
  FileText, 
  Trash2,
  Edit3,
  X,
  Plus,
  Mail,
  Search,
  MessageSquare
} from 'lucide-react';
import { formatCNPJ, formatPhone } from '../../utils/formatters';

export const Fornecedores: React.FC<{ filterText: string }> = ({ filterText }) => {
  const { 
    fornecedores, 
    produtos,
    addFornecedor, 
    updateFornecedor, 
    deleteFornecedor 
  } = useApp();

  const { hasAccess } = useAuth();
  
  const [showModal, setShowModal] = useState<'none' | 'fornecedor'>('none');
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  // Form states - Fornecedor
  const [fornRazao, setFornRazao] = useState('');
  const [fornFantasia, setFornFantasia] = useState('');
  const [fornCNPJ, setFornCNPJ] = useState('');
  const [fornTelefone, setFornTelefone] = useState('');
  const [fornWhatsapp, setFornWhatsapp] = useState('');
  const [fornEmail, setFornEmail] = useState('');
  const [fornEndereco, setFornEndereco] = useState('');
  const [fornObservacoes, setFornObservacoes] = useState('');

  // Reset form
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

  // Actions
  const handleOpenNewFornecedor = () => {
    clearFornForm();
    setIsEditing(false);
    setShowModal('fornecedor');
  };

  const handleOpenEditFornecedor = (f: Fornecedor, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFornecedorId(f.id);
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

    if (isEditing && selectedFornecedorId) {
      updateFornecedor(selectedFornecedorId, payload);
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

  // Filtragem combinada
  const searchNormalized = (localSearch || filterText).toLowerCase();
  const filteredFornecedores = fornecedores.filter(f => 
    (f.nomeFantasia || '').toLowerCase().includes(searchNormalized) ||
    (f.razaoSocial || '').toLowerCase().includes(searchNormalized) ||
    (f.cnpj || '').includes(searchNormalized) ||
    (f.email || '').toLowerCase().includes(searchNormalized)
  );

  return (
    <div className="pessoas-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* HEADER DA TELA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={24} style={{ color: 'var(--primary-color)' }} />
            Gestão de Fornecedores
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Cadastre e gerencie os fornecedores de mercadorias da sua loja.
          </p>
        </div>
        <button onClick={handleOpenNewFornecedor} className="btn btn-primary btn-xs">
          <Plus size={16} /> Novo Fornecedor
        </button>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="card glass" style={{ padding: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Busque por Nome Fantasia, Razão Social, CNPJ ou E-mail..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '40px', borderRadius: 'var(--radius-full)' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* LISTA DE FORNECEDORES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredFornecedores.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Nenhum fornecedor encontrado
          </div>
        ) : (
          filteredFornecedores.map(f => {
            const fornecidoCount = produtos.filter(p => p.fornecedorId === f.id).length;

            return (
              <div 
                key={f.id} 
                className="card card-interactive" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderLeft: '4px solid var(--primary-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{f.nomeFantasia}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Razão Social: <strong>{f.razaoSocial}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={(e) => handleOpenEditFornecedor(f, e)} 
                      className="btn btn-secondary btn-icon" 
                      style={{ padding: '6px' }}
                      title="Editar cadastro"
                    >
                      <Edit3 size={14} />
                    </button>
                    {hasAccess('settings_view') && (
                      <button 
                        onClick={(e) => handleDeleteFornecedor(f.id, f.nomeFantasia, e)} 
                        className="btn btn-danger btn-icon" 
                        style={{ padding: '6px' }}
                        title="Excluir fornecedor"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 20px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} style={{ color: 'var(--text-muted)' }} /> 
                    <span>CNPJ: <strong>{f.cnpj}</strong></span>
                  </div>
                  {f.telefone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={16} style={{ color: 'var(--text-muted)' }} /> 
                      <span>Tel: {f.telefone}</span>
                    </div>
                  )}
                  {f.whatsapp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={16} style={{ color: '#25D366' }} /> 
                      <span>WhatsApp: <a href={`https://wa.me/55${f.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{formatPhone(f.whatsapp)}</a></span>
                    </div>
                  )}
                  {f.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={16} style={{ color: 'var(--text-muted)' }} /> 
                      <span>E-mail: {f.email}</span>
                    </div>
                  )}
                  {f.endereco && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: '1 / -1' }}>
                      <MapPin size={16} style={{ color: 'var(--text-muted)' }} /> 
                      <span>Endereço: {f.endereco}</span>
                    </div>
                  )}
                </div>

                {f.observacoes && (
                  <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem', borderLeft: '3px stroke var(--border-color)' }}>
                    <strong>Observações:</strong> {f.observacoes}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Produtos Fornecidos no Sistema:</span>
                  <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{fornecidoCount} produtos</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL CADASTRO/EDIÇÃO FORNECEDOR */}
      {showModal === 'fornecedor' && (
        <div className="modal-overlay" onClick={() => setShowModal('none')}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
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
                  placeholder="Nome comercial / Fantasia"
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
                    placeholder="11900000000 (Apenas dígitos com DDD)"
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
                  placeholder="Prazo médio de entrega, formas de pagamento aceitas, chaves PIX, histórico de compras, etc."
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
    </div>
  );
};
