
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

type LeadFormProps = {
  campaignId?: string;
  campaignSlug?: string;
  onSuccess: (lead: any) => void;
};

export default function LeadForm({ campaignId, campaignSlug, onSuccess }: LeadFormProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 13) {
      setWhatsapp(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('Você precisa aceitar os termos para continuar.');
      return;
    }
    if (whatsapp.length !== 13 || !whatsapp.startsWith('55')) {
      setError('Informe um WhatsApp válido no formato 5531999999999.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const body = JSON.stringify({
        name,
        phone: whatsapp,
        campaign_id: campaignId,
        campaign_slug: campaignSlug,
        terms_accepted: termsAccepted,
      })

      let res = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) {
        try {
          res = await fetch('http://localhost:3001/api/public/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          })
        } catch {}
      }
      if (res && res.ok) {
        const data = await res.json()
        onSuccess(data.lead)
        return
      }
      let serverError = 'Não foi possível salvar seus dados. Tente novamente.'
      try {
        const errJson = await res.json()
        serverError = errJson?.error || serverError
      } catch {}
      throw new Error(serverError)
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-xl border border-white/10 bg-white/5 p-6 text-center">
      <h2 className="text-xl font-semibold">Participe e concorra!</h2>
      <p className="mt-2 text-sm text-gray-400">Preencha seus dados para girar a roleta.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
        <div>
          <label htmlFor="name" className="block text-xs text-gray-300">Nome do cliente</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600"
            placeholder="Seu nome"
            required
          />
        </div>
        <div>
          <label htmlFor="whatsapp" className="block text-xs text-gray-300">WhatsApp</label>
          <input
            id="whatsapp"
            type="tel"
            value={whatsapp}
            onChange={handleWhatsappChange}
            className="mt-1 w-full rounded-lg bg-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600"
            placeholder="5531999999999"
            required
          />
        </div>
        <div className="flex items-start">
          <input
            id="terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <div className="ml-3 text-sm">
            <label htmlFor="terms" className="text-gray-300">
              Eu concordo com os <a href="#" className="underline hover:text-white">termos de uso</a> e aceito receber ofertas e o prêmio pelo WhatsApp.
            </label>
          </div>
        </div>
        {error && <div className="text-xs text-red-400 text-center">{error}</div>}
        <button
          type="submit"
          disabled={loading || !termsAccepted}
          className="w-full rounded-full bg-violet-600 px-5 py-3 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Participar'}
        </button>
      </form>
    </div>
  );
}
