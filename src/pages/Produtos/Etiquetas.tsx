import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import type { Produto } from '../../context/AppContext';
import { 
  Printer, 
  Settings2, 
  Sparkles, 
  Search, 
  Trash2, 
  Eye, 
  Grid,
  FileCheck,
  RotateCcw
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import './Etiquetas.css';

interface ItemEtiqueta {
  produto: Produto;
  quantidades: { [tamanho: string]: number }; // quantidade de etiquetas por tamanho
}

export const Etiquetas: React.FC = () => {
  const { produtos } = useApp();

  // Estados locais
  const [busca, setBusca] = useState('');
  const [itensEtiquetas, setItensEtiquetas] = useState<ItemEtiqueta[]>([]);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});

  // Estados de Personalização
  const [formato, setFormato] = useState<'quadrado' | 'retangular_h' | 'retangular_v' | 'redondo'>('quadrado');
  const [tamanhoPreset, setTamanhoPreset] = useState<'30x30' | '40x40' | '50x50' | 'custom'>('40x40');
  const [larguraMm, setLarguraMm] = useState(40);
  const [alturaMm, setAlturaMm] = useState(40);
  
  // Customização de Informações
  const [exibirNome, setExibirNome] = useState(true);
  const [exibirPreco, setExibirPreco] = useState(true);
  const [exibirTamanho, setExibirTamanho] = useState(true);
  const [exibirBarras, setExibirBarras] = useState(true);
  const [exibirMarca, setExibirMarca] = useState(true);
  
  // Customização do Grid de Página
  const [colunas, setColunas] = useState(3);
  const [gapMm, setGapMm] = useState(4);

  // Monitorar Presets de Tamanho
  useEffect(() => {
    if (tamanhoPreset === '30x30') {
      setLarguraMm(30);
      setAlturaMm(30);
    } else if (tamanhoPreset === '40x40') {
      setLarguraMm(40);
      setAlturaMm(40);
    } else if (tamanhoPreset === '50x50') {
      setLarguraMm(50);
      setAlturaMm(50);
    }
  }, [tamanhoPreset]);

  // Geração de QR Codes locais sob demanda
  useEffect(() => {
    const gerarQrCodes = async () => {
      const novosQr = { ...qrCodes };
      let mudou = false;

      for (const item of itensEtiquetas) {
        for (const t of item.produto.tamanhos) {
          const valorQr = `glowpos:${item.produto.id}:${t.tamanho}`;
          if (!novosQr[valorQr]) {
            try {
              const url = await QRCode.toDataURL(valorQr, {
                margin: 1,
                width: 120,
                color: {
                  dark: '#000000',
                  light: '#ffffff'
                }
              });
              novosQr[valorQr] = url;
              mudou = true;
            } catch (err) {
              console.error('Erro ao gerar QR Code:', err);
            }
          }
        }
      }

      if (mudou) {
        setQrCodes(novosQr);
      }
    };

    gerarQrCodes();
  }, [itensEtiquetas]);

  // Filtragem do Catálogo
  const filteredCatalog = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigoInterno.includes(busca) ||
    p.codigoBarras.includes(busca) ||
    p.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  // Adicionar produto para emissão de etiquetas
  const handleToggleProduct = (produto: Produto) => {
    const existe = itensEtiquetas.some(item => item.produto.id === produto.id);

    if (existe) {
      setItensEtiquetas(itensEtiquetas.filter(item => item.produto.id !== produto.id));
    } else {
      // Inicializa com quantidade 1 para o primeiro tamanho com estoque, ou 1 para todos
      const iniciaQuants: { [tamanho: string]: number } = {};
      produto.tamanhos.forEach(t => {
        iniciaQuants[t.tamanho] = 0; // inicia zerado, lojista preenche
      });
      // se houver tamanhos, coloca quantidade 1 no primeiro por padrão
      if (produto.tamanhos.length > 0) {
        iniciaQuants[produto.tamanhos[0].tamanho] = 1;
      }

      setItensEtiquetas([...itensEtiquetas, { produto, quantidades: iniciaQuants }]);
    }
  };

  // Alterar quantidades individualmente
  const handleQuantityChange = (produtoId: string, tamanho: string, qtd: number) => {
    const novos = itensEtiquetas.map(item => {
      if (item.produto.id === produtoId) {
        return {
          ...item,
          quantidades: {
            ...item.quantidades,
            [tamanho]: Math.max(0, qtd)
          }
        };
      }
      return item;
    });
    setItensEtiquetas(novos);
  };

  // Copiar as quantidades físicas do estoque de cada produto
  const handleFillWithStock = () => {
    const novos = itensEtiquetas.map(item => {
      const quantsEstoque: { [tamanho: string]: number } = {};
      item.produto.tamanhos.forEach(t => {
        quantsEstoque[t.tamanho] = Math.max(0, t.estoque);
      });
      return {
        ...item,
        quantidades: quantsEstoque
      };
    });
    setItensEtiquetas(novos);
  };

  // Limpar lista de etiquetas selecionadas
  const handleClearAll = () => {
    if (confirm('Deseja limpar todos os produtos da fila de impressão?')) {
      setItensEtiquetas([]);
    }
  };

  // Abrir tela de impressão do navegador
  const handlePrint = () => {
    const totalEtiquetas = itensEtiquetas.reduce((acc, item) => {
      const somaItem = Object.values(item.quantidades).reduce((s, q) => s + q, 0);
      return acc + somaItem;
    }, 0);

    if (totalEtiquetas === 0) {
      alert('Selecione os produtos e insira as quantidades de etiquetas antes de imprimir.');
      return;
    }

    window.print();
  };

  // Compilar lista linear de etiquetas para renderizar na página de impressão
  const renderEtiquetaItem = (item: ItemEtiqueta, tamanho: string, index: number) => {
    const valorQr = `glowpos:${item.produto.id}:${tamanho}`;
    const qrSrc = qrCodes[valorQr] || '';

    // Estilo inline responsivo às configurações de mm do usuário
    const styleEtiqueta: React.CSSProperties = {
      width: `${larguraMm}mm`,
      height: `${alturaMm}mm`,
      borderRadius: formato === 'redondo' ? '50%' : formato === 'quadrado' ? '6px' : '2px',
    };

    return (
      <div 
        key={`${item.produto.id}-${tamanho}-${index}`} 
        className={`etiqueta-layout-card format-${formato}`} 
        style={styleEtiqueta}
      >
        <div className="etiqueta-inner-content">
          {/* Logo / Marca */}
          {exibirMarca && <div className="etiqueta-badge-header">{item.produto.marca || 'GlowPOS'}</div>}

          {/* Nome do Produto */}
          {exibirNome && <div className="etiqueta-prod-name">{item.produto.nome}</div>}

          {/* Área do QR Code + Dados secundários */}
          <div className="etiqueta-body-grid">
            {qrSrc && (
              <div className="etiqueta-qr-wrapper">
                <img src={qrSrc} alt="QR Code" className="etiqueta-qr-img" />
              </div>
            )}

            <div className="etiqueta-info-text-group">
              {/* Tamanho */}
              {exibirTamanho && <span className="etiqueta-tam-text">Tam: <strong>{tamanho}</strong></span>}

              {/* Preço de Venda */}
              {exibirPreco && (
                <span className="etiqueta-price-text">
                  {formatCurrency(item.produto.precoVenda)}
                </span>
              )}

              {/* Código de barras ou Interno */}
              {exibirBarras && (
                <span className="etiqueta-bar-text">
                  Cod: {item.produto.codigoInterno}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Criar array linear com todas as etiquetas baseadas na quantidade solicitada de cada uma
  const compileAllEtiquetas = () => {
    const lista: React.ReactNode[] = [];
    itensEtiquetas.forEach(item => {
      Object.entries(item.quantidades).forEach(([tamanho, quantidade]) => {
        for (let i = 0; i < quantidade; i++) {
          lista.push(renderEtiquetaItem(item, tamanho, i));
        }
      });
    });
    return lista;
  };

  const todasEtiquetas = compileAllEtiquetas();

  return (
    <div className="etiquetas-dashboard-container">
      {/* PAINEL DE CONFIGURAÇÕES E SELEÇÃO */}
      <div className="etiquetas-grid-layout">
        
        {/* COLUNA ESQUERDA - CONFIGURAÇÕES E PRODUTOS */}
        <div className="etiquetas-panel-config">
          
          {/* CARD 1: CONFIGURAÇÃO DE DESIGN */}
          <div className="card glass config-card">
            <div className="config-section-title">
              <Settings2 size={18} className="icon-purple" />
              <h4>Personalizar Etiqueta</h4>
            </div>

            <div className="form-row" style={{ marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Formato</label>
                <select 
                  value={formato} 
                  onChange={(e) => setFormato(e.target.value as any)}
                  className="form-input"
                >
                  <option value="quadrado">Quadrada</option>
                  <option value="retangular_h">Retangular Horizontal</option>
                  <option value="retangular_v">Retangular Vertical</option>
                  <option value="redondo">Redonda</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tamanho (Preset)</label>
                <select 
                  value={tamanhoPreset} 
                  onChange={(e) => setTamanhoPreset(e.target.value as any)}
                  className="form-input"
                >
                  <option value="30x30">Pequeno (30x30mm)</option>
                  <option value="40x40">Médio (40x40mm)</option>
                  <option value="50x50">Grande (50x50mm)</option>
                  <option value="custom">Personalizado (mm)</option>
                </select>
              </div>
            </div>

            {tamanhoPreset === 'custom' && (
              <div className="form-row" style={{ marginTop: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Largura (mm)</label>
                  <input 
                    type="number" 
                    value={larguraMm} 
                    onChange={(e) => setLarguraMm(Number(e.target.value))}
                    className="form-input"
                    min={20}
                    max={100}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Altura (mm)</label>
                  <input 
                    type="number" 
                    value={alturaMm} 
                    onChange={(e) => setAlturaMm(Number(e.target.value))}
                    className="form-input"
                    min={20}
                    max={100}
                  />
                </div>
              </div>
            )}

            {/* Checkboxes de Informação */}
            <div className="checkboxes-layout-group">
              <span className="form-label" style={{ gridColumn: 'span 2', marginBottom: '4px' }}>Dados Visíveis na Etiqueta</span>
              
              <label className="checkbox-custom-item">
                <input 
                  type="checkbox" 
                  checked={exibirNome} 
                  onChange={(e) => setExibirNome(e.target.checked)} 
                />
                <span>Nome do Produto</span>
              </label>

              <label className="checkbox-custom-item">
                <input 
                  type="checkbox" 
                  checked={exibirPreco} 
                  onChange={(e) => setExibirPreco(e.target.checked)} 
                />
                <span>Preço de Venda</span>
              </label>

              <label className="checkbox-custom-item">
                <input 
                  type="checkbox" 
                  checked={exibirTamanho} 
                  onChange={(e) => setExibirTamanho(e.target.checked)} 
                />
                <span>Tamanho (Grade)</span>
              </label>

              <label className="checkbox-custom-item">
                <input 
                  type="checkbox" 
                  checked={exibirBarras} 
                  onChange={(e) => setExibirBarras(e.target.checked)} 
                />
                <span>Código Interno</span>
              </label>

              <label className="checkbox-custom-item" style={{ gridColumn: 'span 2' }}>
                <input 
                  type="checkbox" 
                  checked={exibirMarca} 
                  onChange={(e) => setExibirMarca(e.target.checked)} 
                />
                <span>Marca do Produto (ou Logo Loja)</span>
              </label>
            </div>

            {/* Configurações da Folha */}
            <div className="form-row border-top-divider" style={{ marginTop: '12px', paddingTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Colunas por Linha</label>
                <input 
                  type="number" 
                  value={colunas} 
                  onChange={(e) => setColunas(Math.max(1, Math.min(8, Number(e.target.value))))}
                  className="form-input"
                  min={1}
                  max={8}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gap entre Etiquetas (mm)</label>
                <input 
                  type="number" 
                  value={gapMm} 
                  onChange={(e) => setGapMm(Math.max(0, Number(e.target.value)))}
                  className="form-input"
                  min={0}
                  max={20}
                />
              </div>
            </div>
          </div>

          {/* CARD 2: ADICIONAR PRODUTOS DO CATÁLOGO */}
          <div className="card glass selector-card" style={{ marginTop: '16px' }}>
            <div className="config-section-title">
              <Grid size={18} className="icon-blue" />
              <h4>Selecione os Produtos</h4>
            </div>

            <div className="header-search-container" style={{ margin: '12px 0', maxWidth: '100%' }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Pesquisar por nome, código ou barras..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="global-search-input"
                style={{ padding: '8px 12px 8px 34px', fontSize: '0.85rem' }}
              />
            </div>

            <div className="catalog-fast-selector-list">
              {filteredCatalog.map(p => {
                const selecionado = itensEtiquetas.some(item => item.produto.id === p.id);
                return (
                  <div 
                    key={p.id} 
                    onClick={() => handleToggleProduct(p)}
                    className={`catalog-fast-item ${selecionado ? 'selected' : ''}`}
                  >
                    <input 
                      type="checkbox" 
                      checked={selecionado} 
                      readOnly 
                      className="checkbox-circle" 
                    />
                    <div className="catalog-fast-info">
                      <span className="fast-name">{p.nome}</span>
                      <span className="fast-code">Código: {p.codigoInterno} │ Preço: {formatCurrency(p.precoVenda)}</span>
                    </div>
                  </div>
                );
              })}

              {filteredCatalog.length === 0 && (
                <div className="empty-catalog-alert">Nenhum produto localizado para etiquetas.</div>
              )}
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA - FILA DE IMPRESSÃO E PREVIEW */}
        <div className="etiquetas-panel-preview">
          
          {/* CONTROLE DE FILA E IMPRESSÃO */}
          <div className="card glass preview-controls-card">
            <div className="preview-controls-header">
              <div className="config-section-title">
                <FileCheck size={18} className="icon-green" />
                <h4>Fila de Emissão ({todasEtiquetas.length} Etiquetas)</h4>
              </div>

              <div className="preview-action-buttons">
                {itensEtiquetas.length > 0 && (
                  <>
                    <button 
                      onClick={handleFillWithStock} 
                      className="btn btn-secondary btn-xs"
                      title="Define as quantidades com base no estoque do produto"
                    >
                      <Sparkles size={13} />
                      Usar Estoque Atual
                    </button>
                    <button 
                      onClick={handleClearAll} 
                      className="btn btn-secondary btn-xs danger-hover"
                      title="Limpar fila de impressão"
                    >
                      <Trash2 size={13} />
                      Limpar Fila
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Listagem da Fila de Impressão */}
            <div className="print-queue-list">
              {itensEtiquetas.map(item => (
                <div key={item.produto.id} className="queue-item-card">
                  <div className="queue-item-header">
                    <span className="queue-item-title">{item.produto.nome}</span>
                    <button 
                      onClick={() => handleToggleProduct(item.produto)} 
                      className="queue-remove-btn"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="queue-sizes-grid">
                    {item.produto.tamanhos.map(t => (
                      <div key={t.tamanho} className="queue-size-input-item">
                        <span className="size-label">
                          {t.tamanho} 
                          <small className="size-stock">({t.estoque} un)</small>
                        </span>
                        <input 
                          type="number" 
                          value={item.quantidades[t.tamanho] || 0}
                          onChange={(e) => handleQuantityChange(item.produto.id, t.tamanho, parseInt(e.target.value) || 0)}
                          className="form-input size-input"
                          min={0}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {itensEtiquetas.length === 0 && (
                <div className="empty-queue-view">
                  <RotateCcw size={28} className="empty-queue-icon" />
                  <h5>Fila de impressão vazia</h5>
                  <span>Selecione produtos na coluna ao lado para gerar as etiquetas de QR Code correspondentes.</span>
                </div>
              )}
            </div>

            {todasEtiquetas.length > 0 && (
              <button onClick={handlePrint} className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
                <Printer size={18} />
                Confirmar e Imprimir ({todasEtiquetas.length} Etiquetas)
              </button>
            )}
          </div>

          {/* LIVE PREVIEW DA ETIQUETA */}
          <div className="card glass live-preview-wrapper-card" style={{ marginTop: '16px' }}>
            <div className="config-section-title" style={{ marginBottom: '12px' }}>
              <Eye size={18} className="icon-orange" />
              <h4>Live Preview (Etiqueta de Demonstração)</h4>
            </div>

            <div className="live-preview-viewport">
              {itensEtiquetas.length > 0 ? (
                // Renderiza o preview baseado no primeiro produto selecionado
                renderEtiquetaItem(
                  itensEtiquetas[0], 
                  Object.keys(itensEtiquetas[0].quantidades)[0] || 'M', 
                  9999
                )
              ) : (
                // Renderiza etiqueta placeholder mockada
                <div 
                  className={`etiqueta-layout-card format-${formato} preview-placeholder`} 
                  style={{
                    width: `${larguraMm}mm`,
                    height: `${alturaMm}mm`,
                    borderRadius: formato === 'redondo' ? '50%' : formato === 'quadrado' ? '6px' : '2px',
                  }}
                >
                  <div className="etiqueta-inner-content">
                    {exibirMarca && <div className="etiqueta-badge-header">GlowPOS ERP</div>}
                    {exibirNome && <div className="etiqueta-prod-name">Produto Demonstrativo</div>}
                    <div className="etiqueta-body-grid">
                      <div className="etiqueta-qr-wrapper mock-qr">
                        <div className="qr-box-pattern"></div>
                      </div>
                      <div className="etiqueta-info-text-group">
                        {exibirTamanho && <span className="etiqueta-tam-text">Tam: <strong>Único</strong></span>}
                        {exibirPreco && <span className="etiqueta-price-text">R$ 149,90</span>}
                        {exibirBarras && <span className="etiqueta-bar-text">Cod: 1234</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="preview-disclaimer">
              O tamanho físico impresso corresponderá exatamente a <strong>{larguraMm}x{alturaMm}mm</strong>. Garanta que a sua impressora esteja com a mídia correta de etiquetas.
            </div>
          </div>

        </div>

      </div>

      {/* ELEMENTO INVISÍVEL NO MONITOR - EXIBIDO EXCLUSIVAMENTE NO PDF / IMPRESSÃO VIA @MEDIA PRINT */}
      <div className="folha-impressao-etiquetas" style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${colunas}, min-content)`, 
        gap: `${gapMm}mm`,
        justifyContent: 'center'
      }}>
        {compileAllEtiquetas()}
      </div>

    </div>
  );
};

// Ícone X simples auxiliar pois o Lucide X está como custom na quebra
const X: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
