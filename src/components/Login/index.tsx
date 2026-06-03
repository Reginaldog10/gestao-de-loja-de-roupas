import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../context/AuthContext';
import { Mail, Lock, User, Shield, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { isOfflineMode } from '../../utils/supabaseClient';
import './login.css';

export const Login: React.FC = () => {
  const { login, signup } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [perfil, setPerfil] = useState<UserProfile>('vendedor');
  
  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!nome.trim()) {
          throw new Error('Por favor, informe seu nome.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        const { error } = await signup(email, password, nome, perfil);
        if (error) throw error;
        
        setSuccessMsg('Conta criada com sucesso! Você já pode fazer login.');
        setIsRegister(false);
        setPassword('');
      } else {
        const { error } = await login(email, password);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocorreu um erro inesperado. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Elementos Decorativos de Fundo */}
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>
      
      <div className="login-card glass">
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-dot">
              <Sparkles size={20} className="logo-sparkle" />
            </div>
            <h1>GlowPOS</h1>
          </div>
          <p className="subtitle">
            {isRegister 
              ? 'Cadastre-se para gerenciar sua loja de roupas' 
              : 'Faça login para gerenciar sua loja de roupas'
            }
          </p>
        </div>

        {/* Alternador de Abas */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(false);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
          >
            Entrar
          </button>
          <button 
            type="button"
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(true);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
          >
            Criar Conta
          </button>
          <div className={`tab-indicator ${isRegister ? 'right' : 'left'}`}></div>
        </div>

        {/* Mensagens de Feedback */}
        {errorMsg && (
          <div className="auth-message error-message">
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-message success-message">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modo Demo Informações */}
        {isOfflineMode && (
          <div className="offline-demo-alert">
            <div className="offline-demo-title">
              <Sparkles size={16} />
              <span>Modo Demo Local Ativo</span>
            </div>
            <p style={{ margin: 0 }}>
              As credenciais do Supabase não estão configuradas no arquivo <code>.env</code>. Os dados serão salvos localmente no seu navegador.
            </p>
            <div className="offline-demo-tips">
              💡 <strong>Dica de Login:</strong> Use qualquer email contendo <code>admin</code>, <code>caixa</code> ou <code>vendedor</code> (ex: <code>admin@demo.com</code>) para testar os diferentes perfis do sistema.
            </div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="nome">Nome Completo</label>
              <div className="input-icon-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="nome"
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required={isRegister}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <div className="input-icon-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="usuario@loja.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="input-icon-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="perfil">Perfil de Acesso</label>
              <div className="input-icon-wrapper">
                <Shield size={18} className="input-icon" />
                <select
                  id="perfil"
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value as UserProfile)}
                  disabled={loading}
                  className="perfil-select-auth"
                >
                  <option value="vendedor">Vendedor (Vendas & Estoque)</option>
                  <option value="caixa">Caixa (Operador Financeiro)</option>
                  <option value="administrador">Administrador (Acesso Total)</option>
                </select>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-submit btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <span>{isRegister ? 'Cadastrar' : 'Entrar'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
