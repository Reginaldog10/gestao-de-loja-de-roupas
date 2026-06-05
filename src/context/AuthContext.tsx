import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { User } from '@supabase/supabase-js';

export type UserProfile = 'superadmin' | 'administrador' | 'vendedor' | 'caixa';

export interface PermissionGate {
  finance_view: boolean;     // Visualizar lucros, totais financeiros, faturamento
  finance_modify: boolean;   // Receber parcelas, renegociar dívidas, aplicar descontos
  products_view: boolean;    // Visualizar catálogo de produtos
  products_modify: boolean;  // Cadastrar, duplicar ou alterar preços de produtos
  sales_create: boolean;     // Realizar novas vendas no PDV
  settings_view: boolean;    // Configurações, logs e backups do sistema
}

interface AuthStoreInfo {
  nome: string;
  slug: string;
  status: 'ativo' | 'bloqueado' | 'expirado';
  expiracao: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
}

interface AuthContextType {
  user: User | null;
  currentProfile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  permissions: PermissionGate;
  hasAccess: (permission: keyof PermissionGate) => boolean;
  login: (email: string, senha: string) => Promise<{ data: any; error: any }>;
  signup: (email: string, senha: string, nome: string, perfil: UserProfile, lojaId?: string) => Promise<{ data: any; error: any }>;
  logout: () => Promise<void>;
  loading: boolean;
  lojaId: string | null;
  lojaInfo: AuthStoreInfo | null;
  reloadStoreStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERMISSION_MAP: Record<UserProfile, PermissionGate> = {
  superadmin: {
    finance_view: true,
    finance_modify: true,
    products_view: true,
    products_modify: true,
    sales_create: true,
    settings_view: true,
  },
  administrador: {
    finance_view: true,
    finance_modify: true,
    products_view: true,
    products_modify: true,
    sales_create: true,
    settings_view: true,
  },
  caixa: {
    finance_view: false,      // Não vê relatórios consolidados de lucro do negócio
    finance_modify: true,     // Caixa precisa receber parcelas de crediário
    products_view: true,
    products_modify: false,   // Caixa não altera cadastro/preço de produtos
    sales_create: true,       // Caixa realiza vendas
    settings_view: false,     // Caixa não mexe em backups/logs
  },
  vendedor: {
    finance_view: false,
    finance_modify: false,    // Vendedor não recebe parcelas ou renegocia dívidas
    products_view: true,
    products_modify: true,    // Vendedor pode cadastrar produtos na grade
    sales_create: true,       // Vendedor realiza vendas
    settings_view: false,
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentProfile, setCurrentProfileState] = useState<UserProfile>('vendedor');
  const [permissions, setPermissions] = useState<PermissionGate>(PERMISSION_MAP.vendedor);
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [lojaInfo, setLojaInfo] = useState<AuthStoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para buscar o perfil do banco ou fallback para os metadados do usuário
  const fetchUserProfile = async (currentUser: User) => {
    try {
      // 1. Tentar buscar na tabela de perfis incluindo dados da loja relacionada
      const { data, error } = await supabase
        .from('perfis')
        .select(`
          perfil, 
          loja_id,
          lojas (
            nome,
            slug,
            status,
            expiracao,
            cnpj,
            telefone,
            endereco,
            cidade
          )
        `)
        .eq('id', currentUser.id)
        .single();

      if (error || !data) {
        // 2. Fallback defensivo: ler de user_metadata caso o trigger do banco não tenha rodado ainda
        const metadataPerfil = currentUser.user_metadata?.perfil as UserProfile;
        const metadataLojaId = currentUser.user_metadata?.loja_id as string;
        
        setLojaId(metadataLojaId || null);
        setLojaInfo(null);
        
        if (metadataPerfil && PERMISSION_MAP[metadataPerfil]) {
          setCurrentProfileState(metadataPerfil);
          setPermissions(PERMISSION_MAP[metadataPerfil]);
        } else {
          // Padrão seguro
          setCurrentProfileState('vendedor');
          setPermissions(PERMISSION_MAP.vendedor);
        }
      } else {
        const dbPerfil = data.perfil as UserProfile;
        const dbLojaId = data.loja_id as string;
        
        setLojaId(dbLojaId || null);
        setCurrentProfileState(dbPerfil);
        setPermissions(PERMISSION_MAP[dbPerfil]);
        
        if (data.lojas) {
          const loja = data.lojas as any;
          setLojaInfo({
            nome: loja.nome,
            slug: loja.slug,
            status: loja.status,
            expiracao: loja.expiracao,
            cnpj: loja.cnpj,
            telefone: loja.telefone,
            endereco: loja.endereco,
            cidade: loja.cidade
          });
        } else {
          setLojaInfo(null);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
      // Fallback em caso de falha de conexão/tabela inexistente
      setCurrentProfileState('vendedor');
      setPermissions(PERMISSION_MAP.vendedor);
      setLojaId(null);
      setLojaInfo(null);
    }
  };

  const reloadStoreStatus = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user).then(() => setLoading(false));
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Ouvir mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setCurrentProfileState('vendedor');
        setPermissions(PERMISSION_MAP.vendedor);
        setLojaId(null);
        setLojaInfo(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, senha: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    return { data, error };
  };

  const signup = async (email: string, senha: string, nome: string, perfil: UserProfile, lojaId?: string) => {
    // Criamos o usuário passando dados adicionais em user_metadata
    // Esses dados são lidos pelo trigger do banco de dados do Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
          perfil,
          loja_id: lojaId,
        },
      },
    });
    return { data, error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // Mantido para compatibilidade e troca rápida se o usuário for administrador e quiser simular,
  // ou se ele atualizar o perfil nas configurações.
  const setProfile = async (profile: UserProfile) => {
    setCurrentProfileState(profile);
    setPermissions(PERMISSION_MAP[profile]);
    
    // Se o usuário estiver logado, tenta sincronizar a alteração de perfil no banco de dados
    if (user) {
      try {
        await supabase
          .from('perfis')
          .update({ perfil: profile })
          .eq('id', user.id);
      } catch (err) {
        console.error('Erro ao atualizar perfil no banco:', err);
      }
    }
  };

  const hasAccess = (permission: keyof PermissionGate): boolean => {
    return permissions[permission];
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      currentProfile, 
      setProfile, 
      permissions, 
      hasAccess, 
      login, 
      signup, 
      logout,
      loading,
      lojaId,
      lojaInfo,
      reloadStoreStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
