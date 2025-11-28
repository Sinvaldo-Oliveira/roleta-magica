import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured()) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para autenticar.')
      return
    }
    setLoading(true)
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black text-white grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="mt-2 text-xs text-gray-400">Lojistas acessam o painel com e-mail e senha.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="block text-xs text-gray-300">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-300">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600"
              required
            />
          </div>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div className="mt-4 text-xs text-gray-400">Não tem conta? <a href="/cadastro" className="text-violet-400 hover:text-violet-300">Criar conta</a></div>
      </div>
    </div>
  )
}
