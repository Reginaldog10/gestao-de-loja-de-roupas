import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { PDV } from './pages/PDV';
import { Crediario } from './pages/Crediario';
import { Pessoas } from './pages/Pessoas';
import { Produtos } from './pages/Produtos';
import { Configuracoes } from './pages/Configuracoes';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

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
    <AppProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
