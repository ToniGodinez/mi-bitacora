// 🌐 Configuración de API para desarrollo y producción
export const API_CONFIG = {
  // Auto-detectar el ambiente
  API_URL: import.meta.env.VITE_API_URL || 
           (import.meta.env.DEV ? 'http://localhost:3000' : ''),
  
  TMDB_API_KEY: import.meta.env.VITE_TMDB_API_KEY || '',
  
  // Configuración de auto-fill
  ENABLE_AUTO_FILL: import.meta.env.VITE_ENABLE_AUTO_FILL === 'true',
  AUTO_FILL_BATCH_SIZE: Number(import.meta.env.VITE_AUTO_FILL_BATCH_SIZE) || 1,
  
  // Headers para requests
  getHeaders: () => ({
    'Content-Type': 'application/json',
  }),
  
  // Helper para construir URLs de API
  getApiUrl: (endpoint) => {
    const baseUrl = API_CONFIG.API_URL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }
};

export default API_CONFIG;
