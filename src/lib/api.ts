const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const mcpApiBaseUrl = import.meta.env.VITE_MCP_API_BASE_URL || 'http://localhost:8001'

type ApiError = { detail?: string }

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({} as ApiError)) as ApiError
    throw new Error(body.detail || `Request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function authenticatedRequest<T>(path: string, token: string, options: RequestInit = {}) {
  return request<T>(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  })
}

async function mcpRequest<T>(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${mcpApiBaseUrl}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers } })
  if (!response.ok) { const body = await response.json().catch(() => ({} as ApiError)) as ApiError; throw new Error(body.detail || `MCP request failed with status ${response.status}`) }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export type AuthToken = { access_token: string; token_type: string }
export type User = { id: number; name: string; email: string; role: string; created_at: string }
export type Mcp = { id: number; owner_id: number; name: string; description: string | null; mcp_type: 'LOCAL' | 'REMOTE'; protocol: 'STDIO' | 'SSE' | 'STREAMABLE_HTTP'; access: 'PRIVATE' | 'PUBLIC'; status: 'DRAFT' | 'ACTIVE' | 'DISABLED'; created_at: string; updated_at: string }
export type McpVersion = { id: number; mcp_id: number; version: number; source_kind: string; source_digest: string; source_reference: string | null; manifest: Record<string, unknown>; created_at: string; updated_at: string }
export type McpBuild = { id: number; mcp_id: number; version_id: number; status: 'QUEUED' | 'BUILDING' | 'SUCCEEDED' | 'FAILED'; image_ref: string | null; logs: string; error: string | null; created_at: string; updated_at: string }
export type McpDeployment = { id: number; mcp_id: number; version_id: number; build_id: number; status: 'STARTING' | 'RUNNING' | 'STOPPED' | 'FAILED'; container_id: string | null; image_ref: string; logs: string; error: string | null; created_at: string; updated_at: string }

export function login(email: string, password: string) {
  const form = new URLSearchParams({ username: email, password })
  return request<AuthToken>('/auth/login', { method: 'POST', body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
}

export function register(name: string, email: string, password: string) {
  return request<User>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
}

export function getCurrentUser(token: string) {
  return authenticatedRequest<User>('/users/me', token)
}

export function updateProfile(token: string, updates: { name: string; email: string }) {
  return authenticatedRequest<User>('/users/me', token, { method: 'PATCH', body: JSON.stringify(updates) })
}

export function updatePassword(token: string, currentPassword: string, newPassword: string) {
  return authenticatedRequest<User>('/users/me/password', token, { method: 'PATCH', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) })
}

export function listMcps(token: string) { return mcpRequest<Mcp[]>('/mcps', token) }
export function createMcp(token: string, data: Pick<Mcp, 'name' | 'description' | 'mcp_type' | 'protocol' | 'access'>) { return mcpRequest<Mcp>('/mcps', token, { method: 'POST', body: JSON.stringify(data) }) }
export function getMcp(token: string, id: number) { return mcpRequest<Mcp>(`/mcps/${id}`, token) }
export function updateMcp(token: string, id: number, data: Partial<Pick<Mcp, 'name' | 'description' | 'access' | 'status'>>) { return mcpRequest<Mcp>(`/mcps/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }) }
export function deleteMcp(token: string, id: number) { return mcpRequest<void>(`/mcps/${id}`, token, { method: 'DELETE' }) }
export function listMcpVersions(token: string, id: number) { return mcpRequest<McpVersion[]>(`/mcps/${id}/versions`, token) }
export function buildMcpVersion(token: string, id: number, version: number) { return mcpRequest<McpBuild>(`/mcps/${id}/versions/${version}/build`, token, { method: 'POST' }) }
export function listMcpBuilds(token: string, id: number) { return mcpRequest<McpBuild[]>(`/mcps/${id}/builds`, token) }
export function deployMcpVersion(token: string, id: number, version: number) { return mcpRequest<McpDeployment>(`/mcps/${id}/versions/${version}/deploy`, token, { method: 'POST' }) }
export function listMcpDeployments(token: string, id: number) { return mcpRequest<McpDeployment[]>(`/mcps/${id}/deployments`, token) }
export function undeployMcp(token: string, id: number, deploymentId: number) { return mcpRequest<McpDeployment>(`/mcps/${id}/deployments/${deploymentId}/undeploy`, token, { method: 'POST' }) }
export function restartMcp(token: string, id: number, deploymentId: number) { return mcpRequest<McpDeployment>(`/mcps/${id}/deployments/${deploymentId}/restart`, token, { method: 'POST' }) }
export function getMcpVersion(token: string, id: number, version: number) { return mcpRequest<McpVersion>(`/mcps/${id}/versions/${version}`, token) }
export function createMcpVersion(token: string, id: number, data: { source_kind: 'ZIP' | 'GIT'; source_digest: string; source_reference?: string; manifest: Record<string, unknown> }) { return mcpRequest<McpVersion>(`/mcps/${id}/versions`, token, { method: 'POST', body: JSON.stringify(data) }) }
export function invokeTool(token: string, mcpId: number, versionId: number, toolName: string, toolInput: object) { return mcpRequest<{ output: string | null; error: string | null; status: string }>(`/mcps/${mcpId}/${versionId}/invoke-tool`, token, { method: 'POST', body: JSON.stringify({ tool_name: toolName, tool_input: toolInput }) }) }
export function listTools(token: string, mcpId: number, versionId: number) { return mcpRequest<{ tools: any[]; error: string | null }>(`/mcps/${mcpId}/${versionId}/list-tools`, token, { method: 'POST' }) }
export async function uploadMcpVersion(token: string, id: number, archive: File) {
  const body = new FormData(); body.append('archive', archive)
  const response = await fetch(`${mcpApiBaseUrl}/mcps/${id}/versions/upload`, { method: 'POST', body, headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) { const error = await response.json().catch(() => ({} as ApiError)) as ApiError; throw new Error(error.detail || `MCP upload failed with status ${response.status}`) }
  return response.json() as Promise<McpVersion>
}
