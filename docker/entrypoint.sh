#!/bin/sh

set -eu

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL:-http://localhost:8000}",
  MCP_API_BASE_URL: "${MCP_API_BASE_URL:-http://localhost:8001}",
  AGENT_API_BASE_URL: "${AGENT_API_BASE_URL:-http://localhost:8002}",
  LLM_API_BASE_URL: "${LLM_API_BASE_URL:-http://localhost:8003}"
};
EOF

exec nginx -g "daemon off;"