/* Utilitários de Formatação */

/**
 * Formata um número para o formato de moeda brasileiro (R$)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formata uma data no formato ISO (YYYY-MM-DD ou Date) para formato legível brasileiro (DD/MM/YYYY)
 */
export const formatDate = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  // Evitar problemas de timezone ao converter strings YYYY-MM-DD
  if (typeof dateInput === 'string' && dateInput.includes('-') && dateInput.length <= 10) {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return date.toLocaleDateString('pt-BR');
};

/**
 * Formata um CPF (###.###.###-##)
 */
export const formatCPF = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
};

/**
 * Formata um CNPJ (##.###.###/####-##)
 */
export const formatCNPJ = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
};

/**
 * Formata um número de telefone/WhatsApp (##) #####-####
 */
export const formatPhone = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
};

/**
 * Remove formatações e retorna apenas os dígitos de uma string
 */
export const stripNonDigits = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Gera um ID único aleatório simples
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11).toUpperCase();
};

/**
 * Calcula a diferença em dias entre duas datas
 */
export const getDaysDifference = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  // Zera as horas para comparar apenas os dias
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};
