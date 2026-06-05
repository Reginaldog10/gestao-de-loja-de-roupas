import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabaseClient';
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
  ChevronRight,
  Sparkles,
  Key,
  Loader2,
  Check,
  Building2
} from 'lucide-react';
import { formatCurrency, formatDate, formatCNPJ, formatPhone } from '../../utils/formatters';

const parseEnderecoConsolidado = (str: string) => {
  const res = { rua: '', numero: '', bairro: '', cep: '' };
  if (!str) return res;
  
  const matchRua = str.match(/Rua:\s*(.*?)(?=\s*\||$)/);
  const matchNum = str.match(/Num:\s*(.*?)(?=\s*\||$)/);
  const matchBairro = str.match(/Bairro:\s*(.*?)(?=\s*\||$)/);
  const matchCep = str.match(/CEP:\s*(.*?)(?=\s*\||$)/);
  
  if (matchRua) res.rua = matchRua[1];
  if (matchNum) res.numero = matchNum[1];
  if (matchBairro) res.bairro = matchBairro[1];
  if (matchCep) res.cep = matchCep[1];
  
  if (!matchRua && !matchNum && !matchBairro && !matchCep) {
    res.rua = str;
  }
  
  return res;
};

const parseCidadeConsolidada = (str: string) => {
  const res = { cidade: '', uf: '' };
  if (!str) return res;
  const partes = str.split(' - ');
  if (partes.length >= 2) {
    res.uf = partes.pop() || '';
    res.cidade = partes.join(' - ');
  } else {
    res.cidade = str;
  }
  return res;
};

