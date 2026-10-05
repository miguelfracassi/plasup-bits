const B=new URL(".",document.currentScript.src).href;

const $=i=>document.getElementById(i),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let tk=localStorage.tk||'',me=null,P=[];
const api=async(p,m='GET',b)=>{const r=await fetch('/api/'+p,{method:m,headers:{'Content-Type':'application/json',...(tk?{Authorization:'Bearer '+tk}:{})},body:b?JSON.stringify(b):undefined});const j=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401&&tk)sair();throw Error(j.erro||'Erro inesperado')}return j};

/* fundo aurora */
if(!$('aur')){document.body.insertAdjacentHTML('afterbegin','<div id="aur"><i></i><i></i><i></i></div>');addEventListener('pointermove',e=>{const r=document.documentElement.style;r.setProperty('--mx',(e.clientX/innerWidth-.5).toFixed(2));r.setProperty('--my',(e.clientY/innerHeight-.5).toFixed(2))})}
document.addEventListener('DOMContentLoaded',()=>{if(!('IntersectionObserver'in window))return;const o=new IntersectionObserver(l=>l.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');o.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.rv').forEach(x=>o.observe(x))});

/* modal genérico */
const field=([id,l,t,o])=>`<label>${l}${t==='select'?`<select id="f_${id}">${o.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select>`:t==='textarea'?`<textarea id="f_${id}" rows="3"></textarea>`:`<input id="f_${id}" type="${t}"${t==='file'?' accept="application/pdf"':''}>`}</label>`;
const closeM=()=>$('ov').classList.remove('on');
function modal(t,fs,v,ok,x={}){
$('md').innerHTML=`${x.head||''}<h3>${t}</h3>${fs.map(field).join('')}${x.extra||''}<p class="err" id="er"></p><div class="row"><button type="button" class="btn" onclick="closeM()">Cancelar</button><button class="btn pri">${x.btn||'Salvar'}</button></div>${x.foot||''}`;
fs.forEach(f=>{const e=$('f_'+f[0]);if(v[f[0]]!=null&&f[2]!=='file')e.value=v[f[0]]});$('ov').classList.add('on');
$('md').onsubmit=async e=>{e.preventDefault();$('er').textContent='';const o={};fs.forEach(f=>{const e=$('f_'+f[0]);o[f[0]]=f[2]==='file'?e.files[0]:e.value});try{await ok(o)}catch(x){$('er').textContent=x.message}}}


const CAD=[['nome','Nome completo','text'],['telefone','Telefone','tel'],['paroquia','Paróquia','text'],['diocese','Diocese','text'],['cargo','Cargo','text']];
const saud=()=>{const h=new Date().getHours();return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'};
function sair(){localStorage.removeItem('tk');location.href=B}
const senha=()=>modal('Alterar senha',[['atual','Senha atual','password'],['nova','Nova senha','password'],['conf','Confirmar nova senha','password']],{},async o=>{if(o.nova!==o.conf)throw Error('As senhas não coincidem');await api('me/password','PUT',o);closeM()});
async function shell(act){
if(!tk){location.replace(B);return null}
try{me=(await api('me')).user}catch(e){return null}
const L=[['painel','Painel','painel'],['planejamentos','Planejamentos','itens?tipo=planejamento'],['postagens','Postagens','itens?tipo=postagem'],['quadro','Quadro','quadro'],['equipe','Equipe','equipe'],['calendario','Calendário','calendario'],['ferramentas','Ferramentas','ferramentas']];
document.body.insertAdjacentHTML('afterbegin',`<header class="hdr"><a href="${B}painel"><img src="${B}logo.png" alt="PasUp"></a><div class="mn">${L.map(l=>`<a href="${B+l[2]}" class="${l[0]===act?'on':''}">${l[1]}</a>`).join('')}</div><div><a class="u" href="${B}conta">${esc(me.nome.split(' ')[0])}</a><button class="btn" onclick="sair()">Sair</button></div></header>`);
document.body.insertAdjacentHTML('beforeend','<div class="ov" id="ov"><form class="md" id="md"></form></div>');
$('ov').addEventListener('mousedown',e=>{if(e.target.id==='ov')closeM()});return me}
const S={pendente:'Pendente',andamento:'Em andamento',concluido:'Concluído'},I={alta:'Alta',media:'Média',baixa:'Baixa'};
function stats(L){const n=L.filter(p=>p.status!=='concluido').length;$('st').innerHTML=[['Total',L.length,''],['Em aberto',n,''],['Atrasados',L.filter(late).length,'late'],['Concluídos',L.length-n,'']].map(([l,v,c])=>`<div class="card stat ${c}"><b>${v}</b><span class="mut">${l}</span></div>`).join('')}
const card=p=>`<div class="card it ${p.importancia} ${late(p)?'atraso':''}"><div><h3>${esc(p.titulo)}</h3>${p.dono?`<div class="mut">Membro: ${esc(p.dono)}</div>`:''}${p.assunto?`<div class="mut">${esc(p.assunto)}</div>`:''}<span class="tg">${p.tipo==='postagem'?'Postagem':'Planejamento'}</span><span class="tg">Importância ${I[p.importancia]}</span><span class="tg ${p.status==='concluido'?'v':''}">${S[p.status]}</span>${late(p)?'<span class="tg r">Atrasado</span>':''}${p.visib==='privado'?'<span class="tg">Privado</span>':''}${p.canal?`<span class="tg">${CN[p.canal]||esc(p.canal)}</span>`:''}${etq(p)}${p.responsavel?`<div class="rsp"><span class="av">${esc(p.responsavel[0].toUpperCase())}</span>Responsável: ${esc(p.responsavel)}</div>`:''}${p.data_hora?`<div class="mut" style="margin-top:6px">${new Date(p.data_hora).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</div>`:''}${p.descricao?`<p class="mut" style="margin-top:6px">${esc(p.descricao)}</p>`:''}</div><div class="b2"><button class="btn" onclick="conversa(${p.id})">Conversa</button>${p.tem_pdf?`<button class="btn" onclick="pdf(${p.id})">Baixar PDF</button>`:''}${p.ro?'':`<button class="btn" onclick="tog(${p.id})">${p.status==='concluido'?'Reabrir':'Concluir'}</button><button class="btn" onclick="edit(${p.id})">Editar</button><button class="btn" onclick="dup(${p.id})">Duplicar</button><button class="btn" onclick="del(${p.id})">Excluir</button>`}</div></div>`;
const COR=['#0a7be0','#1fa87c','#7b4bb3','#e0883a','#d6457a','#2e8bc0','#6d8f1d'];
const cor=t=>COR[[...t.toLowerCase()].reduce((a,c)=>a+c.charCodeAt(0),0)%COR.length];
const tags=p=>(p.etiquetas||'').split(',').map(x=>x.trim()).filter(Boolean);
const etq=p=>tags(p).map(t=>`<span class="et" style="background:${cor(t)}">${esc(t)}</span>`).join('');
async function conversa(id){const p=P.find(x=>x.id===id)||{};const dr=async()=>{const L=await api('comments/'+id);$('md').innerHTML=`<h3>Conversa</h3><p class="mut">${esc(p.titulo||'')}${p.responsavel?' · Responsável: '+esc(p.responsavel):''}</p><div class="bl" id="bl">${L.map(c=>`<div class="bb ${c.user_id===me.id?'me':''}">${c.user_id===me.id?'':'<b>'+esc(c.nome.split(' ')[0])+'</b><br>'}${esc(c.texto)}<small>${new Date(c.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</small></div>`).join('')||'<p class="mut">Nenhuma mensagem ainda. Comece a conversa.</p>'}</div><input id="cm" placeholder="Escreva uma mensagem" autocomplete="off"><p class="err" id="er"></p><div class="row"><button type="button" class="btn" onclick="closeM()">Fechar</button><button class="btn pri">Enviar</button></div>`;$('bl').scrollTop=1e6;$('md').onsubmit=async e=>{e.preventDefault();const t=$('cm').value.trim();if(!t)return;try{await api('comments/'+id,'POST',{texto:t});dr()}catch(x){$('er').textContent=x.message}};$('cm').focus()};$('ov').classList.add('on');dr()}
/* planejamentos */
const rd=f=>new Promise(r=>{const x=new FileReader();x.onload=()=>r(x.result);x.readAsDataURL(f)});
const loc=iso=>iso?new Date(new Date(iso)-new Date(iso).getTimezoneOffset()*6e4).toISOString().slice(0,16):'';
const PF=[['titulo','Título','text'],['assunto','Assunto','text'],['tipo','Tipo','select',[['planejamento','Planejamento'],['postagem','Postagem']]],['importancia','Importância','select',[['baixa','Baixa'],['media','Média'],['alta','Alta']]],['status','Status','select',[['pendente','Pendente'],['andamento','Em andamento'],['concluido','Concluído']]],['responsavel','Responsável','text'],['etiquetas','Etiquetas (pastoral ou tema, separe por vírgula)','text'],['canal','Canal de publicação','select',[['','Nenhum'],['instagram','Instagram'],['facebook','Facebook'],['whatsapp','WhatsApp'],['youtube','YouTube'],['site','Site ou boletim'],['mural','Mural da paróquia']]],['data_hora','Data e hora','datetime-local'],['descricao','Descrição','textarea'],['visib','Visibilidade','select',[['equipe','Visível para a equipe'],['privado','Somente eu']]],['pdf','Planejamento em PDF (até 3 MB)','file']];
function form(p,dt){const id=p?.id;modal(id?'Editar item':'Novo item',PF,p?{...p,data_hora:loc(p.data_hora)}:{tipo:window.TIPO||'planejamento',importancia:'media',status:'pendente',visib:'equipe',data_hora:dt||''},async o=>{
const b={titulo:o.titulo,assunto:o.assunto,tipo:o.tipo,importancia:o.importancia,status:o.status,descricao:o.descricao,responsavel:o.responsavel,canal:o.canal,etiquetas:o.etiquetas,visib:o.visib,data_hora:o.data_hora?new Date(o.data_hora).toISOString():null};
if(o.pdf){if(o.pdf.size>3e6)throw Error('O PDF passa de 3 MB');b.pdf_nome=o.pdf.name;b.pdf_data=await rd(o.pdf)}
await api(id?'plans/'+id:'plans',id?'PUT':'POST',b);closeM();load()})}
const novo=()=>form(),edit=id=>form(P.find(p=>p.id===id));
const late=p=>p.status!=='concluido'&&p.data_hora&&new Date(p.data_hora)<Date.now();
async function tog(id){const p=P.find(x=>x.id===id);await api('plans/'+id,'PUT',{...p,data_hora:p.data_hora,status:p.status==='concluido'?'pendente':'concluido'});load()}
async function del(id){if(confirm('Excluir este item? Essa ação não pode ser desfeita.')){await api('plans/'+id,'DELETE');load()}}
async function pdf(id){const r=await api(`plans/${id}/pdf`);const a=document.createElement('a');a.href=r.data;a.download=r.nome||'planejamento.pdf';a.click()}

const CN={instagram:'Instagram',facebook:'Facebook',whatsapp:'WhatsApp',youtube:'YouTube',site:'Site ou boletim',mural:'Mural da paróquia'};
async function dup(id){const{id:_i,tem_pdf,pdf_nome,...b}=P.find(x=>x.id===id);await api('plans','POST',{...b,titulo:b.titulo+' (cópia)',status:'pendente'});load()}
function csv(L,nome){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const t=[['Título','Assunto','Tipo','Importância','Status','Canal','Responsável','Data e hora','Descrição'].map(q).join(';'),...L.map(p=>[p.titulo,p.assunto,p.tipo,I[p.importancia],S[p.status],CN[p.canal]||'',p.responsavel,p.data_hora?new Date(p.data_hora).toLocaleString('pt-BR'):'',p.descricao].map(q).join(';'))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+t],{type:'text/csv'}));a.download=nome+'.csv';a.click()}
function rodape(){document.querySelectorAll('footer').forEach(f=>f.remove());const o=!!tk,l=(h,t)=>`<a href="${B+h}">${t}</a>`;
document.body.insertAdjacentHTML('beforeend',`<footer class="ft"><div class="ftg"><div><img src="${B}logo.png" alt="PasUp"><p>Sua comunicação em evolução. Gratuito para as equipes de comunicação das paróquias.</p></div><div><b>Plataforma</b>${o?l('painel','Painel')+l('itens?tipo=planejamento','Planejamentos')+l('itens?tipo=postagem','Postagens')+l('calendario','Calendário')+l('quadro','Quadro')+l('ferramentas','Ferramentas')+l('historico','Histórico')+l('equipe','Equipe'):l('','Início')}</div><div><b>Conta</b>${o?l('conta','Minha conta'):l('','Entrar ou criar conta')}</div><div><b>Legal</b>${l('termos','Termos de Serviço')+l('privacidade','Política de Privacidade')}</div></div><div class="ftc"><p>O PasUp é um projeto independente e não possui vínculo com nenhuma plataforma de pastoral, diocese ou igreja.</p><p style="margin-top:6px">© ${new Date().getFullYear()} PasUp. Todos os direitos reservados.</p></div></footer>`)}
rodape();
