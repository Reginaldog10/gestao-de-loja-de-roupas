import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { supabase, isOfflineMode } from '../../utils/supabaseClient';
import './login.css';

export const Login: React.FC = () => {
  const { login, signup } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [nomeLoja, setNomeLoja] = useState('');
  const [slugLoja, setSlugLoja] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  
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
          throw new Error('Por favor, informe o nome da loja.');
        }
        if (!slugLoja.trim()) {
          throw new Error('Por favor, defina um identificador de URL (slug) para a loja.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
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
          // Buscar período de testes padrão
          let diasTeste = 30;
          try {
            const { data: configData, error: configError } = await supabase
              .from('saas_config')
              .select('dias_teste_padrao')
              .eq('id', 'global')
              .single();
            
            if (!configError && configData) {
              diasTeste = configData.dias_teste_padrao;
            }
          } catch (e) {
            console.error('Erro ao buscar saas_config, utilizando fallback de 30 dias:', e);
          }

          // 1. Criar a nova loja no banco de dados
          const { data: lojaData, error: lojaError } = await supabase
            .from('lojas')
            .insert({
              nome: nomeLoja.trim(),
              slug: formattedSlug,
              status: 'ativo',
              expiracao: new Date(Date.now() + diasTeste * 24 * 60 * 60 * 1000).toISOString()
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
          // Se der erro no cadastro do usuário e a loja foi criada, podemos opcionalmente deletá-la,
          // mas vamos apenas exibir o erro para que ele tente cadastrar novamente.
          throw error;
        }
        
        setSuccessMsg('Sua loja e sua conta de administrador foram criadas com sucesso! Faça login para começar.');
        setIsRegister(false);
        setPassword('');
        setNomeLoja('');
        setSlugLoja('');
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
            <>
              <div className="form-group">
                <label htmlFor="nomeLoja">Nome da Loja</label>
                <div className="input-icon-wrapper">
                  <Sparkles size={18} className="input-icon text-muted" />
                  <input
                    id="nomeLoja"
                    type="text"
                    placeholder="Ex: Glow Modas Filial Centro"
                    value={nomeLoja}
                    onChange={(e) => handleNomeLojaChange(e.target.value)}
                    required={isRegister}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="slugLoja">Identificador da URL (Ex: minha-loja)</label>
                <div className="input-icon-wrapper">
                  <Sparkles size={18} className="input-icon text-muted" />
                  <input
                    id="slugLoja"
                    type="text"
                    placeholder="Ex: glowmodas-centro"
                    value={slugLoja}
                    onChange={(e) => handleSlugLojaChange(e.target.value)}
                    required={isRegister}
                    disabled={loading}
                  />
                </div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                  Apenas letras minúsculas, números e hífens.
                </span>
              </div>
            </>
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
