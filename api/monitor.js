import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

/* Painel de monitoramento do PasUp. Somente leitura.
   Senha: a mesma PASUPTEAM_SENHA (padrão 2015) usada em /pasupteam. */

const URL_DB = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
const sql = neon(URL_DB || 'postgresql://x:x@localhost/x');
const BOOT = Date.now();
const FALHAS = new Map();
const hh = x => crypto.createHash('sha256').update(String(x)).digest();

/* executa uma consulta, mede o tempo e nunca derruba o painel inteiro */
async function medir(fn, vazio) {
  const t = Date.now();
  try { return { v: await fn(), ms: Date.now() - t }; }
  catch (e) { return { v: vazio, ms: Date.now() - t, erro: String(e.message || e).slice(0, 160) }; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
    const f = FALHAS.get(ip) || { n: 0, t: Date.now() };
    if (Date.now() - f.t > 6e5) { f.n = 0; f.t = Date.now(); }
    if (f.n >= 5) return res.status(429).json({ erro: 'Muitas tentativas. Tente de novo em alguns minutos.' });

    const d = req.body || {};
    const certa = process.env.PASUPTEAM_SENHA || '2015';
    if (req.method !== 'POST' || !crypto.timingSafeEqual(hh(d.senha ?? ''), hh(certa))) {
      f.n++; FALHAS.set(ip, f);
      return res.status(401).json({ erro: 'Senha incorreta' });
    }
    FALHAS.delete(ip);

    if (!URL_DB) return res.status(500).json({ erro: 'Banco de dados não configurado: falta a variável DATABASE_URL na Vercel' });

    const t0 = Date.now();
    const q = {};
    const jobs = {
      ping: () => sql`SELECT 1 AS ok`,
      contagens: async () => (await sql`SELECT
        (SELECT count(*)::int FROM comup_users) AS usuarios,
        (SELECT count(*)::int FROM comup_users WHERE created_at > now() - interval '24 hours') AS novos24,
        (SELECT count(*)::int FROM comup_users WHERE created_at > now() - interval '7 days') AS novos7,
        (SELECT count(*)::int FROM comup_users WHERE created_at > now() - interval '30 days') AS novos30,
        (SELECT count(*)::int FROM comup_teams) AS equipes,
        (SELECT count(*)::int FROM comup_users WHERE team_id IS NOT NULL) AS em_equipe,
        (SELECT count(*)::int FROM comup_plans) AS itens,
        (SELECT count(*)::int FROM comup_plans WHERE status <> 'concluido') AS pendentes,
        (SELECT count(*)::int FROM comup_plans WHERE status = 'concluido') AS concluidos,
        (SELECT count(*)::int FROM comup_plans WHERE status <> 'concluido' AND data_hora < now()) AS atrasados,
        (SELECT count(*)::int FROM comup_plans WHERE created_at > now() - interval '24 hours') AS itens24,
        (SELECT count(*)::int FROM comup_plans WHERE concluido_em > now() - interval '24 hours') AS concluidos24,
        (SELECT count(*)::int FROM comup_comments) AS comentarios,
        (SELECT count(*)::int FROM comup_comments WHERE created_at > now() - interval '24 hours') AS comentarios24,
        (SELECT count(*)::int FROM comup_extras) AS extras,
        (SELECT count(*)::int FROM comup_log WHERE created_at > now() - interval '24 hours') AS acoes24`)[0],
      ativos: async () => (await sql`SELECT
        count(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '5 minutes')::int AS a5,
        count(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '15 minutes')::int AS a15,
        count(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '1 hour')::int AS a60,
        count(DISTINCT user_id)::int AS a24
        FROM comup_log WHERE created_at > now() - interval '24 hours'`)[0],
      online: () => sql`SELECT u.id, u.nome, u.cargo, u.paroquia, max(l.created_at) AS ultimo, count(*)::int AS acoes
        FROM comup_log l JOIN comup_users u ON u.id = l.user_id
        WHERE l.created_at > now() - interval '30 minutes'
        GROUP BY u.id, u.nome, u.cargo, u.paroquia ORDER BY ultimo DESC LIMIT 20`,
      feed: () => sql`SELECT l.id, l.acao, l.detalhe, l.created_at, u.nome
        FROM comup_log l JOIN comup_users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT 30`,
      cadastros: () => sql`SELECT to_char(g.d::date, 'YYYY-MM-DD') AS dia, count(u.id)::int AS n
        FROM generate_series((now() AT TIME ZONE 'America/Sao_Paulo')::date - 13, (now() AT TIME ZONE 'America/Sao_Paulo')::date, interval '1 day') g(d)
        LEFT JOIN comup_users u ON (u.created_at AT TIME ZONE 'America/Sao_Paulo')::date = g.d::date
        GROUP BY g.d ORDER BY g.d`,
      porHora: () => sql`SELECT g.h, count(l.id)::int AS n
        FROM generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') g(h)
        LEFT JOIN comup_log l ON date_trunc('hour', l.created_at) = g.h
        GROUP BY g.h ORDER BY g.h`,
      recentes: () => sql`SELECT id, nome, cargo, paroquia, diocese, created_at FROM comup_users ORDER BY id DESC LIMIT 8`,
      acoes: () => sql`SELECT acao AS nome, count(*)::int AS n FROM comup_log WHERE created_at > now() - interval '24 hours' GROUP BY acao ORDER BY n DESC LIMIT 6`,
      paroquias: () => sql`SELECT paroquia AS nome, count(*)::int AS n FROM comup_users WHERE coalesce(trim(paroquia), '') <> '' GROUP BY paroquia ORDER BY n DESC LIMIT 6`,
      tipos: () => sql`SELECT coalesce(tipo, 'outro') AS nome, count(*)::int AS n FROM comup_plans GROUP BY tipo ORDER BY n DESC LIMIT 6`,
      banco: async () => (await sql`SELECT pg_database_size(current_database())::bigint AS bytes`)[0],
      vakinha: async () => (await sql`SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE status = 'pago')::int AS pagos,
        count(*) FILTER (WHERE status = 'pendente')::int AS pendentes,
        coalesce(sum(valor_cents) FILTER (WHERE status = 'pago'), 0)::bigint AS pago_cents
        FROM comup_apoios`)[0]
    };
    const vazios = { ping: null, contagens: null, ativos: null, online: [], feed: [], cadastros: [], porHora: [], recentes: [], acoes: [], paroquias: [], tipos: [], banco: null, vakinha: null };

    await Promise.all(Object.keys(jobs).map(async k => { q[k] = await medir(jobs[k], vazios[k]); }));

    const erros = Object.entries(q).filter(([, r]) => r.erro).map(([k, r]) => ({ consulta: k, erro: r.erro }));
    const mem = process.memoryUsage();
    const num = x => (x == null ? null : Number(x));
    const banco = q.banco.v ? { bytes: num(q.banco.v.bytes) } : null;
    const vk = q.vakinha.v ? { ...q.vakinha.v, pago_cents: num(q.vakinha.v.pago_cents) } : null;

    res.status(200).json({
      agora: Date.now(),
      servidor: {
        regiao: process.env.VERCEL_REGION || null,
        node: process.version,
        memoria_mb: Math.round(mem.rss / 1048576),
        heap_mb: Math.round(mem.heapUsed / 1048576),
        instancia_s: Math.round((Date.now() - BOOT) / 1000),
        frio: Date.now() - BOOT < 1500
      },
      desempenho: {
        banco_ping_ms: q.ping.ms,
        banco_ok: !q.ping.erro,
        consultas_ms: Object.fromEntries(Object.entries(q).map(([k, r]) => [k, r.ms])),
        total_ms: Date.now() - t0
      },
      erros,
      contagens: q.contagens.v,
      ativos: q.ativos.v,
      online: q.online.v,
      feed: q.feed.v,
      cadastros: q.cadastros.v,
      porHora: q.porHora.v,
      recentes: q.recentes.v,
      acoes: q.acoes.v,
      paroquias: q.paroquias.v,
      tipos: q.tipos.v,
      banco,
      vakinha: vk
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}
