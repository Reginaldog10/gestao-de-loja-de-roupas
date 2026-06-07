import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, Phone, Globe, Building, Check } from 'lucide-react';
import { supabase, isOfflineMode } from '../../utils/supabaseClient';
import { formatPhone } from '../../utils/formatters';
import { Logo } from '../Logo';
import './login.css';

export const Login: React.FC = () => {
  const { login, signup } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [nomeLoja, setNomeLoja] = useState('');
  const [slugLoja, setSlugLoja] = useState('');
  const [telefone, setTelefone] = useState('');
  const [aceitarTermos, setAceitarTermos] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [diasTeste, setDiasTeste] = useState(30);
  
  useEffect(() => {
    const buscarDiasTeste = async () => {
      if (isOfflineMode) {
        const localVal = localStorage.getItem('saas_dias_teste_padrao');
        if (localVal) setDiasTeste(Number(localVal));
        return;
      }
      try {
        const { data, error } = await supabase
          .from('saas_config')
          .select('dias_teste_padrao')
          .eq('id', 'global')
          .single();
        
        if (!error && data) {
          setDiasTeste(data.dias_teste_padrao);
          localStorage.setItem('saas_dias_teste_padrao', String(data.dias_teste_padrao));
        } else {
          const localVal = localStorage.getItem('saas_dias_teste_padrao');
          if (localVal) setDiasTeste(Number(localVal));
        }
      } catch (err) {
        console.error('Erro ao buscar dias de teste padrão:', err);
        const localVal = localStorage.getItem('saas_dias_teste_padrao');
        if (localVal) setDiasTeste(Number(localVal));
      }
    };
    buscarDiasTeste();
  }, []);
  
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleNomeLojaChange = (val: string) => {
    setNomeLoja(val);
    if (!isSlugManuallyEdited) {
      setSlugLoja(slugify(val));
    }
  };

  const handleSlugLojaChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setSlugLoja(val.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleTelefoneChange = (val: string) => {
    setTelefone(formatPhone(val));
  };
  
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
        if (!nomeLoja.trim()) {
          throw new Error('Por favor, informe o nome da empresa.');
        }
        if (!slugLoja.trim()) {
          throw new Error('Por favor, defina um identificador de URL (slug) para a loja.');
        }
        if (!telefone.trim()) {
          throw new Error('Por favor, informe o telefone de contato.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem. Digite novamente.');
        }
        if (!aceitarTermos) {
          throw new Error('Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
        }

        // Formatar o slug da loja
        const formattedSlug = slugLoja
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '') // remove acentos, espaços e caracteres especiais
          .replace(/-+/g, '-');       // evita múltiplos hífens seguidos

        if (!formattedSlug) {
          throw new Error('O identificador de URL da loja deve conter apenas letras, números e hífens.');
        }

        let lojaId = undefined;

        if (!isOfflineMode) {
          // 1. Criar a nova loja no banco de dados
          const { data: lojaData, error: lojaError } = await supabase
            .from('lojas')
            .insert({
              nome: nomeLoja.trim(),
              slug: formattedSlug,
              status: 'ativo',
              expiracao: new Date(Date.now() + diasTeste * 24 * 60 * 60 * 1000).toISOString(),
              telefone: telefone.trim()
            })
            .select('id')
            .single();

          if (lojaError) {
            if (lojaError.message.includes('slug') || lojaError.code === '23505') {
              throw new Error('O identificador de URL (slug) digitado já está sendo usado por outra loja.');
            }
            throw lojaError;
          }

          lojaId = lojaData.id;
        }

        // 2. Criar o usuário e associá-lo a essa loja com perfil administrador
        const { error } = await signup(email, password, nome, 'administrador', lojaId);
        
        if (error) {
          throw error;
        }
        
        setSuccessMsg('Sua empresa e sua conta de administrador foram criadas com sucesso! Faça login para começar.');
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
        setNomeLoja('');
        setSlugLoja('');
        setTelefone('');
        setAceitarTermos(false);
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
      {/* Lado Esquerdo (60% da Tela) */}
      <div className="login-left-section">
        {/* Elementos Geométricos 3D Flutuantes */}
        <div className="shapes-container">
          {/* Prisma Roxo 1 */}
          <div className="geometric-shape shape-1">
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              <defs>
                <linearGradient id="prism1-face1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#6D28FF" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="prism1-face2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#A21CAF" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="prism1-face3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <path d="M 100 20 L 40 140 L 110 160 Z" fill="url(#prism1-face1)" />
              <path d="M 100 20 L 110 160 L 165 120 Z" fill="url(#prism1-face2)" />
              <path d="M 100 20 L 165 120 L 150 65 Z" fill="url(#prism1-face3)" />
            </svg>
          </div>

          {/* Prisma Azul/Violeta 2 */}
          <div className="geometric-shape shape-2">
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              <defs>
                <linearGradient id="prism2-face1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="prism2-face2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4C1D95" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path d="M 100 30 L 50 130 L 125 145 Z" fill="url(#prism2-face1)" />
              <path d="M 100 30 L 125 145 L 160 95 Z" fill="url(#prism2-face2)" />
            </svg>
          </div>

          {/* Esfera Translúcida (Glass) */}
          <div className="geometric-shape shape-3">
            <svg viewBox="0 0 150 150" width="100%" height="100%">
              <defs>
                <radialGradient id="sphere-grad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
                  <stop offset="40%" stopColor="#D8B4FE" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6D28FF" stopOpacity="0.75" />
                </radialGradient>
              </defs>
              <circle cx="75" cy="75" r="55" fill="url(#sphere-grad)" filter="drop-shadow(0 15px 25px rgba(109, 40, 217, 0.45))" />
            </svg>
          </div>

          {/* Prisma Menor Rosa/Roxo 4 */}
          <div className="geometric-shape shape-4">
            <svg viewBox="0 0 120 120" width="100%" height="100%">
              <defs>
                <linearGradient id="prism3-face1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F472B6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#D946EF" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="prism3-face2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <path d="M 60 15 L 25 80 L 75 90 Z" fill="url(#prism3-face1)" />
              <path d="M 60 15 L 75 90 L 95 60 Z" fill="url(#prism3-face2)" />
            </svg>
          </div>
        </div>

        {/* Efeitos de Glow no fundo esquerdo */}
        <div className="left-bg-glow glow-1"></div>
        <div className="left-bg-glow glow-2"></div>

        {/* Conteúdo Central da Marca */}
        <div className="left-content-wrapper">
          <div className="brand-logo-container">
            <div className="brand-logo-icon" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <Logo size={38} style={{ filter: 'drop-shadow(0 2px 8px rgba(109, 40, 217, 0.3))' }} />
            </div>
            <h1 className="brand-name">GlowPOS <span className="brand-tag">ERP</span></h1>
          </div>
          <p className="brand-slogan">PDV, estoque e crediário em uma única plataforma.</p>
        </div>
      </div>

      {/* Lado Direito (40% da Tela - Card e Formulário) */}
      <div className="login-right-section">
        {/* Marca exibida apenas na visualização mobile */}
        <div className="mobile-brand-header" style={{ flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-logo-icon-sm" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <Logo size={22} />
            </div>
            <h2>GlowPOS <span className="brand-tag-sm">ERP</span></h2>
          </div>
          <p className="mobile-brand-slogan" style={{ fontSize: '0.75rem', color: 'var(--color-gray-muted)', marginTop: '4px', textAlign: 'center', fontWeight: 'normal' }}>
            PDV, estoque e crediário em uma única plataforma.
          </p>
        </div>

        <div className="login-card glass">
          <div className="login-header">
            <h2>{isRegister ? 'Criar Nova Conta' : 'Acesse o Sistema'}</h2>
            <p className="subtitle">
              {isRegister 
                ? 'Preencha os dados abaixo e comece a gerenciar seu negócio' 
                : 'Insira suas credenciais para acessar o painel administrativo'
              }
            </p>
          </div>

          {/* Destaque do Período de Testes */}
          {isRegister && (
            <div className="trial-banner">
              <span className="trial-glow"></span>
              <div className="trial-content">
                <Sparkles size={16} className="trial-icon" />
                <span>Aproveite! Use o sistema completo totalmente grátis por <strong>{diasTeste} dias</strong></span>
              </div>
            </div>
          )}

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
              Cadastrar
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
                As credenciais do Supabase não estão configuradas. Os dados serão salvos localmente.
              </p>
              <div className="offline-demo-tips">
                💡 <strong>Dica de Login:</strong> Use qualquer e-mail contendo <code>admin</code> para testar.
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="auth-form">
            
            {/* CAMPOS ESPECÍFICOS DE CADASTRO */}
            {isRegister && (
              <>
                <div className="form-group">
                  <label htmlFor="nomeLoja">Nome da Empresa</label>
                  <div className="input-icon-wrapper">
                    <Building size={18} className="input-icon" />
                    <input
                      id="nomeLoja"
                      type="text"
                      placeholder="Ex: Glow Modas Ltda"
                      value={nomeLoja}
                      onChange={(e) => handleNomeLojaChange(e.target.value)}
                      required={isRegister}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="slugLoja">Identificador da URL (minha-loja)</label>
                  <div className="input-icon-wrapper">
                    <Globe size={18} className="input-icon" />
                    <input
                      id="slugLoja"
                      type="text"
                      placeholder="Ex: glowmodas"
                      value={slugLoja}
                      onChange={(e) => handleSlugLojaChange(e.target.value)}
                      required={isRegister}
                      disabled={loading}
                    />
                  </div>
                  <span className="input-helper">
                    Apenas letras minúsculas, números e hífens.
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="nome">Nome do Responsável</label>
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

                <div className="form-group">
                  <label htmlFor="telefone">Telefone de Contato</label>
                  <div className="input-icon-wrapper">
                    <Phone size={18} className="input-icon" />
                    <input
                      id="telefone"
                      type="text"
                      placeholder="Ex: (11) 99999-9999"
                      value={telefone}
                      onChange={(e) => handleTelefoneChange(e.target.value)}
                      required={isRegister}
                      disabled={loading}
                    />
                  </div>
                </div>
              </>
            )}

            {/* CAMPOS COMUNS (E-MAIL E SENHA) */}
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <div className="input-icon-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="exemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password">Senha</label>
                {!isRegister && (
                  <a href="#recuperar" className="forgot-password-link">
                    Esqueceu a senha?
                  </a>
                )}
              </div>
              <div className="input-icon-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* CONFIRMAÇÃO DE SENHA NO CADASTRO */}
            {isRegister && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Senha</label>
                <div className="input-icon-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={isRegister}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* CHECKBOX DE TERMOS NO CADASTRO */}
            {isRegister && (
              <div className="terms-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={aceitarTermos}
                    onChange={(e) => setAceitarTermos(e.target.checked)}
                    required
                    disabled={loading}
                  />
                  <span className="checkbox-custom">
                    {aceitarTermos && <Check size={12} className="check-icon" />}
                  </span>
                  <span className="checkbox-text">
                    Aceito os <a href="#termos" className="terms-link">Termos de Serviço</a> e a <a href="#privacidade" className="terms-link">Política de Privacidade</a>.
                  </span>
                </label>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Criar Conta Grátis' : 'Entrar no Sistema'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Links de Rodapé */}
          <div className="card-footer-links">
            {isRegister ? (
              <p>
                Já possui uma conta?{' '}
                <button 
                  type="button" 
                  className="switch-auth-link"
                  onClick={() => {
                    setIsRegister(false);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  Fazer Login
                </button>
              </p>
            ) : (
              <p>
                Ainda não tem conta?{' '}
                <button 
                  type="button" 
                  className="switch-auth-link"
                  onClick={() => {
                    setIsRegister(true);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  Experimente Grátis
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
