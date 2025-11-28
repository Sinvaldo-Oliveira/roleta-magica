import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import LeadForm from '@/components/LeadForm'
import { useUserStore } from '@/store/user'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function ClientRegister() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<{ id: string; name: string; callout?: string | null } | null>(null)
  const setUser = useUserStore((s) => s.setUser)

  useEffect(() => {
    async function load() {
      setError(null)
      setLoading(true)
      if (!slug) {
        setError('Slug não informado')
        setLoading(false)
        return
      }
      let res = await fetch(`/api/public/campaign/${slug}`)
      if (!res.ok) {
        try {
                    res = await fetch(`https://webspin.conecteplus.com/api/public/campaign/${slug}`)
        } catch {}
      }
      if (!res.ok) {
        if (isSupabaseConfigured() && supabase) {
          const { data: campA } = await supabase.from('campaigns').select('id, name, callout').eq('slug', slug).limit(1).single()
          let camp = campA as any
          if (!camp) {
            const { data: campB } = await supabase.from('campigns').select('id, name, callout').eq('slug', slug).limit(1).single()
            camp = campB as any
          }
          if (!camp) {
            setError('Campanha não encontrada')
            setLoading(false)
            return
          }
          setCampaign({ id: camp.id, name: camp.name, callout: camp.callout ?? null })
          setLoading(false)
          return
        } else {
          setError('Campanha não encontrada')
          setLoading(false)
          return
        }
      }
      const json = await res.json()
      const camp = json.campaign as { id: string; name: string; callout?: string | null }
      setCampaign({ id: camp.id, name: camp.name, callout: camp.callout ?? null })
      setLoading(false)
    }
    load()
  }, [slug])

  function handleSuccess(newLead: any) {
    localStorage.setItem(`lead_${slug}`, JSON.stringify(newLead))
    setUser(newLead?.name, newLead?.phone)
    navigate(`/c/${slug}`)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">Cadastro do Cliente</div>
            <h1 className="text-2xl md:text-3xl font-semibold">{campaign?.name || String(slug || '').split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ') || '—'}</h1>
            <div className="mt-1 text-sm text-gray-300">{campaign?.callout || 'Validade dos prêmios: 10 dias'}</div>
          </div>
          <a href="/" className="rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20">Voltar</a>
        </div>

        {loading ? (
          <div className="mt-10 text-sm text-gray-400">Carregando...</div>
        ) : (
          <div className="mt-8 grid md:grid-cols-1 gap-8 place-items-center">
            <LeadForm campaignId={campaign?.id} campaignSlug={slug} onSuccess={handleSuccess} />
          </div>
        )}
      </div>
    </div>
  )
}
