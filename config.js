/* CORYTAX V15 - configuração para produção serverless gratuita.
   Se frontend e funções estiverem no mesmo projeto Vercel, mantenha as rotas relativas.
   Se usar backend separado, troque as URLs abaixo para o domínio público correspondente.
*/
window.CORYTAX_TRIBUTOS_API_PROXY_BASE = window.CORYTAX_TRIBUTOS_API_PROXY_BASE || '/api/tributos';
window.CORYTAX_IBGE_CNAE_API_PROXY_BASE = window.CORYTAX_IBGE_CNAE_API_PROXY_BASE || '/api/ibge';
window.CORYTAX_LEAD_API_URL = window.CORYTAX_LEAD_API_URL || '/api/lead';
window.CORYTAX_AMBIENTE = window.CORYTAX_AMBIENTE || 'producao-serverless';
