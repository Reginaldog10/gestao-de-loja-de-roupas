import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, X, ShoppingBag, Search, AlertCircle } from 'lucide-react';
import './ScannerModal.css';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string, mode: 'venda' | 'consulta') => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [scanMode, setScanMode] = useState<'venda' | 'consulta'>('venda');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [scanFeedback, setScanFeedback] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const readerId = 'scanner-video-container';

  // Bipe sonoro sintetizado nativamente via Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime); // Beep clássico de 1000Hz
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volume suave

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.1); // Bipe de 100ms
    } catch (e) {
      console.warn('Erro ao reproduzir áudio nativo:', e);
    }
  };

  // Inicializar e configurar câmeras
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setErrorMessage('');
    setScanFeedback(false);

    // Listar câmeras disponíveis
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          setHasPermission(true);

          // Escolhe preferencialmente a câmera traseira (environment) no celular
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('traseira') || 
            d.label.toLowerCase().includes('environment')
          );
          setActiveCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setErrorMessage('Nenhuma câmera localizada no dispositivo.');
          setHasPermission(false);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro de permissão da câmera:', err);
        setErrorMessage('Permissão de acesso à câmera negada ou erro de inicialização.');
        setHasPermission(false);
        setIsLoading(false);
      });

    return () => {
      // Garantir desligamento total da câmera ao fechar o modal
      stopScanner();
    };
  }, [isOpen]);

  // Iniciar leitura sempre que a câmera ativa mudar
  useEffect(() => {
    if (!isOpen || !activeCameraId || !hasPermission) return;

    startScanner(activeCameraId);
  }, [activeCameraId, isOpen, hasPermission]);

  const startScanner = async (cameraId: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Se houver um scanner anterior rodando, encerra ele antes
      await stopScanner();

      const html5Qrcode = new Html5Qrcode(readerId);
      html5QrcodeRef.current = html5Qrcode;

      const config = {
        fps: 15,
        qrbox: (width: number, height: number) => {
          // Caixa reativa baseada nas dimensões da câmera
          const size = Math.min(width, height) * 0.65;
          return { width: size, height: size };
        },
        aspectRatio: 1.0
      };

      await html5Qrcode.start(
        cameraId,
        config,
        (decodedText) => {
          // Sucesso na leitura
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignora logs de falha na busca em frames (isso é disparado a cada frame não lido)
        }
      );

      setIsLoading(false);
    } catch (err: any) {
      console.error('Erro ao iniciar Html5Qrcode:', err);
      setErrorMessage('Erro ao conectar ao stream da câmera selecionada.');
      setIsLoading(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (err) {
        console.error('Erro ao parar Html5Qrcode:', err);
      }
      html5QrcodeRef.current = null;
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    if (scanFeedback) return; // Evita múltiplas leituras simultâneas no mesmo bipe

    playBeep();
    setScanFeedback(true);

    // Pequeno delay visual para feedback do bipe verde
    setTimeout(() => {
      setScanFeedback(false);
      onScanSuccess(decodedText, scanMode);
    }, 600);
  };

  const toggleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCameraId(cameras[nextIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div className="scanner-modal-overlay">
      <div className="scanner-modal-card glass">
        {/* Header */}
        <div className="scanner-modal-header">
          <div className="scanner-title-group">
            <Camera className="scanner-title-icon" size={20} />
            <h3>Leitor de Câmera (QR / Código de Barras)</h3>
          </div>
          <button onClick={onClose} className="scanner-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Alternador de Modo */}
        <div className="scanner-mode-switch-wrapper">
          <button
            onClick={() => setScanMode('venda')}
            className={`scanner-mode-tab ${scanMode === 'venda' ? 'active venda' : ''}`}
          >
            <ShoppingBag size={16} />
            <span>Vender Produto</span>
          </button>
          <button
            onClick={() => setScanMode('consulta')}
            className={`scanner-mode-tab ${scanMode === 'consulta' ? 'active consulta' : ''}`}
          >
            <Search size={16} />
            <span>Consultar Preço</span>
          </button>
        </div>

        {/* Viewfinder da Câmera */}
        <div className="scanner-viewfinder-container">
          {isLoading && (
            <div className="scanner-status-overlay loading">
              <div className="scanner-spinner"></div>
              <span>Inicializando fluxo da câmera...</span>
            </div>
          )}

          {errorMessage && (
            <div className="scanner-status-overlay error">
              <AlertCircle size={36} className="error-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div 
            id={readerId} 
            className={`scanner-video-frame ${scanFeedback ? 'scan-success-flash' : ''}`}
          >
            {/* Linha laser de scan simulada */}
            {!isLoading && !errorMessage && <div className="scanner-laser-line"></div>}
          </div>
        </div>

        {/* Rodapé e Controles */}
        <div className="scanner-modal-footer">
          {cameras.length > 1 && (
            <button onClick={toggleCamera} className="btn btn-secondary btn-block">
              <RefreshCw size={16} />
              <span>Alternar Câmera ({cameras.length})</span>
            </button>
          )}
          <span className="scanner-instruction-text">
            {scanMode === 'venda' 
              ? 'Aponte para o QR Code de etiqueta ou código de barras para adicionar ao carrinho de compras.'
              : 'Aponte para consultar preço, marca, cor e estoque físico na grade instantaneamente.'}
          </span>
        </div>
      </div>
    </div>
  );
};
