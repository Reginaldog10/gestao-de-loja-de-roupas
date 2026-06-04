import { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { PDV } from './pages/PDV';
import { Crediario } from './pages/Crediario';
import { Pessoas } from './pages/Pessoas';
import { Fornecedores } from './pages/Fornecedores';
import { Produtos } from './pages/Produtos';
import { Configuracoes } from './pages/Configuracoes';
import { Login } from './components/Login';
import { SuperDashboard } from './pages/SuperAdmin/SuperDashboard';
import { SuperLojas } from './pages/SuperAdmin/SuperLojas';
import { SuperPlanos } from './pages/SuperAdmin/SuperPlanos';
import { supabase } from './utils/supabaseClient';
import { Loader2, Sparkles, ShieldAlert, Key, LogOut } from 'lucide-react';

function LicencaExpirada() {
  const { logout, lojaInfo, reloadStoreStatus, lojaId } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAtivar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !lojaId) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.rpc('resgatar_token_ativacao', {
        p_token: tokenInput.trim(),
        p_loja_id: lojaId
      });

      if (error) throw error;

      setSuccessMsg('Token resgatado com sucesso! Sua licença foi ativada.');
      setTokenInput('');
      
      // Recarregar os dados da loja no AuthContext
      await reloadStoreStatus();
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao resgatar token. Verifique se o código está correto e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#090a0f',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      padding: '20px'
    }}>
      <div className="login-card glass" style={{ maxWidth: '450px', width: '100%', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)'
          }}>
            <ShieldAlert size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0' }}>Licença Bloqueada ou Expirada</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            A loja <strong>{lojaInfo?.nome}</strong> está com o acesso suspenso no momento.
          </p>
        </div>

        {errorMsg && <div className="auth-message error-message" style={{ marginBottom: '16px' }}>{errorMsg}</div>}
        {successMsg && <div className="auth-message success-message" style={{ marginBottom: '16px' }}>{successMsg}</div>}

        <form onSubmit={handleAtivar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label htmlFor="token">Token de Ativação</label>
            <div className="input-icon-wrapper">
              <Key size={18} className="input-icon text-muted" />
              <input
                id="token"
                type="text"
                placeholder="Ex: GLOW-ACT-30D-XXXX-XXXX"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', display: 'block' }}>
              Insira o token de licença para estender ou liberar o acesso de sua loja.
            </span>
          </div>

          <button type="submit" className="btn-submit btn-primary" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={18} /> : <span>Ativar Licença</span>}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
          <button onClick={logout} className="btn btn-secondary btn-xs" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={14} /> Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading, currentProfile, lojaInfo } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  // Sincronizar aba ativa ao mudar de perfil (Lojista <-> Superadmin)
  useEffect(() => {
    if (user) {
      if (currentProfile === 'superadmin') {
        setActiveTab('super_dashboard');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [currentProfile, user]);

  // Exibir tela de loading enquanto verifica a sessão no Supabase
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#090a0f',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        gap: '1rem'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)'
        }}>
          <Sparkles size={24} color="#fff" />
        </div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>GlowPOS</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
          <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Verificando conexão com o servidor...</span>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Se não estiver autenticado, renderiza a tela de login
  if (!user) {
    return <Login />;
  }

  // Se a loja estiver bloqueada ou com licença expirada, bloqueia o acesso
  const isLojaBloqueada = currentProfile !== 'superadmin' && (
    lojaInfo?.status === 'bloqueado' || 
    lojaInfo?.status === 'expirado' ||
    (lojaInfo?.expiracao && new Date(lojaInfo.expiracao) < new Date())
  );

  if (isLojaBloqueada) {
    return <LicencaExpirada />;
  }

  // Roteamento reativo simples por abas
  const renderTabContent = () => {
    // Rotas do Super Admin
    if (currentProfile === 'superadmin') {
      switch (activeTab) {
        case 'super_dashboard':
          return <SuperDashboard />;
        case 'super_lojas':
          return <SuperLojas />;
        case 'super_planos':
          return <SuperPlanos />;
        default:
          return <SuperDashboard />;
      }
    }

    // Rotas do Lojista
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'pdv':
        return <PDV />;
      case 'crediario':
        return <Crediario filterText={searchTerm} />;
      case 'pessoas':
        return <Pessoas filterText={searchTerm} />;
      case 'fornecedores':
        return <Fornecedores filterText={searchTerm} />;
      case 'produtos':
        return <Produtos filterText={searchTerm} />;
      case 'configuracoes':
        return <Configuracoes />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
    >
      {renderTabContent()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
