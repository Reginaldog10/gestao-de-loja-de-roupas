import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  CreditCard, 
  Users, 
  Package, 
  Settings, 
  Sun, 
  Moon, 
  ShieldAlert,
  Search
} from 'lucide-react';
import './layout.css';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab,
  searchTerm,
  setSearchTerm
}) => {
  const { currentProfile, setProfile } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('erp_theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      return 'dark';
    }
    document.documentElement.setAttribute('data-theme', 'light');
    return 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('erp_theme', nextTheme);
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'pdv', label: 'PDV', icon: ShoppingBag },
    { id: 'crediario', label: 'Crediário', icon: CreditCard },
    { id: 'pessoas', label: 'Contatos', icon: Users },
    { id: 'produtos', label: 'Produtos', icon: Package },
    { id: 'configuracoes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="app-container">
      {/* SIDEBAR - DESKTOP ONLY */}
      <aside className="desktop-sidebar glass">
        <div className="sidebar-brand">
          <div className="brand-dot"></div>
          <h2>GlowPOS</h2>
          <span className="brand-badge">ERP</span>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-badge-container">
            <ShieldAlert size={16} className="profile-icon" />
            <select
              value={currentProfile}
              onChange={(e) => setProfile(e.target.value as UserProfile)}
              className="profile-select"
            >
              <option value="administrador">Admin (Acesso Total)</option>
              <option value="caixa">Caixa (Operador)</option>
              <option value="vendedor">Vendedor (Estoque/Venda)</option>
            </select>
          </div>
        </div>
      </aside>

      {/* TOP HEADER */}
      <div className="content-wrapper">
        <header className="top-header glass">
          <div className="header-search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Busca rápida global em todo o sistema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="global-search-input"
            />
          </div>

          <div className="header-actions">
            {/* Tema Toggle */}
            <button onClick={toggleTheme} className="theme-toggle-btn btn-secondary btn-icon" title="Alternar tema">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Profile Dropdown para Mobile */}
            <div className="mobile-profile-container">
              <select
                value={currentProfile}
                onChange={(e) => setProfile(e.target.value as UserProfile)}
                className="profile-select-mobile"
              >
                <option value="administrador">Admin</option>
                <option value="caixa">Caixa</option>
                <option value="vendedor">Vend.</option>
              </select>
            </div>
          </div>
        </header>

        {/* MAIN ROUTE VIEW */}
        <main className="main-content">
          {children}
        </main>

        {/* BOTTOM NAV BAR - MOBILE ONLY */}
        <nav className="mobile-nav-bar glass">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <div className="nav-icon-container">
                  <Icon size={22} />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
