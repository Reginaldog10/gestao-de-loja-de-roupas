import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Download, 
  Upload, 
  Trash2, 
  FileSpreadsheet, 
  FileText, 
  ShieldCheck, 
  Database,
  Printer,
  History,
  ChevronRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const Configuracoes: React.FC = () => {
  const { 
    clientes, 
    produtos, 
    vendas, 
    parcelas, 
    logs, 
    limparBanco, 
    exportarDados, 
    importarDados 
  } = useApp();

  const { hasAccess, currentProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados locais
  const [activeSubTab, setActiveSubTab] = useState<'relatorios' | 'backup' | 'logs'>('relatorios');
  const [showPrintView, setShowPrintView] = useState<'none' | 'fechamento' | 'produtos_sem_giro' | 'inadimplentes'>('none');

  // --- CONTROLE DE BACKUP E RESTAURAÇÃO ---
  const handleExportBackup = () => {
    try {
      const dataStr = exportarDados();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_glowpos_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao gerar arquivo de backup.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const success = importarDados(result);
      if (success) {
        alert('Dados importados com sucesso! O aplicativo foi recarregado.');
      } else {
        alert('Erro: O arquivo de backup selecionado é inválido ou está corrompido.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetBanco = () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os dados cadastrados, vendas, parcelas e logs. Essa ação NÃO pode ser desfeita! Tem certeza que deseja prosseguir?')) {
      limparBanco();
      alert('Banco de dados redefinido com sucesso.');
      window.location.reload();
    }
  };

  // --- EXPORTAÇÃO EXCEL / CSV ---
  const handleExportCSV = (tipo: 'produtos' | 'vendas') => {
    let csvContent = '\uFEFF'; // UTF-8 BOM para abrir com acentuação correta no Excel
    
    if (tipo === 'produtos') {
      csvContent += 'Código Interno;Código Barras;Nome do Produto;Categoria;Marca;Cor;Estoque Total;Preço Custo;Preço Venda\n';
      produtos.forEach(p => {
        const estoque = p.tamanhos.reduce((sum, item) => sum + item.estoque, 0);
        csvContent += `"${p.codigoInterno}";"${p.codigoBarras}";"${p.nome}";"${p.categoria}";"${p.marca}";"${p.cor}";${estoque};${p.precoCusto.toFixed(2)};${p.precoVenda.toFixed(2)}\n`;
      });
    } else {
      csvContent += 'ID Venda;Data;Cliente;Subtotal;Desconto;Total Final;Formas Pagamento;Operador\n';
      vendas.forEach(v => {
        const cliName = clientes.find(c => c.id === v.clienteId)?.nome || 'Venda Rápida';
        const formas = v.formasPagamento.map(fp => `${fp.tipo}(R$${fp.valor})`).join(', ');
        csvContent += `"${v.id}";"${v.data}";"${cliName}";${v.subtotal.toFixed(2)};${v.desconto.toFixed(2)};${v.total.toFixed(2)};"${formas}";"${v.usuario}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${tipo}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- CÁLCULO DE RELATÓRIOS DO PAINEL ---
  
  // Produtos sem giro (não constam em nenhuma venda realizada)
  const produtosSemGiro = produtos.filter(p => {
    const vendido = vendas.some(v => v.produtos.some(vp => vp.produtoId === p.id));
    return !vendido;
  });

  // Financeiro Consolidado
  const totalFaturadoHistorico = vendas.reduce((sum, v) => sum + v.total, 0);
  const totalRecebidoEmCrediarios = parcelas.reduce((sum, p) => {
    const totalPg = p.pagamentos.reduce((s, pg) => s + pg.valorRecebido, 0);
    return sum + totalPg;
  }, 0);
  
  const totalVencidoInadimplencia = parcelas.filter(p => p.status === 'vencida').reduce((sum, p) => sum + p.valorRestante, 0);

  return (
    <div className="configuracoes-container">
      {/* ABAS SECUNDÁRIAS */}
      <div className="card glass" style={{ padding: '8px', marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setActiveSubTab('relatorios')}
          className={`btn ${activeSubTab === 'relatorios' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
        >
          <FileText size={18} />
          Relatórios & PDF
        </button>
        <button
          onClick={() => setActiveSubTab('backup')}
          className={`btn ${activeSubTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
        >
          <Database size={18} />
          Backup & Banco
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`btn ${activeSubTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
        >
          <History size={18} />
          Logs de Auditoria
        </button>
      </div>

      {/* --- SUB-ABA 1: RELATÓRIOS --- */}
      {activeSubTab === 'relatorios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card Indicadores Relatórios */}
          {hasAccess('finance_view') && (
            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>FATURAMENTO HISTÓRICO</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--primary-color)', display: 'block', marginTop: '4px' }}>
                  {formatCurrency(totalFaturadoHistorico)}
                </strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Soma de todas as vendas</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>LIQUIDEZ DE CREDIÁRIOS</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--color-success)', display: 'block', marginTop: '4px' }}>
                  {formatCurrency(totalRecebidoEmCrediarios)}
                </strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Soma das parcelas pagas</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>INADIMPLÊNCIA ACUMULADA</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--color-danger)', display: 'block', marginTop: '4px' }}>
                  {formatCurrency(totalVencidoInadimplencia)}
                </strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Soma das parcelas atrasadas</span>
              </div>
            </div>
          )}

          {/* Opções de Exportação Comercial */}
          <div className="card glass" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileSpreadsheet size={18} className="text-secondary" />
              Exportação para Planilhas (CSV / Excel)
            </h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button onClick={() => handleExportCSV('produtos')} className="btn btn-secondary" style={{ flex: 1, minWidth: '150px' }}>
                <FileSpreadsheet size={16} /> Exportar Produtos (Excel)
              </button>
              <button onClick={() => handleExportCSV('vendas')} className="btn btn-secondary" style={{ flex: 1, minWidth: '150px' }} disabled={!hasAccess('finance_view')}>
                <FileSpreadsheet size={16} /> Exportar Vendas (Excel)
              </button>
            </div>
          </div>

          {/* Visualizações para Impressão / PDF */}
          <div className="card glass" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={18} className="text-secondary" />
              Relatórios em PDF (Impressão Formatada)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => setShowPrintView('fechamento')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Relatório Consolidado de Fechamento de Caixa</span>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setShowPrintView('produtos_sem_giro')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Relatório de Produtos Parados (Sem Giro de Estoque)</span>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setShowPrintView('inadimplentes')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Relatório Geral de Inadimplentes e Cobrança</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-ABA 2: BACKUP --- */}
      {activeSubTab === 'backup' && (
        <div className="card glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={18} className="text-secondary" />
              Backup Automático e Manual
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Os seus dados são salvos de forma segura e imediata no seu navegador (IndexedDB/localStorage). Recomendamos exportar backups periódicos para segurança extra.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
            <button onClick={handleExportBackup} className="btn btn-primary" style={{ flex: 1, minWidth: '160px' }}>
              <Download size={16} /> Exportar Backup (JSON)
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="btn btn-secondary" 
              style={{ flex: 1, minWidth: '160px' }}
            >
              <Upload size={16} /> Importar Backup (JSON)
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportBackup} 
              accept=".json" 
              style={{ display: 'none' }} 
            />
          </div>

          {hasAccess('settings_view') && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-danger)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={16} /> Reset de Segurança
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '12px' }}>
                Caso queira limpar todos os registros e inicializar a loja com o banco de dados limpo para produção.
              </p>
              <button onClick={handleResetBanco} className="btn btn-danger btn-xs">
                Reset Total do Banco de Dados
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- SUB-ABA 3: LOGS DE AUDITORIA --- */}
      {activeSubTab === 'logs' && (
        <div className="card glass" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={18} className="text-secondary" />
            Logs de Auditoria de Segurança
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Registro cronológico detalhado de todas as operações e auditorias realizadas no sistema.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                Nenhum log gravado.
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                    <span>{formatDate(log.data)} {new Date(log.data).toLocaleTimeString('pt-BR')}</span>
                    <strong>{log.usuario}</strong>
                  </div>
                  <strong style={{ color: 'var(--primary-color)', fontSize: '0.85rem' }}>{log.acao}</strong>
                  <span style={{ color: 'var(--text-primary)' }}>{log.detalhe}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- VIEWS DE IMPRESSÃO / PDF (TIMBRADOS MOCK) --- */}
      {showPrintView !== 'none' && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-lg" style={{ background: '#fff', color: '#000', padding: '30px', fontFamily: 'sans-serif' }}>
            
            {/* Fechar view */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', gap: '8px' }}>
              <button onClick={() => window.print()} className="btn btn-primary btn-xs">
                <Printer size={14} /> Imprimir / Exportar PDF
              </button>
              <button onClick={() => setShowPrintView('none')} className="btn btn-secondary btn-xs">
                Fechar Relatório
              </button>
            </div>

            {/* CABEÇALHO DO RELATÓRIO TIMBRADO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#000' }}>GLOW MODAS ERP</h1>
                <p style={{ fontSize: '0.85rem', color: '#444' }}>Gestão de Vendas, Estoque e Crediário</p>
                <p style={{ fontSize: '0.85rem', color: '#444' }}>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>RELATÓRIO COMERCIAL</h2>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>Emitido por: {currentProfile.toUpperCase()}</p>
              </div>
            </div>

            {/* CORPO DO RELATÓRIO: FECHAMENTO DE CAIXA */}
            {showPrintView === 'fechamento' && (
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>Consolidado Financeiro de Caixa</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                  Este relatório apresenta o resumo das receitas comerciais da loja, faturamentos totais, liquidez de recebimentos de parcelas do crediário e passivos vencidos.
                </p>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
                      <th style={{ textAlign: 'left', padding: '10px' }}>Indicador de Faturamento</th>
                      <th style={{ textAlign: 'right', padding: '10px' }}>Total Consolidado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>Faturamento Bruto em Vendas</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}><strong>{formatCurrency(totalFaturadoHistorico)}</strong></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>Total de Recebimentos de Crediário</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'green' }}><strong>{formatCurrency(totalRecebidoEmCrediarios)}</strong></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>Total em Crediários em Aberto (Ativos)</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}><strong>{formatCurrency(totalRecebidoEmCrediarios)}</strong></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>Inadimplência Real (Parcelas Atrasadas)</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'red' }}><strong>{formatCurrency(totalVencidoInadimplencia)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* CORPO DO RELATÓRIO: PRODUTOS SEM GIRO */}
            {showPrintView === 'produtos_sem_giro' && (
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>Produtos Parados em Estoque</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                  Abaixo constam os produtos que estão ocupando estoque na loja mas não tiveram nenhuma movimentação de venda registrada no histórico recente do sistema.
                </p>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Cód. Interno</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Nome do Produto</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Categoria</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Estoque Atual</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Preço Venda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosSemGiro.map(p => {
                      const totalEstoque = p.tamanhos.reduce((sum, t) => sum + t.estoque, 0);
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px' }}>{p.codigoInterno}</td>
                          <td style={{ padding: '8px' }}>{p.nome} ({p.cor})</td>
                          <td style={{ padding: '8px' }}>{p.categoria}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{totalEstoque} un</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(p.precoVenda)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CORPO DO RELATÓRIO: INADIMPLENTES */}
            {showPrintView === 'inadimplentes' && (
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>Carteira de Clientes Inadimplentes</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                  Lista geral com os dados e contatos de clientes que possuem débitos vencidos e não quitados no sistema, para ações de cobrança judicial ou amigável.
                </p>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Cliente</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>CPF</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Telefone / WhatsApp</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Total Atrasado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes
                      .filter(c => parcelas.some(p => p.clienteId === c.id && p.status === 'vencida'))
                      .map(c => {
                        const vencidas = parcelas.filter(p => p.clienteId === c.id && p.status === 'vencida');
                        const totalVenc = vencidas.reduce((sum, p) => sum + p.valorRestante, 0);
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}><strong>{c.nome}</strong></td>
                            <td style={{ padding: '8px' }}>{c.cpf}</td>
                            <td style={{ padding: '8px' }}>{c.telefone}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: 'red' }}><strong>{formatCurrency(totalVenc)}</strong></td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '40px', borderTop: '1px solid #ccc', paddingTop: '12px', textAlign: 'center', fontSize: '0.75rem', color: '#666' }}>
              <p>GLOW MODAS ERP - Relatório para uso interno corporativo restrito.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
