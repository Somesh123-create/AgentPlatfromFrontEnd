import config from '../config'

const apiBaseUrl = config.API_BASE_URL
const mcpApiBaseUrl = config.MCP_API_BASE_URL
const agentApiBaseUrl = config.AGENT_API_BASE_URL
const llmApiBaseUrl = config.LLM_API_BASE_URL

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
  if (response.status === 204) return undefined as T
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

async function serviceRequest<T>(baseUrl: string, path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({} as ApiError)) as ApiError
    throw new Error(body.detail || `Request failed with status ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export type AuthToken = { access_token: string; token_type: string }
export type User = { id: number; name: string; email: string; role: string; created_at: string }
export type Mcp = { id: number; owner_id: number; name: string; description: string | null; mcp_type: 'LOCAL' | 'REMOTE'; protocol: 'STDIO' | 'SSE' | 'STREAMABLE_HTTP'; access: 'PRIVATE' | 'PUBLIC'; status: 'DRAFT' | 'ACTIVE' | 'DISABLED'; created_at: string; updated_at: string }
export type McpVersion = { id: number; mcp_id: number; version: number; source_kind: string; source_digest: string; source_reference: string | null; manifest: Record<string, unknown>; created_at: string; updated_at: string }
export type McpBuild = { id: number; mcp_id: number; version_id: number; version: number; status: 'QUEUED' | 'BUILDING' | 'SUCCEEDED' | 'FAILED'; image_ref: string | null; logs: string; error: string | null; created_at: string; updated_at: string }
export type McpProject = { version_id: number; revision: number; files: Record<string, string> }
export type McpRuntimeLog = { time: string; message: string; level: string }
export type McpRuntimeLogs = { mcp_id: number; version_id: number; version: number; entries: McpRuntimeLog[]; truncated: boolean }
export type AgentFramework = 'GOOGLE_ADK' | 'LANGGRAPH'
export type AgentDraftStatus = 'DRAFT' | 'GENERATED' | 'PUBLISHED'
export type AgentMcpConnection = { name?: string | null; mcp_id: number; mcp_version_id: number; mcp_version: number; protocol?: string | null; mcp_type?: string | null; image_ref?: string | null }
export type AgentLlmModel = { model_id: number; provider: string; model_name: string; display_name?: string | null }
export type AgentDraft = { id: number; owner_id: number; name: string; description: string | null; framework: AgentFramework; mcp_id: number; mcp_version_id: number; mcp_version: number; mcp_connections: AgentMcpConnection[]; system_prompt: string; user_prompt: string; llm_model_id: number | null; llm_provider: string | null; llm_model_name: string | null; llm_models: AgentLlmModel[]; temperature: number | null; max_output_tokens: number | null; project_directory: string; project_revision: number; default_build_id: number | null; artifact_path: string | null; files: Record<string, string>; status: AgentDraftStatus; created_at: string; updated_at: string }
export type ArtifactCheck = { name: string; passed: boolean; detail: string }
export type ArtifactValidationResponse = { agent_id: number; valid: boolean; checks: ArtifactCheck[] }
export type AgentBuildStatus = 'QUEUED' | 'BUILDING' | 'SUCCEEDED' | 'FAILED'
export type AgentBuild = { id: number; agent_id: number; owner_id: number; version: number; status: AgentBuildStatus; image_ref: string | null; logs: string; error: string | null; created_at: string; updated_at: string }
export type AgentTestResponse = { agent_id: number; output: string; tools_available: number; mcp_connected: boolean; llm_model_id: number }
export type AgentInvocationResponse = { agent_id: number; build_id: number; status: string; output: string | null; tools_available: number; error: string | null }
export type AgentRuntimeLog = { time: string; message: string; level: string }
export type AgentRuntimeLogs = { agent_id: number; build_id?: number | null; build_version?: number | null; entries: AgentRuntimeLog[]; truncated: boolean }
export type AgentConversation = { id: number; agent_id: number; owner_id: number; title: string; created_at: string; updated_at: string }
export type AgentMessage = { id: number; conversation_id: number; role: 'USER' | 'ASSISTANT' | 'TOOL'; content: string; created_at: string }
export type LlmStatus = 'ACTIVE' | 'DISABLED'
export type CredentialStatus = 'UNKNOWN' | 'VALID' | 'INVALID'
export type ConnectionTestStatus = 'UNKNOWN' | 'SUCCEEDED' | 'FAILED' | 'UNSUPPORTED'
export type LlmProvider = { id: number; slug: string; display_name: string; api_family: string; status: LlmStatus }
export type LlmModel = { id: number; provider_id: number; provider_slug: string; model_name: string; display_name: string; capabilities: Record<string, unknown>; context_window: number | null; max_output_tokens: number | null; status: LlmStatus; enabled: boolean; is_default: boolean; test_status: ConnectionTestStatus; last_tested_at: string | null; last_test_error: string | null }
export type CredentialResponse = { provider_id: number; status: CredentialStatus; configured: boolean; updated_at: string | null }
export type DefaultResponse = { model_id: number | null }
export type ModelCreateInput = { provider_id: number; model_name: string; display_name: string; capabilities: Record<string, unknown>; context_window: number | null; max_output_tokens: number | null }
export type ConnectionTestResponse = { model_id: number; status: ConnectionTestStatus; tested_at: string; error: string | null }

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
export function getMcpVersion(token: string, id: number, version: number) { return mcpRequest<McpVersion>(`/mcps/${id}/versions/${version}`, token) }
export function generateMcp(token: string, id: number) { return mcpRequest<McpVersion>(`/mcps/${id}/generate`, token, { method: 'POST' }) }
export function getMcpProject(token: string, id: number, version: number) { return mcpRequest<McpProject>(`/mcps/${id}/versions/${version}/project`, token) }
export function updateMcpFile(token: string, id: number, version: number, path: string, content: string, revision: number) { return mcpRequest<McpProject>(`/mcps/${id}/versions/${version}/project/file`, token, { method: 'PUT', body: JSON.stringify({ path, content, revision }) }) }
export function createMcpFolder(token: string, id: number, version: number, path: string, revision: number) { return mcpRequest<McpProject>(`/mcps/${id}/versions/${version}/project/folder`, token, { method: 'POST', body: JSON.stringify({ path, revision }) }) }
export function deleteMcpFile(token: string, id: number, version: number, path: string, revision: number) { return mcpRequest<McpProject>(`/mcps/${id}/versions/${version}/project/file`, token, { method: 'DELETE', body: JSON.stringify({ path, revision }) }) }
export async function exportMcp(token: string, id: number, version: number) { const response = await fetch(`${mcpApiBaseUrl}/mcps/${id}/versions/${version}/project/export`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) { const body = await response.json().catch(() => ({} as ApiError)) as ApiError; throw new Error(body.detail || `MCP export failed with status ${response.status}`) } return response.blob() }
export function createMcpVersion(token: string, id: number, data: { source_kind: 'ZIP' | 'GIT'; source_digest: string; source_reference?: string; manifest: Record<string, unknown> }) { return mcpRequest<McpVersion>(`/mcps/${id}/versions`, token, { method: 'POST', body: JSON.stringify(data) }) }
export function invokeTool(token: string, mcpId: number, versionId: number, toolName: string, toolInput: object) { return mcpRequest<{ output: string | null; error: string | null; status: string; logs?: string[] }>(`/mcps/${mcpId}/${versionId}/invoke-tool`, token, { method: 'POST', body: JSON.stringify({ tool_name: toolName, tool_input: toolInput }) }) }
export function listTools(token: string, mcpId: number, versionId: number) { return mcpRequest<{ tools: any[]; error: string | null; logs?: string[] }>(`/mcps/${mcpId}/${versionId}/list-tools`, token, { method: 'POST' }) }
export function getMcpRuntimeLogs(token: string, id: number, version: number) { return mcpRequest<McpRuntimeLogs>(`/mcps/${id}/versions/${version}/runtime-logs`, token) }
export async function uploadMcpVersion(token: string, id: number, archive: File) {
  const body = new FormData(); body.append('archive', archive)
  const response = await fetch(`${mcpApiBaseUrl}/mcps/${id}/versions/upload`, { method: 'POST', body, headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) { const error = await response.json().catch(() => ({} as ApiError)) as ApiError; throw new Error(error.detail || `MCP upload failed with status ${response.status}`) }
  return response.json() as Promise<McpVersion>
}

export function listAgents(token: string) { return serviceRequest<AgentDraft[]>(agentApiBaseUrl, '/agents', token) }
export function getAgent(token: string, id: number) { return serviceRequest<AgentDraft>(agentApiBaseUrl, `/agents/${id}`, token) }
export type AgentDraftInput = Omit<AgentDraft, 'id' | 'owner_id' | 'files' | 'status' | 'project_revision' | 'default_build_id' | 'artifact_path' | 'created_at' | 'updated_at'>
export function createAgent(token: string, data: AgentDraftInput) { return serviceRequest<AgentDraft>(agentApiBaseUrl, '/agents', token, { method: 'POST', body: JSON.stringify(data) }) }
export function updateAgent(token: string, id: number, data: Partial<AgentDraftInput> & { default_build_id?: number | null }) { return serviceRequest<AgentDraft>(agentApiBaseUrl, `/agents/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }) }
export function generateAgent(token: string, id: number) { return serviceRequest<AgentDraft>(agentApiBaseUrl, `/agents/${id}/generate`, token, { method: 'POST' }) }
export function publishAgent(token: string, id: number) { return serviceRequest<AgentDraft>(agentApiBaseUrl, `/agents/${id}/publish`, token, { method: 'POST' }) }
export function updateAgentFile(token: string, id: number, path: string, content: string, revision: number) { return serviceRequest<AgentDraft>(agentApiBaseUrl, `/agents/${id}/files`, token, { method: 'PUT', body: JSON.stringify({ path, content, revision }) }) }
export function createAgentFolder(token: string, id: number, path: string, revision: number) { return serviceRequest<AgentDraft>(agentApiBaseUrl, `/agents/${id}/folders`, token, { method: 'POST', body: JSON.stringify({ path, revision }) }) }
export function deleteAgentPath(token: string, id: number, path: string, revision: number) { return serviceRequest<AgentDraft>(agentApiBaseUrl, `/agents/${id}/files`, token, { method: 'DELETE', body: JSON.stringify({ path, revision }) }) }
export async function uploadAgent(token: string, id: number, archive: File) {
  const body = new FormData(); body.append('archive', archive)
  const response = await fetch(`${agentApiBaseUrl}/agents/${id}/upload`, { method: 'POST', body, headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) { const error = await response.json().catch(() => ({} as ApiError)) as ApiError; throw new Error(error.detail || `Agent upload failed with status ${response.status}`) }
  return response.json() as Promise<AgentDraft>
}
export function deleteAgent(token: string, id: number) { return serviceRequest<void>(agentApiBaseUrl, `/agents/${id}`, token, { method: 'DELETE' }) }
export function validateAgent(token: string, id: number) { return serviceRequest<ArtifactValidationResponse>(agentApiBaseUrl, `/agents/${id}/validate`, token, { method: 'POST' }) }
export function buildAgent(token: string, id: number) { return serviceRequest<AgentBuild>(agentApiBaseUrl, `/agents/${id}/build`, token, { method: 'POST' }) }
export function listAgentBuilds(token: string, id: number) { return serviceRequest<AgentBuild[]>(agentApiBaseUrl, `/agents/${id}/builds`, token) }
export function listAgentRuntimeLogs(token: string, id: number, buildVersion?: number | null) { return serviceRequest<AgentRuntimeLogs>(agentApiBaseUrl, `/agents/${id}/runtime-logs${buildVersion ? `?build_version=${buildVersion}` : ''}`, token) }
export function runAgentBuild(token: string, agentId: number, buildId: number, prompt: string, modelId?: number | null) { return serviceRequest<AgentInvocationResponse>(agentApiBaseUrl, `/agents/${agentId}/builds/${buildId}/run`, token, { method: 'POST', body: JSON.stringify({ prompt, model_id: modelId || undefined }) }) }
export function testAgent(token: string, id: number, prompt: string) { return serviceRequest<AgentTestResponse>(agentApiBaseUrl, `/agents/${id}/test`, token, { method: 'POST', body: JSON.stringify({ prompt }) }) }
export function listAgentConversations(token: string, agentId: number) { return serviceRequest<AgentConversation[]>(agentApiBaseUrl, `/agents/${agentId}/conversations`, token) }
export function createAgentConversation(token: string, agentId: number, title = 'New conversation') { return serviceRequest<AgentConversation>(agentApiBaseUrl, `/agents/${agentId}/conversations`, token, { method: 'POST', body: JSON.stringify({ title }) }) }
export function listAgentMessages(token: string, agentId: number, conversationId: number) { return serviceRequest<AgentMessage[]>(agentApiBaseUrl, `/agents/${agentId}/conversations/${conversationId}/messages`, token) }
export function sendAgentMessage(token: string, agentId: number, conversationId: number, prompt: string, buildId: number, modelId?: number | null) { return serviceRequest<AgentMessage[]>(agentApiBaseUrl, `/agents/${agentId}/conversations/${conversationId}/messages`, token, { method: 'POST', body: JSON.stringify({ prompt, build_id: buildId, model_id: modelId || undefined }) }) }
export async function exportAgent(token: string, id: number) {
  const response = await fetch(`${agentApiBaseUrl}/agents/${id}/export`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) { const body = await response.json().catch(() => ({} as ApiError)) as ApiError; throw new Error(body.detail || `Agent export failed with status ${response.status}`) }
  return response.blob()
}

export function listLlmProviders(token: string) { return serviceRequest<LlmProvider[]>(llmApiBaseUrl, '/providers', token) }
export function listLlmModels(token: string) { return serviceRequest<LlmModel[]>(llmApiBaseUrl, '/models', token) }
export function createLlmModel(token: string, data: ModelCreateInput) { return serviceRequest<LlmModel>(llmApiBaseUrl, '/models', token, { method: 'POST', body: JSON.stringify(data) }) }
export function getLlmModel(token: string, modelId: number) { return serviceRequest<LlmModel>(llmApiBaseUrl, `/models/${modelId}`, token) }
export function updateLlmModel(token: string, modelId: number, data: Partial<ModelCreateInput> & { status?: LlmStatus }) { return serviceRequest<LlmModel>(llmApiBaseUrl, `/models/${modelId}`, token, { method: 'PATCH', body: JSON.stringify(data) }) }
export function deleteLlmModel(token: string, modelId: number) { return serviceRequest<void>(llmApiBaseUrl, `/models/${modelId}`, token, { method: 'DELETE' }) }
export function testLlmModel(token: string, modelId: number) { return serviceRequest<ConnectionTestResponse>(llmApiBaseUrl, `/models/${modelId}/test`, token, { method: 'POST' }) }
export function getLlmDefault(token: string) { return serviceRequest<DefaultResponse>(llmApiBaseUrl, '/defaults', token) }
export function setLlmModelAccess(token: string, modelId: number, enabled: boolean) { return serviceRequest<LlmModel>(llmApiBaseUrl, `/models/${modelId}/access`, token, { method: 'POST', body: JSON.stringify({ enabled }) }) }
export function setLlmDefault(token: string, modelId: number) { return serviceRequest<DefaultResponse>(llmApiBaseUrl, `/models/${modelId}/default`, token, { method: 'PUT' }) }
export function saveLlmCredential(token: string, providerId: number, apiKey: string) { return serviceRequest<CredentialResponse>(llmApiBaseUrl, `/providers/${providerId}/credentials`, token, { method: 'POST', body: JSON.stringify({ api_key: apiKey }) }) }
