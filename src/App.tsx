import { useState } from 'react';
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
import { Loader2, Sparkles } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

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

  // Roteamento reativo simples por abas
  const renderTabContent = () => {
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
