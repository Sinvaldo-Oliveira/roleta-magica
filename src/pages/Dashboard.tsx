import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useUserStore } from '@/store/user'

type MetricState = {
  leads: number | null
  prizesDelivered: number | null
  activeCampaigns: number | null
  conversion: number | null
}

type Participant = {
  name: string | null
  phone: string | null
  prize_id: string | null
  created_at: string
  prizes?: { prize_name: string } | null
}

type PrizeRel = { prize_name?: string } | null

type CampaignItem = {
  id?: string
  name: string
  slug: string
  is_active: boolean
  created_at?: string
}

type CampaignInsert = {
  name: string
  slug: string
  is_active: boolean
  company_id?: string
  callout?: string
}

export default function Dashboard() {
  const userName = useUserStore((s) => s.name)
  const userPhone = useUserStore((s) => s.phone)
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<MetricState>({ leads: null, prizesDelivered: null, activeCampaigns: null, conversion: null })
  const [participants, setParticipants] = useState<Participant[] | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignItem[] | null>(null)
  const [activeCampaign, setActiveCampaign] = useState<{ name: string; slug: string } | null>(null)
  const [menu, setMenu] = useState<'nova' | 'participantes' | 'campanha' | 'campanhas' | 'qr' | 'config'>('participantes')
  const [name, setName] = useState('')
  const [numPrizes, setNumPrizes] = useState(3)
  const [validityDays, setValidityDays] = useState(30)
  const [whatsTemplate, setWhatsTemplate] = useState(
    'Parabéns! Você ganhou {premio}! 🎉 Válido até {validade}. Apresente esta mensagem na loja.'
  )
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [prizesForm, setPrizesForm] = useState(
    Array.from({ length: 3 }, (_, i) => ({
      prize_name: `Prêmio ${i + 1}`,
      description: '',
      quantity: 0,
      probability: 0,
    }))
  )
  const [activeFlag, setActiveFlag] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const configured = isSupabaseConfigured()

  const [companyName, setCompanyName] = useState('')
  const [companySlogan, setCompanySlogan] = useState('')
  const [companyLogoUrl, setCompanyLogoUrl] = useState('')
  const [brandColor, setBrandColor] = useState('#7c3aed')
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const campaignLink = useMemo(() => {
    const slug = activeCampaign?.slug || 'demo-campanha'
    return `${window.location.origin}/c/${slug}`
  }, [activeCampaign])

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!configured || !supabase) return
      try {
        const session = await supabase.auth.getSession()
        setUserEmail(session.data.session?.user?.email ?? null)
        const companyId = await ensureCompanyId()
        setCompanyId(companyId)
        if (!companyId) {
          if (mounted) {
            setMetrics({ leads: 0, prizesDelivered: 0, activeCampaigns: 0, conversion: null })
            setParticipants(null)
            setCampaigns(null)
            setActiveCampaign(null)
          }
          return
        }
        const { data: allCampaigns } = await supabase
          .from('campaigns')
          .select('id, name, slug, is_active, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
        const allCampaignsData = ((allCampaigns ?? []) as (CampaignItem & { id: string })[])
        const campaignIds = allCampaignsData.map((c) => c.id)
        const [{ count: leadsCount }, { count: deliveredCount }] = await Promise.all([
          supabase.from('leads').select('*', { count: 'exact', head: true }).in('campaign_id', campaignIds.length ? campaignIds : ['00000000-0000-0000-0000-000000000000']),
          supabase.from('leads').select('*', { count: 'exact', head: true }).in('campaign_id', campaignIds.length ? campaignIds : ['00000000-0000-0000-0000-000000000000']).neq('prize_id', null),
        ])
        const conv = leadsCount && deliveredCount ? Math.round((deliveredCount / leadsCount) * 100) : null
        const { data: recent } = await supabase
          .from('leads')
          .select('name, phone, prize_id, created_at, prizes(prize_name), campaign_id')
          .in('campaign_id', campaignIds.length ? campaignIds : ['00000000-0000-0000-0000-000000000000'])
          .order('created_at', { ascending: false })
          .limit(8)
        if (mounted) {
          setMetrics({ leads: leadsCount ?? 0, prizesDelivered: deliveredCount ?? 0, activeCampaigns: allCampaignsData.filter((c) => c.is_active).length, conversion: conv })
          const normalized = (recent ?? []).map((r: Omit<Participant, 'prizes'> & { prizes?: PrizeRel | PrizeRel[] }) => ({
            ...r,
            prizes: Array.isArray(r?.prizes) ? (r.prizes[0] ?? null) : (r?.prizes ?? null),
          })) as Participant[]
          setParticipants(normalized)
          setCampaigns(allCampaignsData)
          const active = allCampaignsData.find((c) => c.is_active)
          setActiveCampaign(active ? { name: active.name, slug: active.slug } : null)
        }
      } catch {
        // graceful fallback
        if (mounted) {
          setMetrics({ leads: 0, prizesDelivered: 0, activeCampaigns: 0, conversion: null })
          setParticipants(null)
          setCampaigns(null)
          setUserEmail(null)
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [configured])

  useEffect(() => {
    async function loadCompany() {
      if (!configured || !supabase) return
      setLoadingCompany(true)
      setSaveError(null)
      setSaveMessage(null)
      const cid = companyId
      if (!cid) {
        setLoadingCompany(false)
        return
      }
      const { data, error } = await supabase.from('companies').select('name, slogan, logo_url, brand_color').eq('id', cid).limit(1)
      if (error) {
        setSaveError(error.message)
      } else if (data && data[0]) {
        const row = data[0] as { name?: string; slogan?: string; logo_url?: string; brand_color?: string }
        setCompanyName(row.name ?? '')
        setCompanySlogan(row.slogan ?? '')
        setCompanyLogoUrl(row.logo_url ?? '')
        setBrandColor(row.brand_color ?? '#7c3aed')
      }
      setLoadingCompany(false)
    }
    if (menu === 'config' && companyId) loadCompany()
  }, [menu, configured, companyId])

  async function saveCompany() {
    if (!configured || !supabase) return
    setSavingSettings(true)
    setSaveError(null)
    setSaveMessage(null)
    const cid = companyId
    if (!cid) {
      setSaveError('Não foi possível identificar a empresa do usuário.')
      setSavingSettings(false)
      return
    }
    const { error } = await supabase
      .from('companies')
      .update({ name: companyName, slogan: companySlogan, logo_url: companyLogoUrl, brand_color: brandColor })
      .eq('id', cid)
    if (error) {
      setSaveError(error.message)
    } else {
      setSaveMessage('Configurações salvas')
    }
    setSavingSettings(false)
  }

  async function uploadLogo(file: File) {
    if (!configured || !supabase) return
    setUploadingLogo(true)
    setSaveError(null)
    setSaveMessage(null)
    const cid = companyId
    if (!cid) {
      setSaveError('Não foi possível identificar a empresa do usuário.')
      setUploadingLogo(false)
      return
    }
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const path = `${cid}/${filename}`
    const { error: upErr } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true })
    if (upErr) {
      setSaveError(upErr.message)
      setUploadingLogo(false)
      return
    }
    const { data: publicData } = supabase.storage.from('company-logos').getPublicUrl(path)
    const url = publicData?.publicUrl || ''
    setCompanyLogoUrl(url) // Optimistic UI update

    // Now, save all company settings including the new logo URL
    const { error: saveErr } = await supabase
      .from('companies')
      .update({ name: companyName, slogan: companySlogan, logo_url: url, brand_color: brandColor })
      .eq('id', cid)

    if (saveErr) {
      setSaveError(saveErr.message)
    } else {
      setSaveMessage('Configurações salvas com sucesso!')
    }
    setUploadingLogo(false)
  }

  async function onCreateCampaign() {
    if (!configured || !supabase) {
      setCreateError('Supabase não configurado')
      return
    }
    if (numPrizes < 3 || numPrizes > 10) {
      setCreateError('Número de prêmios deve estar entre 3 e 10')
      return
    }
    const totalProb = prizesForm.slice(0, numPrizes).reduce((s, p) => s + Number(p.probability || 0), 0)
    if (totalProb !== 100) {
      setCreateError('A soma das probabilidades deve ser 100%')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const companyId = await ensureCompanyId()
      const slug = slugify(name)
      const payload: CampaignInsert = { name, slug, is_active: activeFlag, callout: `Validade dos prêmios: ${validityDays} dias` }
      if (!companyId) {
        setCreateError('Não foi possível vincular seu usuário a uma empresa (company_id). Faça login e tente novamente.')
        setCreating(false)
        return
      }
      payload.company_id = companyId
      const { data, error } = await supabase.from('campaigns').insert(payload).select().single()
      if (error) {
        setCreateError(error.message)
      } else {
        const prizesPayload = prizesForm.slice(0, numPrizes).map((p) => ({
          campaign_id: data.id,
          prize_name: p.prize_name,
          description: p.description,
          quantity: Number(p.quantity || 0),
          probability: Number(p.probability || 0),
          whatsapp_message: whatsTemplate,
        }))
        const { error: prizesErr } = await supabase.from('prizes').insert(prizesPayload)
        if (prizesErr) {
          setCreateError(prizesErr.message)
          setCreating(false)
          return
        }
        setActiveCampaign({ name: data.name, slug: data.slug })
        setMetrics((m) => ({ ...m, activeCampaigns: (m.activeCampaigns ?? 0) + (data.is_active ? 1 : 0) }))
        setMenu('campanha')
        setName('')
        setNumPrizes(3)
        setValidityDays(30)
        setWhatsTemplate('Parabéns! Você ganhou {premio}! 🎉 Válido até {validade}. Apresente esta mensagem na loja.')
        setPrizesForm(Array.from({ length: 3 }, (_, i) => ({ prize_name: `Prêmio ${i + 1}`, description: '', quantity: 0, probability: 0 })))
        setActiveFlag(true)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar campanha'
      setCreateError(msg)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Menu</div>
          <nav className="mt-3 space-y-2">
            <SidebarItem label="Nova Campanha" active={menu==='nova'} onClick={()=>setMenu('nova')} />
            <SidebarItem label="Participantes" active={menu==='participantes'} onClick={()=>setMenu('participantes')} />
            <SidebarItem label="Campanhas" active={menu==='campanhas'} onClick={()=>setMenu('campanhas')} />
            <SidebarItem label="Campanha" active={menu==='campanha'} onClick={()=>setMenu('campanha')} />
            <SidebarItem label="Código QR" active={menu==='qr'} onClick={()=>setMenu('qr')} />
            <SidebarItem label="Configurações" active={menu==='config'} onClick={()=>setMenu('config')} />
          </nav>
        </aside>

        <main>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Painel do Lojista</h1>
              <p className="mt-1 text-sm text-gray-400">Gerencie suas campanhas e acompanhe resultados</p>
            </div>
            <div className="flex items-center gap-3">
              {userEmail && <div className="text-xs text-gray-300">Logado: {userEmail}</div>}
              <button onClick={() => navigate('/')} className="rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20">Voltar para Home</button>
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total de Leads" value={metrics.leads ?? '—'} caption="Contatos captados" />
            <MetricCard title="Prêmios Distribuídos" value={metrics.prizesDelivered ?? '—'} caption="Já entregues" />
            <MetricCard title="Campanhas Ativas" value={metrics.activeCampaigns ?? '—'} caption="Em andamento" />
            <MetricCard title="Taxa de Conversão" value={metrics.conversion != null ? `${metrics.conversion}%` : '—'} caption="Resgates realizados" />
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-6">
            {menu === 'participantes' && (
              <div>
                <h3 className="text-lg font-semibold">Participantes recentes</h3>
                <p className="mt-1 text-xs text-gray-400">Acompanhe quem está girando a roleta</p>
                <div className="mt-4 space-y-3">
                  {participants && participants.length > 0 ? (
                    participants.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-black px-3 py-2">
                        <div>
                          <div className="text-sm">{p.name || 'Visitante'}</div>
                          <div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()}</div>
                        </div>
                        <div className="text-xs text-gray-300">{p.prizes?.prize_name || '—'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400">Não foi possível carregar participantes.</div>
                  )}
                </div>
              </div>
            )}

            {menu === 'campanha' && (
              <div>
                <h3 className="text-lg font-semibold">Campanha ativa</h3>
                <p className="mt-1 text-xs text-gray-400">Dados da campanha em andamento</p>
                {activeCampaign ? (
                  <div className="mt-4 grid sm:grid-cols-2 gap-4">
                    <InfoRow label="Nome" value={activeCampaign.name} />
                    <InfoRow label="Slug" value={activeCampaign.slug} />
                    <InfoRow label="Link" value={campaignLink} copy />
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-gray-400">Nenhuma campanha ativa encontrada.</div>
                )}
              </div>
            )}

            {menu === 'campanhas' && (
              <div>
                <h3 className="text-lg font-semibold">Campanhas</h3>
                <p className="mt-1 text-xs text-gray-400">Lista de campanhas</p>
                <div className="mt-4 space-y-3">
                  {campaigns && campaigns.length > 0 ? (
                    campaigns.map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-black px-3 py-2">
                        <div>
                          <div className="text-sm">{c.name}</div>
                          <div className="text-xs text-gray-400">{c.slug}</div>
                        </div>
                        <div className="text-xs">{c.is_active ? 'Ativa' : 'Inativa'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400">Nenhuma campanha encontrada.</div>
                  )}
                </div>
              </div>
            )}

            {menu === 'qr' && (
              <div>
                <h3 className="text-lg font-semibold">Código QR da Campanha</h3>
                <p className="mt-1 text-xs text-gray-400">Compartilhe com seus clientes</p>
                <div className="mt-4 flex items-center gap-6">
                  <div className="rounded-xl border border-white/10 bg-black p-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(campaignLink)}`}
                      alt="QR da campanha"
                      className="h-44 w-44"
                    />
                  </div>
                  <div className="text-xs text-gray-300 break-all">{campaignLink}</div>
                </div>
              </div>
            )}

            {menu === 'nova' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Criar Nova Campanha</h3>
                  <div className="mt-3 grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-300">Nome da Campanha</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="Ex: Promoção de Verão" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300">Número de Prêmios (3-10)</label>
                      <input type="number" min={3} max={10} value={numPrizes} onChange={(e) => {
                        const v = Math.max(3, Math.min(10, Number(e.target.value || 0)))
                        setNumPrizes(v)
                        setPrizesForm((prev) => {
                          const next = [...prev]
                          if (v > next.length) {
                            for (let i = next.length; i < v; i++) next.push({ prize_name: `Prêmio ${i + 1}`, description: '', quantity: 0, probability: 0 })
                          } else if (v < next.length) {
                            next.splice(v)
                          }
                          return next
                        })
                      }} className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300">Validade dos Prêmios (dias)</label>
                      <input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(Math.max(1, Number(e.target.value || 1)))} className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Ativar campanha</div>
                      <input type="checkbox" checked={activeFlag} onChange={(e) => setActiveFlag(e.target.checked)} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Configurar Prêmios</h3>
                  <div className="mt-3 space-y-4">
                    {prizesForm.slice(0, numPrizes).map((p, i) => (
                      <div key={i} className="rounded-lg border border-white/10 bg-black p-4">
                        <div className="text-sm font-medium">Prêmio {i + 1}</div>
                        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-gray-300">Nome do Prêmio</label>
                            <input value={p.prize_name} onChange={(e) => setPrizesForm((prev)=>{ const next=[...prev]; next[i]={...next[i], prize_name:e.target.value}; return next; })} className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300">Descrição</label>
                            <input value={p.description} onChange={(e) => setPrizesForm((prev)=>{ const next=[...prev]; next[i]={...next[i], description:e.target.value}; return next; })} className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300">Quantidade</label>
                            <input type="number" min={0} value={p.quantity} onChange={(e) => setPrizesForm((prev)=>{ const next=[...prev]; next[i]={...next[i], quantity:Number(e.target.value || 0)}; return next; })} className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="Ex: 50" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300">Probabilidade (%)</label>
                            <input type="number" min={0} max={100} value={p.probability} onChange={(e) => setPrizesForm((prev)=>{ const next=[...prev]; next[i]={...next[i], probability:Number(e.target.value || 0)}; return next; })} className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-gray-400">Soma das probabilidades: {prizesForm.slice(0, numPrizes).reduce((s,p)=> s + Number(p.probability || 0), 0)}%</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Mensagem do WhatsApp</h3>
                  <p className="mt-1 text-xs text-gray-400">Use {`{premio}`}, {`{validade}`}, {`{nome}`} e {`{whatsapp}`} para personalizar</p>
                  <textarea
                    value={whatsTemplate}
                    onChange={(e) => setWhatsTemplate(e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600"
                  />
                  <div className="mt-2 text-xs text-gray-400">Prévia</div>
                  <div className="mt-1 rounded-lg border border-white/10 bg-black p-3 text-sm">
                    {whatsTemplate
                      .replace(/\{premio\}/g, prizesForm[0]?.prize_name || 'Prêmio')
                      .replace(/\{validade\}/g, new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toLocaleDateString())
                      .replace(/\{nome\}/g, userName || 'Cliente')
                      .replace(/\{whatsapp\}/g, userPhone || '5531999999999')}
                  </div>
                </div>

                {createError && <div className="text-xs text-red-400">{createError}</div>}
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => { setName(''); setNumPrizes(3); setValidityDays(30); setWhatsTemplate('Parabéns! Você ganhou {premio}! 🎉 Válido até {validade}. Apresente esta mensagem na loja.'); setPrizesForm(Array.from({ length: 3 }, (_, i) => ({ prize_name: `Prêmio ${i + 1}`, description: '', quantity: 0, probability: 0 }))); setActiveFlag(true); }} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Limpar</button>
                  <button onClick={onCreateCampaign} disabled={creating || !name.trim()} className="rounded-full bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-50">{creating ? 'Criando...' : 'Criar campanha'}</button>
                </div>
              </div>
            )}

            {menu === 'config' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Configurações da Empresa</h3>
                  <div className="mt-3 grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-300">Nome da empresa</label>
                      <input value={companyName} onChange={(e)=>setCompanyName(e.target.value)} className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300">Slogan</label>
                      <input value={companySlogan} onChange={(e)=>setCompanySlogan(e.target.value)} className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="Ex: Experiências que encantam" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-300">Logotipo</label>
                      <div className="mt-1 flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e)=>{ const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
                          className="text-xs"
                        />
                        <button onClick={()=>{ setCompanyLogoUrl('') }} className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20">Remover</button>
                      </div>
                      {uploadingLogo && <div className="mt-2 text-xs text-gray-400">Enviando...</div>}
                      {companyLogoUrl && (
                        <div className="mt-3 flex items-center gap-4">
                          <div className="rounded-xl border border-white/10 bg-black p-3">
                            <img src={companyLogoUrl} alt="Logo" className="h-16 w-16 object-contain" />
                          </div>
                          <div className="text-xs text-gray-400 break-all">{companyLogoUrl}</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300">Cor principal</label>
                      <input type="color" value={brandColor} onChange={(e)=>setBrandColor(e.target.value)} className="mt-1 h-9 w-20 rounded-md bg-black border border-white/10" />
                    </div>
                  </div>
                </div>
                {saveError && <div className="text-xs text-red-400">{saveError}</div>}
                {saveMessage && <div className="text-xs text-green-400">{saveMessage}</div>}
                <div className="flex items-center justify-end">
                  <button onClick={saveCompany} disabled={savingSettings || loadingCompany} className="rounded-full bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-50">{savingSettings ? 'Salvando...' : 'Salvar configurações'}</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function MetricCard({ title, value, caption }: { title: string; value: string | number; caption: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between text-sm">
        <div className="font-medium">{title}</div>
        <div className="h-4 w-4 rounded bg-white/10" />
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-gray-400">{caption}</div>
    </div>
  )
}

function InfoRow({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-sm break-all flex items-center gap-2">
        <span>{value}</span>
        {copy && (
          <button
            onClick={() => navigator.clipboard.writeText(value)}
            className="rounded-full bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
          >
            Copiar
          </button>
        )}
      </div>
    </div>
  )
}

function SidebarItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg px-3 py-2 text-sm border ${active ? 'bg-white/10 border-white/20' : 'bg-black border-white/10 text-gray-300 hover:bg-white/5'}`}
    >
      {label}
    </button>
  )
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function getCompanyId() {
  if (!supabase) return null
  const session = await supabase.auth.getSession()
  const uid = session.data.session?.user?.id
  if (!uid) return null
  const { data } = await supabase.from('users').select('company_id').eq('id', uid).limit(1)
  return data && data[0] ? data[0].company_id : null
}

async function ensureCompanyId(): Promise<string | null> {
  if (!supabase) return null
  const session = await supabase.auth.getSession()
  const user = session.data.session?.user
  const existing = await getCompanyId()
  if (existing) return existing
  if (!user?.id) return null
  const defaultName = (user.email || 'Minha Loja').split('@')[0]
  const { data: company } = await supabase.from('companies').insert({ name: defaultName }).select().single()
  if (company?.id) {
    await supabase.from('users').upsert({ id: user.id, company_id: company.id })
  }
  return await getCompanyId()
}

 
