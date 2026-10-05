import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const URL_DB = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
const sql = neon(URL_DB || 'postgresql://x:x@localhost/x');
const MP = process.env.MP_ACCESS_TOKEN;
class E extends Error { constructor(m, c = 400) { super(m); this.c = c; } }

let ready;
const init = () => (ready ||= (async () => {
  await sql`CREATE TABLE IF NOT EXISTS comup_vakinhas(id SERIAL PRIMARY KEY, slug TEXT UNIQUE NOT NULL, titulo TEXT NOT NULL, descricao TEXT, valor_cents INT NOT NULL, meta_cents INT NOT NULL, ativa BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS comup_apoios(id SERIAL PRIMARY KEY, ref TEXT UNIQUE NOT NULL, vakinha_id INT NOT NULL REFERENCES comup_vakinhas(id) ON DELETE CASCADE, nome TEXT NOT NULL, email TEXT NOT NULL, telefone TEXT, instagram TEXT, valor_cents INT NOT NULL, mp_id TEXT UNIQUE, status TEXT DEFAULT 'pendente', created_at TIMESTAMPTZ DEFAULT now(), pago_em TIMESTAMPTZ)`;
  await sql`UPDATE comup_vakinhas SET slug='apoio-inicial', titulo='Apoie o início do PasUp' WHERE slug='inicio-do-comup'`;
  await sql`UPDATE comup_vakinhas SET meta_cents=1099, valor_cents=100 WHERE slug='apoio-inicial' AND meta_cents=100000 AND valor_cents=1099`;
  await sql`INSERT INTO comup_vakinhas(slug,titulo,descricao,valor_cents,meta_cents) VALUES('apoio-inicial','Apoie o início do PasUp','Ajude a colocar o PasUp no ar e a manter a plataforma gratuita para as equipes de comunicação das paróquias.',100,1099) ON CONFLICT (slug) DO NOTHING`;
})().catch(e => { ready = null; throw e; }));

