import { useEffect, useState } from 'react'
import { Check, FlaskConical, KeyRound, Loader2, Plus, Save, Star, Trash2 } from 'lucide-react'
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/auth/AuthProvider'
import {
  getLlmDefault,
  createLlmModel,
  deleteLlmModel,
  listLlmModels,
  listLlmProviders,
  saveLlmCredential,
  setLlmDefault,
  setLlmModelAccess,
  testLlmModel,
  type ModelCreateInput,
  type LlmModel,
  type LlmProvider,
} from '@/lib/api'
import { useToast } from '@/components/ui/toast'

export function LlmSettingsPage() {
  const { token } = useAuth()
  const { show } = useToast()
  const [providers, setProviders] = useState<LlmProvider[]>([])
  const [models, setModels] = useState<LlmModel[]>([])
  const [defaultModelId, setDefaultModelId] = useState<number | null>(null)
  const [keys, setKeys] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingProvider, setSavingProvider] = useState<number | null>(null)
  const [updatingModel, setUpdatingModel] = useState<number | null>(null)
  const [testingModel, setTestingModel] = useState<number | null>(null)
  const [creatingModel, setCreatingModel] = useState(false)
  const [modelForm, setModelForm] = useState<ModelCreateInput>({ provider_id: 0, model_name: '', display_name: '', capabilities: { tools: true, streaming: true }, context_window: null, max_output_tokens: null })

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    Promise.all([listLlmProviders(token), listLlmModels(token), getLlmDefault(token)])
      .then(([loadedProviders, loadedModels, defaultResponse]) => {
        setProviders(loadedProviders)
        setModels(loadedModels)
        setDefaultModelId(defaultResponse.model_id)
      })
      .catch(error => show('Unable to load LLM settings', error instanceof Error ? error.message : 'Request failed.'))
      .finally(() => setLoading(false))
  }, [token, show])

  const saveProviderKey = async (provider: LlmProvider) => {
    if (!token || !keys[provider.id]?.trim()) return
    setSavingProvider(provider.id)
    try {
      const result = await saveLlmCredential(token, provider.id, keys[provider.id].trim())
      setKeys(current => ({ ...current, [provider.id]: '' }))
      show('Credential saved', `${provider.display_name} is configured (${result.status.toLowerCase()}).`)
    } catch (error) {
      show('Credential save failed', error instanceof Error ? error.message : 'Unable to save credential.')
    } finally {
      setSavingProvider(null)
    }
  }

  const toggleModel = async (model: LlmModel) => {
    if (!token) return
    setUpdatingModel(model.id)
    try {
      const updated = await setLlmModelAccess(token, model.id, !model.enabled)
      setModels(current => current.map(item => item.id === updated.id ? updated : item))
    } catch (error) {
      show('Model update failed', error instanceof Error ? error.message : 'Unable to update model access.')
    } finally {
      setUpdatingModel(null)
    }
  }

  const chooseDefault = async (model: LlmModel) => {
    if (!token) return
    setUpdatingModel(model.id)
    try {
      await setLlmDefault(token, model.id)
      setDefaultModelId(model.id)
      setModels(current => current.map(item => ({ ...item, is_default: item.id === model.id, enabled: item.id === model.id ? true : item.enabled })))
      show('Default model updated', `${model.display_name} will be used for new agents.`)
    } catch (error) {
      show('Default update failed', error instanceof Error ? error.message : 'Unable to set default model.')
    } finally {
      setUpdatingModel(null)
    }
  }

  const createModel = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token || !modelForm.provider_id || !modelForm.model_name.trim() || !modelForm.display_name.trim()) {
      show('Complete model details', 'Choose a provider and enter both model identifiers.')
      return
    }
    setCreatingModel(true)
    try {
      const created = await createLlmModel(token, modelForm)
      setModels(current => [...current, created])
      setModelForm(current => ({ ...current, model_name: '', display_name: '', context_window: null, max_output_tokens: null }))
      show('Model created', `${created.display_name} is available for configuration.`)
    } catch (error) {
      show('Model creation failed', error instanceof Error ? error.message : 'Unable to create model.')
    } finally {
      setCreatingModel(false)
    }
  }

  const testModel = async (model: LlmModel) => {
    if (!token) return
    setTestingModel(model.id)
    try {
      const result = await testLlmModel(token, model.id)
      setModels(current => current.map(item => item.id === model.id ? { ...item, test_status: result.status, last_tested_at: result.tested_at, last_test_error: result.error } : item))
      show(result.status === 'SUCCEEDED' ? 'Connection succeeded' : 'Connection test failed', result.error || `${model.display_name} responded successfully.`)
    } catch (error) {
      show('Connection test failed', error instanceof Error ? error.message : 'Unable to test model connection.')
    } finally {
      setTestingModel(null)
    }
  }

  const removeModel = async (model: LlmModel) => {
    if (!token || !window.confirm(`Delete ${model.display_name}?`)) return
    try {
      await deleteLlmModel(token, model.id)
      setModels(current => current.filter(item => item.id !== model.id))
      show('Model deleted', model.display_name)
    } catch (error) {
      show('Model deletion failed', error instanceof Error ? error.message : 'Unable to delete model.')
    }
  }

  if (loading) return <WorkspaceLayout><div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-400">Loading LLM settings...</div></WorkspaceLayout>

  return <WorkspaceLayout><main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600 dark:text-blue-400">Workspace settings</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.05em] text-slate-950 dark:text-white">LLM providers</h1><p className="mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-400">Connect provider credentials and choose the models your agents can use.</p></div><Badge><KeyRound size={13} /> Credentials are encrypted</Badge></div>
    <section className="mt-10 grid gap-5 lg:grid-cols-2">{providers.map(provider => <ProviderCard key={provider.id} provider={provider} value={keys[provider.id] || ''} saving={savingProvider === provider.id} onChange={value => setKeys(current => ({ ...current, [provider.id]: value }))} onSave={() => saveProviderKey(provider)} />)}</section>
    <Card className="mt-10 p-6"><div className="flex items-center gap-3"><Plus size={18} className="text-blue-600" /><div><h2 className="font-bold text-slate-950 dark:text-white">Add a model</h2><p className="mt-1 text-xs text-slate-500">Register any model identifier supported by a seeded provider.</p></div></div><form onSubmit={createModel} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><select value={modelForm.provider_id || ''} onChange={event => setModelForm(current => ({ ...current, provider_id: Number(event.target.value) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">Provider</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.display_name}</option>)}</select><Input value={modelForm.model_name} onChange={event => setModelForm(current => ({ ...current, model_name: event.target.value }))} placeholder="Model identifier" /><Input value={modelForm.display_name} onChange={event => setModelForm(current => ({ ...current, display_name: event.target.value }))} placeholder="Display name" /><Button type="submit" disabled={creatingModel}>{creatingModel ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Create model</Button></form></Card>
    <section className="mt-10"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Model access</p><h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">Available models</h2></div><div className="mt-5 space-y-3">{models.length === 0 ? <Card className="p-8 text-center text-sm text-slate-400">No active models are available.</Card> : models.map(model => <ModelRow key={model.id} model={model} isDefault={defaultModelId === model.id} updating={updatingModel === model.id} testing={testingModel === model.id} onToggle={() => toggleModel(model)} onDefault={() => chooseDefault(model)} onTest={() => testModel(model)} onDelete={() => removeModel(model)} />)}</div></section>
  </main></WorkspaceLayout>
}

function ProviderCard({ provider, value, saving, onChange, onSave }: { provider: LlmProvider; value: string; saving: boolean; onChange: (value: string) => void; onSave: () => void }) {
  return <Card className="p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-950 dark:text-white">{provider.display_name}</h2><p className="mt-1 text-xs text-slate-500">{provider.api_family} · {provider.slug}</p></div><Badge>{provider.status}</Badge></div><div className="mt-6 flex flex-col gap-3 sm:flex-row"><Input type="password" value={value} onChange={event => onChange(event.target.value)} placeholder="Paste API key" autoComplete="off" /><Button type="button" disabled={saving || !value.trim()} onClick={onSave}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save key</Button></div><p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Check size={13} className="text-emerald-500" /> Keys are never displayed after saving.</p></Card>
}

function ModelRow({ model, isDefault, updating, testing, onToggle, onDefault, onTest, onDelete }: { model: LlmModel; isDefault: boolean; updating: boolean; testing: boolean; onToggle: () => void; onDefault: () => void; onTest: () => void; onDelete: () => void }) {
  return <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-950 dark:text-white">{model.display_name}</h3>{isDefault && <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"><Star size={12} fill="currentColor" /> Default</Badge>}<Badge>{model.test_status}</Badge></div><p className="mt-1 truncate font-mono text-xs text-slate-400">{model.provider_slug} / {model.model_name}</p><p className="mt-2 text-xs text-slate-500">{Object.entries(model.capabilities).filter(([, enabled]) => enabled).map(([name]) => name).join(' · ') || 'Standard capabilities'}{model.last_test_error ? ` · ${model.last_test_error}` : ''}</p></div><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={testing} onClick={onTest}>{testing ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}Test</Button><Button type="button" size="sm" variant={model.enabled ? 'secondary' : 'outline'} disabled={updating} onClick={onToggle}>{model.enabled ? 'Enabled' : 'Enable'}</Button><Button type="button" size="icon" variant="ghost" aria-label={`Set ${model.display_name} as default`} disabled={updating || !model.enabled} onClick={onDefault}><Star size={17} className={isDefault ? 'text-amber-500' : 'text-slate-400'} fill={isDefault ? 'currentColor' : 'none'} /></Button><Button type="button" size="icon" variant="ghost" aria-label={`Delete ${model.display_name}`} onClick={onDelete}><Trash2 size={15} className="text-rose-500" /></Button></div></Card>
}
