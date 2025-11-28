import { Router, type Request, type Response } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'

const router = Router()

router.get('/campaign/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').toLowerCase()
    if (!slug) {
      res.status(400).json({ success: false, error: 'slug is required' })
      return
    }
    if (!supabaseAdmin) {
      res.status(500).json({ success: false, error: 'Administrador do Supabase não configurado' })
      return
    }
    let camp: any = null
    let cErr: any = null
    {
      const { data, error } = await supabaseAdmin
        .from('campaigns')
        .select('id, name, callout, is_active, company_id')
        .eq('slug', slug)
        .limit(1)
        .single()
      camp = data
      cErr = error
    }
    if (!camp) {
      const { data, error } = await supabaseAdmin
        .from('campigns')
        .select('id, name, callout, is_active, company_id')
        .eq('slug', slug)
        .limit(1)
        .single()
      camp = data
      cErr = error
    }
    if (!camp) {
      res.status(404).json({ success: false, error: cErr?.message || 'Campaign not found' })
      return
    }
    const { data: prizes, error: pErr } = await supabaseAdmin
      .from('prizes')
      .select('id, prize_name, description, probability, whatsapp_message')
      .eq('campaign_id', camp.id)
    if (pErr) {
      res.status(500).json({ success: false, error: pErr.message })
      return
    }
    res.status(200).json({ success: true, campaign: camp, prizes: prizes ?? [] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ success: false, error: msg })
  }
})


router.post('/leads', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, campaign_id, campaign_slug, terms_accepted } = req.body

    if (!name || !phone || terms_accepted === undefined) {
      res.status(400).json({ success: false, error: 'Dados incompletos.' })
      return
    }

    const trimmedName = String(name).trim()
    const digits = String(phone).replace(/\D/g, '')
    if (!terms_accepted) {
      res.status(400).json({ success: false, error: 'É necessário aceitar os termos.' })
      return
    }
    if (trimmedName.length < 2) {
      res.status(400).json({ success: false, error: 'Nome inválido.' })
      return
    }
    if (digits.length !== 13 || !digits.startsWith('55')) {
      res.status(400).json({ success: false, error: 'WhatsApp inválido. Use 5531999999999.' })
      return
    }

    if (!supabaseAdmin) {
      res.status(500).json({ success: false, error: 'Administrador do Supabase não configurado' })
      return
    }

    let campId = campaign_id as string | undefined
    if (!campId && campaign_slug) {
      const slug = String(campaign_slug).toLowerCase()
      let found: any = null
      {
        const { data } = await supabaseAdmin!.from('campaigns').select('id').eq('slug', slug).limit(1).single()
        found = data
      }
      if (!found) {
        const { data } = await supabaseAdmin!.from('campigns').select('id').eq('slug', slug).limit(1).single()
        found = data
      }
      if (found?.id) campId = found.id
    }

    if (!campId) {
      res.status(404).json({ success: false, error: 'Campanha não encontrada' })
      return
    }

    let insertPayload: any = { name: trimmedName, phone: digits, campaign_id: campId, terms_accepted }
    let { data, error } = await supabaseAdmin.from('leads').insert(insertPayload).select().single()

    if (error && /terms_accepted/i.test(error.message)) {
      insertPayload = { name: trimmedName, phone: digits, campaign_id: campId }
      const retry = await supabaseAdmin.from('leads').insert(insertPayload).select().single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      res.status(500).json({ success: false, error: error.message })
      return
    }

    res.status(201).json({ success: true, lead: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ success: false, error: msg })
  }
})

export default router;
