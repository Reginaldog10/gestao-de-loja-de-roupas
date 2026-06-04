import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  Building2, 
  Key, 
  Loader2, 
  Trash2, 
  Lock, 
  Unlock, 
  Plus, 
  Gift
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface Loja {
  id: string;
  nome: string;
  slug: string;
  plano_id: string | null;
  status: 'ativo' | 'bloqueado' | 'expirado';
  expiracao: string | null;
  created_at: string;
  planos: {
    nome: string;
  } | null;
}

interface Plano {
  id: string;
  nome: string;
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

export const SuperLojas: React.FC = () => {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [tokens, setTokens] = useState<TokenAtivacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Abas Locais
  const [localTab, setLocalTab] = useState<'lojas' | 'tokens'>('lojas');

  // Gerador de Token
  const [diasValidade, setDiasValidade] = useState<number>(30);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Ações rápidas Lojas
  const [editingLojaId, setEditingLojaId] = useState<string | null>(null);
  const [newPlanoId, setNewPlanoId] = useState<string>('');
  const [newExpiracao, setNewExpiracao] = useState<string>('');
  const [updatingLoja, setUpdatingLoja] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Lojas
      const { data: lojasData, error: lojasError } = await supabase
        .from('lojas')
        .select('*, planos(nome)')
        .order('nome', { ascending: true });
      if (lojasError) throw lojasError;
      setLojas(lojasData || []);

      // Planos (para os dropdowns)
      const { data: planosData, error: planosError } = await supabase
        .from('planos')
        .select('id, nome')
        .order('preco', { ascending: true });
      if (planosError) throw planosError;
      setPlanos(planosData || []);

      // Tokens
      const { data: tokensData, error: tokensError } = await supabase
        .from('tokens_ativacao')
        .select('*, lojas(nome)')
        .order('created_at', { ascending: false });
      if (tokensError) throw tokensError;
      setTokens(tokensData || []);

    } catch (e) {
      console.error('Erro ao buscar dados do SaaS:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // GERAR TOKEN DE ATIVAÇÃO
  const handleGenerateToken = async () => {
    setGenerating(true);
    setGeneratedToken(null);
    try {
      // Gerar string do token legível (ex: GLOW-ACT-30D-XXXX-XXXX)
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
      await fetchData();
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
      await fetchData();
    } catch (err: any) {
      alert(`Erro ao deletar token: ${err.message}`);
    }
  };

  // ALTERAR STATUS DA LOJA (BLOQUEAR/ATIVAR)
  const handleToggleStoreStatus = async (lojaId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';
    const acaoLabel = nextStatus === 'ativo' ? 'Desbloquear' : 'Bloquear';
    
    if (!confirm(`Deseja realmente ${acaoLabel.toLowerCase()} esta loja?`)) return;

    try {
      const { error } = await supabase
        .from('lojas')
        .update({ status: nextStatus })
        .eq('id', lojaId);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert(`Erro ao atualizar status da loja: ${err.message}`);
    }
  };

  // INICIAR EDIÇÃO DA LOJA (PLANO E EXPIRAÇÃO)
  const startEditingLoja = (loja: Loja) => {
    setEditingLojaId(loja.id);
    setNewPlanoId(loja.plano_id || '');
    // Formatar data para YYYY-MM-DD
    if (loja.expiracao) {
      setNewExpiracao(loja.expiracao.split('T')[0]);
    } else {
      setNewExpiracao('');
    }
  };

  // ATUALIZAR LOJA
  const handleUpdateLoja = async (lojaId: string) => {
    setUpdatingLoja(true);
    try {
      const updates: any = {};
      if (newPlanoId) updates.plano_id = newPlanoId;
      else updates.plano_id = null;

      if (newExpiracao) {
        // Salvar com o final do dia
        updates.expiracao = new Date(`${newExpiracao}T23:59:59.999Z`).toISOString();
      } else {
        updates.expiracao = null;
      }

      const { error } = await supabase
        .from('lojas')
        .update(updates)
        .eq('id', lojaId);

      if (error) throw error;

      alert('Dados da loja atualizados com sucesso!');
      setEditingLojaId(null);
      await fetchData();
    } catch (err: any) {
      alert(`Erro ao atualizar loja: ${err.message}`);
    } finally {
      setUpdatingLoja(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', width: '100%' }}>
        <Loader2 className="spinner" size={32} color="var(--primary-color)" />
        <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>Carregando dados globais...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ABAS LOCAIS */}
      <div className="card glass" style={{ padding: '8px', display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => setLocalTab('lojas')} 
          className={`btn ${localTab === 'lojas' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ flex: 1 }}
        >
          <Building2 size={16} /> Lojas Cadastradas
        </button>
        <button 
          onClick={() => setLocalTab('tokens')} 
          className={`btn ${localTab === 'tokens' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ flex: 1 }}
        >
          <Key size={16} /> Tokens de Ativação (Licenças)
        </button>
      </div>

      {/* --- ABA 1: LOJAS --- */}
      {localTab === 'lojas' && (
        <div className="card glass" style={{ padding: '20px', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Lista de Lojas Registradas
          </h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Nome da Loja</th>
                <th style={{ padding: '12px' }}>Slug / Identificador</th>
                <th style={{ padding: '12px' }}>Plano Contratado</th>
                <th style={{ padding: '12px' }}>Vencimento da Licença</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lojas.map(loja => (
                <tr key={loja.id} style={{ borderBottom: '1px solid var(--border-color)', background: editingLojaId === loja.id ? 'rgba(168, 85, 247, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{loja.nome}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>/{loja.slug}</td>
                  
                  {/* Plano */}
                  <td style={{ padding: '12px' }}>
                    {editingLojaId === loja.id ? (
                      <select 
                        value={newPlanoId} 
                        onChange={(e) => setNewPlanoId(e.target.value)}
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', minWidth: '130px' }}
                      >
                        <option value="">Sem plano</option>
                        {planos.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{loja.planos?.nome || 'Nenhum'}</span>
                    )}
                  </td>

                  {/* Vencimento */}
                  <td style={{ padding: '12px' }}>
                    {editingLojaId === loja.id ? (
                      <input 
                        type="date"
                        value={newExpiracao}
                        onChange={(e) => setNewExpiracao(e.target.value)}
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                      />
                    ) : (
                      <span>{loja.expiracao ? formatDate(loja.expiracao.split('T')[0]) : 'Sem limite'}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span className={`status-badge ${loja.status === 'ativo' ? 'status-paga' : 'status-vencida'}`} style={{ fontSize: '0.7rem' }}>
                      {loja.status}
                    </span>
                  </td>

                  {/* Ações */}
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {editingLojaId === loja.id ? (
                        <>
                          <button 
                            onClick={() => handleUpdateLoja(loja.id)}
                            className="btn btn-primary btn-xs"
                            disabled={updatingLoja}
                          >
                            Salvar
                          </button>
                          <button 
                            onClick={() => setEditingLojaId(null)}
                            className="btn btn-secondary btn-xs"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEditingLoja(loja)}
                            className="btn btn-secondary btn-xs"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleToggleStoreStatus(loja.id, loja.status)}
                            className={`btn ${loja.status === 'ativo' ? 'btn-danger' : 'btn-primary'} btn-xs`}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {loja.status === 'ativo' ? (
                              <>
                                <Lock size={12} /> Bloquear
                              </>
                            ) : (
                              <>
                                <Unlock size={12} /> Ativar
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- ABA 2: TOKENS DE ATIVAÇÃO --- */}
      {localTab === 'tokens' && (
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
              <div style={{ marginTop: '20px', background: 'rgba(168, 85, 247, 0.05)', padding: '16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--primary-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  Token Gerado com Sucesso (Copie e envie ao lojista):
                </span>
                <code style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-color)', wordBreak: 'break-all' }}>
                  {generatedToken}
                </code>
              </div>
            )}
          </div>

          {/* LISTA DE TOKENS */}
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
                        <code style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{token.token}</code>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{token.dias_validade} dias</td>
                      <td style={{ padding: '12px' }}>{new Date(token.created_at).toLocaleDateString('pt-BR')}</td>
                      
                      {/* Status */}
                      <td style={{ padding: '12px' }}>
                        <span className={`status-badge ${token.usado ? 'status-vencida' : 'status-em-aberto'}`} style={{ fontSize: '0.7rem' }}>
                          {token.usado ? 'Resgatado' : 'Disponível'}
                        </span>
                      </td>

                      {/* Usado por */}
                      <td style={{ padding: '12px', fontWeight: 600 }}>{token.lojas?.nome || '-'}</td>

                      {/* Data Resgate */}
                      <td style={{ padding: '12px' }}>
                        {token.usado_em ? new Date(token.usado_em).toLocaleDateString('pt-BR') : '-'}
                      </td>

                      {/* Ações */}
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
