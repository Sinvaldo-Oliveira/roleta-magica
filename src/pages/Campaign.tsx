import LeadForm from '@/components/LeadForm';
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import React from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useUserStore } from '@/store/user'

type Prize = {
  id: string
  prize_name: string
  description?: string | null
  probability: number
  whatsapp_message?: string | null
}

export default function Campaign() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campaign, setCampaign] = useState<{ id: string; name: string; callout?: string | null } | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<Prize | null>(null)
  const [lead, setLead] = useState<any | null>(null);
  const setUser = useUserStore((s) => s.setUser)
  const userName = useUserStore((s) => s.name)

  useEffect(() => {
    const savedLead = localStorage.getItem(`lead_${slug}`);
    if (savedLead) {
      const parsed = JSON.parse(savedLead)
      setLead(parsed)
      setUser(parsed?.name, parsed?.phone)
    }
  }, [slug]);

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
          const { data: prs } = await supabase.from('prizes').select('id, prize_name, description, probability, whatsapp_message').eq('campaign_id', camp.id)
          setCampaign({ id: camp.id, name: camp.name, callout: camp.callout ?? null })
          setPrizes((prs || []).map((p: any) => ({ id: p.id, prize_name: p.prize_name, description: p.description ?? null, probability: Number(p.probability || 0) })))
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
      const prs = (json.prizes || []) as Array<{ id: string; prize_name: string; description?: string | null; probability: number; whatsapp_message?: string | null }>
      setCampaign({ id: camp.id, name: camp.name, callout: camp.callout ?? null })
      setPrizes(prs.map((p) => ({ id: p.id, prize_name: p.prize_name, description: p.description ?? null, probability: Number(p.probability || 0), whatsapp_message: p.whatsapp_message ?? null })))
      setLoading(false)
    }
    load()
  }, [slug])

  function handleSuccess(newLead: any) {
    localStorage.setItem(`lead_${slug}`, JSON.stringify(newLead))
    setLead(newLead)
    setUser(newLead?.name, newLead?.phone)
  }

  function spin() {
    if (!prizes.length || spinning) return
    const total = prizes.reduce((s, p) => s + Number(p.probability || 0), 0)
    if (total <= 0) return
    const rand = Math.random() * total
    let acc = 0
    let idx = 0
    for (let i = 0; i < prizes.length; i++) {
      acc += Number(prizes[i].probability || 0)
      if (rand <= acc) { idx = i; break }
    }
    setResult(null)
    setSpinning(true)
    const extraTurns = 6
    const desiredNorm = targetNormForIndex(idx)
    const currentNorm = normalize(rotation)
    const deltaNorm = normalize(desiredNorm - currentNorm)
    const endRotation = rotation + 360 * extraTurns + deltaNorm
    setRotation(endRotation)
    setTimeout(() => {
      setSpinning(false)
      const norm = normalize(endRotation)
      const finalIndex = indexFromNorm(norm)
      const chosen = prizes[finalIndex]
      setResult(chosen)
      void sendWebhook(chosen)
    }, 2200)
  }

  const colors = ['#7c3aed','#6d28d9','#5b21b6','#7c3aed','#6d28d9','#5b21b6','#7c3aed','#6d28d9','#5b21b6','#7c3aed']
  const angle = prizes.length ? 360 / prizes.length : 0
  const cx = 180
  const cy = 180
  const r = 160
  function pos(deg: number) {
    const rad = (Math.PI / 180) * deg
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  function pathFor(startDeg: number, endDeg: number) {
    const s = pos(startDeg)
    const e = pos(endDeg)
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y} Z`
  }
  function labelPos(midDeg: number) {
    const rad = (Math.PI / 180) * midDeg
    const rr = r * 0.62
    return { x: cx + rr * Math.cos(rad), y: cy + rr * Math.sin(rad) }
  }
  function segmentRotation(i: number) {
    return i * angle
  }
  function normalize(a: number) {
    return ((a % 360) + 360) % 360
  }
  function targetNormForIndex(i: number) {
    const mid = i * angle - 90 + angle / 2
    return normalize(-90 - mid)
  }
  function indexFromNorm(norm: number) {
    const alpha = normalize(-90 - norm)
    const idx = Math.floor(normalize(alpha + 90) / angle)
    return Math.max(0, Math.min(prizes.length - 1, idx))
  }

  async function sendWebhook(prize: Prize) {
    if (!lead) return
    const template = prize.whatsapp_message || 'Parabéns! Você ganhou {premio}! 🎉 Válido até {validade}. Apresente esta mensagem na loja.'
    const validadeDays = (() => {
      const txt = campaign?.callout || ''
      const m = txt.match(/(\d+)/)
      return m ? Number(m[1]) : 10
    })()
    const msg = template
      .replace(/\{premio\}/g, prize.prize_name || 'Prêmio')
      .replace(/\{validade\}/g, String(validadeDays))
      .replace(/\{nome\}/g, lead?.name || '')
      .replace(/\{whatsapp\}/g, lead?.phone || '')
    const body = JSON.stringify({
      lead: { name: lead?.name || '', whatsapp: lead?.phone || '' },
      campaign: { slug: slug || '', validity_days: validadeDays },
      prize: { id: prize.id, name: prize.prize_name },
      template,
      message: msg,
    })
    try {
      await fetch('https://webhookn8n.conectyia.cloud/webhook/disp-resultado-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
    } catch {}
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">Campanha</div>
            <h1 className="text-2xl md:text-3xl font-semibold">{campaign?.name || '—'}</h1>
            {campaign?.callout && <div className="mt-1 text-sm text-gray-300">{campaign.callout}</div>}
            {(lead?.name || userName) && (
              <div className="mt-2 text-lg md:text-xl text-gray-200">
                <span className="font-semibold">{lead?.name ?? userName}</span> — Seja bem-vindo à Roleta Mágica, boa sorte.
              </div>
            )}
          </div>
          <a href="/" className="rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20">Voltar</a>
        </div>

        {loading ? (
          <div className="mt-10 text-sm text-gray-400">Carregando...</div>
        ) : error ? (
          <div className="mt-10 text-sm text-red-400">{error}</div>
        ) : (
          <>
            {campaign && !lead && <LeadForm campaignId={campaign.id} onSuccess={handleSuccess} />}
            {campaign && lead && (
              <div className="mt-8 grid md:grid-cols-1 gap-8 place-items-center">
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                  <div className="relative w-[500px] h-[500px] rounded-lg border border-white/10 bg-black overflow-hidden">
                    <svg viewBox="0 0 360 360" className="absolute inset-0 h-full w-full origin-center" style={{ transform: `scale(1.1) rotate(${rotation}deg)`, transition: spinning ? 'transform 2s cubic-bezier(0.22, 1, 0.36, 1)' : 'none' }}>
                      <circle cx={cx} cy={cy} r={r} fill="#0b0b0b" stroke="#222" strokeWidth={2} />
                      {prizes.map((p, i) => {
                        const start = i * angle - 90
                        const end = start + angle
                        const mid = start + angle / 2
                        const lp = labelPos(mid)
                        return (
                          <g key={p.id}>
                            <path d={pathFor(start, end)} fill={colors[i % colors.length]} opacity={0.9} stroke="#000" strokeWidth={1} />
                            <text x={lp.x} y={lp.y} fontSize={10} fill="#fff" textAnchor="middle" transform={`rotate(${segmentRotation(i)} ${lp.x} ${lp.y})`}>
                              {p.prize_name}
                            </text>
                          </g>
                        )
                      })}
                      <circle cx={cx} cy={cy} r={40} fill="#000" stroke="#222" />
                    </svg>
                    <div className="absolute left-1/2 top-2 -translate-x-1/2 h-0 w-0 border-l-8 border-r-8 border-b-[14px] border-l-transparent border-r-transparent border-b-orange-500" />
                    <button onClick={spin} disabled={spinning || !prizes.length} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-full bg-violet-600 px-5 py-3 text-sm hover:bg-violet-500 disabled:opacity-50">{spinning ? 'Girando...' : 'Girar roleta'}</button>
                  </div>
                  
                  {result && (
                    <div className="mt-3 rounded-lg border border-white/10 bg-black p-3">
                      <div className="text-xs text-gray-400">Resultado</div>
                      <div className="mt-1 text-sm">{result.prize_name}</div>
                      {result.description && <div className="mt-1 text-xs text-gray-300">{result.description}</div>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
