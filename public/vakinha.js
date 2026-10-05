const brl = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const falta = v => Math.max(0, v.meta_cents - v.arrecadado);
const pct = v => Math.min(100, Math.round(100 * v.arrecadado / v.meta_cents));
document.head.insertAdjacentHTML('beforeend', `<style>
.vk{display:block;color:inherit;text-decoration:none;margin-bottom:14px;transition:border-color .2s}.vk:hover{border-color:var(--b)}
.vk .pr{display:block;font-size:1.9rem;margin:8px 0 2px;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.gr{background:#fff3b0;padding:1px 6px;border-radius:5px;font-weight:600}
.nm{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.nm .tg{margin:0}
.qr{text-align:center}.qr img{width:240px;max-width:100%;border:1px solid var(--ln);border-radius:12px;padding:8px;background:#fff}
.qr textarea{margin:12px 0 8px;font-size:.8rem;resize:none}
.ok{border-left:6px solid var(--g)}
</style>`);
