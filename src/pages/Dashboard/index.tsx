import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  TrendingUp, 
  CreditCard, 
  AlertTriangle, 
  Calendar, 
  Package, 
  Users, 
  ArrowUpRight, 
  Sparkles,
  Cake
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const Dashboard: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { 
    vendas, 
    parcelas, 
    clientes, 
    produtos 
  } = useApp();

  // --- CÁLCULO DOS INDICADORES ---
  const hojeStr = new Date().toISOString().split('T')[0];
  const mesAtualStr = hojeStr.substring(0, 7); // YYYY-MM

  // 1. Vendas
  const vendasDia = vendas.filter(v => v.data === hojeStr);
  const totalVendasDia = vendasDia.reduce((sum, v) => sum + v.total, 0);

  const vendasMes = vendas.filter(v => v.data.substring(0, 7) === mesAtualStr);
  const totalVendasMes = vendasMes.reduce((sum, v) => sum + v.total, 0);

  // 2. Crediário e Parcelas
  const parcelasAbertas = parcelas.filter(p => p.status !== 'paga');
  const totalCrediarioAberto = parcelasAbertas.reduce((sum, p) => sum + p.valorRestante, 0);

  const parcelasVencidas = parcelas.filter(p => p.status === 'vencida');
  const totalVencido = parcelasVencidas.reduce((sum, p) => sum + p.valorRestante, 0);

  const parcelasVenceHoje = parcelas.filter(p => p.dataVencimento === hojeStr && p.status !== 'paga');
  const totalVenceHoje = parcelasVenceHoje.reduce((sum, p) => sum + p.valorRestante, 0);

  // 3. Clientes Inadimplentes (possuem alguma parcela vencida)
  const clientesInadimplentesCount = clientes.filter(c => {
    const vencidas = parcelas.filter(p => p.clienteId === c.id && p.status === 'vencida');
    return vencidas.length > 0;
  }).length;

  // 3.5. Clientes que fazem aniversário hoje
  const aniversariantesHoje = clientes.filter(c => {
    if (!c.dataNascimento) return false;
    try {
      const partes = c.dataNascimento.split('-');
      if (partes.length < 3) return false;
      const nascMes = parseInt(partes[1]);
      const nascDia = parseInt(partes[2]);
      
      const hoje = new Date();
      const hojeMes = hoje.getMonth() + 1;
      const hojeDia = hoje.getDate();
      
      return nascMes === hojeMes && nascDia === hojeDia;
    } catch (e) {
      return false;
    }
  });

  // 4. Estoques
  let produtosBaixoEstoque = 0;
  let produtosSemEstoque = 0;

  produtos.forEach(p => {
    const estoqueTotal = p.tamanhos.reduce((sum, t) => sum + t.estoque, 0);
    if (estoqueTotal === 0) {
      produtosSemEstoque++;
    } else if (estoqueTotal <= p.estoqueMinimo) {
      produtosBaixoEstoque++;
    }
  });

  // --- PREPARAÇÃO DE DADOS PARA GRÁFICOS SVG NATIVOS ---
  
  // Gráfico A: Vendas dos últimos 7 dias (Linhas)
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const vendasPorDiaValores = ultimos7Dias.map(dia => {
    const diaVendas = vendas.filter(v => v.data === dia);
    return diaVendas.reduce((sum, v) => sum + v.total, 0);
  });

  const maxVenda = Math.max(...vendasPorDiaValores, 100); // Evitar divisão por zero
  
  // Coordenadas para o SVG do gráfico de linha
  const svgWidth = 500;
  const svgHeight = 150;
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const pontosLinha = ultimos7Dias.map((_, i) => {
    const x = paddingX + (i * (chartWidth / 6));
    const y = paddingY + chartHeight - ((vendasPorDiaValores[i] / maxVenda) * chartHeight);
    return `${x},${y}`;
  }).join(' ');

  // Gráfico B: Recebimentos de Crediário por tipo de pagamento (Barras)
  // Somar pagamentos das parcelas que foram realizados
  const recebimentosPorTipo = {
    pix: 0,
    dinheiro: 0,
    debito: 0,
    credito: 0
  };

  parcelas.forEach(p => {
    p.pagamentos.forEach(pg => {
      if (recebimentosPorTipo[pg.tipoPagamento] !== undefined) {
        recebimentosPorTipo[pg.tipoPagamento] += pg.valorRecebido;
      }
    });
  });

  const totalRecebidoCalculado = Object.values(recebimentosPorTipo).reduce((sum, v) => sum + v, 0);

  // Gráfico C: Categoria de produtos mais vendidos
  // Contar produtos vendidos
  const vendasPorCategoria: Record<string, number> = {};
  vendas.forEach(v => {
    v.produtos.forEach(item => {
      const prod = produtos.find(p => p.id === item.produtoId);
      const cat = prod ? prod.categoria : 'Outros';
      vendasPorCategoria[cat] = (vendasPorCategoria[cat] || 0) + item.quantidade;
    });
  });

  const categoriasVenda = Object.keys(vendasPorCategoria).slice(0, 3);
  const totalProdutosVendidos = Object.values(vendasPorCategoria).reduce((sum, v) => sum + v, 0);

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* BOAS VINDAS */}
      <div className="card glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-gradient)', color: 'white', border: 'none' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={18} />
            Seu Painel GlowPOS
          </h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            {formatDate(hojeStr)} | Movimentação diária da sua loja de modas em tempo real.
          </p>
        </div>
        <button onClick={() => setActiveTab('pdv')} className="btn btn-secondary btn-xs" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
          Ir para PDV <ArrowUpRight size={14} />
        </button>
      </div>

      {/* METRICAS CHAVE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        
        <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>VENDAS DO DIA</span>
          <strong style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>{formatCurrency(totalVendasDia)}</strong>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{vendasDia.length} atendimentos</span>
        </div>

        <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>VENDAS DO MÊS</span>
          <strong style={{ fontSize: '1.2rem', color: 'var(--color-success)' }}>{formatCurrency(totalVendasMes)}</strong>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{vendasMes.length} vendas</span>
        </div>

        <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>CREDIÁRIO ABERTO</span>
          <strong style={{ fontSize: '1.2rem', color: 'var(--color-crediario)' }}>{formatCurrency(totalCrediarioAberto)}</strong>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{parcelasAbertas.length} parcelas</span>
        </div>

        <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: totalVencido > 0 ? '3px solid var(--color-danger)' : '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>SALDO VENCIDO</span>
          <strong style={{ fontSize: '1.2rem', color: totalVencido > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
            {formatCurrency(totalVencido)}
          </strong>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{clientesInadimplentesCount} cl. inadimplentes</span>
        </div>

      </div>

      {/* ALERTAS DO DIA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Alertas Estoque */}
        {(produtosBaixoEstoque > 0 || produtosSemEstoque > 0) && (
          <div className="card" style={{ padding: '14px', background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle color="var(--color-warning)" size={24} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-primary)' }}>Rupturas de Estoque</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {produtosSemEstoque} produtos ESGOTADOS e {produtosBaixoEstoque} produtos com estoque crítico!
              </span>
            </div>
            <button onClick={() => setActiveTab('produtos')} className="btn btn-secondary btn-xs" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)', background: 'transparent' }}>
              Ver
            </button>
          </div>
        )}

        {/* Alertas Vencimento Hoje */}
        {totalVenceHoje > 0 && (
          <div className="card" style={{ padding: '14px', background: 'var(--color-info-light)', borderColor: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar color="var(--color-info)" size={24} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-primary)' }}>Vencendo Hoje</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Você tem {parcelasVenceHoje.length} parcela(s) que vencem hoje, totalizando {formatCurrency(totalVenceHoje)}.
              </span>
            </div>
            <button onClick={() => setActiveTab('crediario')} className="btn btn-secondary btn-xs" style={{ borderColor: 'var(--color-info)', color: 'var(--color-info)', background: 'transparent' }}>
              Cobrar
            </button>
          </div>
        )}

        {/* Alertas Aniversariantes do Dia */}
        {aniversariantesHoje.length > 0 && (
          <div className="card" style={{ 
            padding: '14px', 
            background: 'rgba(168, 85, 247, 0.08)', 
            borderColor: 'rgba(168, 85, 247, 0.4)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            borderLeft: '4px solid #a855f7'
          }}>
            <Cake color="#a855f7" size={24} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-primary)' }}>Aniversariantes de Hoje! 🎉</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {aniversariantesHoje.map(c => c.nome.split(' ')[0]).join(', ')} faz(em) aniversário hoje! Envie uma mensagem.
              </span>
            </div>
            <button onClick={() => setActiveTab('pessoas')} className="btn btn-secondary btn-xs" style={{ borderColor: '#a855f7', color: '#a855f7', background: 'transparent', fontWeight: 700 }}>
              Ver
            </button>
          </div>
        )}

      </div>

      {/* SEÇÃO DE GRÁFICOS SVG DINÂMICOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Gráfico 1: Linha de Vendas (7 dias) */}
        <div className="card glass" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} className="text-secondary" />
            Vendas do Período (Últimos 7 dias)
          </h3>

          <div style={{ position: 'relative', width: '100%', height: '150px' }}>
            <svg width="100%" height="150" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={svgWidth - paddingX} y2={paddingY + chartHeight / 2} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1={paddingX} y1={paddingY + chartHeight} x2={svgWidth - paddingX} y2={paddingY + chartHeight} stroke="var(--border-color)" strokeWidth="1" />

              {/* Linha de Conexão */}
              <polyline
                fill="none"
                stroke="var(--primary-color)"
                strokeWidth="3.5"
                points={pontosLinha}
              />

              {/* Pontos (Dots) com Tooltips Simples */}
              {ultimos7Dias.map((_, i) => {
                const x = paddingX + (i * (chartWidth / 6));
                const y = paddingY + chartHeight - ((vendasPorDiaValores[i] / maxVenda) * chartHeight);
                return (
                  <g key={i} className="chart-dot-group">
                    <circle cx={x} cy={y} r="5" fill="var(--bg-card)" stroke="var(--primary-color)" strokeWidth="2.5" />
                    <text x={x} y={y - 10} textAnchor="middle" fontSize="7" fill="var(--text-primary)" fontWeight="700">
                      {vendasPorDiaValores[i] > 0 ? formatCurrency(vendasPorDiaValores[i]).replace('R$', '').trim() : ''}
                    </text>
                  </g>
                );
              })}

              {/* Rótulos X (Datas) */}
              {ultimos7Dias.map((dia, i) => {
                const x = paddingX + (i * (chartWidth / 6));
                const parts = dia.split('-');
                return (
                  <text key={i} x={x} y={svgHeight - 4} textAnchor="middle" fontSize="8" fill="var(--text-secondary)" fontWeight="600">
                    {parts[2]}/{parts[1]}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Gráfico 2: Barras de Recebimentos por Tipo */}
        <div className="card glass" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard size={16} className="text-secondary" />
            Recebimento de Parcelas de Crediário
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '150px', justifyContent: 'center' }}>
            {Object.entries(recebimentosPorTipo).map(([tipo, valor]) => {
              const porcentagem = totalRecebidoCalculado > 0 ? (valor / totalRecebidoCalculado) * 100 : 0;
              const barColor = tipo === 'pix' 
                ? 'var(--color-pix)' 
                : tipo === 'dinheiro' 
                  ? 'var(--color-money)' 
                  : 'var(--color-card)';

              return (
                <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                  <span style={{ width: '70px', fontWeight: 700, textTransform: 'uppercase' }}>{tipo}</span>
                  
                  <div style={{ flex: 1, height: '14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${porcentagem}%`, 
                        height: '100%', 
                        background: barColor, 
                        transition: 'width 1s ease-in-out',
                        borderRadius: 'var(--radius-full)'
                      }} 
                    />
                  </div>

                  <strong style={{ width: '75px', textAlign: 'right' }}>{formatCurrency(valor)}</strong>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RANKINGS E CLIENTES MAIS ATIVOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Melhores Compradores */}
        <div className="card glass" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} className="text-secondary" />
            Melhores Compradores (Fidelidade)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {clientes
              .sort((a, b) => b.totalComprado - a.totalComprado)
              .slice(0, 3)
              .map((c, i) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: 'var(--primary-color)' }}>#{i + 1}</strong>
                    <strong>{c.nome.split(' ')[0]} {c.nome.split(' ')[1] || ''}</strong>
                  </div>
                  <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(c.totalComprado)}</strong>
                </div>
              ))}
          </div>
        </div>

        {/* Giro de Categorias */}
        <div className="card glass" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={16} className="text-secondary" />
            Produtos Vendidos por Categoria
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categoriasVenda.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhuma venda registrada ainda
              </div>
            ) : (
              categoriasVenda.map(cat => {
                const qtd = vendasPorCategoria[cat];
                const porcentagem = totalProdutosVendidos > 0 ? (qtd / totalProdutosVendidos) * 100 : 0;
                
                return (
                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{cat}</span>
                      <span>{qtd} un ({porcentagem.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ width: `${porcentagem}%`, height: '100%', background: 'var(--primary-gradient)', borderRadius: 'var(--radius-full)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
