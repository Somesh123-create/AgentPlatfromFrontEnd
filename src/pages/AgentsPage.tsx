import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  Check,
  Download,
  FileCode2,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import {
  createAgent,
  buildAgent,
  deleteAgent,
  listAgents,
  listLlmModels,
  listMcps,
  listMcpVersions,
  exportAgent,
  validateAgent,
  testAgent,
  updateAgent,
  type AgentDraft,
  type AgentDraftInput,
  type AgentMcpConnection,
  type LlmModel,
  type Mcp,
  type McpVersion,
} from "@/lib/api";

const emptyForm: AgentDraftInput = {
  name: "",
  description: "",
  framework: "GOOGLE_ADK",
  mcp_id: 0,
  mcp_version_id: 0,
  mcp_version: 0,
  mcp_connections: [],
  system_prompt: "",
  user_prompt: "",
  llm_model_id: null,
  llm_provider: null,
  llm_model_name: null,
  llm_models: [],
  temperature: 0.2,
  max_output_tokens: 1000,
  project_directory: "agent-project",
};

export function AgentsPage() {
  const { token } = useAuth();
  const { show } = useToast();
  const [searchParams] = useSearchParams();
  const requestedEditId = Number(searchParams.get("edit"));
  const [agents, setAgents] = useState<AgentDraft[]>([]);
  const [mcps, setMcps] = useState<Mcp[]>([]);
  const [versions, setVersions] = useState<McpVersion[]>([]);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [form, setForm] = useState<AgentDraftInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [testingAgent, setTestingAgent] = useState(false);
  const [testPrompt, setTestPrompt] = useState("");
  const [testOutput, setTestOutput] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.allSettled([
      listAgents(token),
      listMcps(token),
      listLlmModels(token),
    ])
      .then(async ([agentsResult, mcpsResult, modelsResult]) => {
        if (agentsResult.status === "fulfilled") {
          setAgents(agentsResult.value);
          const requested = agentsResult.value.find((item) => item.id === requestedEditId);
          if (requested) void editAgent(requested);
        }
        else
          show(
            "Unable to load saved agents",
            getErrorMessage(agentsResult.reason),
          );

        if (mcpsResult.status === "fulfilled") {
          setMcps(mcpsResult.value);
          if (mcpsResult.value[0]) await loadVersions(mcpsResult.value[0].id);
        } else {
          show(
            "Unable to load MCP servers",
            getErrorMessage(mcpsResult.reason),
          );
        }

        if (modelsResult.status === "fulfilled") setModels(modelsResult.value);
        else
          show(
            "Unable to load LLM models",
            getErrorMessage(modelsResult.reason),
          );
      })
      .finally(() => setLoading(false));
  }, [token, show, requestedEditId]);

  const loadVersions = async (mcpId: number) => {
    if (!token || !mcpId) {
      setVersions([]);
      return;
    }
    try {
      const loadedVersions = await listMcpVersions(token, mcpId);
      setVersions(loadedVersions);
      setForm((current) => ({
        ...current,
        mcp_id: mcpId,
        mcp_version_id: loadedVersions[0]?.id || 0,
        mcp_version: loadedVersions[0]?.version || 0,
      }));
    } catch (error) {
      show(
        "Unable to load MCP versions",
        error instanceof Error ? error.message : "Request failed.",
      );
    }
  };

  const updateField = <K extends keyof AgentDraftInput>(
    field: K,
    value: AgentDraftInput[K],
  ) => setForm((current) => ({ ...current, [field]: value }));

  const selectMcp = async (mcpId: number) => {
    updateField("mcp_id", mcpId);
    await loadVersions(mcpId);
  };

  const selectVersion = (versionId: number) => {
    const version = versions.find((item) => item.id === versionId);
    setForm((current) => ({
      ...current,
      mcp_version_id: versionId,
      mcp_version: version?.version || 0,
      mcp_connections: current.mcp_connections.map((connection, index) =>
        index === 0
          ? {
              ...connection,
              mcp_version_id: versionId,
              mcp_version: version?.version || 0,
            }
          : connection,
      ),
    }));
  };

  const updateMcpConnections = (connections: AgentMcpConnection[]) => {
    const primary = connections[0];
    setForm((current) => ({
      ...current,
      mcp_connections: connections,
      mcp_id: primary?.mcp_id || 0,
      mcp_version_id: primary?.mcp_version_id || 0,
      mcp_version: primary?.mcp_version || 0,
    }));
  };

  const selectModel = (modelId: number | null) => {
    const model = models.find((item) => item.id === modelId);
    setForm((current) => ({
      ...current,
      llm_model_id: modelId,
      llm_provider: model?.provider_slug || null,
      llm_model_name: model?.model_name || null,
    }));
  };

  const toggleModel = (modelId: number) => {
    const model = models.find((item) => item.id === modelId);
    if (!model) return;
    const selected = form.llm_models.some((item) => item.model_id === modelId);
    const next = selected
      ? form.llm_models.filter((item) => item.model_id !== modelId)
      : [...form.llm_models, {
          model_id: model.id,
          provider: model.provider_slug,
          model_name: model.model_name,
          display_name: model.display_name,
        }];
    setForm((current) => ({
      ...current,
      llm_models: next,
      llm_model_id: next[0]?.model_id || null,
      llm_provider: next[0]?.provider || null,
      llm_model_name: next[0]?.model_name || null,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      mcp_id: mcps[0]?.id || 0,
      mcp_version_id: versions[0]?.id || 0,
      mcp_version: versions[0]?.version || 0,
    });
    setSelectedFile(null);
  };

  const editAgent = async (agent: AgentDraft) => {
    setEditingId(agent.id);
    setForm({
      name: agent.name,
      description: agent.description || "",
      framework: agent.framework,
      mcp_id: agent.mcp_id,
      mcp_version_id: agent.mcp_version_id,
      mcp_version: agent.mcp_version,
      mcp_connections: agent.mcp_connections || [],
      system_prompt: agent.system_prompt,
      user_prompt: agent.user_prompt,
      llm_model_id: agent.llm_model_id,
      llm_provider: agent.llm_provider,
      llm_model_name: agent.llm_model_name,
      llm_models: agent.llm_models || [],
      temperature: agent.temperature,
      max_output_tokens: agent.max_output_tokens,
      project_directory: agent.project_directory || "agent-project",
    });
    await loadVersions(agent.mcp_id);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !form.name.trim() || !form.mcp_id || !form.mcp_version_id) {
      show(
        "Complete the required fields",
        "Choose a name, MCP server, and MCP version before saving.",
      );
      return;
    }
    setSaving(true);
    try {
      const saved = editingId
        ? await updateAgent(token, editingId, form)
        : await createAgent(token, form);
      setAgents((current) =>
        editingId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setEditingId(saved.id);
      show("Draft saved", `${saved.name} is ready to generate.`);
    } catch (error) {
      show(
        "Save failed",
        error instanceof Error ? error.message : "Unable to save agent draft.",
      );
    } finally {
      setSaving(false);
    }
  };


  const remove = async (agent: AgentDraft) => {
    if (!token || !window.confirm(`Delete ${agent.name}?`)) return;
    try {
      await deleteAgent(token, agent.id);
      setAgents((current) => current.filter((item) => item.id !== agent.id));
      if (editingId === agent.id) resetForm();
      show("Agent deleted", agent.name);
    } catch (error) {
      show(
        "Delete failed",
        error instanceof Error ? error.message : "Unable to delete agent.",
      );
    }
  };

  const validate = async () => {
    if (!token || !editingId) return;
    setValidating(true);
    try {
      const result = await validateAgent(token, editingId);
      const failures = result.checks
        .filter((check) => !check.passed)
        .map((check) => check.detail)
        .join(" ");
      show(
        result.valid ? "Artifact is valid" : "Artifact needs attention",
        failures || "All generated checks passed.",
      );
    } catch (error) {
      show(
        "Validation failed",
        error instanceof Error ? error.message : "Unable to validate artifact.",
      );
    } finally {
      setValidating(false);
    }
  };

  const downloadArchive = async () => {
    if (!token || !editingId) return;
    try {
      const blob = await exportAgent(token, editingId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeAgent?.name || "agent"}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      show(
        "Export failed",
        error instanceof Error ? error.message : "Unable to export agent.",
      );
    }
  };

  const buildImage = async () => {
    if (!token || !editingId) return;
    setBuilding(true);
    try {
      const result = await buildAgent(token, editingId);
      show(
        result.status === "SUCCEEDED"
          ? "Agent image built"
          : "Agent build failed",
        result.error || result.image_ref || "Build completed.",
      );
    } catch (error) {
      show(
        "Build request failed",
        error instanceof Error ? error.message : "Unable to build agent image.",
      );
    } finally {
      setBuilding(false);
    }
  };

  const runAgentTest = async () => {
    if (!token || !editingId || !testPrompt.trim()) {
      show(
        "Enter a test prompt",
        "Provide a prompt to test the selected agent.",
      );
      return;
    }
    setTestingAgent(true);
    setTestOutput(null);
    try {
      const result = await testAgent(token, editingId, testPrompt.trim());
      setTestOutput(result.output);
      show(
        "Agent test completed",
        `MCP connected with ${result.tools_available} available tool(s).`,
      );
    } catch (error) {
      show(
        "Agent test failed",
        error instanceof Error ? error.message : "Unable to test agent.",
      );
    } finally {
      setTestingAgent(false);
    }
  };

  const activeAgent = agents.find((agent) => agent.id === editingId);
  if (loading)
    return (
      <WorkspaceLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-400">
          Loading agents...
        </div>
      </WorkspaceLayout>
    );

  return (
    <WorkspaceLayout>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600 dark:text-blue-400">
              Agent workspace
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.05em] text-slate-950 dark:text-white">
              Build an agent
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-400">
              Compose a draft from your MCP tools and enabled language models,
              then generate a ready-to-run project.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={resetForm}>
            <Plus size={16} />
            New draft
          </Button>
        </div>
        <div className="mt-10 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <Bot size={19} />
              </span>
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  {editingId ? "Edit agent draft" : "New agent draft"}
                </h2>
                <p className="text-xs text-slate-500">
                  Required fields are marked by the form.
                </p>
              </div>
            </div>
            <form onSubmit={save} className="mt-6 space-y-4">
              <Input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Agent name"
                required
                maxLength={100}
              />
              <Input
                value={form.description || ""}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Short description"
                maxLength={2000}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Framework"
                  value={form.framework}
                  onChange={(value) =>
                    updateField(
                      "framework",
                      value as AgentDraftInput["framework"],
                    )
                  }
                  options={[
                    ["GOOGLE_ADK", "Google ADK"],
                    ["LANGGRAPH", "LangGraph"],
                  ]}
                />
                <div className="sm:col-span-2">
                  <McpConnectionPicker
                    token={token}
                    mcps={mcps}
                    connections={form.mcp_connections}
                    onChange={updateMcpConnections}
                    show={show}
                  />
                </div>
                <LlmModelPicker models={models} selected={form.llm_models} onToggle={toggleModel} />
              </div>
              <TextArea
                label="System prompt"
                value={form.system_prompt}
                onChange={(value) => updateField("system_prompt", value)}
                placeholder="Describe how the agent should behave."
              />
              <TextArea
                label="User prompt"
                value={form.user_prompt}
                onChange={(value) => updateField("user_prompt", value)}
                placeholder="Add the default task context."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Temperature"
                  value={form.temperature ?? ""}
                  min="0"
                  max="2"
                  step="0.1"
                  onChange={(value) =>
                    updateField(
                      "temperature",
                      value === "" ? null : Number(value),
                    )
                  }
                />
                <NumberField
                  label="Max output tokens"
                  value={form.max_output_tokens ?? ""}
                  min="1"
                  step="1"
                  onChange={(value) =>
                    updateField(
                      "max_output_tokens",
                      value === "" ? null : Number(value),
                    )
                  }
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save draft
                </Button>
              </div>
            </form>
          </Card>
          <div className="space-y-5">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
                    Saved drafts
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                    Your agents
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {agents.length} total
                </span>
              </div>
              <div className="mt-5 space-y-2">
                {agents.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                    No agent drafts yet.
                  </p>
                ) : (
                  agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`flex items-center gap-3 rounded-xl p-3 ${editingId === agent.id ? "bg-blue-50 dark:bg-blue-500/10" : "bg-slate-50 dark:bg-slate-800"}`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-300">
                        <Bot size={16} />
                      </span>
                      <Link to={`/agents/${agent.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900 hover:text-blue-600 dark:text-white">
                          {agent.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {agent.framework}
                        </p>
                      </Link>
                      <button
                        type="button"
                        className="rounded-full px-2 text-xs text-slate-400 hover:text-blue-600"
                        onClick={() => editAgent(agent)}
                      >
                        Edit
                      </button>
                      <Badge>{agent.status}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${agent.name}`}
                        onClick={() => remove(agent)}
                      >
                        <Trash2 size={15} className="text-rose-500" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
            {activeAgent && activeAgent.status === "GENERATED" && (
              <GeneratedFiles
                agent={activeAgent}
                selectedFile={selectedFile}
                onSelect={setSelectedFile}
                validating={validating}
                building={building}
                testing={testingAgent}
                prompt={testPrompt}
                output={testOutput}
                onPrompt={setTestPrompt}
                onValidate={validate}
                onBuild={buildImage}
                onTest={runAgentTest}
                onExport={downloadArchive}
              />
            )}
          </div>
        </div>
      </main>
    </WorkspaceLayout>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

function LlmModelPicker({
  models,
  selected,
  onToggle,
}: {
  models: LlmModel[];
  selected: AgentDraftInput["llm_models"];
  onToggle: (modelId: number) => void;
}) {
  const selectedIds = new Set(selected.map((item) => item.model_id));
  return (
    <div className="sm:col-span-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">LLM models</p>
      <p className="mt-1 text-xs text-slate-500">Select models available for each agent request. The first selected model is the default.</p>
      <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-2 dark:bg-slate-950">
        {models.length === 0 ? <p className="p-3 text-xs text-slate-400">No enabled LLM models available.</p> : models.map((model) => {
          const isSelected = selectedIds.has(model.id);
          return <button key={model.id} type="button" onClick={() => onToggle(model.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs ${isSelected ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>{isSelected && <Check size={13} />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{model.display_name}</span><span className="block truncate text-[10px] opacity-70">{model.provider_slug} · {model.model_name}</span></span>
          </button>;
        })}
      </div>
      {selected.length > 0 && <p className="mt-2 text-[10px] font-semibold text-blue-600">Configured order: {selected.map((item) => item.display_name || item.model_name).join(" → ")}</p>}
    </div>
  );
}

function McpConnectionPicker({
  token,
  mcps,
  connections,
  onChange,
  show,
}: {
  token: string | null;
  mcps: Mcp[];
  connections: AgentMcpConnection[];
  onChange: (connections: AgentMcpConnection[]) => void;
  show: (title: string, description: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [versionsByMcp, setVersionsByMcp] = useState<Record<number, McpVersion[]>>({});
  const [loadingMcp, setLoadingMcp] = useState<number | null>(null);
  const selectedIds = new Set(connections.map((connection) => connection.mcp_id));
  const visibleMcps = mcps.filter((mcp) => {
    const text = `${mcp.name} ${mcp.description || ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  const loadVersionsFor = async (mcpId: number) => {
    if (!token || versionsByMcp[mcpId]) return versionsByMcp[mcpId] || [];
    setLoadingMcp(mcpId);
    try {
      const versions = await listMcpVersions(token, mcpId);
      setVersionsByMcp((current) => ({ ...current, [mcpId]: versions }));
      return versions;
    } catch (error) {
      show("Unable to load MCP versions", getErrorMessage(error));
      return [];
    } finally {
      setLoadingMcp(null);
    }
  };

  useEffect(() => {
    connections.forEach((connection) => {
      void loadVersionsFor(connection.mcp_id);
    });
  }, []);

  const toggleMcp = async (mcp: Mcp) => {
    if (selectedIds.has(mcp.id)) {
      onChange(connections.filter((connection) => connection.mcp_id !== mcp.id));
      return;
    }
    const versions = await loadVersionsFor(mcp.id);
    const version = versions[0];
    if (!version) {
      show("No MCP version available", `${mcp.name} needs a version before it can be added.`);
      return;
    }
    onChange([
      ...connections,
      {
        name: mcp.name,
        mcp_id: mcp.id,
        mcp_version_id: version.id,
        mcp_version: version.version,
        mcp_type: mcp.mcp_type,
        protocol: mcp.protocol,
      },
    ]);
  };

  const changeVersion = (mcpId: number, versionId: number) => {
    const version = versionsByMcp[mcpId]?.find((item) => item.id === versionId);
    if (!version) return;
    onChange(connections.map((connection) => connection.mcp_id === mcpId
      ? { ...connection, mcp_version_id: version.id, mcp_version: version.version }
      : connection));
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">MCP connections</p>
          <p className="mt-1 text-xs text-slate-500">Search and select multiple servers, then pin a version for each.</p>
        </div>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-300">{connections.length} selected</span>
      </div>
      <div className="relative mt-3">
        <Search size={15} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search MCP servers..." />
      </div>
      <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-2 dark:bg-slate-950">
        {visibleMcps.length === 0 ? <p className="p-3 text-xs text-slate-400">No MCP servers match your search.</p> : visibleMcps.map((mcp) => {
          const selected = selectedIds.has(mcp.id);
          return <button key={mcp.id} type="button" onClick={() => void toggleMcp(mcp)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition ${selected ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>{selected && <Check size={13} />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{mcp.name}</span><span className="block truncate text-[10px] opacity-70">{mcp.description || `${mcp.protocol} · ${mcp.mcp_type}`}</span></span>
            {loadingMcp === mcp.id && <Loader2 size={14} className="animate-spin" />}
          </button>;
        })}
      </div>
      {connections.length > 0 && <div className="mt-3 space-y-2">{connections.map((connection) => <div key={connection.mcp_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{connection.name || `MCP ${connection.mcp_id}`}</span><select value={connection.mcp_version_id} onChange={(event) => changeVersion(connection.mcp_id, Number(event.target.value))} disabled={!versionsByMcp[connection.mcp_id]} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><option value={connection.mcp_version_id}>Version {connection.mcp_version}</option>{(versionsByMcp[connection.mcp_id] || []).filter((version) => version.id !== connection.mcp_version_id).map((version) => <option key={version.id} value={version.id}>Version {version.version}</option>)}</select><button type="button" onClick={() => toggleMcp(mcps.find((mcp) => mcp.id === connection.mcp_id)!)} className="text-slate-400 hover:text-rose-500" aria-label={`Remove ${connection.name || "MCP"}`}><X size={15} /></button></div>)}</div>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  allowEmpty,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        <option value="">
          {allowEmpty ? emptyLabel : `Choose ${label.toLowerCase()}`}
        </option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={20000}
        className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}
function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number | string;
  min: string;
  max?: string;
  step: string;
  onChange: (value: number | "") => void;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
      {label}
      <Input
        className="mt-2 font-normal"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
      />
    </label>
  );
}
function GeneratedFiles({
  agent,
  selectedFile,
  onSelect,
  validating,
  building,
  testing,
  prompt,
  output,
  onPrompt,
  onValidate,
  onBuild,
  onTest,
  onExport,
}: {
  agent: AgentDraft;
  selectedFile: string | null;
  onSelect: (file: string) => void;
  validating: boolean;
  building: boolean;
  testing: boolean;
  prompt: string;
  output: string | null;
  onPrompt: (value: string) => void;
  onValidate: () => void;
  onBuild: () => void;
  onTest: () => void;
  onExport: () => void;
}) {
  const file =
    selectedFile && agent.files[selectedFile]
      ? selectedFile
      : Object.keys(agent.files)[0];
  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(
      new Blob([agent.files[file]], { type: "text/plain" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
            Generated output
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
            Project files
          </h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={validating}
            onClick={onValidate}
          >
            {validating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Validate"
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={building}
            onClick={onBuild}
          >
            {building ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Build image"
            )}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onExport}>
            Export ZIP
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Download selected file"
            onClick={download}
          >
            <Download size={17} />
          </Button>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Test agent
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            value={prompt}
            onChange={(event) => onPrompt(event.target.value)}
            placeholder="Ask this agent a question"
          />
          <Button type="button" disabled={testing} onClick={onTest}>
            {testing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Run test"
            )}
          </Button>
        </div>
        {output && (
          <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-200">
            {output}
          </pre>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {Object.keys(agent.files).map((name) => (
          <Button
            key={name}
            type="button"
            size="sm"
            variant={name === file ? "secondary" : "outline"}
            onClick={() => onSelect(name)}
          >
            <FileCode2 size={14} />
            {name}
          </Button>
        ))}
      </div>
      {file && (
        <pre className="mt-5 max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
          <code>{agent.files[file]}</code>
        </pre>
      )}
    </Card>
  );
}
