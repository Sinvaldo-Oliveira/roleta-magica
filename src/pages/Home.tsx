import { useState } from "react";
import wheelImg from "@/assets/wheel.svg";

export default function Home() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const segments = [
    { name: "Casquinha Grátis", probability: 20 },
    { name: "10% OFF", probability: 18 },
    { name: "Bola Extra", probability: 15 },
    { name: "Milk-shake Pequeno", probability: 7 },
    { name: "Topping Grátis", probability: 14 },
    { name: "20% OFF", probability: 6 },
    { name: "Taça Especial", probability: 3 },
    { name: "Trufa de Chocolate", probability: 8 },
    { name: "Não foi dessa vez", probability: 6 },
    { name: "1 Chance Extra", probability: 3 },
  ];

  function pickWeightedIndex() {
    const total = segments.reduce((s, x) => s + x.probability, 0);
    const r = Math.random() * total;
    let acc = 0;
    for (let i = 0; i < segments.length; i++) {
      acc += segments[i].probability;
      if (r <= acc) return i;
    }
    return segments.length - 1;
  }

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const index = pickWeightedIndex();
    const centerAngle = index * 36 + 18;
    const turns = 8;
    const target = turns * 360 + (90 - centerAngle);
    setRotation((prev) => prev + target);
    setTimeout(() => {
      setSpinning(false);
      setResult(segments[index].name);
    }, 3200);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-violet-600" />
            <span className="text-sm font-semibold tracking-wide">Roleta Premiada SaaS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-300">
            <a href="#features" className="hover:text-white">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-white">Como funciona</a>
            <a href="#tecnologia" className="hover:text-white">Tecnologia</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="/login" className="hidden md:inline-flex items-center rounded-full px-4 py-2 text-sm bg-white/10 hover:bg-white/20">Ver demo</a>
            <a href="/login" className="inline-flex items-center rounded-full px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500">Começar</a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pt-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">Engaje clientes com uma roleta premiada e capture leads.</h1>
            <p className="mt-4 text-gray-300">Crie campanhas personalizadas, defina prêmios e probabilidades, e entregue automaticamente via WhatsApp. Multi-empresa, seguro e escalável com Supabase.</p>
            <div className="mt-6 flex items-center gap-3">
              <a href="/cadastro" className="inline-flex items-center rounded-full bg-violet-600 px-6 py-3 text-sm font-medium hover:bg-violet-500">Criar campanha</a>
              <a href="/cadastro-cliente/sabor-de-minas" className="inline-flex items-center rounded-full bg-white/10 px-6 py-3 text-sm font-medium hover:bg-white/20">Eu quero jogar</a>
            </div>
            <div className="mt-4 text-xs text-gray-400">PWA, Dark Mode, integrações e relatórios incluídos.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="relative aspect-[16/10] rounded-lg border border-white/10 bg-black flex items-center justify-center overflow-hidden">
              <img
                src={wheelImg}
                alt="Roleta de exemplo"
                className="h-[260px] w-auto transition-transform duration-[3000ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <div className="absolute top-2 left-1/2 -translate-x-1/2" aria-hidden>
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={spin}
                disabled={spinning}
                className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-50"
              >
                Girar agora
              </button>
              {result && (
                <span className="text-xs text-gray-300">Resultado: {result}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold">Funcionalidades principais</h2>
        <p className="mt-2 text-gray-300">Painel do lojista completo, roleta para clientes e integração via WhatsApp.</p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="h-6 w-6 rounded bg-violet-600" />
            <div className="mt-3 text-sm font-medium">Campanhas rápidas</div>
            <div className="mt-1 text-sm text-gray-300">Crie e ative campanhas com slug único em minutos.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="h-6 w-6 rounded bg-violet-600" />
            <div className="mt-3 text-sm font-medium">Prêmios configuráveis</div>
            <div className="mt-1 text-sm text-gray-300">Tipos diversos, quantidade, probabilidade e mensagem de entrega.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="h-6 w-6 rounded bg-violet-600" />
            <div className="mt-3 text-sm font-medium">Relatórios</div>
            <div className="mt-1 text-sm text-gray-300">Leads, desempenho e prêmios mais populares.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="h-6 w-6 rounded bg-violet-600" />
            <div className="mt-3 text-sm font-medium">Autenticação segura</div>
            <div className="mt-1 text-sm text-gray-300">Supabase Auth com e-mail e senha, reset de senha e políticas.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="h-6 w-6 rounded bg-violet-600" />
            <div className="mt-3 text-sm font-medium">PWA</div>
            <div className="mt-1 text-sm text-gray-300">Instalação em desktop e mobile com ícone e splash personalizado.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="h-6 w-6 rounded bg-violet-600" />
            <div className="mt-3 text-sm font-medium">Dark Mode</div>
            <div className="mt-1 text-sm text-gray-300">Ativação automática ou manual para melhor experiência.</div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold">Como funciona</h2>
        <div className="mt-6 grid md:grid-cols-4 gap-6 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-gray-400">1</div>
            <div className="mt-2 font-medium">Configure a campanha</div>
            <div className="mt-1 text-gray-300">Identidade visual, prêmios e mensagem de WhatsApp.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-gray-400">2</div>
            <div className="mt-2 font-medium">Compartilhe o link</div>
            <div className="mt-1 text-gray-300">Use o slug único da campanha para divulgação.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-gray-400">3</div>
            <div className="mt-2 font-medium">Clientes giram a roleta</div>
            <div className="mt-1 text-gray-300">Microcadastro com nome e telefone e roleta animada.</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-gray-400">4</div>
            <div className="mt-2 font-medium">Entrega automática</div>
            <div className="mt-1 text-gray-300">Prêmio enviado via WhatsApp por webhook configurável.</div>
          </div>
        </div>
      </section>

      <section id="tecnologia" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold">Tecnologia</h2>
        <p className="mt-2 text-gray-300">Lovable para frontend, Supabase para backend e banco de dados, design responsivo e PWA.</p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-violet-600/40 bg-violet-600/10 px-3 py-1">Lovable</span>
          <span className="rounded-full border border-violet-600/40 bg-violet-600/10 px-3 py-1">Supabase</span>
          <span className="rounded-full border border-violet-600/40 bg-violet-600/10 px-3 py-1">PWA</span>
          <span className="rounded-full border border-violet-600/40 bg-violet-600/10 px-3 py-1">WhatsApp API</span>
          <span className="rounded-full border border-violet-600/40 bg-violet-600/10 px-3 py-1">Tailwind</span>
        </div>
        <div className="mt-8">
          <a href="/login" className="inline-flex items-center rounded-full bg-violet-600 px-6 py-3 text-sm font-medium hover:bg-violet-500">Começar agora</a>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between text-xs text-gray-400">
          <div>© {new Date().getFullYear()} Roleta Premiada SaaS</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white">Termos</a>
            <a href="#" className="hover:text-white">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
