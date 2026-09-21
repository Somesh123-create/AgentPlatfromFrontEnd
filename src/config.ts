export interface AppConfig {
  API_BASE_URL: string
  MCP_API_BASE_URL: string
  AGENT_API_BASE_URL: string
  LLM_API_BASE_URL: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig
  }
}

const config: AppConfig = {
  API_BASE_URL:
    window.__APP_CONFIG__?.API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:8000',

  MCP_API_BASE_URL:
    window.__APP_CONFIG__?.MCP_API_BASE_URL ||
    import.meta.env.VITE_MCP_API_BASE_URL ||
    'http://localhost:8001',

  AGENT_API_BASE_URL:
    window.__APP_CONFIG__?.AGENT_API_BASE_URL ||
    import.meta.env.VITE_AGENT_API_BASE_URL ||
    'http://localhost:8002',

  LLM_API_BASE_URL:
    window.__APP_CONFIG__?.LLM_API_BASE_URL ||
    import.meta.env.VITE_LLM_API_BASE_URL ||
    'http://localhost:8003',
}

export default config