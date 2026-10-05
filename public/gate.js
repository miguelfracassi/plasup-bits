/* Contagem regressiva: libera o site em 03/10/2026 às 20:00 (Brasília). Teste: ?preview=1 na URL. */
(function(){
var LIBERA=new Date('2026-10-03T20:00:00-03:00').getTime(),off=0,d=document,h=d.documentElement,g=null,timer=null;
if(/[?&]preview=1/.test(location.search))return;
if(Date.now()>=LIBERA)return;
try{if(localStorage.getItem('pasup_acesso')==='1')return}catch(e){}
var css='#gate{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;background:linear-gradient(135deg,#0a7be0,#1fa87c 62%,#5cb946);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:Poppins,system-ui,sans-serif;overflow:auto}#gate img{height:110px;width:110px;object-fit:contain;background:#fff;border-radius:24px;padding:10px;margin-bottom:22px}#gate h1{font-size:clamp(1.8rem,5vw,3.2rem);margin:0 0 6px;color:#fff;-webkit-text-fill-color:#fff}#gate p{opacity:.95;max-width:34em;margin:0}#gate .cd{display:flex;gap:12px;margin:28px 0 60px;flex-wrap:wrap;justify-content:center}#gate .cd div{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);border-radius:18px;padding:14px 18px;min-width:84px}#gate .cd b{display:block;font-size:clamp(1.8rem,6vw,3rem);font-variant-numeric:tabular-nums}#gate .cd span{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em}#gk{position:absolute;top:12px;right:14px;display:flex;gap:6px;align-items:center;opacity:.4}#gk:hover,#gk:focus-within{opacity:1}#gb{background:none;border:0;color:#fff;font:inherit;font-size:.68rem;text-decoration:underline;cursor:pointer;padding:4px}#gi{display:none;width:92px;padding:5px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.7);background:rgba(255,255,255,.18);color:#fff;font:inherit;font-size:.8rem;outline:0}#gi.er{border-color:#ffb4ab;background:rgba(198,40,40,.35)}#gate small{position:absolute;bottom:18px;left:24px;right:24px;opacity:.9;font-size:.78rem}';
var st=d.createElement('style');st.id='gts';st.textContent=css+'html.gt,html.gt body{overflow:hidden!important}';
(d.head||h).appendChild(st);
h.classList.add('gt');
g=d.createElement('div');g.id='gate';g.setAttribute('role','status');
g.innerHTML='<div id="gk"><input id="gi" type="password" inputmode="numeric" maxlength="20" autocomplete="off" placeholder="código" aria-label="Código de acesso"><button id="gb" type="button">código</button></div><img src="/logo.png" alt="PasUp"><h1>Estamos quase lá</h1><p>O PasUp será liberado hoje, às 20:00 (horário de Brasília).</p><div class="cd"><div><b id="gd">00</b><span>dias</span></div><div><b id="gh">00</b><span>horas</span></div><div><b id="gm">00</b><span>minutos</span></div><div><b id="gs">00</b><span>segundos</span></div></div><small>O PasUp é um projeto independente e não possui vínculo com nenhuma plataforma de pastoral, diocese ou igreja.</small>';
h.appendChild(g);
var CODIGO='2025';
function codigo(){var i=d.getElementById('gi'),b=d.getElementById('gb');
if(!i||!b)return;
function ok(){var v=i.value.replace(/\s/g,'');
if(v===CODIGO){try{localStorage.setItem('pasup_acesso','1')}catch(e){}liberar();return}
i.className='er';i.value='';setTimeout(function(){i.className=''},900)}
b.onclick=function(){if(i.style.display==='block')ok();else{i.style.display='block';b.textContent='ok';i.focus()}};
i.onkeydown=function(e){if(e.key==='Enter')ok()}}
function pad(n){return (n<10?'0':'')+n}
function liberar(){clearTimeout(timer);h.classList.remove('gt');if(g&&g.parentNode)g.parentNode.removeChild(g);if(st.parentNode)st.parentNode.removeChild(st)}
function tick(){
var t=LIBERA-(Date.now()+off);
if(t<=0){liberar();return}
var s=Math.floor(t/1000),set=function(i,v){var e=d.getElementById(i);if(e)e.textContent=pad(v)};
set('gd',Math.floor(s/86400));set('gh',Math.floor(s%86400/3600));set('gm',Math.floor(s%3600/60));set('gs',s%60);
timer=setTimeout(tick,250)}
tick();codigo();
/* acerta o relógio com a hora do servidor (ignora se der erro ou diferença absurda) */
try{var t0=Date.now();fetch('/api/hora?_='+t0,{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
var t1=Date.now(),o=j.agora+(t1-t0)/2-t1;if(isFinite(o)&&Math.abs(o)<36e5*48){off=o;clearTimeout(timer);tick()}}).catch(function(){})}catch(e){}
})();
