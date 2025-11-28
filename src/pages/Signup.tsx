import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!isSupabaseConfigured()) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para cadastrar.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase!.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data.user) {
      if (companyName.trim()) {
        await fetch('/api/auth/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_name: companyName, user_id: data.user.id }),
        })
      }
      setMessage('Cadastro criado! Verifique seu e-mail e faça login.')
      setTimeout(() => navigate('/login'), 1500)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Criar conta</h1>
        <p className="mt-2 text-xs text-gray-400">Crie sua conta de lojista para iniciar campanhas.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="block text-xs text-gray-300">Nome da empresa</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Sorveteria Roleta Mágica"
              className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600"
            />
          </div>
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
          {message && <div className="text-xs text-green-400">{message}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
        <div className="mt-4 text-xs text-gray-400">Já tem conta? <a href="/login" className="text-violet-400 hover:text-violet-300">Entrar</a></div>
      </div>
    </div>
  )
}
