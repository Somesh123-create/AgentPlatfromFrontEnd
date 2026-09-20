import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Network, Plus, Trash2 } from 'lucide-react'
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/auth/AuthProvider'
import { createMcp, deleteMcp, listMcps, type Mcp } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

export function McpServersPage() {
  const { token } = useAuth(); const { show } = useToast(); const [mcps, setMcps] = useState<Mcp[]>([]); const [loading, setLoading] = useState(true); const [creating, setCreating] = useState(false); const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [mcpType, setMcpType] = useState<'LOCAL' | 'REMOTE'>('REMOTE'); const [protocol, setProtocol] = useState<'STDIO' | 'SSE' | 'STREAMABLE_HTTP'>('STREAMABLE_HTTP'); const [access, setAccess] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE')
  const changeMcpType = (value: 'LOCAL' | 'REMOTE') => { setMcpType(value); setProtocol(value === 'LOCAL' ? 'STDIO' : protocol === 'STDIO' ? 'STREAMABLE_HTTP' : protocol) }
  useEffect(() => { if (!token) { setLoading(false); return } listMcps(token).then(setMcps).catch(error => show('Unable to load MCP servers', error.message)).finally(() => setLoading(false)) }, [token])
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!token) return; setCreating(true); try { const mcp = await createMcp(token, { name, description, mcp_type: mcpType, protocol, access }); setMcps(items => [mcp, ...items]); setName(''); setDescription(''); show('MCP server created', `${mcp.name} is ready to configure.`) } catch (error) { show('Creation failed', error instanceof Error ? error.message : 'Unable to create MCP server.') } finally { setCreating(false) } }
  const remove = async (mcp: Mcp) => { if (!token || !window.confirm(`Delete ${mcp.name}?`)) return; try { await deleteMcp(token, mcp.id); setMcps(items => items.filter(item => item.id !== mcp.id)); show('MCP server deleted', mcp.name) } catch (error) { show('Delete failed', error instanceof Error ? error.message : 'Unable to delete MCP server.') } }
  return <WorkspaceLayout><main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600 dark:text-blue-400">Connected resources</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.05em] text-slate-950 dark:text-white">MCP servers</h1><p className="mt-3 text-base text-slate-500 dark:text-slate-400">Connect agents to tools, context, and external capabilities.</p></div><Badge><Network size={13} /> Owner workspace</Badge></div><div className="mt-10 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><Card className="p-6"><h2 className="text-lg font-bold text-slate-950 dark:text-white">Add a server</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Start with a private remote MCP endpoint.</p><form onSubmit={submit} className="mt-6 space-y-4">
      <Input value={name} onChange={event => setName(event.target.value)} placeholder="Server name" required maxLength={100} />
      <Input value={description} onChange={event => setDescription(event.target.value)} placeholder="Short description" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">MCP Type</label>
          <select value={mcpType} onChange={e => changeMcpType(e.target.value as 'LOCAL' | 'REMOTE')} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option value="LOCAL">LOCAL</option>
            <option value="REMOTE">REMOTE</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Protocol</label>
          <select value={protocol} onChange={e => setProtocol(e.target.value as 'STDIO' | 'SSE' | 'STREAMABLE_HTTP')} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            {mcpType === 'LOCAL' ? <option value="STDIO">STDIO</option> : <><option value="SSE">SSE</option><option value="STREAMABLE_HTTP">STREAMABLE_HTTP</option></>}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Access</label>
          <select value={access} onChange={e => setAccess(e.target.value as 'PRIVATE' | 'PUBLIC')} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option value="PRIVATE">PRIVATE</option>
            <option value="PUBLIC">PUBLIC</option>
          </select>
        </div>
      </div>
      <Button type="submit" disabled={creating} className="w-full">{creating ? <><Loader2 size={16} className="animate-spin" />Creating...</> : <><Plus size={16} />Create MCP server</>}</Button>
    </form></Card><div>{loading ? <div className="flex min-h-52 items-center justify-center text-sm text-slate-400">Loading MCP servers...</div> : mcps.length === 0 ? <Card className="flex min-h-52 flex-col items-center justify-center p-8 text-center"><Network size={27} className="text-slate-300" /><p className="mt-4 text-sm font-bold text-slate-500">No MCP servers yet</p><p className="mt-2 text-xs text-slate-400">Create one to give your future agents tools.</p></Card> : <div className="space-y-3">{mcps.map(mcp => <Card key={mcp.id} className="flex items-center gap-4 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"><Network size={19} /></span><Link to={`/mcp-servers/${mcp.id}`} className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-slate-950 hover:text-blue-600 dark:text-white">{mcp.name}</h3><p className="mt-1 truncate text-xs text-slate-500">{mcp.description || 'No description'}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{mcp.protocol} · {mcp.access}</p></Link><Badge>{mcp.status}</Badge><Button variant="ghost" size="icon" aria-label={`Delete ${mcp.name}`} onClick={() => remove(mcp)}><Trash2 size={16} className="text-rose-500" /></Button></Card>)}</div>}</div></div></main></WorkspaceLayout>
}
