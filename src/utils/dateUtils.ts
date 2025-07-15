import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Lista de timezones do Brasil e principais timezones mundiais
export const TIMEZONE_OPTIONS = [
  // Brasil
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT/BRST)' },
  { value: 'America/Manaus', label: 'Manaus (AMT)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (ACT)' },
  { value: 'America/Recife', label: 'Recife (BRT)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (BRT)' },
  { value: 'America/Belem', label: 'Belém (BRT)' },
  { value: 'America/Campo_Grande', label: 'Campo Grande (AMT/AMST)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (AMT/AMST)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (AMT)' },
  { value: 'America/Boa_Vista', label: 'Boa Vista (AMT)' },
  { value: 'America/Maceio', label: 'Maceió (BRT)' },
  { value: 'America/Bahia', label: 'Salvador (BRT)' },
  
  // América do Norte
  { value: 'America/New_York', label: 'Nova York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
  { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)' },
  { value: 'America/Mexico_City', label: 'Cidade do México (CST/CDT)' },
  
  // Europa
  { value: 'Europe/London', label: 'Londres (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlim (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Roma (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { value: 'Europe/Zurich', label: 'Zurique (CET/CEST)' },
  { value: 'Europe/Vienna', label: 'Viena (CET/CEST)' },
  { value: 'Europe/Brussels', label: 'Bruxelas (CET/CEST)' },
  { value: 'Europe/Prague', label: 'Praga (CET/CEST)' },
  { value: 'Europe/Stockholm', label: 'Estocolmo (CET/CEST)' },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET/EEST)' },
  { value: 'Europe/Warsaw', label: 'Varsóvia (CET/CEST)' },
  { value: 'Europe/Budapest', label: 'Budapeste (CET/CEST)' },
  { value: 'Europe/Bucharest', label: 'Bucareste (EET/EEST)' },
  { value: 'Europe/Athens', label: 'Atenas (EET/EEST)' },
  { value: 'Europe/Istanbul', label: 'Istambul (TRT)' },
  { value: 'Europe/Moscow', label: 'Moscou (MSK)' },
  
  // Ásia
  { value: 'Asia/Tokyo', label: 'Tóquio (JST)' },
  { value: 'Asia/Seoul', label: 'Seul (KST)' },
  { value: 'Asia/Shanghai', label: 'Xangai (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapura (SGT)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT)' },
  { value: 'Asia/Jakarta', label: 'Jacarta (WIB)' },
  { value: 'Asia/Manila', label: 'Manila (PHT)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (ICT)' },
  { value: 'Asia/Kolkata', label: 'Mumbai/Nova Delhi (IST)' },
  { value: 'Asia/Karachi', label: 'Karachi (PKT)' },
  { value: 'Asia/Dhaka', label: 'Dhaka (BST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Tehran', label: 'Teerã (IRST)' },
  { value: 'Asia/Jerusalem', label: 'Jerusalém (IST/IDT)' },
  { value: 'Asia/Riyadh', label: 'Riad (AST)' },
  
  // África
  { value: 'Africa/Cairo', label: 'Cairo (EET/EEST)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
  { value: 'Africa/Johannesburg', label: 'Joanesburgo (SAST)' },
  { value: 'Africa/Casablanca', label: 'Casablanca (WET/WEST)' },
  
  // Oceania
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
];

/**
 * Formata uma data considerando o fuso horário do usuário
 */
export const formatDateInTimezone = (
  date: string | Date, 
  formatPattern: string = 'dd/MM/yyyy', 
  timezone: string = 'America/Sao_Paulo'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    // Converter para o timezone do usuário
    const dateInTimezone = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(dateObj);

    // Reconstruir a data no timezone correto
    const year = parseInt(dateInTimezone.find(part => part.type === 'year')?.value || '0');
    const month = parseInt(dateInTimezone.find(part => part.type === 'month')?.value || '0') - 1;
    const day = parseInt(dateInTimezone.find(part => part.type === 'day')?.value || '0');
    const hour = parseInt(dateInTimezone.find(part => part.type === 'hour')?.value || '0');
    const minute = parseInt(dateInTimezone.find(part => part.type === 'minute')?.value || '0');
    const second = parseInt(dateInTimezone.find(part => part.type === 'second')?.value || '0');

    const adjustedDate = new Date(year, month, day, hour, minute, second);
    
    return format(adjustedDate, formatPattern, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return format(new Date(), formatPattern, { locale: ptBR });
  }
};

/**
 * Formata uma data e hora considerando o fuso horário do usuário
 */
export const formatDateTimeInTimezone = (
  date: string | Date, 
  timezone: string = 'America/Sao_Paulo'
): string => {
  return formatDateInTimezone(date, 'dd/MM/yyyy HH:mm', timezone);
};

/**
 * Formata apenas a data considerando o fuso horário do usuário
 */
export const formatDateOnlyInTimezone = (
  date: string | Date, 
  timezone: string = 'America/Sao_Paulo'
): string => {
  return formatDateInTimezone(date, 'dd/MM/yyyy', timezone);
};

/**
 * Formata apenas a hora considerando o fuso horário do usuário
 */
export const formatTimeInTimezone = (
  date: string | Date, 
  timezone: string = 'America/Sao_Paulo'
): string => {
  return formatDateInTimezone(date, 'HH:mm', timezone);
};

/**
 * Converte uma data para o timezone do usuário retornando um objeto Date
 */
export const convertToTimezone = (
  date: string | Date, 
  timezone: string = 'America/Sao_Paulo'
): Date => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    // Converter para o timezone do usuário
    const dateInTimezone = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(dateObj);

    // Reconstruir a data no timezone correto
    const year = parseInt(dateInTimezone.find(part => part.type === 'year')?.value || '0');
    const month = parseInt(dateInTimezone.find(part => part.type === 'month')?.value || '0') - 1;
    const day = parseInt(dateInTimezone.find(part => part.type === 'day')?.value || '0');
    const hour = parseInt(dateInTimezone.find(part => part.type === 'hour')?.value || '0');
    const minute = parseInt(dateInTimezone.find(part => part.type === 'minute')?.value || '0');
    const second = parseInt(dateInTimezone.find(part => part.type === 'second')?.value || '0');

    return new Date(year, month, day, hour, minute, second);
  } catch (error) {
    console.error('Erro ao converter data para timezone:', error);
    return new Date();
  }
};

/**
 * Obtém informações sobre o timezone
 */
export const getTimezoneInfo = (timezone: string = 'America/Sao_Paulo') => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    
    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value;
    
    // Calcular offset
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const timezoneDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMinutes = (timezoneDate.getTime() - utcDate.getTime()) / (1000 * 60);
    const offsetHours = offsetMinutes / 60;
    
    return {
      name: timeZoneName,
      offset: offsetHours,
      offsetString: `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`
    };
  } catch (error) {
    console.error('Erro ao obter informações do timezone:', error);
    return {
      name: 'BRT',
      offset: -3,
      offsetString: 'GMT-3'
    };
  }
};