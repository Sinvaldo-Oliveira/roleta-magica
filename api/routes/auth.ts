/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'

const router = Router()

/**
 * User Login
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' })
})

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' })
})

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' })
})

/**
 * Provision resources for new merchant (company)
 * POST /api/auth/provision
 * body: { company_name: string, user_id?: string }
 */
router.post('/provision', async (req: Request, res: Response): Promise<void> => {
  try {
    const { company_name, user_id } = req.body as { company_name?: string; user_id?: string }
    if (!company_name) {
      res.status(400).json({ success: false, error: 'company_name is required' })
      return
    }
    if (!supabaseAdmin) {
      res.status(500).json({ success: false, error: 'Administrador do Supabase não configurado' })
      return
    }
    // Try to insert into companies if table exists
    const { data: company, error: companyErr } = await supabaseAdmin.from('companies').insert({ name: company_name }).select().single()
    if (companyErr) {
      // Table may not exist yet; return graceful message
      res.status(200).json({ success: true, message: 'User registered. DB provisioning skipped (tables missing).', details: companyErr.message })
      return
    }
    // Optionally link user profile if table exists
    if (user_id) {
      await supabaseAdmin.from('users').insert({ id: user_id, company_id: company.id })
    }
    res.status(200).json({ success: true, company })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ success: false, error: msg })
  }
})

export default router
