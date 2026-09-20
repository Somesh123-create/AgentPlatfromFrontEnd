import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  Download,
  FileArchive,
  FileCode2,
  FolderPlus,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TerminalSquare,
  UploadCloud,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/auth/AuthProvider'

import {
  buildMcpVersion,
  createMcpFolder,
  deleteMcpFile,
  exportMcp,
  generateMcp,
  getMcp,
  getMcpProject,
  listMcpBuilds,
  listMcpVersions,
  invokeTool as invokeMcpTool,
  listTools,
  getMcpRuntimeLogs,
  updateMcpFile,
  uploadMcpVersion,
  type Mcp,
  type McpBuild,
  type McpVersion,
} from '@/lib/api'

import { useToast } from '@/components/ui/toast'

type McpTool = {
  id: string | number
  name?: string
  description?: string
  input_schema?: unknown
  inputSchema?: unknown
  source_digest?: string
  source_kind?: string
  created_at?: string
}

type InvocationResult = {
  output: string | null
  error: string | null
  status: string
}

type InvocationHistoryItem = InvocationResult & {
  id: number
  toolName: string
  version: number
  input: object
  createdAt: string
}

type RuntimeLog = { time: string; message: string; level: string }

export function McpDetailPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const { show } = useToast()

  const [mcp, setMcp] = useState<Mcp | null>(null)
  const [versions, setVersions] = useState<McpVersion[]>([])
  const [builds, setBuilds] = useState<McpBuild[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [building, setBuilding] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [project, setProject] = useState<{ version_id: number; revision: number; files: Record<string, string> } | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [savingFile, setSavingFile] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [loadingTools, setLoadingTools] = useState(false)
  const [invoking, setInvoking] = useState(false)

  const [tools, setTools] = useState<McpTool[]>([])
  const [selectedTool, setSelectedTool] = useState('')
  const [toolInput, setToolInput] = useState('{}')

  const [invocationResult, setInvocationResult] =
    useState<InvocationResult | null>(null)
  const [invocationHistory, setInvocationHistory] = useState<InvocationHistoryItem[]>([])
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeLog[]>([])
  const [loadingRuntimeLogs, setLoadingRuntimeLogs] = useState(false)
  const [runtimeLogsTruncated, setRuntimeLogsTruncated] = useState(false)

  const mcpId = id ? Number(id) : null

  /*
   * ---------------------------------------------------------
   * Load MCP
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      !token ||
      mcpId === null ||
      Number.isNaN(mcpId)
    ) {
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)

    Promise.all([
      getMcp(token, mcpId),
      listMcpVersions(token, mcpId),
      listMcpBuilds(token, mcpId),
    ])
      .then(
        ([
          server,
          serverVersions,
          serverBuilds,
        ]) => {
          setMcp(server)
          setVersions(serverVersions)
          setBuilds(serverBuilds)
          setSelectedVersionId(serverVersions[0]?.id ?? null)
        },
      )
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Request failed.')
        show(
          'Unable to load MCP server',
          error instanceof Error
            ? error.message
            : 'Request failed.',
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token, mcpId, show])

  /*
   * ---------------------------------------------------------
   * Upload MCP version
   * ---------------------------------------------------------
   */

  const upload = async (file: File) => {
    if (!token || mcpId === null) {
      return
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith('.zip')
    ) {
      show(
        'Invalid file',
        'Please select an MCP ZIP file.',
      )
      return
    }

    setUploading(true)

    try {
      const version = await uploadMcpVersion(
        token,
        mcpId,
        file,
      )

      setVersions((items) => [
        version,
        ...items,
      ])
      setSelectedVersionId(version.id)

      show(
        'Version uploaded',
        `Version ${version.version} passed server validation.`,
      )
    } catch (error) {
      show(
        'Upload failed',
        error instanceof Error
          ? error.message
          : 'Unable to upload ZIP.',
      )
    } finally {
      setUploading(false)
    }
  }

  /*
   * ---------------------------------------------------------
  * Build selected version
   * ---------------------------------------------------------
   */

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? null
  const selectedBuild = selectedVersion
    ? builds.find((build) => build.version_id === selectedVersion.id && build.status === 'SUCCEEDED') ?? null
    : null
  const latestBuild = selectedVersion
    ? builds.find((build) => build.version_id === selectedVersion.id) ?? null
    : null

  const transport = mcp
    ? ({ STDIO: 'stdio', SSE: 'sse', STREAMABLE_HTTP: 'streamable-http' } as const)[mcp.protocol]
    : null

  const loadRuntimeLogs = async () => {
    if (!token || mcpId === null || !selectedVersion) {
      setRuntimeLogs([])
      setRuntimeLogsTruncated(false)
      return
    }
    setLoadingRuntimeLogs(true)
    try {
      const result = await getMcpRuntimeLogs(token, mcpId, selectedVersion.version)
      setRuntimeLogs(result.entries)
      setRuntimeLogsTruncated(result.truncated)
    } catch (error) {
      setRuntimeLogs([])
      setRuntimeLogsTruncated(false)
      setRuntimeError(error instanceof Error ? error.message : 'Unable to load runtime logs.')
    } finally {
      setLoadingRuntimeLogs(false)
    }
  }

  useEffect(() => {
    if (!token || mcpId === null || !selectedVersion) {
      setProject(null)
      setSelectedFile(null)
      return
    }
    getMcpProject(token, mcpId, selectedVersion.version)
      .then((loaded) => {
        setProject(loaded)
        setSelectedFile((current) => current && loaded.files[current] !== undefined ? current : Object.keys(loaded.files)[0] || null)
      })
      .catch(() => setProject(null))
  }, [token, mcpId, selectedVersionId])

  useEffect(() => {
    setFileContent(selectedFile && project?.files[selectedFile] !== undefined ? project.files[selectedFile] : '')
  }, [selectedFile, project])

  useEffect(() => {
    void loadRuntimeLogs()
  }, [token, mcpId, selectedVersionId])

  const refreshProject = async (version = selectedVersion) => {
    if (!token || mcpId === null || !version) return
    const loaded = await getMcpProject(token, mcpId, version.version)
    setProject(loaded)
    setSelectedFile(Object.keys(loaded.files)[0] || null)
  }

  const generateCode = async () => {
    if (!token || mcpId === null) return
    setGenerating(true)
    try {
      const generated = await generateMcp(token, mcpId)
      const nextVersions = [generated, ...versions]
      setVersions(nextVersions)
      setSelectedVersionId(generated.id)
      show('Sample MCP generated', 'A runnable server, manifest, requirements, and environment file are ready to edit.')
    } catch (error) {
      show('Generation failed', error instanceof Error ? error.message : 'Unable to generate MCP code.')
    } finally { setGenerating(false) }
  }

  const saveFile = async () => {
    if (!token || mcpId === null || !selectedVersion || !project || !selectedFile) return
    setSavingFile(true)
    try {
      const updated = await updateMcpFile(token, mcpId, selectedVersion.version, selectedFile, fileContent, project.revision)
      setProject(updated)
      show('File saved', selectedFile)
    } catch (error) { show('File save failed', error instanceof Error ? error.message : 'Unable to save file.') }
    finally { setSavingFile(false) }
  }

  const createFile = async () => {
    const path = window.prompt('New file path', 'tools.py')?.trim()
    if (!token || mcpId === null || !selectedVersion || !project || !path) return
    try {
      const updated = await updateMcpFile(token, mcpId, selectedVersion.version, path, '', project.revision)
      setProject(updated); setSelectedFile(path); show('File created', path)
    } catch (error) { show('File creation failed', error instanceof Error ? error.message : 'Unable to create file.') }
  }

  const createFolder = async () => {
    const path = window.prompt('New folder path', 'src')?.trim()
    if (!token || mcpId === null || !selectedVersion || !project || !path) return
    try {
      const updated = await createMcpFolder(token, mcpId, selectedVersion.version, path, project.revision)
      setProject(updated); show('Folder created', path)
    } catch (error) { show('Folder creation failed', error instanceof Error ? error.message : 'Unable to create folder.') }
  }

  const removeFile = async () => {
    if (!token || mcpId === null || !selectedVersion || !project || !selectedFile || !window.confirm(`Delete ${selectedFile}?`)) return
    try {
      const updated = await deleteMcpFile(token, mcpId, selectedVersion.version, selectedFile, project.revision)
      setProject(updated); setSelectedFile(Object.keys(updated.files)[0] || null); show('File deleted', selectedFile)
    } catch (error) { show('Delete failed', error instanceof Error ? error.message : 'Unable to delete file.') }
  }

  const downloadProject = async () => {
    if (!token || mcpId === null || !selectedVersion) return
    setExporting(true)
    try {
      const archive = await exportMcp(token, mcpId, selectedVersion.version)
      const url = URL.createObjectURL(archive); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${mcp?.name || 'mcp'}-v${selectedVersion.version}.zip`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
    } catch (error) { show('Export failed', error instanceof Error ? error.message : 'Unable to export MCP project.') }
    finally { setExporting(false) }
  }

  const buildSelected = async () => {
    if (
      !token ||
      mcpId === null ||
      !selectedVersion
    ) {
      show(
        'Upload a version first',
        'Build requires a validated ZIP version.',
      )
      return
    }

    setBuilding(true)

    try {
      const build = await buildMcpVersion(
        token,
        mcpId,
        selectedVersion.version,
      )

      setBuilds((items) => [build, ...items.filter((item) => item.id !== build.id)])

      show(
        build.status === 'SUCCEEDED'
          ? 'Image built'
          : 'Build failed',
        build.error ||
          build.image_ref ||
          'Build completed.',
      )
    } catch (error) {
      show(
        'Build request failed',
        error instanceof Error
          ? error.message
          : 'Unable to start the build.',
      )
    } finally {
      setBuilding(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * Get tool name
   * ---------------------------------------------------------
   */

  const getToolName = (
    tool: McpTool,
  ): string => {
    return (
      tool.name ||
      String(tool.id)
    )
  }

  /*
   * ---------------------------------------------------------
   * Get tool schema
   * ---------------------------------------------------------
   */

  const getToolSchema = (
    tool: McpTool,
  ): unknown => {
    return (
      tool.input_schema ??
      tool.inputSchema
    )
  }

  /*
   * ---------------------------------------------------------
   * Create example input from MCP schema
   * ---------------------------------------------------------
   */

  const createExampleInput = (
    schema: unknown,
  ): Record<string, unknown> => {
    if (
      !schema ||
      typeof schema !== 'object'
    ) {
      return {}
    }

    const objectSchema =
      schema as {
        properties?: Record<
          string,
          {
            type?: string
            default?: unknown
            example?: unknown
          }
        >
      }

    if (!objectSchema.properties) {
      return {}
    }

    const result: Record<
      string,
      unknown
    > = {}

    for (const [
      key,
      property,
    ] of Object.entries(
      objectSchema.properties,
    )) {
      if (
        property.example !== undefined
      ) {
        result[key] =
          property.example
        continue
      }

      if (
        property.default !== undefined
      ) {
        result[key] =
          property.default
        continue
      }

      switch (property.type) {
        case 'string':
          result[key] = ''
          break

        case 'number':
        case 'integer':
          result[key] = 0
          break

        case 'boolean':
          result[key] = false
          break

        case 'array':
          result[key] = []
          break

        case 'object':
          result[key] = {}
          break

        default:
          result[key] = null
      }
    }

    return result
  }

  /*
   * ---------------------------------------------------------
   * Select tool
   * ---------------------------------------------------------
   */

  const selectTool = (
    tool: McpTool,
  ) => {
    const name = getToolName(tool)

    setSelectedTool(name)
    setInvocationResult(null)

    const schema =
      getToolSchema(tool)

    if (schema) {
      setToolInput(
        JSON.stringify(
          createExampleInput(
            schema,
          ),
          null,
          2,
        ),
      )
    } else {
      setToolInput('{}')
    }
  }

  useEffect(() => {
    if (!token || mcpId === null || !selectedVersion) {
      setTools([])
      setSelectedTool('')
      setToolInput('{}')
      setInvocationResult(null)
      setInvocationHistory([])
      return
    }

    setTools([])
    setSelectedTool('')
    setToolInput('{}')
    setInvocationResult(null)
    setRuntimeError(null)
    setInvocationHistory([])
  }, [selectedVersionId])

  /*
   * ---------------------------------------------------------
   * Discover MCP tools
   *
   * IMPORTANT:
   * listTools() returns:
   *
   * {
   *   tools: any[],
   *   error: string | null
   * }
   *
   * It does NOT return InvocationResult.
   * ---------------------------------------------------------
   */

  const listAvailableTools =
    async () => {
      if (
        !token ||
        mcpId === null ||
        !selectedVersion
      ) {
        show(
          'Select a version first',
          'Tool listing requires a validated version.',
        )
        return
      }

      setLoadingTools(true)
      setInvocationResult(null)

      try {
        const result =
          await listTools(
            token,
            mcpId,
            selectedVersion.id,
          )

        /*
         * listTools result:
         *
         * {
         *   tools: any[],
         *   error: string | null
         * }
         */

        if (result.error) {
          setTools([])
          setRuntimeError(result.error)
          await loadRuntimeLogs()

          show(
            'Tool listing failed',
            result.error,
          )

          return
        }

        const discoveredTools =
          (result.tools ||
            []) as McpTool[]

        setTools(
          discoveredTools,
        )
        setRuntimeError(null)
        await loadRuntimeLogs()

        if (
          discoveredTools.length === 0
        ) {
          setSelectedTool('')
          setToolInput('{}')

          show(
            'No tools found',
            'The MCP server did not expose any tools.',
          )

          return
        }

        /*
         * Automatically select first tool.
         */
        const firstTool =
          discoveredTools[0]

        const firstToolName =
          getToolName(firstTool)

        setSelectedTool(
          firstToolName,
        )

        const schema =
          getToolSchema(
            firstTool,
          )

        if (schema) {
          setToolInput(
            JSON.stringify(
              createExampleInput(
                schema,
              ),
              null,
              2,
            ),
          )
        } else {
          setToolInput('{}')
        }

        show(
          'Tools discovered',
          `${discoveredTools.length} tool(s) available.`,
        )
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : 'Unable to list tools.')
        await loadRuntimeLogs()
        show(
          'Tool discovery failed',
          error instanceof Error
            ? error.message
            : 'Unable to list tools.',
        )
      } finally {
        setLoadingTools(false)
      }
    }

  /*
   * ---------------------------------------------------------
   * Invoke selected MCP tool
   * ---------------------------------------------------------
   */

  const invokeSelectedTool =
    async () => {
      if (
        !token ||
        mcpId === null
      ) {
        show(
          'Not authenticated',
          'Please sign in first.',
        )
        return
      }

      if (!selectedVersion) {
        show(
          'No version available',
          'Upload an MCP version first.',
        )
        return
      }

      if (!selectedTool) {
        show(
          'Select a tool',
          'Choose an MCP tool before invoking it.',
        )
        return
      }

      let parsedInput: object

      try {
        const parsed =
          JSON.parse(
            toolInput || '{}',
          )

        if (
          parsed === null ||
          Array.isArray(parsed) ||
          typeof parsed !== 'object'
        ) {
          show(
            'Invalid input',
            'Tool input must be a JSON object.',
          )
          return
        }

        parsedInput =
          parsed as object
      } catch {
        show(
          'Invalid JSON',
          'Please enter valid JSON tool arguments.',
        )
        return
      }

      setInvoking(true)
      setInvocationResult(null)

      try {
        /*
         * IMPORTANT:
         *
         * mcpId is a number.
         *
         * This fixes the original:
         *
         * Argument of type 'string'
         * is not assignable to
         * parameter of type 'number'
         */
        const result =
          await invokeMcpTool(
            token,
            Number(mcpId),
            selectedVersion.id,
            selectedTool,
            parsedInput,
          )

        setInvocationResult(
          result,
        )
        setRuntimeError(result.error)
        await loadRuntimeLogs()
        setInvocationHistory((items) => [
          {
            id: Date.now(),
            toolName: selectedTool,
            version: selectedVersion.version,
            input: parsedInput,
            createdAt: new Date().toISOString(),
            ...result,
          },
          ...items,
        ].slice(0, 20))

        if (
          result.status ===
          'success'
        ) {
          show(
            'Tool invoked',
            result.output ||
              'Tool executed successfully.',
          )
        } else {
          show(
            'Tool invocation failed',
            result.error ||
              'Unknown error.',
          )
        }
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : 'Unable to invoke tool.')
        await loadRuntimeLogs()
        show(
          'Invocation failed',
          error instanceof Error
            ? error.message
            : 'Unable to invoke tool.',
        )
      } finally {
        setInvoking(false)
      }
    }

  /*
   * ---------------------------------------------------------
   * Format output
   * ---------------------------------------------------------
   */

  const formatOutput = (
    output: string,
  ) => {
    try {
      return JSON.stringify(
        JSON.parse(output),
        null,
        2,
      )
    } catch {
      return output
    }
  }

  /*
   * ---------------------------------------------------------
   * Loading
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <WorkspaceLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-400">
          Loading MCP server...
        </div>
      </WorkspaceLayout>
    )
  }

  /*
   * ---------------------------------------------------------
   * Not found
   * ---------------------------------------------------------
   */

  if (!mcp) {
    return (
      <WorkspaceLayout>
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <p className="text-sm text-slate-500">
            {loadError || 'This MCP server could not be found.'}
          </p>

          <Link
            to="/mcp-servers"
            className="mt-4 inline-block text-sm font-bold text-blue-600"
          >
            Back to servers
          </Link>
        </div>
      </WorkspaceLayout>
    )
  }

  /*
   * ---------------------------------------------------------
   * Page
   * ---------------------------------------------------------
   */

  return (
    <WorkspaceLayout>
      <main className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 py-6 sm:px-5 sm:py-8 lg:px-10 lg:py-12">

        {/* Back */}
        <Link
          to="/mcp-servers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft size={15} />
          Back to MCP servers
        </Link>

        {/* Header */}
        <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <Network size={21} />
              </span>

              <div>
                <h1 className="font-display text-4xl font-semibold tracking-[-.05em] text-slate-950 dark:text-white">
                  {mcp.name}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {mcp.description ||
                    'No description provided.'}
                </p>
                <div className="mt-3 flex min-w-0 flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="max-w-full break-words rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Protocol: {mcp.protocol}</span>
                  <span className="max-w-full break-words rounded-md bg-cyan-50 px-2 py-1 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">MCP_TRANSPORT: {transport}</span>
                </div>
              </div>
            </div>
          </div>

          <Badge>
            {mcp.status}
          </Badge>
        </div>

        {/* Upload + Build */}
        <div className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:mt-10">

          {/* Upload */}
          <Card className="min-w-0 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <FileArchive
                size={18}
                className="text-blue-600"
              />

              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Upload a version
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  ZIP files are validated before storage.
                </p>
              </div>
            </div>

            <label
              htmlFor="mcp-archive"
              className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:hover:border-blue-500"
            >
              <UploadCloud
                size={25}
                className="text-blue-600"
              />

              <span className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                Choose MCP ZIP
              </span>

              <span className="mt-1 text-xs text-slate-400">
                Must include mcp.manifest.json
              </span>

              <Input
                id="mcp-archive"
                type="file"
                accept=".zip,application/zip"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  const file =
                    event.target.files?.[0]

                  if (file) {
                    upload(file)
                    event.currentTarget.value =
                      ''
                  }
                }}
              />
            </label>

            {uploading && (
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-600">
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Validating and uploading...
              </p>
            )}
          </Card>

          {/* Build + Test */}
          <Card className="min-w-0 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Build and test
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Build a local OCI image from the selected validated version.
                </p>
              </div>

              <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                Local engine
              </Badge>
            </div>

            <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Version to build
              <select
                value={selectedVersionId ?? ''}
                onChange={(event) => setSelectedVersionId(Number(event.target.value))}
                disabled={building || versions.length === 0}
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    Version {version.version} · {version.source_kind}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">

              <Button
                type="button"
                disabled={
                  building ||
                  versions.length === 0
                }
                onClick={
                  buildSelected
                }
              >
                {building ? (
                  <>
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                    Building...
                  </>
                ) : (
                  <>
                    <Box size={15} />
                    Build image
                  </>
                )}
              </Button>

              <Button type="button" variant="secondary" disabled={generating} onClick={generateCode}>
                {generating ? <><Loader2 size={15} className="animate-spin" />Generating...</> : <><FileCode2 size={15} />Generate code</>}
              </Button>

              <LiveAction
                icon={TerminalSquare}
                label={
                  loadingTools
                    ? 'Discovering...'
                    : 'Test tools'
                }
                disabled={
                  building ||
                  loadingTools ||
                  !selectedBuild
                }
                onClick={
                  listAvailableTools
                }
              />
            </div>

            {/* Latest build */}
            {latestBuild && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Image build · {latestBuild.status === 'QUEUED' || latestBuild.status === 'BUILDING' ? 'Live' : 'Finished'}
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  Version {latestBuild.version} · {latestBuild.status}
                </p>

                {latestBuild.error && (
                  <p className="mt-1 text-xs text-rose-500">
                    {latestBuild.error}
                  </p>
                )}

                {latestBuild.image_ref && (
                  <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
                    {latestBuild.image_ref}
                  </p>
                )}
                <pre className="mt-3 max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-5 text-emerald-300">{latestBuild.logs || 'Waiting for build output...'}</pre>
              </div>
            )}
          </Card>
        </div>

        {project && selectedVersion && (
          <Card className="mt-5 min-w-0 overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold"><FileCode2 size={16} className="text-cyan-300" /> MCP project workspace</div>
                <p className="mt-1 text-xs text-slate-400">Version {selectedVersion.version} · {Object.keys(project.files).length} files</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={createFile}><Plus size={14} />File</Button>
                <Button type="button" variant="secondary" size="sm" onClick={createFolder}><FolderPlus size={14} />Folder</Button>
                <Button type="button" variant="secondary" size="sm" onClick={removeFile} disabled={!selectedFile}><Trash2 size={14} />Delete</Button>
                <Button type="button" size="sm" onClick={downloadProject} disabled={exporting}>{exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}Export ZIP</Button>
              </div>
            </div>
            <div className="grid min-h-[28rem] min-w-0 lg:grid-cols-[16rem_minmax(0,1fr)]">
              <div className="border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 lg:border-b-0 lg:border-r">
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Project files</p>
                <div className="space-y-1">
                  {Object.keys(project.files).map((path) => <button key={path} type="button" onClick={() => setSelectedFile(path)} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-medium ${selectedFile === path ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800'}`}><FileCode2 size={14} />{path}</button>)}
                </div>
              </div>
              <div className="flex min-h-[28rem] min-w-0 flex-col bg-[#101827]">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-700 px-4 py-2 text-xs text-slate-400"><span className="min-w-0 break-all">{selectedFile || 'Select a file'}</span><Button type="button" size="sm" onClick={saveFile} disabled={!selectedFile || savingFile}>{savingFile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save</Button></div>
                <textarea value={fileContent} onChange={(event) => setFileContent(event.target.value)} spellCheck={false} disabled={!selectedFile} className="min-h-[25rem] w-full min-w-0 flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none sm:p-5" />
              </div>
            </div>
          </Card>
        )}

        {/* Versions */}
        <Card className="mt-5 min-w-0 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Versions
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Validated source packages for this server.
              </p>
            </div>

            <span className="text-xs font-bold text-slate-400">
              {versions.length} total
            </span>
          </div>

          {versions.length === 0 ? (
            <EmptyState
              icon={FileArchive}
              message="No versions uploaded yet."
            />
          ) : (
            <div className="mt-5 space-y-2">
              {versions.map(
                (version) => (
                  <div
                    key={version.id}
                    className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center dark:bg-slate-800"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <CheckCircle2
                        size={17}
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Version{' '}
                        {
                          version.version
                        }
                      </p>

                      <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
                        {
                          version.source_digest
                        }
                      </p>
                    </div>

                    <Badge>
                      {
                        version.source_kind
                      }
                    </Badge>

                    <span className="text-xs text-slate-400">
                      {new Date(
                        version.created_at,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </Card>

        <Card className="mt-5 min-w-0 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">Runtime logs</h2>
              <p className="mt-1 text-xs text-slate-500">Persisted diagnostics for the selected MCP version.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={runtimeLogs.some((entry) => entry.level === 'error') ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>
                {runtimeLogs.some((entry) => entry.level === 'error') ? 'Error' : runtimeLogs.length ? 'Healthy' : 'Idle'}
              </Badge>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadRuntimeLogs()} disabled={loadingRuntimeLogs || !selectedVersion}>
                {loadingRuntimeLogs ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh
              </Button>
            </div>
          </div>
          <div className="mt-4 max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-5">
            {loadingRuntimeLogs ? <p className="text-slate-500">Loading runtime logs...</p> : runtimeLogs.length === 0 ? <p className="text-slate-500">No runtime logs for this version yet.</p> : <>{runtimeLogsTruncated && <p className="mb-2 text-amber-300">Showing the latest retained log entries.</p>}{runtimeLogs.map((entry, index) => <div key={`${entry.time}-${index}`} className={entry.level === 'error' ? 'text-rose-300' : 'text-emerald-300'}><span className="mr-2 text-slate-500">{new Date(entry.time).toLocaleTimeString()}</span>{entry.message}</div>)}</>}
          </div>
        </Card>

        {/* Tools */}
        <Card className="mt-5 min-w-0 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Tools
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Discover and invoke tools exposed by the MCP server.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">
                {tools.length}{' '}
                total
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  loadingTools ||
                  invoking ||
                  versions.length === 0
                }
                onClick={
                  listAvailableTools
                }
              >
                {loadingTools ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw
                    size={14}
                  />
                )}

                Refresh
              </Button>
            </div>
          </div>

          {runtimeError && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300">MCP runtime error</p>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-rose-700 dark:text-rose-200">{runtimeError}</pre>
            </div>
          )}

          {versions.length === 0 ? (
            <EmptyState
              icon={TerminalSquare}
              message="Upload a version before discovering tools."
            />
          ) : !selectedBuild ? (
            <EmptyState
              icon={Box}
              message="Build the selected version before testing tools."
            />
          ) : loadingTools ? (
            <div className="mt-7 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 p-8 text-sm text-slate-500 dark:border-slate-700">
              <Loader2 size={18} className="animate-spin text-blue-600" />
              Starting the selected MCP build...
            </div>
          ) : tools.length === 0 ? (
            <div className="mt-7 rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
              <TerminalSquare
                className="mx-auto text-slate-300"
                size={25}
              />

              <p className="mt-3 text-sm font-semibold text-slate-500">
                No tools discovered yet.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Click "Test tools" or
                "Refresh" to discover
                MCP tools.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">

              {/* Tool list */}
              <div className="space-y-2">
                {tools.map(
                  (tool) => {
                    const name =
                      getToolName(
                        tool,
                      )

                    const selected =
                      selectedTool ===
                      name

                    return (
                      <button
                        key={`${tool.id}-${name}`}
                        type="button"
                        onClick={() =>
                          selectTool(
                            tool,
                          )
                        }
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          selected
                            ? 'border-blue-400 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10'
                            : 'border-slate-200 bg-slate-50 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">

                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                            <TerminalSquare
                              size={
                                15
                              }
                            />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {
                                name
                              }
                            </p>

                            {tool.description && (
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {
                                  tool.description
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  },
                )}
              </div>

              {/* Tool invocation */}
              <div className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5 dark:border-slate-700">

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Selected tool
                    </p>

                    <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {
                        selectedTool ||
                        'None'
                      }
                    </p>
                  </div>

                  {selectedTool && (
                    <Badge>
                      MCP Tool
                    </Badge>
                  )}
                </div>

                {selectedTool && (
                  <details className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-400">
                      Input schema
                    </summary>
                    <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                      {formatOutput(JSON.stringify(getToolSchema(tools.find((tool) => getToolName(tool) === selectedTool) ?? { id: selectedTool }) ?? {}, null, 2))}
                    </pre>
                  </details>
                )}

                <div className="mt-5">
                  <label
                    htmlFor="tool-input"
                    className="text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    Tool input
                  </label>

                  <textarea
                    id="tool-input"
                    value={
                      toolInput
                    }
                    onChange={(
                      event,
                    ) =>
                      setToolInput(
                        event.target
                          .value,
                      )
                    }
                    spellCheck={
                      false
                    }
                    className="mt-2 min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
                    placeholder='{"key": "value"}'
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    disabled={
                      invoking ||
                      !selectedTool
                    }
                    onClick={
                      invokeSelectedTool
                    }
                  >
                    {invoking ? (
                      <>
                        <Loader2
                          size={
                            15
                          }
                          className="animate-spin"
                        />
                        Invoking...
                      </>
                    ) : (
                      <>
                        <TerminalSquare
                          size={
                            15
                          }
                        />
                        Invoke tool
                      </>
                    )}
                  </Button>
                </div>

                {/* Invocation result */}
                {invocationResult && (
                  <div className="mt-5">

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Result
                      </p>

                      <Badge
                        className={
                          invocationResult.status ===
                          'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                        }
                      >
                        {
                          invocationResult.status
                        }
                      </Badge>
                    </div>

                    {invocationResult.error && (
                      <pre className="mt-2 max-h-[300px] overflow-auto rounded-xl bg-rose-50 p-4 font-mono text-xs leading-5 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                        {
                          invocationResult.error
                        }
                      </pre>
                    )}

                    {invocationResult.output && (
                      <pre className="mt-2 max-h-[400px] overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-200">
                        {formatOutput(
                          invocationResult.output,
                        )}
                      </pre>
                    )}
                  </div>
                )}

                {invocationHistory.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Recent calls
                      </p>
                      <span className="text-xs text-slate-400">{invocationHistory.length}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {invocationHistory.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedTool(item.toolName)
                            setToolInput(JSON.stringify(item.input, null, 2))
                            setInvocationResult(item)
                          }}
                          className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{item.toolName}</span>
                            <span className="text-[10px] text-slate-400">Version {item.version} · {new Date(item.createdAt).toLocaleTimeString()}</span>
                          </span>
                          <Badge className={item.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>{item.status}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </main>
    </WorkspaceLayout>
  )
}

/*
 * ---------------------------------------------------------
 * Empty state
 * ---------------------------------------------------------
 */

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: typeof Box
  message: string
}) {
  return (
    <div className="mt-7 rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
      <Icon
        className="mx-auto text-slate-300"
        size={25}
      />

      <p className="mt-3 text-sm font-semibold text-slate-500">
        {message}
      </p>
    </div>
  )
}

/*
 * ---------------------------------------------------------
 * Live action button
 * ---------------------------------------------------------
 */

function LiveAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: typeof Box
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-500 px-3 py-3 text-left text-xs font-bold text-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
    >
      <Icon size={15} />
      {label}
    </Button>
  )
}

