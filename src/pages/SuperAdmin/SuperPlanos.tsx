import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Loader2, 
  Check, 
  Users, 
  Package 
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

export const SuperPlanos: React.FC = () => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Campos do formulário
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [maxClientes, setMaxClientes] = useState('');
  const [maxProdutos, setMaxProdutos] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlanos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('preco', { ascending: true });

      if (error) throw error;
      setPlanos(data || []);
    } catch (e) {
      console.error('Erro ao buscar planos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !preco) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('planos')
        .insert({
          nome: nome.trim(),
          preco: Number(preco),
          max_clientes: maxClientes ? Number(maxClientes) : null,
          max_produtos: maxProdutos ? Number(maxProdutos) : null
        });

      if (error) throw error;
      
      alert('Plano cadastrado com sucesso!');
      setShowAddForm(false);
      setNome('');
      setPreco('');
      setMaxClientes('');
      setMaxProdutos('');
      await fetchPlanos();
    } catch (err: any) {
      alert(`Erro ao cadastrar plano: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', width: '100%' }}>
        <Loader2 className="spinner" size={32} color="var(--primary-color)" />
        <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>Carregando planos...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings style={{ color: 'var(--primary-color)' }} />
            Gerenciar Planos do SaaS
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Cadastre e gerencie as opções de assinatura que estarão disponíveis para as lojas.
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <Plus size={16} /> Novo Plano
        </button>
      </div>

      {showAddForm && (
        <div className="card glass" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Cadastrar Novo Plano
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                <span>Salvar Plano</span>
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="btn btn-secondary"
                style={{ padding: '10px 24px' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PLANOS LIST */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {planos.length === 0 ? (
          <div className="card glass" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Nenhum plano cadastrado.
          </div>
        ) : (
          planos.map(plano => (
            <div key={plano.id} className="card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              <button 
                onClick={() => handleDeletePlano(plano.id, plano.nome)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
                title="Excluir Plano"
              >
                <Trash2 size={18} />
              </button>
              
              <div>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)', display: 'block' }}>{plano.nome}</strong>
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
  );
};
