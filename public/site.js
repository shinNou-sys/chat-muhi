(async function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const openChat=()=>window.PSBChat&&window.PSBChat.open();
  ['open-chat','open-chat-top','open-chat-hero','open-chat-banner'].forEach(id=>{
    const el=$(id); if(el) el.addEventListener('click',e=>{if(id==='open-chat')e.preventDefault();openChat();});
  });
  try{
    const res=await fetch('/api/sekolah'); if(!res.ok) throw new Error('Data sekolah tidak tersedia');
    const s=await res.json();
    document.title=`${s.nama} — Portal PSB`;
    $('tagline').textContent=s.tagline;
    $('tahun').textContent=s.tahunAjaran;
    $('jurusan-list').innerHTML=(s.jurusan||[]).map(j=>`
      <article class="program-card ${j.kode==='PPLG'?'featured':''}">
        <div class="program-icon"><img src="assets/jurusan/${esc(j.icon||'pplg.svg')}" alt="" onerror="this.style.display='none'"></div>
        <h3>${esc(j.kode)} · ${esc(j.nama)}</h3>
        <p>${esc(j.ringkas)}</p>
        <div class="mini">${(j.tags||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
        <button type="button" onclick="window.PSBChat&&window.PSBChat.open();document.getElementById('psb-input').value='Apa keunggulan ${esc(j.kode)}?';document.getElementById('psb-form').requestSubmit();">Tanya AI →</button>
      </article>`).join('');
    $('alur-list').innerHTML=(s.alur||[]).map((a,i)=>`<li><span class="num">${String(i+1).padStart(2,'0')}</span><strong>${esc(a.judul)}</strong><span>${esc(a.deskripsi)}</span></li>`).join('');
    $('syarat-list').innerHTML=(s.syarat||[]).map(x=>`<li>${esc(x)}</li>`).join('');
    $('jadwal-body').innerHTML=(s.jadwal||[]).map(j=>`<tr><td>${esc(j.tahap)}</td><td>${esc(j.tanggal)}</td></tr>`).join('');
    $('foot-nama').textContent=s.nama;$('foot-alamat').textContent=s.alamat;$('foot-telp').textContent=s.telepon;$('foot-wa').textContent=s.whatsapp;$('foot-email').textContent=s.email;$('foot-jam').textContent=s.jamLayanan;
  }catch(e){console.error(e);}
})();