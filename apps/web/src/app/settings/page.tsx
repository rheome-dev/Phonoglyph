'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { UserDisplay } from '@/components/auth/profile-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { trpc } from '@/lib/trpc'
import { Key, Copy, Trash2, Plus, Eye, EyeOff, Shield } from 'lucide-react'

function ApiKeysSection() {
  const { toast } = useToast()
  const [newKeyName, setNewKeyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data: apiKeys, refetch, isLoading } = trpc.apiKey.list.useQuery()
  const createMutation = trpc.apiKey.create.useMutation()
  const revokeMutation = trpc.apiKey.revoke.useMutation()

  const handleCreate = useCallback(async () => {
    if (!newKeyName.trim()) return
    setIsCreating(true)
    try {
      const result = await createMutation.mutateAsync({
        name: newKeyName.trim(),
        scopes: ['read', 'write', 'render'],
      })
      setRevealedKey(result.key)
      setNewKeyName('')
      setShowCreateForm(false)
      refetch()
      toast({
        title: 'API key created',
        description: 'Copy your key now — it won\'t be shown again.',
      })
    } catch {
      toast({
        title: 'Failed to create API key',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }, [newKeyName, createMutation, refetch, toast])

  const handleRevoke = useCallback(async (id: string, name: string) => {
    try {
      await revokeMutation.mutateAsync({ id })
      refetch()
      toast({
        title: 'API key revoked',
        description: `"${name}" has been revoked.`,
      })
    } catch {
      toast({
        title: 'Failed to revoke API key',
        variant: 'destructive',
      })
    }
  }, [revokeMutation, refetch, toast])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }, [toast])

  const activeKeys = apiKeys?.filter((k) => !k.revoked_at) || []
  const revokedKeys = apiKeys?.filter((k) => k.revoked_at) || []

  return (
    <div className="space-y-6">
      {/* Newly created key banner */}
      {revealedKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                Copy your API key now — it won&apos;t be shown again
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 bg-white border border-amber-300 rounded px-3 py-2 text-sm font-mono text-gray-900 break-all">
                  {revealedKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(revealedKey)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-amber-700"
                onClick={() => setRevealedKey(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create new key */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
          <p className="text-sm text-gray-500">
            Manage API keys for CLI and programmatic access.
          </p>
        </div>
        {!showCreateForm && (
          <Button
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Key
          </Button>
        )}
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key name
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. CLI, CI/CD, Development"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1"
              autoFocus
            />
            <Button onClick={handleCreate} disabled={isCreating || !newKeyName.trim()}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
            <Button variant="ghost" onClick={() => { setShowCreateForm(false); setNewKeyName('') }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Active keys list */}
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading keys...</div>
      ) : activeKeys.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <Key className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No API keys yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Create one to use with the Phonoglyph CLI.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {activeKeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{key.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <code>{key.key_prefix}...{'•'.repeat(8)}</code>
                    <span>·</span>
                    <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                    {key.last_used_at && (
                      <>
                        <span>·</span>
                        <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                      </>
                    )}
                    {key.expires_at && (
                      <>
                        <span>·</span>
                        <span>Expires {new Date(key.expires_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {key.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleRevoke(key.id, key.name)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Revoked</p>
          <div className="border rounded-lg divide-y opacity-60">
            {revokedKeys.map((key) => (
              <div key={key.id} className="flex items-center px-4 py-3">
                <Key className="w-4 h-4 text-gray-300 flex-shrink-0 mr-3" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 line-through">{key.name}</p>
                  <p className="text-xs text-gray-400">
                    Revoked {new Date(key.revoked_at!).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsPageContent() {
  const [activeTab, setActiveTab] = useState<'account' | 'api-keys'>('account')

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <UserDisplay />
          </div>

          {/* Tab navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('account')}
                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                  activeTab === 'account'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Account
              </button>
              <button
                onClick={() => setActiveTab('api-keys')}
                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                  activeTab === 'api-keys'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                API Keys
              </button>
            </nav>
          </div>

          {/* Tab content */}
          <div className="bg-white shadow rounded-lg p-6">
            {activeTab === 'account' && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
                <p className="text-gray-600">
                  Your account details are managed through your authentication provider.
                </p>
              </>
            )}

            {activeTab === 'api-keys' && <ApiKeysSection />}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading settings...</p>
        </div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  )
}
