import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  FileArchive,
  Loader2,
  Network,
  RefreshCw,
  Rocket,
  Square,
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
  deployMcpVersion,
  getMcp,
  listMcpBuilds,
  listMcpDeployments,
  listMcpVersions,
  invokeTool as invokeMcpTool,
  listTools,
  restartMcp,
  undeployMcp,
  uploadMcpVersion,
  type Mcp,
  type McpBuild,
  type McpDeployment,
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

export function McpDetailPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const { show } = useToast()

  const [mcp, setMcp] = useState<Mcp | null>(null)
  const [versions, setVersions] = useState<McpVersion[]>([])
  const [builds, setBuilds] = useState<McpBuild[]>([])
  const [deployments, setDeployments] = useState<McpDeployment[]>([])

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [building, setBuilding] = useState(false)
  const [deploying, setDeploying] = useState(false)

  const [loadingTools, setLoadingTools] = useState(false)
  const [invoking, setInvoking] = useState(false)

  const [tools, setTools] = useState<McpTool[]>([])
  const [selectedTool, setSelectedTool] = useState('')
  const [toolInput, setToolInput] = useState('{}')

  const [invocationResult, setInvocationResult] =
    useState<InvocationResult | null>(null)

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
      return
    }

    setLoading(true)

    Promise.all([
      getMcp(token, mcpId),
      listMcpVersions(token, mcpId),
      listMcpBuilds(token, mcpId),
      listMcpDeployments(token, mcpId),
    ])
      .then(
        ([
          server,
          serverVersions,
          serverBuilds,
          serverDeployments,
        ]) => {
          setMcp(server)
          setVersions(serverVersions)
          setBuilds(serverBuilds)
          setDeployments(serverDeployments)
        },
      )
      .catch((error) => {
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
   * Build latest version
   * ---------------------------------------------------------
   */

  const buildLatest = async () => {
    if (
      !token ||
      mcpId === null ||
      !versions[0]
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
        versions[0].version,
      )

      setBuilds((items) => [
        build,
        ...items,
      ])

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
   * Deploy latest version
   * ---------------------------------------------------------
   */

  const deployLatest = async () => {
    if (
      !token ||
      mcpId === null ||
      !versions[0]
    ) {
      show(
        'Upload a version first',
        'Deployment requires a validated version.',
      )
      return
    }

    setDeploying(true)

    try {
      const deployment =
        await deployMcpVersion(
          token,
          mcpId,
          versions[0].version,
        )

      setDeployments((items) => [
        deployment,
        ...items,
      ])

      show(
        deployment.status === 'RUNNING'
          ? 'MCP deployed'
          : 'Deployment failed',
        deployment.error ||
          deployment.image_ref ||
          'Deployment completed.',
      )
    } catch (error) {
      show(
        'Deployment failed',
        error instanceof Error
          ? error.message
          : 'Unable to deploy MCP server.',
      )
    } finally {
      setDeploying(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * Stop deployment
   * ---------------------------------------------------------
   */

  const stopDeployment = async (
    deployment: McpDeployment,
  ) => {
    if (
      !token ||
      mcpId === null
    ) {
      return
    }

    try {
      const updated =
        await undeployMcp(
          token,
          mcpId,
          deployment.id,
        )

      setDeployments((items) =>
        items.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      )

      show(
        'MCP undeployed',
        'The runtime container was stopped.',
      )
    } catch (error) {
      show(
        'Undeploy failed',
        error instanceof Error
          ? error.message
          : 'Unable to stop deployment.',
      )
    }
  }

  /*
   * ---------------------------------------------------------
   * Restart deployment
   * ---------------------------------------------------------
   */

  const restartDeployment = async (
    deployment: McpDeployment,
  ) => {
    if (
      !token ||
      mcpId === null
    ) {
      return
    }

    try {
      const updated =
        await restartMcp(
          token,
          mcpId,
          deployment.id,
        )

      setDeployments((items) =>
        items.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      )

      show(
        'MCP restarted',
        updated.status,
      )
    } catch (error) {
      show(
        'Restart failed',
        error instanceof Error
          ? error.message
          : 'Unable to restart deployment.',
      )
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
        !versions[0]
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
            versions[0].version,
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

      if (!versions[0]) {
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
            versions[0].version,
            selectedTool,
            parsedInput,
          )

        setInvocationResult(
          result,
        )

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
            This MCP server could not be found.
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
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">

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
              </div>
            </div>
          </div>

          <Badge>
            {mcp.status}
          </Badge>
        </div>

        {/* Upload + Build */}
        <div className="mt-10 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">

          {/* Upload */}
          <Card className="p-6">
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

          {/* Build + Deploy */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Build and deploy
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Build a local OCI image from the latest validated version.
                </p>
              </div>

              <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                Local engine
              </Badge>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">

              <Button
                type="button"
                disabled={
                  building ||
                  deploying ||
                  versions.length === 0
                }
                onClick={
                  buildLatest
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

              <LiveAction
                icon={Rocket}
                label={
                  deploying
                    ? 'Deploying...'
                    : 'Deploy server'
                }
                disabled={
                  building ||
                  deploying ||
                  versions.length === 0
                }
                onClick={
                  deployLatest
                }
              />

              <LiveAction
                icon={TerminalSquare}
                label={
                  loadingTools
                    ? 'Discovering...'
                    : 'Test tools'
                }
                disabled={
                  building ||
                  deploying ||
                  loadingTools ||
                  versions.length === 0
                }
                onClick={
                  listAvailableTools
                }
              />
            </div>

            {/* Latest build */}
            {builds.length > 0 && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Latest build
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {builds[0].status}
                </p>

                {builds[0].error && (
                  <p className="mt-1 text-xs text-rose-500">
                    {builds[0].error}
                  </p>
                )}

                {builds[0].image_ref && (
                  <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
                    {builds[0].image_ref}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Versions */}
        <Card className="mt-5 p-6">
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

        {/* Deployments */}
        <Card className="mt-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Deployments
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Runtime instances of this MCP server.
              </p>
            </div>

            <span className="text-xs font-bold text-slate-400">
              {deployments.length} total
            </span>
          </div>

          {deployments.length === 0 ? (
            <EmptyState
              icon={Rocket}
              message="No deployments yet."
            />
          ) : (
            <div className="mt-5 space-y-3">
              {deployments.map(
                (deployment) => {
                  const isRunning =
                    deployment.status ===
                    'RUNNING'

                  return (
                    <div
                      key={
                        deployment.id
                      }
                      className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            isRunning
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isRunning ? (
                            <CheckCircle2
                              size={17}
                            />
                          ) : (
                            <Square
                              size={15}
                            />
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Deployment #
                            {
                              deployment.id
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Status:{' '}
                            <span className="font-semibold">
                              {
                                deployment.status
                              }
                            </span>
                          </p>

                          {deployment.image_ref && (
                            <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
                              {
                                deployment.image_ref
                              }
                            </p>
                          )}

                          {deployment.error && (
                            <p className="mt-1 text-xs text-rose-500">
                              {
                                deployment.error
                              }
                            </p>
                          )}
                        </div>

                        <Badge>
                          {
                            deployment.status
                          }
                        </Badge>

                        <div className="flex gap-2">
                          {isRunning ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                stopDeployment(
                                  deployment,
                                )
                              }
                            >
                              <Square
                                size={
                                  14
                                }
                              />
                              Stop
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                restartDeployment(
                                  deployment,
                                )
                              }
                            >
                              <RefreshCw
                                size={
                                  14
                                }
                              />
                              Restart
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          )}
        </Card>

        {/* Tools */}
        <Card className="mt-5 p-6">
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

          {versions.length === 0 ? (
            <EmptyState
              icon={TerminalSquare}
              message="Upload a version before discovering tools."
            />
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
            <div className="mt-6 grid gap-5 lg:grid-cols-[.7fr_1.3fr]">

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
              <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">

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

