(()=>{const all=()=>document.querySelectorAll('details.les');
document.getElementById('bOpen').onclick=()=>all().forEach(d=>d.open=true);
document.getElementById('bClose').onclick=()=>all().forEach(d=>d.open=false);
const r=document.getElementById('bRefs');r.onclick=()=>{const on=document.body.classList.toggle('refs');r.setAttribute('aria-pressed',on)};
const go=()=>{const id=decodeURIComponent(location.hash.slice(1));const el=id&&document.getElementById(id);const d=el&&el.closest('details.les');if(d){d.open=true;}};
addEventListener('hashchange',go);go();
document.getElementById('toc').addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const el=document.getElementById(a.getAttribute('href').slice(1));if(el&&el.matches('details.les'))el.open=true});
})();
