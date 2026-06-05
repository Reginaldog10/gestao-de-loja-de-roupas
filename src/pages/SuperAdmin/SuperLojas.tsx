import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  Building2, 
  Loader2, 
  Lock, 
  Unlock 
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

export const SuperLojas: React.FC = () => {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);

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

    } catch (e) {
      console.error('Erro ao buscar dados de lojas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>Carregando dados das lojas...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div className="card glass" style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <Building2 style={{ color: 'var(--primary-color)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
            Lista de Lojas Registradas
          </h2>
        </div>
        
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
            {lojas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Nenhuma loja cadastrada no sistema.
                </td>
              </tr>
            ) : (
              lojas.map(loja => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