export const Configuracoes: React.FC = () => {
  const { 
    clientes, 
    produtos, 
    vendas, 
    parcelas, 
    logs, 
    limparBanco, 
    exportarDados, 
    importarDados,
    systemConfig,
    updateSystemConfig
  } = useApp();

  const { hasAccess, currentProfile, lojaInfo, lojaId, reloadStoreStatus } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados locais
  const [activeSubTab, setActiveSubTab] = useState<'relatorios' | 'backup' | 'logs' | 'crm_cashback' | 'licenca' | 'empresa'>('relatorios');
  
  // Form states - Loja
  const [lojaNome, setLojaNome] = useState('');
  const [lojaCNPJ, setLojaCNPJ] = useState('');
  const [lojaTelefone, setLojaTelefone] = useState('');
  const [lojaCep, setLojaCep] = useState('');
  const [lojaRua, setLojaRua] = useState('');
  const [lojaNumero, setLojaNumero] = useState('');
  const [lojaBairro, setLojaBairro] = useState('');
  const [lojaCidade, setLojaCidade] = useState('');
  const [lojaUF, setLojaUF] = useState('');
  const [loadingLojaCep, setLoadingLojaCep] = useState(false);
  const [savingLojaInfo, setSavingLojaInfo] = useState(false);

  useEffect(() => {
    if (lojaInfo) {
      setLojaNome(lojaInfo.nome || '');
      setLojaCNPJ(lojaInfo.cnpj || '');
      setLojaTelefone(lojaInfo.telefone || '');
      
      if (lojaInfo.endereco) {
        const parsed = parseEnderecoConsolidado(lojaInfo.endereco);
        setLojaCep(parsed.cep);
        setLojaRua(parsed.rua);
        setLojaNumero(parsed.numero);
        setLojaBairro(parsed.bairro);
      } else {
        setLojaCep('');
        setLojaRua('');
        setLojaNumero('');
        setLojaBairro('');
      }

      if (lojaInfo.cidade) {
        const parsed = parseCidadeConsolidada(lojaInfo.cidade);
        setLojaCidade(parsed.cidade);
        setLojaUF(parsed.uf);
      } else {
        setLojaCidade('');
        setLojaUF('');
      }
    }
  }, [lojaInfo]);

  useEffect(() => {
    const savedSubTab = localStorage.getItem('erp_configuracoes_subtab');
    if (savedSubTab === 'licenca') {
      setActiveSubTab('licenca');
      localStorage.removeItem('erp_configuracoes_subtab');
    } else if (savedSubTab === 'empresa') {
      setActiveSubTab('empresa');
      localStorage.removeItem('erp_configuracoes_subtab');
    }
  }, []);

  const [showPrintView, setShowPrintView] = useState<'none' | 'fechamento' | 'produtos_sem_giro' | 'inadimplentes'>('none');

  const [cashbackAtivo, setCashbackAtivo] = useState(systemConfig.cashbackAtivo);
  const [cashbackPercentual, setCashbackPercentual] = useState(systemConfig.cashbackPercentual);
  const [cashbackMinimoResgate, setCashbackMinimoResgate] = useState(systemConfig.cashbackMinimoResgate);
  const [mensagemAniversario, setMensagemAniversario] = useState(systemConfig.mensagemAniversario);

  const [tokenVal, setTokenVal] = useState('');
  const [savingToken, setSavingToken] = useState(false);

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemConfig({
      cashbackAtivo,
      cashbackPercentual: Number(cashbackPercentual),
      cashbackMinimoResgate: Number(cashbackMinimoResgate),
      cashbackValidadeDias: systemConfig.cashbackValidadeDias,
      mensagemAniversario
    });
    alert('Configurações de Fidelidade & CRM salvas com sucesso!');
  };

  const handleLojaCepChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').substring(0, 8);
    let formatted = clean;
    if (clean.length > 5) {
      formatted = clean.substring(0, 5) + '-' + clean.substring(5);
    }
    setLojaCep(formatted);

    if (clean.length === 8) {
      setLoadingLojaCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLojaRua(data.logradouro || '');
          setLojaBairro(data.bairro || '');
          setLojaCidade(data.localidade || '');
          setLojaUF(data.uf || '');
          
          setTimeout(() => {
            const numEl = document.getElementById('loja-numero-input');
            if (numEl) numEl.focus();
          }, 50);
        }
      } catch (err) {
        console.error('Erro ao buscar CEP da loja:', err);
      } finally {
        setLoadingLojaCep(false);
      }
    }
  };

  const handleSaveLojaInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaNome.trim()) {
      alert('O nome da empresa é obrigatório.');
      return;
    }
    if (!lojaId) return;

    setSavingLojaInfo(true);
    try {
      const enderecoConsolidado = `Rua: ${lojaRua.trim()} | Num: ${lojaNumero.trim()} | Bairro: ${lojaBairro.trim()} | CEP: ${lojaCep.trim()}`;
      const cidadeConsolidada = `${lojaCidade.trim()} - ${lojaUF.trim().toUpperCase()}`;

      const { error } = await supabase
        .from('lojas')
        .update({
          nome: lojaNome.trim(),
          cnpj: formatCNPJ(lojaCNPJ),
          telefone: formatPhone(lojaTelefone),
          endereco: enderecoConsolidado,
          cidade: cidadeConsolidada
        })
        .eq('id', lojaId);

      if (error) throw error;

      alert('Dados da empresa salvos com sucesso!');
      await reloadStoreStatus();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar dados da empresa.');
    } finally {
      setSavingLojaInfo(false);
    }
  };

  const handleAtivarToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenVal.trim() || !lojaId) return;

    setSavingToken(true);
    try {
      const { error } = await supabase.rpc('resgatar_token_ativacao', {
        p_token: tokenVal.trim(),
        p_loja_id: lojaId
      });

      if (error) throw error;

      alert('Licença ativada e prorrogada com sucesso!');
      setTokenVal('');
      await reloadStoreStatus();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao resgatar token. Verifique se o código está correto e tente novamente.');
    } finally {
      setSavingToken(false);
    }
  };

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
      <div className="card glass" style={{ padding: '8px', marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('relatorios')}
          className={`btn ${activeSubTab === 'relatorios' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '130px' }}
        >
          <FileText size={18} />
          Relatórios & PDF
        </button>
        <button
          onClick={() => setActiveSubTab('backup')}
          className={`btn ${activeSubTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '130px' }}
        >
          <Database size={18} />
          Backup & Banco
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`btn ${activeSubTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '130px' }}
        >
          <History size={18} />
          Logs de Auditoria
        </button>
        <button
          onClick={() => setActiveSubTab('crm_cashback')}
          className={`btn ${activeSubTab === 'crm_cashback' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '130px' }}
        >
          <Sparkles size={18} />
          Fidelidade & CRM
        </button>
        <button
          onClick={() => setActiveSubTab('empresa')}
          className={`btn ${activeSubTab === 'empresa' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '130px' }}
        >
          <Building2 size={18} />
          Dados da Empresa
        </button>
        <button
          onClick={() => setActiveSubTab('licenca')}
          className={`btn ${activeSubTab === 'licenca' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minWidth: '130px' }}
        >
          <ShieldCheck size={18} />
          Licença & Plano
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

      {/* --- SUB-ABA 4: FIDELIDADE & CRM --- */}
      {activeSubTab === 'crm_cashback' && (
        <div className="card glass" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--primary-color)' }} />
            Programa de Cashback & CRM
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Configure o percentual de cashback que seus clientes recebem ao realizar compras na loja e personalize as mensagens automáticas de aniversário.
          </p>

          <form onSubmit={handleSaveConfigs} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', padding: '14px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-color)' }}>
              <input
                type="checkbox"
                id="cashbackAtivo"
                checked={cashbackAtivo}
                onChange={(e) => setCashbackAtivo(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="cashbackAtivo" style={{ fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                Ativar Programa de Cashback no Sistema Geral
              </label>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Percentual de Cashback (%)</label>
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  required
                  disabled={!cashbackAtivo}
                  value={cashbackPercentual}
                  onChange={(e) => setCashbackPercentual(Number(e.target.value))}
                  className="form-input"
                  placeholder="Ex: 5"
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Porcentagem calculada sobre o total de cada pagamento efetuado.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Valor Mínimo para Resgate (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  disabled={!cashbackAtivo}
                  value={cashbackMinimoResgate}
                  onChange={(e) => setCashbackMinimoResgate(Number(e.target.value))}
                  className="form-input"
                  placeholder="Ex: 10.00"
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>O saldo de cashback do cliente deve atingir este valor para ser resgatado como desconto.</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mensagem Padrão de Aniversário (WhatsApp)</label>
              <textarea
                required
                value={mensagemAniversario}
                onChange={(e) => setMensagemAniversario(e.target.value)}
                className="form-input"
                style={{ minHeight: '100px', resize: 'vertical' }}
                placeholder="Insira a mensagem que será enviada para os clientes no aniversário..."
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', background: 'var(--bg-primary)', padding: '8px', borderRadius: 'var(--radius-xs)' }}>
                💡 <strong>Dica:</strong> Use a tag <strong>{`{nome}`}</strong> no text para que o sistema substitua automaticamente pelo primeiro nome do cliente na hora de abrir a mensagem no WhatsApp.
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', padding: '10px 24px', fontWeight: 700, marginTop: '10px' }}>
              Salvar Configurações
            </button>
          </form>
        </div>
      )}

      {/* --- SUB-ABA 5: LICENÇA & PLANO --- */}
      {activeSubTab === 'licenca' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card Detalhes da Licença */}
          <div className="card glass" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--primary-color)' }} />
              Detalhes da Licença da Loja
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>NOME DA LOJA</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '4px' }}>{lojaInfo?.nome || 'Minha Loja'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>IDENTIFICADOR (SLUG)</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '4px' }}>/{lojaInfo?.slug || 'slug'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>STATUS DA LICENÇA</span>
                <strong style={{ display: 'block', marginTop: '4px' }}>
                  <span className={`status-badge ${lojaInfo?.status === 'ativo' ? 'status-paga' : 'status-vencida'}`} style={{ fontSize: '0.75rem' }}>
                    {lojaInfo?.status === 'ativo' ? 'ATIVO / REGULAR' : 'SUSPENSO / EXPIRADO'}
                  </span>
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>DATA DE VENCIMENTO</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {lojaInfo?.expiracao ? formatDate(lojaInfo.expiracao.split('T')[0]) : 'Sem expiração'}
                </strong>
              </div>
            </div>
          </div>

          {/* Form Resgatar Token */}
          <div className="card glass" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} className="text-secondary" />
              Renovar ou Estender Licença por Token
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Caso você possua um Token de Ativação enviado pelo suporte, digite-o no campo abaixo para prorrogar os dias de licença da sua loja.
            </p>

            <form onSubmit={handleAtivarToken} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '220px', marginBottom: 0 }}>
                <label className="form-label">Código do Token</label>
                <div className="input-icon-wrapper">
                  <Key size={18} className="input-icon text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: GLOW-ACT-30D-XXXX-XXXX"
                    value={tokenVal}
                    onChange={(e) => setTokenVal(e.target.value)}
                    className="form-input"
                    disabled={savingToken}
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={savingToken}
                style={{ padding: '10px 24px', height: 'var(--input-height)' }}
              >
                {savingToken ? <Loader2 size={16} className="spinner" /> : <Check size={16} />}
                <span>Ativar Licença</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- SUB-ABA 6: DADOS DA EMPRESA --- */}
      {activeSubTab === 'empresa' && (
        <div className="card glass" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} style={{ color: 'var(--primary-color)' }} />
            Dados da Empresa (Loja)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Preencha os dados comerciais da sua empresa. Essas informações são usadas para cabeçalhos de relatórios, cupons, e personalizações do sistema.
          </p>

          <form onSubmit={handleSaveLojaInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Razão Social / Nome da Loja *</label>
              <input
                type="text"
                required
                placeholder="Nome da sua loja"
                value={lojaNome}
                onChange={(e) => setLojaNome(e.target.value)}
                className="form-input"
                disabled={savingLojaInfo || !hasAccess('settings_view')}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">CNPJ (Opcional)</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={lojaCNPJ}
                  onChange={(e) => setLojaCNPJ(formatCNPJ(e.target.value))}
                  className="form-input"
                  disabled={savingLojaInfo || !hasAccess('settings_view')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone de Contato</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={lojaTelefone}
                  onChange={(e) => setLojaTelefone(formatPhone(e.target.value))}
                  className="form-input"
                  disabled={savingLojaInfo || !hasAccess('settings_view')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">CEP (Digite para preencher)</label>
                <div className="input-icon-wrapper">
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={lojaCep}
                    onChange={(e) => handleLojaCepChange(e.target.value)}
                    className="form-input"
                    disabled={loadingLojaCep || savingLojaInfo || !hasAccess('settings_view')}
                  />
                  {loadingLojaCep && <Loader2 size={16} className="spinner input-icon" style={{ right: '12px', left: 'auto' }} />}
                </div>
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Endereço / Rua</label>
                <input
                  type="text"
                  placeholder="Av. Paulista, Rua das Flores..."
                  value={lojaRua}
                  onChange={(e) => setLojaRua(e.target.value)}
                  className="form-input"
                  disabled={savingLojaInfo || !hasAccess('settings_view')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 0.7 }}>
                <label className="form-label">Número</label>
                <input
                  id="loja-numero-input"
                  type="text"
                  placeholder="Ex: 123"
                  value={lojaNumero}
                  onChange={(e) => setLojaNumero(e.target.value)}
                  className="form-input"
                  disabled={savingLojaInfo || !hasAccess('settings_view')}
                />
              </div>
              <div className="form-group" style={{ flex: 1.3 }}>
                <label className="form-label">Bairro</label>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={lojaBairro}
                  onChange={(e) => setLojaBairro(e.target.value)}
                  className="form-input"
                  disabled={savingLojaInfo || !hasAccess('settings_view')}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 2.5 }}>
                <label className="form-label">Cidade</label>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={lojaCidade}
                  onChange={(e) => setLojaCidade(e.target.value)}
                  className="form-input"
                  disabled={savingLojaInfo || !hasAccess('settings_view')}
                />
              </div>
              <div className="form-group" style={{ flex: 0.7 }}>
                <label className="form-label">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  value={lojaUF}
                  onChange={(e) => setLojaUF(e.target.value.toUpperCase())}
                  className="form-input"
                  disabled={savingLojaInfo || !hasAccess('settings_view')}
                />
              </div>
            </div>

            {hasAccess('settings_view') && (
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: 'fit-content', padding: '10px 24px', fontWeight: 700, marginTop: '10px' }}
                disabled={savingLojaInfo || loadingLojaCep}
              >
                {savingLojaInfo ? <Loader2 size={16} className="spinner" /> : <Check size={16} />}
                <span>Salvar Dados da Empresa</span>
              </button>
            )}
          </form>
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
