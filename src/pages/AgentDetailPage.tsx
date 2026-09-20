import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Download,
  FileUp,
  FileCode2,
  FolderPlus,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  MessageCircle,
  Trash2,
  Save,
  Send,
  TerminalSquare,
  Wrench,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import {
  buildAgent,
  createAgentConversation,
  createAgentFolder,
  exportAgent,
  generateAgent,
  getAgent,
  listAgentBuilds,
  listAgentConversations,
  listAgentMessages,
  publishAgent,
  listAgentRuntimeLogs,
  uploadAgent,
  deleteAgentPath,
  sendAgentMessage,
  updateAgent,
  updateAgentFile,
  type AgentBuild,
  type AgentConversation,
  type AgentDraft,
  type AgentMessage,
  type AgentFramework,
  type AgentRuntimeLog,
} from "@/lib/api";

export function AgentDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const { show } = useToast();
  const agentId = id ? Number(id) : NaN;
  const [agent, setAgent] = useState<AgentDraft | null>(null);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [conversation, setConversation] = useState<AgentConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [builds, setBuilds] = useState<AgentBuild[]>([]);
  const [building, setBuilding] = useState(false);
  const [activeTab, setActiveTab] = useState<"workspace" | "chat">("workspace");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [savingFile, setSavingFile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [projectDirectory, setProjectDirectory] = useState("");
  const [projectRevision, setProjectRevision] = useState(0);
  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [runtimeLogs, setRuntimeLogs] = useState<AgentRuntimeLog[]>([]);
  const [runtimeLogsTruncated, setRuntimeLogsTruncated] = useState(false);
  const [loadingRuntimeLogs, setLoadingRuntimeLogs] = useState(false);
  const [latestBuildId, setLatestBuildId] = useState<number | null>(null);
  const [showBuildLogs, setShowBuildLogs] = useState(false);
  const [framework, setFramework] = useState<AgentFramework>("GOOGLE_ADK");
  const [uploading, setUploading] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token || !Number.isFinite(agentId)) {
      setLoading(false);
      return;
    }
    Promise.all([
      getAgent(token, agentId),
      listAgentConversations(token, agentId),
      listAgentBuilds(token, agentId),
    ])
      .then(async ([loadedAgent, loadedConversations, loadedBuilds]) => {
        setAgent(loadedAgent);
        setSelectedModelId(loadedAgent.llm_models?.[0]?.model_id || loadedAgent.llm_model_id || null);
        setFramework(loadedAgent.framework);
        setProjectDirectory(loadedAgent.project_directory || "agent-project");
        setProjectRevision(loadedAgent.project_revision);
        setConversations(loadedConversations);
        setBuilds(loadedBuilds);
        setLatestBuildId(loadedBuilds[0]?.id || null);
        const successfulBuilds = loadedBuilds.filter(
          (item) => item.status === "SUCCEEDED",
        );
        setSelectedBuildId(
          loadedAgent.default_build_id &&
            successfulBuilds.some(
              (item) => item.id === loadedAgent.default_build_id,
            )
            ? loadedAgent.default_build_id
            : successfulBuilds[0]?.id || null,
        );
        const selected =
          loadedConversations[0] ||
          (await createAgentConversation(
            token,
            agentId,
            `${loadedAgent.name} chat`,
          ));
        setConversation(selected);
        if (!loadedConversations.length) setConversations([selected]);
        setMessages(await listAgentMessages(token, agentId, selected.id));
      })
      .catch((error) =>
        show(
          "Unable to load agent detail",
          error instanceof Error ? error.message : "Request failed.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, agentId, show]);

  useEffect(() => {
    setFileContent(
      selectedFile && agent?.files[selectedFile] !== undefined
        ? agent.files[selectedFile]
        : "",
    );
  }, [selectedFile, agent]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadRuntimeLogs = async () => {
    if (!token || !Number.isFinite(agentId) || !selectedBuildId) {
      setRuntimeLogs([]);
      return;
    }
    setLoadingRuntimeLogs(true);
    try {
      const result = await listAgentRuntimeLogs(token, agentId, builds.find((item) => item.id === selectedBuildId)?.version);
      setRuntimeLogs(result.entries);
      setRuntimeLogsTruncated(result.truncated);
    } catch (error) {
      setRuntimeLogs([]);
      show("Unable to load runtime logs", error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLoadingRuntimeLogs(false);
    }
  };

  useEffect(() => {
    void loadRuntimeLogs();
  }, [token, agentId, selectedBuildId]);

  const removePath = async (path: string) => {
    if (!token || !window.confirm(`Delete ${path}?`)) return;
    try {
      const updated = await deleteAgentPath(token, agentId, path, projectRevision);
      setAgent(updated);
      setProjectRevision(updated.project_revision);
      if (selectedFile === path || selectedFile?.startsWith(`${path}/`)) setSelectedFile(null);
      show("Project item deleted", path);
    } catch (error) {
      show("Delete failed", error instanceof Error ? error.message : "Unable to delete project item.");
    }
  };

  const generateCode = async () => {
    if (!token || !agent) return;
    setGenerating(true);
    try {
      if (framework !== agent.framework) {
        await updateAgent(token, agentId, { framework });
      }
      const generated = await generateAgent(token, agentId);
      setAgent(generated);
      setProjectDirectory(generated.project_directory || "agent-project");
      setProjectRevision(generated.project_revision);
      setSelectedFile(Object.keys(generated.files)[0] || null);
      setActiveTab("workspace");
      show(
        "Code generated",
        "The project files were updated from the current MCP and LLM configuration.",
      );
    } catch (error) {
      show(
        "Generation failed",
        error instanceof Error ? error.message : "Unable to generate code.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const uploadProject = async (file: File) => {
    if (!token) return;
    setUploading(true);
    try {
      const uploaded = await uploadAgent(token, agentId, file);
      setAgent(uploaded);
      setProjectRevision(uploaded.project_revision);
      setSelectedFile(Object.keys(uploaded.files)[0] || null);
      setActiveTab("workspace");
      show("Project uploaded", `${Object.keys(uploaded.files).length} files imported.`);
    } catch (error) {
      show("Upload failed", error instanceof Error ? error.message : "Unable to upload project.");
    } finally {
      setUploading(false);
      if (uploadInput.current) uploadInput.current.value = "";
    }
  };

  const saveProjectDirectory = async () => {
    if (!token || !agent || !projectDirectory.trim()) return;
    try {
      const updated = await updateAgent(token, agentId, {
        project_directory: projectDirectory.trim(),
      });
      setAgent(updated);
      setProjectRevision(updated.project_revision);
      show("Project location saved", projectDirectory.trim());
    } catch (error) {
      show(
        "Location save failed",
        error instanceof Error
          ? error.message
          : "Unable to save project location.",
      );
    }
  };

  const saveFile = async () => {
    if (!token || !selectedFile) return;
    setSavingFile(true);
    try {
      const updated = await updateAgentFile(
        token,
        agentId,
        selectedFile,
        fileContent,
        projectRevision,
      );
      setAgent(updated);
      setProjectRevision(updated.project_revision);
      show("File saved", selectedFile);
    } catch (error) {
      show(
        "File save failed",
        error instanceof Error ? error.message : "Unable to save file.",
      );
    } finally {
      setSavingFile(false);
    }
  };

  const createFile = async () => {
    const path = window.prompt("New file path", "src/agent.py")?.trim();
    if (!token || !path) return;
    try {
      const updated = await updateAgentFile(
        token,
        agentId,
        path,
        "",
        projectRevision,
      );
      setAgent(updated);
      setProjectRevision(updated.project_revision);
      setSelectedFile(path);
      setActiveTab("workspace");
    } catch (error) {
      show(
        "File creation failed",
        error instanceof Error ? error.message : "Unable to create file.",
      );
    }
  };

  const createFolder = async () => {
    const path = window.prompt("New folder path", "src")?.trim();
    if (!token || !path) return;
    try {
      const updated = await createAgentFolder(
        token,
        agentId,
        path,
        projectRevision,
      );
      setAgent(updated);
      setProjectRevision(updated.project_revision);
      setActiveTab("workspace");
      show("Folder created", path);
    } catch (error) {
      show(
        "Folder creation failed",
        error instanceof Error ? error.message : "Unable to create folder.",
      );
    }
  };

  const selectConversation = async (item: AgentConversation) => {
    if (!token) return;
    setConversation(item);
    try {
      setMessages(await listAgentMessages(token, agentId, item.id));
    } catch (error) {
      show(
        "Unable to load conversation",
        error instanceof Error ? error.message : "Request failed.",
      );
    }
  };

  const newConversation = async () => {
    if (!token || !agent) return;
    try {
      const created = await createAgentConversation(
        token,
        agentId,
        `${agent.name} chat`,
      );
      setConversations((items) => [created, ...items]);
      setConversation(created);
      setMessages([]);
    } catch (error) {
      show(
        "Unable to start conversation",
        error instanceof Error ? error.message : "Request failed.",
      );
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !conversation || !prompt.trim() || !selectedBuildId) {
      show(
        "Build the agent first",
        "Select a successful agent build before chatting.",
      );
      return;
    }
    const text = prompt.trim();
    setPrompt("");
    setSending(true);
    try {
      setMessages(
        await sendAgentMessage(
          token,
          agentId,
          conversation.id,
          text,
          selectedBuildId,
          selectedModelId,
        ),
      );
    } catch (error) {
      setPrompt(text);
      show(
        "Agent response failed",
        error instanceof Error ? error.message : "Unable to complete request.",
      );
    } finally {
      setSending(false);
    }
  };

  const publish = async () => {
    if (!token || !agent || !builds.some((item) => item.status === "SUCCEEDED")) return;
    setPublishing(true);
    try {
      const published = await publishAgent(token, agentId);
      setAgent(published);
      show("Agent published", `${published.name} is now published.`);
    } catch (error) {
      show("Publish failed", error instanceof Error ? error.message : "Unable to publish agent.");
    } finally {
      setPublishing(false);
    }
  };

  const downloadExport = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const archive = await exportAgent(token, agentId);
      const url = URL.createObjectURL(archive);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${agent?.name || "agent"}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      show(
        "Export failed",
        error instanceof Error ? error.message : "Unable to export agent.",
      );
    } finally {
      setExporting(false);
    }
  };

  const buildImage = async () => {
    if (!token) return;
    setBuilding(true);
    try {
      const build = await buildAgent(token, agentId);
      setBuilds((items) => [build, ...items]);
      setLatestBuildId(build.id);
      if (build.status === "SUCCEEDED" && !selectedBuildId) {
        setSelectedBuildId(build.id);
        try {
          const updated = await updateAgent(token, agentId, {
            default_build_id: build.id,
          });
          setAgent(updated);
        } catch (error) {
          show(
            "Default build selection failed",
            error instanceof Error
              ? error.message
              : "Unable to save the default build.",
          );
        }
      }
      show(
        build.status === "SUCCEEDED" ? "Image built" : "Build failed",
        build.error || build.image_ref || "Build completed.",
      );
    } catch (error) {
      show(
        "Build failed",
        error instanceof Error ? error.message : "Unable to build image.",
      );
    } finally {
      setBuilding(false);
    }
  };

  const selectBuild = async (buildId: number) => {
    if (!token) return;
    setSelectedBuildId(buildId);
    try {
      const updated = await updateAgent(token, agentId, {
        default_build_id: buildId,
      });
      setAgent(updated);
      show("Default build selected", `Agent chat will use build #${buildId}.`);
    } catch (error) {
      show(
        "Build selection failed",
        error instanceof Error
          ? error.message
          : "Unable to save default build.",
      );
    }
  };

  if (loading)
    return (
      <WorkspaceLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-400">
          Loading agent...
        </div>
      </WorkspaceLayout>
    );
  if (!agent)
    return (
      <WorkspaceLayout>
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <p className="text-sm text-slate-500">
            This agent could not be found.
          </p>
          <Link
            to="/agents"
            className="mt-4 inline-block text-sm font-bold text-blue-600"
          >
            Back to agents
          </Link>
        </div>
      </WorkspaceLayout>
    );

  return (
    <WorkspaceLayout>
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Link
          to="/agents"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft size={15} />
          Back to agents
        </Link>
        <header className="mt-6 flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <Bot size={23} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-3xl font-semibold tracking-[-.04em] text-slate-950 dark:text-white">
                {agent.name}
              </h1>
              <p className="mt-1 truncate text-sm text-slate-500">
                {agent.description || "Agent workspace"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{agent.status}</Badge>
            <Badge>{agent.framework}</Badge>
            {builds.some((item) => item.status === "SUCCEEDED") && agent.status !== "PUBLISHED" && <Button type="button" size="sm" onClick={() => void publish()} disabled={publishing}>{publishing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Publish</Button>}
            <Link to="/llm-settings">
              <Button type="button" size="sm" variant="outline">
                Configure model
              </Button>
            </Link>
          </div>
        </header>
        <div className="mt-6 flex gap-2 border-b border-slate-200 dark:border-slate-800">
          <button type="button" onClick={() => setActiveTab("workspace")} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${activeTab === "workspace" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"}`}>
            <FileCode2 size={16} /> Project workspace
          </button>
          <button type="button" onClick={() => setActiveTab("chat")} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${activeTab === "chat" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"}`}>
            <MessageCircle size={16} /> Agent chat
          </button>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {activeTab === "chat" ? <section className="flex h-[min(720px,calc(100vh-220px))] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare size={17} className="text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-slate-950 dark:text-white">
                    Agent chat
                  </p>
                  <p className="text-xs text-slate-400">
                    Messages run through the selected agent build and its MCP
                    tools.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={newConversation}
              >
                New chat
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {messages.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center text-center">
                  <Bot size={30} className="text-slate-300" />
                  <p className="mt-4 text-sm font-bold text-slate-500">
                    {selectedBuildId
                      ? `Start a conversation with ${agent.name}`
                      : "Build this agent before chatting"}
                  </p>
                  <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">
                    {selectedBuildId
                      ? "The selected build controls the model and MCP tool calls."
                      : "Create a successful agent build, then select its version below."}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}
              <div ref={messagesEnd} />
            </div>
            <form
              onSubmit={send}
              className="sticky bottom-0 border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4"
            >
              <div className="flex items-end gap-2">
                <Input
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={
                    selectedBuildId
                      ? "Message your agent..."
                      : "Build the agent to enable chat"
                  }
                  disabled={sending || !selectedBuildId}
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send message"
                  disabled={sending || !prompt.trim() || !selectedBuildId}
                >
                  {sending ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                </Button>
              </div>
            </form>
          </section> : <CodeWorkspace
            agent={agent}
            projectDirectory={projectDirectory}
            selectedFile={selectedFile}
            content={fileContent}
            saving={savingFile}
            onDirectoryChange={setProjectDirectory}
            onDirectorySave={saveProjectDirectory}
            onFileSelect={setSelectedFile}
            onContentChange={setFileContent}
            onSave={saveFile}
            onCreateFile={createFile}
            onCreateFolder={createFolder}
            onDelete={removePath}
          />}
          <aside className="space-y-5">
            <Card className="p-5">
              <PanelTitle icon={Play} title="Runtime" />
              <div className="mt-4 space-y-3 text-sm">
                <div><p className="text-xs text-slate-400">Configured models</p><div className="mt-2 space-y-1">{(agent.llm_models?.length ? agent.llm_models : [{ model_id: agent.llm_model_id || 0, model_name: agent.llm_model_name || "Not selected", provider: agent.llm_provider || "" }]).map((model) => <button key={model.model_id} type="button" onClick={() => setSelectedModelId(model.model_id)} className={`block w-full rounded-lg px-2 py-1 text-left text-xs font-semibold ${selectedModelId === model.model_id ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "text-slate-600 dark:text-slate-300"}`}>{model.display_name || model.model_name} · {model.provider}</button>)}</div></div>
                <div><p className="text-xs text-slate-400">Configured MCP servers</p><div className="mt-2 space-y-1">{(agent.mcp_connections?.length ? agent.mcp_connections : [{ mcp_id: agent.mcp_id, mcp_version: agent.mcp_version, mcp_version_id: agent.mcp_version_id }]).map((connection) => <div key={`${connection.mcp_id}-${connection.mcp_version_id}`} className="rounded-lg bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{connection.name || `MCP server #${connection.mcp_id}`} · Version {connection.mcp_version}</div>)}</div></div>
                <StatusRow label="API key" value="Managed securely" />
              </div>
            </Card>
            <Card className="p-5">
              <PanelTitle icon={Play} title="Agent build for chat" />
              <div className="mt-4 space-y-3">
                <select
                  value={selectedBuildId || ""}
                  onChange={(event) => void selectBuild(Number(event.target.value))}
                  disabled={!builds.some((item) => item.status === "SUCCEEDED")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="">
                    {builds.some((item) => item.status === "SUCCEEDED")
                      ? "Select successful build"
                      : "Build required before chat"}
                  </option>
                  {builds
                    .filter((item) => item.status === "SUCCEEDED")
                    .map((build) => (
                      <option key={build.id} value={build.id}>
                        v{build.version} · {build.image_ref || "No image reference"} · {new Date(build.created_at).toLocaleString()}
                      </option>
                    ))}
                </select>
                <p className="text-xs leading-5 text-slate-400">
                  Chat runs inside this build, including its configured MCP tools. The selected version becomes the default.
                </p>
                {latestBuildId && (() => {
                  const latestBuild = builds.find((item) => item.id === latestBuildId);
                  if (!latestBuild || latestBuild.status === "SUCCEEDED") return null;
                  return (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/20">
                      <p className="text-xs font-bold text-red-700 dark:text-red-300">
                        Build {latestBuild.status.toLowerCase()}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-red-600 dark:text-red-300">
                        {latestBuild.error || "The container image could not be built."}
                      </p>
                      {latestBuild.logs && (
                        <button type="button" onClick={() => setShowBuildLogs((value) => !value)} className="mt-2 text-xs font-bold text-red-700 underline dark:text-red-300">
                          {showBuildLogs ? "Hide build logs" : "Show build logs"}
                        </button>
                      )}
                      {showBuildLogs && <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-[10px] leading-4 text-slate-200">{latestBuild.logs}</pre>}
                    </div>
                  );
                })()}
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3"><PanelTitle icon={TerminalSquare} title="Runtime logs" /><Button type="button" variant="outline" size="sm" onClick={() => void loadRuntimeLogs()} disabled={loadingRuntimeLogs || !selectedBuildId}>{loadingRuntimeLogs ? <Loader2 size={13} className="animate-spin" /> : "Refresh"}</Button></div>
              <div className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] leading-5">
                {loadingRuntimeLogs ? <p className="text-slate-500">Loading logs...</p> : runtimeLogs.length === 0 ? <p className="text-slate-500">No runtime logs for this build.</p> : <>{runtimeLogsTruncated && <p className="mb-2 text-amber-300">Showing latest retained entries.</p>}{runtimeLogs.map((entry, index) => <div key={`${entry.time}-${index}`} className={entry.level === "error" ? "text-rose-300" : "text-emerald-300"}><span className="mr-2 text-slate-500">{new Date(entry.time).toLocaleTimeString()}</span>{entry.message}</div>)}</>}
              </div>
            </Card>
            <Card className="p-5">
              <PanelTitle icon={MessageSquare} title="Conversations" />
              <div className="mt-4 space-y-2">
                {conversations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectConversation(item)}
                    className={`w-full rounded-xl p-3 text-left text-xs ${conversation?.id === item.id ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "bg-slate-50 text-slate-500 dark:bg-slate-800"}`}
                  >
                    {item.title}
                    <span className="mt-1 block text-[10px] opacity-70">
                      {new Date(item.updated_at).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <PanelTitle icon={Wrench} title="Agent operations" />
              <div className="mt-4 grid gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Generation framework
                  <select value={agent.framework} disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-normal text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <option value={agent.framework}>
                      {agent.framework === "GOOGLE_ADK" ? "Google ADK" : "LangGraph"}
                    </option>
                  </select>
                </label>
                <Button
                  type="button"
                  className="w-full"
                  disabled={generating}
                  onClick={generateCode}
                >
                  {generating ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FileCode2 size={15} />
                  )}{" "}
                  {generating
                    ? "Generating..."
                    : agent.status === "GENERATED"
                      ? "Regenerate code"
                      : "Generate code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => uploadInput.current?.click()}
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
                  Upload agent ZIP
                </Button>
                <input ref={uploadInput} type="file" accept=".zip,application/zip" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProject(file); }} />
                <Link to={`/agents?edit=${agent.id}`}>
                  <Button type="button" variant="outline" className="w-full">
                    <FileCode2 size={15} />
                    Edit configuration
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={
                    exporting ||
                    !agent.files ||
                    Object.keys(agent.files).length === 0
                  }
                  onClick={downloadExport}
                >
                  {exporting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}{" "}
                  {exporting ? "Exporting..." : "Export code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={
                    building ||
                    !agent.files ||
                    Object.keys(agent.files).length === 0
                  }
                  onClick={buildImage}
                >
                  {building ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Play size={15} />
                  )}{" "}
                  {building ? "Building..." : "Build image"}
                </Button>
                <p className="text-xs leading-5 text-slate-400">
                  Builds run with short-lived runtime credentials; provider keys
                  stay in the LLM service.
                </p>
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </WorkspaceLayout>
  );
}

function CodeWorkspace({
  agent,
  projectDirectory,
  selectedFile,
  content,
  saving,
  onDirectoryChange,
  onDirectorySave,
  onFileSelect,
  onContentChange,
  onSave,
  onCreateFile,
  onCreateFolder,
  onDelete,
}: {
  agent: AgentDraft;
  projectDirectory: string;
  selectedFile: string | null;
  content: string;
  saving: boolean;
  onDirectoryChange: (value: string) => void;
  onDirectorySave: () => void;
  onFileSelect: (path: string) => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onDelete: (path: string) => void;
}) {
  const files = Object.keys(agent.files || {}).sort();
  const folders = Array.from(new Set(files.flatMap((path) => {
    const parts = path.split("/");
    return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"));
  }))).sort();
  const entries = [...folders.map((path) => ({ path, folder: true })), ...files.map((path) => ({ path, folder: false }))].sort((left, right) => left.path.localeCompare(right.path) || Number(right.folder) - Number(left.folder));
  return (
    <section className="mt-6 flex h-[calc(100vh-270px)] min-h-[620px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
            Code workspace
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
            Existing project code
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCreateFolder}
          >
            <FolderPlus size={14} />
            Folder
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCreateFile}
          >
            <Plus size={14} />
            File
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!selectedFile || saving}
            onClick={onSave}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save file
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selectedFile || saving}
            onClick={() => selectedFile && onDelete(selectedFile)}
            className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            <Trash2 size={14} />
            Delete file
          </Button>
        </div>
      </div>
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Single project location
          <Input
            className="mt-2 max-w-xl font-normal"
            value={projectDirectory}
            onChange={(event) => onDirectoryChange(event.target.value)}
            onBlur={onDirectorySave}
            placeholder="agent-project"
          />
        </label>
        <p className="mt-2 text-xs text-slate-400">
          Generated code and future files use this project directory. Provider
          API keys stay in the managed LLM service.
        </p>
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="min-h-0 overflow-y-auto border-b border-slate-100 p-3 dark:border-slate-800 md:border-b-0 md:border-r">
          {files.length ? (
            entries.map(({ path, folder }) => (
              <div key={`${folder ? "folder" : "file"}-${path}`} className="group flex items-center gap-1">
                <button
                  type="button"
                  disabled={folder}
                  onClick={() => onFileSelect(path)}
                  className={`min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-xs ${selectedFile === path ? "bg-blue-50 font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : folder ? "font-semibold text-slate-600 dark:text-slate-300" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                  style={{ paddingLeft: `${8 + path.split("/").length * 8}px` }}
                >
                  {folder ? "▾ " : ""}{folder ? path.split("/").pop() : path.split("/").pop()}
                </button>
                <button type="button" aria-label={`Delete ${path}`} onClick={() => onDelete(path)} className="invisible shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 group-hover:visible"><Trash2 size={13} /></button>
              </div>
            ))
          ) : (
            <p className="p-3 text-xs text-slate-400">
              Generate the project to create files.
            </p>
          )}
        </nav>
        <div className="flex min-h-0 flex-col">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800">
            {selectedFile || "No file selected"}
          </div>
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            disabled={!selectedFile}
            className="min-h-0 flex-1 resize-none overflow-auto bg-slate-950 p-5 font-mono text-xs leading-5 text-slate-200 outline-none"
            spellCheck={false}
            placeholder="Select a file to edit its contents."
          />
        </div>
      </div>
    </section>
  );
}

function ChatMessage({ message }: { message: AgentMessage }) {
  const isUser = message.role === "USER";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(85%,720px)] rounded-2xl px-4 py-3 text-sm leading-6 ${isUser ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"}`}
      >
        <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-60">
          {message.role === "TOOL" ? (
            <>
              <TerminalSquare size={12} />
              Tool
            </>
          ) : message.role === "ASSISTANT" ? (
            <>
              <CheckCircle2 size={12} />
              Agent
            </>
          ) : (
            "You"
          )}
        </div>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}
function PanelTitle({
  icon: Icon,
  title,
}: {
  icon: typeof Play;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white">
      <Icon size={16} className="text-blue-600" />
      {title}
    </div>
  );
}
function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="max-w-[180px] truncate text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
        {value}
      </span>
    </div>
  );
}
