import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Loader2, 
  Check, 
  Users, 
  Package,
  Pencil,
  Key,
  Gift,
  Copy
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface Plano {
  id: string;
  nome: string;
  preco: number;
  max_clientes: number | null;
  max_produtos: number | null;
  created_at: string;
}

interface TokenAtivacao {
  token: string;
  dias_validade: number;
  usado: boolean;
  usado_por_loja_id: string | null;
  usado_em: string | null;
  created_at: string;
  lojas: {
    nome: string;
  } | null;
}

export const SuperPlanos: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'planos' | 'tokens'>('planos');
  
  // Estados de Planos
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlanoId, setEditingPlanoId] = useState<string | null>(null);
  
  // Campos do formulário de Planos
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [maxClientes, setMaxClientes] = useState('');
  const [maxProdutos, setMaxProdutos] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de Tokens
  const [tokens, setTokens] = useState<TokenAtivacao[]>([]);
  const [diasValidade, setDiasValidade] = useState<number>(30);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Estado e Função de Cópia
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const fetchPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('preco', { ascending: true });

      if (error) throw error;
      setPlanos(data || []);
    } catch (e) {
      console.error('Erro ao buscar planos:', e);
    }
  };

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('tokens_ativacao')
        .select('*, lojas(nome)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (e) {
      console.error('Erro ao buscar tokens:', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPlanos(), fetchTokens()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // SUBMIT DE CADASTRO OU EDIÇÃO DE PLANO
  const handleSubmitPlano = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !preco) return;

    setIsSubmitting(true);
    try {
      const payload = {
        nome: nome.trim(),
        preco: Number(preco),
        max_clientes: maxClientes ? Number(maxClientes) : null,
        max_produtos: maxProdutos ? Number(maxProdutos) : null
      };

      if (editingPlanoId) {
        const { error } = await supabase
          .from('planos')
          .update(payload)
          .eq('id', editingPlanoId);

        if (error) throw error;
        alert('Plano atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('planos')
          .insert(payload);

        if (error) throw error;
        alert('Plano cadastrado com sucesso!');
      }
      
      handleCancelForm();
      await fetchPlanos();
    } catch (err: any) {
      alert(`Erro ao salvar plano: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // INICIAR EDIÇÃO DO PLANO
  const startEditingPlano = (plano: Plano) => {
    setEditingPlanoId(plano.id);
    setNome(plano.nome);
    setPreco(String(plano.preco));
    setMaxClientes(plano.max_clientes !== null ? String(plano.max_clientes) : '');
    setMaxProdutos(plano.max_produtos !== null ? String(plano.max_produtos) : '');
    setShowAddForm(true);
  };

  // CANCELAR FORMULÁRIO DE PLANO
  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingPlanoId(null);
    setNome('');
    setPreco('');
    setMaxClientes('');
    setMaxProdutos('');
  };

  // DELETAR PLANO
  const handleDeletePlano = async (id: string, nomePlano: string) => {
    if (!confirm(`Tem certeza de que deseja excluir o plano "${nomePlano}"? Lojas associadas a ele ficarão sem plano.`)) return;

    try {
      const { error } = await supabase
        .from('planos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Plano excluído com sucesso!');
      await fetchPlanos();
    } catch (err: any) {
      alert(`Erro ao excluir plano: ${err.message}. Verifique se não há lojas associadas a ele.`);
    }
  };

  // GERAR TOKEN DE ATIVAÇÃO
  const handleGenerateToken = async () => {
    setGenerating(true);
    setGeneratedToken(null);
    try {
      const randStr = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      const tokenString = `GLOW-ACT-${diasValidade}D-${randStr()}-${randStr()}`;

      const { error } = await supabase
        .from('tokens_ativacao')
        .insert({
          token: tokenString,
          dias_validade: diasValidade,
          usado: false
        });

      if (error) throw error;

      setGeneratedToken(tokenString);
      await fetchTokens();
    } catch (err: any) {
      alert(`Erro ao gerar token: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // DELETAR TOKEN
  const handleDeleteToken = async (tokenKey: string) => {
    if (!confirm('Deseja realmente deletar este token de ativação?')) return;
    try {
      const { error } = await supabase
        .from('tokens_ativacao')
        .delete()
        .eq('token', tokenKey);
      if (error) throw error;
      await fetchTokens();
    } catch (err: any) {
      alert(`Erro ao deletar token: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', width: '100%' }}>
        <Loader2 className="spinner" size={32} color="var(--primary-color)" />
        <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>Carregando dados...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ABAS LOCAIS DE NAVEGAÇÃO */}
      <div className="card glass" style={{ padding: '8px', display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => setActiveTab('planos')} 
          className={`btn ${activeTab === 'planos' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ flex: 1 }}
        >
          <Settings size={16} /> Planos de Assinatura
        </button>
        <button 
          onClick={() => setActiveTab('tokens')} 
          className={`btn ${activeTab === 'tokens' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ flex: 1 }}
        >
          <Key size={16} /> Tokens de Ativação (Licenças)
        </button>
      </div>

      {/* --- ABA 1: PLANOS --- */}
      {activeTab === 'planos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings style={{ color: 'var(--primary-color)' }} />
                Gerenciar Planos do SaaS
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Cadastre e gerencie as opções de assinatura que estarão disponíveis para as lojas.
              </p>
            </div>
            <button 
              onClick={() => {
                if (showAddForm && editingPlanoId) {
                  handleCancelForm();
                } else {
                  setShowAddForm(!showAddForm);
                }
              }} 
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Novo Plano
            </button>
          </div>

          {showAddForm && (
            <div className="card glass" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                {editingPlanoId ? 'Editar Plano Existente' : 'Cadastrar Novo Plano'}
              </h3>
              <form onSubmit={handleSubmitPlano} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nome do Plano</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Plano Trimestral Básico"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preço Mensal (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 89.90"
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Limite de Clientes (Vazio = Ilimitado)</label>
                    <input
                      type="number"
                      placeholder="Ex: 100"
                      value={maxClientes}
                      onChange={(e) => setMaxClientes(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Limite de Produtos (Vazio = Ilimitado)</label>
                    <input
                      type="number"
                      placeholder="Ex: 500"
                      value={maxProdutos}
                      onChange={(e) => setMaxProdutos(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isSubmitting}
                    style={{ padding: '10px 24px' }}
                  >
                    {isSubmitting ? <Loader2 size={16} className="spinner" /> : <Check size={16} />}
                    <span>{editingPlanoId ? 'Salvar Alterações' : 'Salvar Plano'}</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCancelForm} 
                    className="btn btn-secondary"
                    style={{ padding: '10px 24px' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* LISTAGEM DE PLANOS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {planos.length === 0 ? (
              <div className="card glass" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum plano cadastrado.
              </div>
            ) : (
              planos.map(plano => (
                <div key={plano.id} className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => startEditingPlano(plano)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '4px' }}
                      title="Editar Plano"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeletePlano(plano.id, plano.nome)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
                      title="Excluir Plano"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)', display: 'block', paddingRight: '48px' }}>{plano.nome}</strong>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                        {formatCurrency(plano.preco)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/mês</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={16} className="text-secondary" />
                      <span>
                        Clientes: {plano.max_clientes === null ? <strong>Ilimitados</strong> : `${plano.max_clientes} clientes`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={16} className="text-secondary" />
                      <span>
                        Produtos: {plano.max_produtos === null ? <strong>Ilimitados</strong> : `${plano.max_produtos} produtos`}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- ABA 2: TOKENS DE ATIVAÇÃO --- */}
      {activeTab === 'tokens' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* GERADOR DE TOKEN */}
          <div className="card glass" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={18} style={{ color: 'var(--primary-color)' }} />
              Gerar Novo Token de Ativação de Licença
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
                <label className="form-label">Validade do Token (em dias)</label>
                <select 
                  value={diasValidade}
                  onChange={(e) => setDiasValidade(Number(e.target.value))}
                  className="form-input"
                >
                  <option value={30}>30 Dias (1 Mês)</option>
                  <option value={90}>90 Dias (3 Meses)</option>
                  <option value={180}>180 Dias (Semestral)</option>
                  <option value={365}>365 Dias (Anual)</option>
                </select>
              </div>
              
              <button 
                onClick={handleGenerateToken} 
                className="btn btn-primary"
                disabled={generating}
                style={{ padding: '10px 24px', height: 'var(--input-height)' }}
              >
                {generating ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
                <span>Gerar Token</span>
              </button>
            </div>

            {generatedToken && (
              <div style={{ 
                marginTop: '20px', 
                background: 'rgba(168, 85, 247, 0.05)', 
                padding: '16px', 
                borderRadius: 'var(--radius-xs)', 
                border: '1px solid var(--primary-color)', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '12px' 
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Token Gerado com Sucesso (Copie e envie ao lojista):
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '450px', justifyContent: 'space-between' }}>
                  <code style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-color)', wordBreak: 'break-all' }}>
                    {generatedToken}
                  </code>
                  <button
                    onClick={() => handleCopyToken(generatedToken)}
                    className="btn"
                    style={{
                      padding: '8px 12px',
                      background: copiedToken === generatedToken ? 'var(--color-success)' : 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {copiedToken === generatedToken ? (
                      <>
                        <Check size={14} /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* HISTÓRICO DE TOKENS */}
          <div className="card glass" style={{ padding: '20px', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>
              Histórico de Tokens de Ativação
            </h3>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Token</th>
                  <th style={{ padding: '12px' }}>Validade (Dias)</th>
                  <th style={{ padding: '12px' }}>Criado em</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Usado por</th>
                  <th style={{ padding: '12px' }}>Data Resgate</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tokens.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Nenhum token gerado.
                    </td>
                  </tr>
                ) : (
                  tokens.map(token => (
                    <tr key={token.token} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{token.token}</code>
                          <button
                            onClick={() => handleCopyToken(token.token)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedToken === token.token ? 'var(--color-success)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'color 0.2s ease'
                            }}
                            title="Copiar Código"
                          >
                            {copiedToken === token.token ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{token.dias_validade} dias</td>
                      <td style={{ padding: '12px' }}>{new Date(token.created_at).toLocaleDateString('pt-BR')}</td>
                      
                      <td style={{ padding: '12px' }}>
                        <span className={`status-badge ${token.usado ? 'status-vencida' : 'status-em-aberto'}`} style={{ fontSize: '0.7rem' }}>
                          {token.usado ? 'Resgatado' : 'Disponível'}
                        </span>
                      </td>

                      <td style={{ padding: '12px', fontWeight: 600 }}>{token.lojas?.nome || '-'}</td>

                      <td style={{ padding: '12px' }}>
                        {token.usado_em ? new Date(token.usado_em).toLocaleDateString('pt-BR') : '-'}
                      </td>

                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteToken(token.token)}
                          disabled={token.usado}
                          style={{ background: 'transparent', border: 'none', color: token.usado ? 'var(--text-muted)' : 'var(--color-danger)', cursor: token.usado ? 'not-allowed' : 'pointer', padding: '4px' }}
                          title="Excluir Token"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
