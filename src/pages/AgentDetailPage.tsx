import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Download,
  FileCode2,
  FolderPlus,
  Loader2,
  MessageSquare,
  Play,
  Plus,
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
  runAgentBuild,
  sendAgentMessage,
  updateAgent,
  updateAgentFile,
  type AgentBuild,
  type AgentConversation,
  type AgentDraft,
  type AgentMessage,
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
  const [runningBuild, setRunningBuild] = useState(false);
  const [runPrompt, setRunPrompt] = useState("");
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [savingFile, setSavingFile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [projectDirectory, setProjectDirectory] = useState("");
  const [projectRevision, setProjectRevision] = useState(0);
  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(null);

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
        setProjectDirectory(loadedAgent.project_directory || "agent-project");
        setProjectRevision(loadedAgent.project_revision);
        setConversations(loadedConversations);
        setBuilds(loadedBuilds);
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

  const generateCode = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      const generated = await generateAgent(token, agentId);
      setAgent(generated);
      setProjectDirectory(generated.project_directory || "agent-project");
      setProjectRevision(generated.project_revision);
      setSelectedFile(Object.keys(generated.files)[0] || null);
      setShowCode(true);
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
      setShowCode(true);
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
      setShowCode(true);
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
      if (build.status === "SUCCEEDED" && !selectedBuildId)
        setSelectedBuildId(build.id);
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

  const runBuild = async () => {
    const build = builds.find((item) => item.status === "SUCCEEDED");
    if (!token || !build || !runPrompt.trim()) {
      show(
        "Enter a prompt",
        "Build a successful image and enter a prompt first.",
      );
      return;
    }
    setRunningBuild(true);
    try {
      const result = await runAgentBuild(
        token,
        agentId,
        build.id,
        runPrompt.trim(),
      );
      setRunOutput(result.output || result.error || "No output returned.");
    } catch (error) {
      show(
        "Built agent failed",
        error instanceof Error ? error.message : "Unable to run built agent.",
      );
    } finally {
      setRunningBuild(false);
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
            <Link to="/llm-settings">
              <Button type="button" size="sm" variant="outline">
                Configure model
              </Button>
            </Link>
          </div>
        </header>
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
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
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
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
          </section>
          <aside className="space-y-5">
            <Card className="p-5">
              <PanelTitle icon={Play} title="Runtime" />
              <div className="mt-4 space-y-3 text-sm">
                <StatusRow
                  label="Model"
                  value={agent.llm_model_name || "Not selected"}
                />
                <StatusRow
                  label="Provider"
                  value={agent.llm_provider || "Not selected"}
                />
                <StatusRow
                  label="MCP server"
                  value={`Server #${agent.mcp_id}`}
                />
                <StatusRow
                  label="MCP version"
                  value={`Version ${agent.mcp_version}`}
                />
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
                        Build #{build.id} · {new Date(build.created_at).toLocaleString()}
                      </option>
                    ))}
                </select>
                <p className="text-xs leading-5 text-slate-400">
                  Chat runs inside this build, including its configured MCP tools. The selected version becomes the default.
                </p>
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
                      : "Generate sample code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!Object.keys(agent.files || {}).length}
                  onClick={() => setShowCode((value) => !value)}
                >
                  <FileCode2 size={15} />
                  {showCode ? "Hide code view" : "View existing code"}
                </Button>
                <Link to="/agents">
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
                  {exporting ? "Exporting..." : "Export generated files"}
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
                <div className="mt-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Input
                    value={runPrompt}
                    onChange={(event) => setRunPrompt(event.target.value)}
                    placeholder="Prompt built agent"
                  />
                  <Button
                    type="button"
                    className="mt-2 w-full"
                    disabled={
                      runningBuild ||
                      !builds.some((item) => item.status === "SUCCEEDED")
                    }
                    onClick={runBuild}
                  >
                    {runningBuild ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}{" "}
                    Run built agent
                  </Button>
                  {runOutput && (
                    <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs text-slate-200">
                      {runOutput}
                    </pre>
                  )}
                </div>
                <p className="text-xs leading-5 text-slate-400">
                  Builds run with short-lived runtime credentials; provider keys
                  stay in the LLM service.
                </p>
              </div>
            </Card>
          </aside>
        </div>
        {showCode && (
          <CodeWorkspace
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
          />
        )}
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
}) {
  const files = Object.keys(agent.files || {}).sort();
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
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
      <div className="grid min-h-[420px] md:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="border-b border-slate-100 p-3 dark:border-slate-800 md:border-b-0 md:border-r">
          {files.length ? (
            files.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => onFileSelect(path)}
                className={`block w-full truncate rounded-lg px-3 py-2 text-left text-xs ${selectedFile === path ? "bg-blue-50 font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                {path}
              </button>
            ))
          ) : (
            <p className="p-3 text-xs text-slate-400">
              Generate the project to create files.
            </p>
          )}
        </nav>
        <div className="flex min-h-[420px] flex-col">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800">
            {selectedFile || "No file selected"}
          </div>
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            disabled={!selectedFile}
            className="min-h-[360px] flex-1 resize-none bg-slate-950 p-5 font-mono text-xs leading-5 text-slate-200 outline-none"
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
