import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  Building2, 
  TrendingUp, 
  ShieldAlert, 
  Key, 
  Loader2, 
  Sparkles,
  Clock
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const SuperDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [diasTestePadrao, setDiasTestePadrao] = useState<number>(30);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [stats, setStats] = useState({
    totalLojas: 0,
    lojasAtivas: 0,
    lojasBloqueadas: 0,
    faturamentoMensal: 0,
    tokensAtivos: 0,
    tokensUsados: 0
  });
  const [recentLojas, setRecentLojas] = useState<any[]>([]);
  const [recentTokens, setRecentTokens] = useState<any[]>([]);

  useEffect(() => {
    const fetchSaaSStats = async () => {
      try {
        setLoading(true);
        
        // 1. Buscar Lojas e Planos relacionados para cálculo
        const { data: lojas, error: lojasError } = await supabase
          .from('lojas')
          .select('id, status, plano_id, planos(preco), created_at, nome, slug');

        if (lojasError) throw lojasError;

        // 2. Buscar Tokens de Ativação
        const { data: tokens, error: tokensError } = await supabase
          .from('tokens_ativacao')
          .select('token, dias_validade, usado, usado_em, created_at, lojas(nome)');

        if (tokensError) throw tokensError;

        // Calcular estatísticas
        const totalLojas = lojas?.length || 0;
        const lojasAtivas = lojas?.filter((l: any) => l.status === 'ativo').length || 0;
        const lojasBloqueadas = lojas?.filter((l: any) => l.status === 'bloqueado' || l.status === 'expirado').length || 0;
        
        // Faturamento mensal estimado
        const faturamentoMensal = lojas?.reduce((sum: number, l: any) => {
          if (l.status === 'ativo' && l.planos) {
            return sum + (Number((l.planos as any).preco) || 0);
          }
          return sum;
        }, 0) || 0;

        const tokensAtivos = tokens?.filter((t: any) => !t.usado).length || 0;
        const tokensUsados = tokens?.filter((t: any) => t.usado).length || 0;

        setStats({
          totalLojas,
          lojasAtivas,
          lojasBloqueadas,
          faturamentoMensal,
          tokensAtivos,
          tokensUsados
        });

        // Lojas recentes (últimas 5)
        const sortedLojas = [...(lojas || [])]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        setRecentLojas(sortedLojas);

        // Últimos tokens gerados (últimos 5)
        const sortedTokens = [...(tokens || [])]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        setRecentTokens(sortedTokens);

        // 3. Buscar saas_config
        try {
          const { data: configData, error: configError } = await supabase
            .from('saas_config')
            .select('dias_teste_padrao')
            .eq('id', 'global')
            .single();

          if (!configError && configData) {
            setDiasTestePadrao(configData.dias_teste_padrao);
            localStorage.setItem('saas_dias_teste_padrao', String(configData.dias_teste_padrao));
          } else {
            const localVal = localStorage.getItem('saas_dias_teste_padrao');
            if (localVal) {
              setDiasTestePadrao(Number(localVal));
            }
          }
        } catch (configErr) {
          console.error('Erro ao buscar configuração saas_config, usando local:', configErr);
          const localVal = localStorage.getItem('saas_dias_teste_padrao');
          if (localVal) {
            setDiasTestePadrao(Number(localVal));
          }
        }

      } catch (err) {
        console.error('Erro ao buscar dados de Super Admin:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSaaSStats();
  }, []);

  const handleSaveConfig = async (dias: number) => {
    try {
      setSavingConfig(true);
      setConfigMessage(null);

      // Salvar localmente como redundância
      localStorage.setItem('saas_dias_teste_padrao', String(dias));

      const { error } = await supabase
        .from('saas_config')
        .upsert({ id: 'global', dias_teste_padrao: dias });

      if (error) {
        console.warn('Erro ao salvar no banco, mantendo local:', error);
        setConfigMessage({ 
          type: 'success', 
          text: `Salvo localmente! Nota: a tabela saas_config pode não estar criada no banco.` 
        });
      } else {
        setConfigMessage({ type: 'success', text: `Período de teste padrão atualizado para ${dias} dias!` });
      }

      setDiasTestePadrao(dias);
      setTimeout(() => setConfigMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar configuração do SaaS:', err);
      setDiasTestePadrao(dias);
      setConfigMessage({ 
        type: 'success', 
        text: `Salvo localmente! Nota: verifique a conexão com o banco.` 
      });
      setTimeout(() => setConfigMessage(null), 4000);
    } finally {
      setSavingConfig(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ color: 'var(--primary-color)' }} />
            Painel SaaS - Super Admin
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Visão consolidada de todas as lojas, assinaturas e tokens de ativação do sistema.
          </p>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--primary-color)', borderRadius: '12px' }}>
            <Building2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>TOTAL DE LOJAS</span>
            <strong style={{ display: 'block', fontSize: '1.5rem', margin: '4px 0 2px 0', color: 'var(--text-primary)' }}>{stats.totalLojas}</strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{stats.lojasAtivas} ativas • {stats.lojasBloqueadas} bloqueadas</span>
          </div>
        </div>

        <div className="card glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)', borderRadius: '12px' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>RECORRÊNCIA ESTIMADA (MRR)</span>
            <strong style={{ display: 'block', fontSize: '1.5rem', margin: '4px 0 2px 0', color: 'var(--color-success)' }}>
              {formatCurrency(stats.faturamentoMensal)}
            </strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Faturamento mensal ativo</span>
          </div>
        </div>

        <div className="card glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: '12px' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>LOJAS BLOQUEADAS</span>
            <strong style={{ display: 'block', fontSize: '1.5rem', margin: '4px 0 2px 0', color: 'var(--color-danger)' }}>{stats.lojasBloqueadas}</strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Sem acesso ativo ao PDV</span>
          </div>
        </div>

        <div className="card glass" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '12px' }}>
            <Key size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>TOKENS DE ATIVAÇÃO</span>
            <strong style={{ display: 'block', fontSize: '1.5rem', margin: '4px 0 2px 0', color: 'var(--text-primary)' }}>{stats.tokensAtivos + stats.tokensUsados}</strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{stats.tokensAtivos} ativos • {stats.tokensUsados} resgatados</span>
          </div>
        </div>
      </div>

      {/* CONFIGURAÇÃO DO PERÍODO DE TESTE */}
      <div className="card glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock style={{ color: 'var(--primary-color)' }} size={18} />
              Configuração do Período de Teste Grátis
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Defina o período de teste padrão que as novas lojas receberão ao criar uma conta no sistema.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {[7, 15, 30].map((dias) => (
                <button
                  key={dias}
                  disabled={savingConfig}
                  onClick={() => handleSaveConfig(dias)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: diasTestePadrao === dias ? 'var(--primary-color)' : 'transparent',
                    color: diasTestePadrao === dias ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                    boxShadow: diasTestePadrao === dias ? '0 2px 8px rgba(168, 85, 247, 0.3)' : 'none'
                  }}
                >
                  {dias} dias
                </button>
              ))}
            </div>
            {savingConfig && <Loader2 className="spinner" size={16} color="var(--primary-color)" />}
          </div>
        </div>

        {configMessage && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: configMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: configMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${configMessage.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {configMessage.text}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginTop: '10px' }}>
        {/* LOJAS RECENTES */}
        <div className="card glass" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Lojas Recém-Criadas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentLojas.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '0.85rem' }}>Nenhuma loja cadastrada ainda.</div>
            ) : (
              recentLojas.map(loja => (
                <div key={loja.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>{loja.nome}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>/{loja.slug}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-badge ${loja.status === 'ativo' ? 'status-paga' : 'status-vencida'}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      {loja.status}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Criada em {new Date(loja.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TOKENS DE ATIVAÇÃO RECENTES */}
        <div className="card glass" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Atividades de Licenciamento (Tokens)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentTokens.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '0.85rem' }}>Nenhum token gerado ainda.</div>
            ) : (
              recentTokens.map(token => (
                <div key={token.token} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <div>
                    <code style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-color)', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      {token.token}
                    </code>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Validade: {token.dias_validade} dias • Criado {new Date(token.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {token.usado ? (
                      <div>
                        <span className="status-badge status-paga" style={{ fontSize: '0.65rem' }}>Resgatado</span>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Por: {token.lojas?.nome || 'Desconhecida'}
                        </span>
                      </div>
                    ) : (
                      <span className="status-badge status-em-aberto" style={{ fontSize: '0.65rem' }}>Disponível</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