const mp = async (path, opt = {}) => {
  const r = await fetch('https://api.mercadopago.com' + path, { ...opt, headers: { Authorization: 'Bearer ' + MP, 'Content-Type': 'application/json', ...opt.headers } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('Mercado Pago', r.status, j); throw new E('Não foi possível falar com o Mercado Pago. Tente novamente.', 502); }
  return j;
};

const todas = () => sql`SELECT v.id,v.slug,v.titulo,v.descricao,v.valor_cents,v.meta_cents,
  COALESCE(SUM(a.valor_cents) FILTER (WHERE a.status='aprovado'),0)::int AS arrecadado,
  count(a.id) FILTER (WHERE a.status='aprovado')::int AS apoiadores
  FROM comup_vakinhas v LEFT JOIN comup_apoios a ON a.vakinha_id=v.id WHERE v.ativa GROUP BY v.id ORDER BY v.id`;

// Confere o pagamento direto no Mercado Pago e atualiza o apoio (nunca confia no corpo do webhook).
async function sync(a) {
  if (a.status !== 'pendente' || !a.mp_id) return a.status;
  const p = await mp('/v1/payments/' + a.mp_id);
  let st = 'pendente';
  if (p.status === 'approved') {
    if (Math.round(p.transaction_amount * 100) === a.valor_cents) st = 'aprovado';
    else console.error('Valor divergente no apoio', a.id);
  } else if (['cancelled', 'rejected', 'expired'].includes(p.status)) st = 'cancelado';
  if (st !== 'pendente') await sql`UPDATE comup_apoios SET status=${st}, pago_em=CASE WHEN ${st}::text='aprovado' THEN now() END WHERE id=${a.id} AND status='pendente'`;
  return st;
}

const txt = (v, n) => String(v || '').trim().slice(0, n);

export default async function handler(req, res) {
  try {
    if (!URL_DB) throw new E('Banco de dados não configurado: falta a variável DATABASE_URL na Vercel', 500);
    await init();
    const [a, b] = (req.query.r || '').split('/').filter(Boolean);
    const m = req.method, d = req.body || {}, ok = (x, s = 200) => res.status(s).json(x);

    if (a === 'lista' && m === 'GET') return ok(await todas());

    if (a === 'item' && b && m === 'GET') {
      const v = (await todas()).find(x => x.slug === b);
      if (!v) throw new E('Vakinha não encontrada', 404);
      const apoiadores = await sql`SELECT nome FROM comup_apoios WHERE vakinha_id=${v.id} AND status='aprovado' ORDER BY pago_em DESC LIMIT 200`;
      return ok({ vakinha: v, apoiadores: apoiadores.map(x => x.nome) });
    }

    if (a === 'pix' && m === 'POST') {
      if (!MP) throw new E('Pagamento ainda não configurado: falta MP_ACCESS_TOKEN na Vercel', 500);
      const v = (await todas()).find(x => x.slug === txt(d.slug, 80));
      if (!v) throw new E('Vakinha não encontrada', 404);
      const rs = c => 'R$ ' + (c / 100).toFixed(2).replace('.', ',');
      const falta = v.meta_cents - v.arrecadado;
      if (falta <= 0) throw new E('A meta desta vakinha já foi atingida. Obrigado!');
      if (d.aceite !== true) throw new E('Aceite os Termos de Serviço e a Política de Privacidade para continuar');
      const nome = txt(d.nome, 120), email = txt(d.email, 160).toLowerCase(), tel = String(d.telefone || '').replace(/\D/g, ''), insta = txt(d.instagram, 60).replace(/^@/, '');
      if (!nome || !/^\S+@\S+\.\S+$/.test(email) || tel.length < 10) throw new E('Preencha nome, e-mail e telefone válidos');
      const s = String(d.valor || '').trim(), n = s.includes(',') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s);
      const cents = Math.round(n * 100);
      const min = Math.min(v.valor_cents, falta);
      if (!Number.isFinite(cents) || cents < min) throw new E(`O valor mínimo é ${rs(min)}`);
      if (cents > falta) throw new E(`O valor máximo é ${rs(falta)}, o que falta para a meta`);
      const ref = crypto.randomUUID();
      const [x] = await sql`INSERT INTO comup_apoios(ref,vakinha_id,nome,email,telefone,instagram,valor_cents) VALUES(${ref},${v.id},${nome},${email},${tel},${insta},${cents}) RETURNING id`;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const p = await mp('/v1/payments', {
        method: 'POST', headers: { 'X-Idempotency-Key': ref },
        body: JSON.stringify({ transaction_amount: cents / 100, description: v.titulo, payment_method_id: 'pix', external_reference: ref, notification_url: `https://${host}/api/vakinha?r=webhook`, payer: { email, first_name: nome.split(' ')[0], last_name: nome.split(' ').slice(1).join(' ') || '-' } })
      });
      const t = p.point_of_interaction?.transaction_data;
      if (!t?.qr_code) throw new E('O Mercado Pago não devolveu o Pix. Tente novamente.', 502);
      await sql`UPDATE comup_apoios SET mp_id=${String(p.id)} WHERE id=${x.id}`;
      return ok({ ref, qr_code: t.qr_code, qr_base64: t.qr_code_base64, valor_cents: cents }, 201);
    }

    if (a === 'status' && b && m === 'GET') {
      const [x] = await sql`SELECT * FROM comup_apoios WHERE ref=${b}`;
      if (!x) throw new E('Apoio não encontrado', 404);
      return ok({ status: await sync(x), nome: x.nome });
    }

    if (a === 'webhook') {
      const id = d?.data?.id || req.query['data.id'];
      if (id && MP) {
        const p = await mp('/v1/payments/' + encodeURIComponent(id));
        const [x] = await sql`SELECT * FROM comup_apoios WHERE ref=${String(p.external_reference || '')}`;
        if (x) await sync(x);
      }
      return ok({ ok: true });
    }

    throw new E('Rota não encontrada', 404);
  } catch (e) {
    console.error(e);
    res.status(e.c || 500).json({ erro: e.c ? e.message : 'Erro interno do servidor' });
  }
}
