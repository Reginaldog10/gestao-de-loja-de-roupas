import { createClient } from '@supabase/supabase-js';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = 
  supabaseUrl && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey && 
  !supabaseAnonKey.includes('sua-chave-anonima') &&
  !supabaseUrl.includes('seu-projeto');

// Interfaces de Tipo Auxiliares para o TypeScript compilar sem erros de implicit any
export interface MockQueryBuilder {
  select: (columns?: string) => MockQueryBuilder;
  order: (column: string, options?: any) => MockQueryBuilder;
  insert: (values: any) => MockQueryBuilder;
  update: (values: any) => MockQueryBuilder;
  upsert: (values: any) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (column: string, value: any) => MockQueryBuilder;
  neq: (column: string, value: any) => MockQueryBuilder;
  single: () => MockQueryBuilder;
  then: (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => Promise<any>;
}

export interface MockSupabaseClient {
  auth: {
    getSession: () => Promise<{ data: { session: Session | null }; error: any }>;
    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void
    ) => { data: { subscription: { unsubscribe: () => void } }; error: any };
    signInWithPassword: (credentials: any) => Promise<{ data: { session: Session | null; user: User | null }; error: any }>;
    signUp: (credentials: any) => Promise<{ data: { user: User | null }; error: any }>;
    signOut: () => Promise<{ error: any }>;
  };
  from: (tableName: string) => MockQueryBuilder;
  rpc: (fnName: string, params?: any) => Promise<{ data: any; error: any }>;
}

export let supabase: MockSupabaseClient;
export const isOfflineMode = !isConfigured;

if (isConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey) as any;
  } catch (err) {
    console.error('[Supabase Client] Falha ao inicializar o cliente Supabase real:', err);
    setupMock();
  }
} else {
  setupMock();
}

function setupMock() {
  console.warn('[Supabase Client] Credenciais não configuradas ou inválidas no arquivo .env.');
  console.warn('[Supabase Client] Iniciando aplicativo no modo de demonstração local (LocalStorage).');

  // Listeners para emular onAuthStateChange
  const authListeners = new Set<(event: AuthChangeEvent, session: Session | null) => void>();

  const getStoredSession = (): Session | null => {
    try {
      const stored = localStorage.getItem('erp_demo_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const setStoredSession = (session: Session | null) => {
    if (session) {
      localStorage.setItem('erp_demo_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('erp_demo_session');
    }
  };

  // Mock do cliente Supabase
  supabase = {
    auth: {
      getSession: async () => {
        const session = getStoredSession();
        return { data: { session }, error: null };
      },
      onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        authListeners.add(callback);
        const session = getStoredSession();
        // Disparar imediatamente com o estado atual
        setTimeout(() => {
          callback('INITIAL_SESSION' as AuthChangeEvent, session);
        }, 0);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners.delete(callback);
              }
            }
          },
          error: null
        };
      },
      signInWithPassword: async ({ email, password }: any) => {
        // Silenciar aviso de variável não lida
        if (password) { /* noop */ }
        
        // Simular login bem-sucedido
        const emailLower = email.toLowerCase();
        let perfil = 'vendedor';
        if (emailLower.includes('admin')) {
          perfil = 'administrador';
        } else if (emailLower.includes('caixa')) {
          perfil = 'caixa';
        }

        const fakeSession: Session = {
          user: {
            id: 'usr_demo_' + Math.random().toString(36).substr(2, 9),
            email: email,
            user_metadata: {
              nome: email.split('@')[0].replace(/^\w/, (c: string) => c.toUpperCase()),
              perfil: perfil
            },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            factors: []
          } as any,
          access_token: 'fake_jwt_token_' + Math.random().toString(36).substr(2, 9),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake_refresh_token_' + Math.random().toString(36).substr(2, 9)
        };

        setStoredSession(fakeSession);
        
        // Notificar listeners
        authListeners.forEach(cb => cb('SIGNED_IN', fakeSession));

        return { data: { session: fakeSession, user: fakeSession.user }, error: null };
      },
      signUp: async ({ email, password, options }: any) => {
        // Silenciar aviso de variáveis não lidas
        if (password || options) { /* noop */ }

        const perfil = options?.data?.perfil || 'vendedor';
        const nome = options?.data?.nome || email.split('@')[0];

        const fakeUser: User = {
          id: 'usr_demo_' + Math.random().toString(36).substr(2, 9),
          email,
          user_metadata: {
            nome,
            perfil
          },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {}
        } as any;

        return { data: { user: fakeUser }, error: null };
      },
      signOut: async () => {
        setStoredSession(null);
        authListeners.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      }
    },
    // Query builder mockado encadeável
    from: (tableName: string) => {
      const errorData = { 
        code: '42P01', 
        message: `Offline mode table ${tableName}. Using localStorage fallback.` 
      };

      const chain: MockQueryBuilder = {
        select: () => chain,
        order: () => chain,
        insert: () => chain,
        update: () => chain,
        upsert: () => chain,
        delete: () => chain,
        eq: () => chain,
        neq: () => chain,
        single: () => chain,
        then: (onfulfilled?: (value: any) => any) => {
          return Promise.resolve({ data: null, error: errorData }).then(onfulfilled);
        }
      };

      return chain;
    },
    // Mock do método RPC
    rpc: async (fnName: string, params?: any) => {
      console.log(`[Supabase Mock] RPC ${fnName} chamada com params:`, params);
      return { data: true, error: null };
    }
  };
}
