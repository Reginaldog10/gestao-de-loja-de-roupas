import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserProfile = 'administrador' | 'vendedor' | 'caixa';

export interface PermissionGate {
  finance_view: boolean;     // Visualizar lucros, totais financeiros, faturamento
  finance_modify: boolean;   // Receber parcelas, renegociar dívidas, aplicar descontos
  products_view: boolean;    // Visualizar catálogo de produtos
  products_modify: boolean;  // Cadastrar, duplicar ou alterar preços de produtos
  sales_create: boolean;     // Realizar novas vendas no PDV
  settings_view: boolean;    // Configurações, logs e backups do sistema
}

interface AuthContextType {
  currentProfile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  permissions: PermissionGate;
  hasAccess: (permission: keyof PermissionGate) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERMISSION_MAP: Record<UserProfile, PermissionGate> = {
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
  const [currentProfile, setCurrentProfileState] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('erp_user_profile');
    return (saved as UserProfile) || 'administrador';
  });

  const [permissions, setPermissions] = useState<PermissionGate>(
    PERMISSION_MAP[currentProfile]
  );

  useEffect(() => {
    localStorage.setItem('erp_user_profile', currentProfile);
    setPermissions(PERMISSION_MAP[currentProfile]);
  }, [currentProfile]);

  const setProfile = (profile: UserProfile) => {
    setCurrentProfileState(profile);
  };

  const hasAccess = (permission: keyof PermissionGate): boolean => {
    return permissions[permission];
  };

  return (
    <AuthContext.Provider value={{ currentProfile, setProfile, permissions, hasAccess }}>
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
