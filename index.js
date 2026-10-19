import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const sekolah=JSON.parse(readFileSync(path.join(__dirname,'data','sekolah.json'),'utf8'));
const PORT=process.env.PORT||3000;
const GEMINI_MODEL=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const ai=process.env.GEMINI_API_KEY?new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}):null;

function buatSystemInstruction(s){
  const jurusan=s.jurusan.map(j=>`- ${j.kode} (${j.nama}): ${j.ringkas}\n  Keunggulan: ${j.keunggulan.join('; ')}.\n  Prospek kerja: ${j.prospekKerja.join(', ')}.\n  Prospek kuliah: ${j.prospekKuliah.join(', ')}.`).join('\n');
  return `Kamu adalah Asisten PSB untuk ${s.nama}.

Jawab dalam Bahasa Indonesia dengan ramah, singkat, dan jelas.
Topik yang boleh dibahas: PSB, jurusan, keunggulan jurusan, prospek lulusan, syarat, alur, jadwal, dan kontak panitia.
Gunakan HANYA DATA SEKOLAH di bawah. Jangan mengarang.
Jika data berisi kata "TEMPLATE", "Isi...", "Silakan isi", atau data belum tersedia, katakan informasi tersebut belum tersedia dan arahkan pengguna ke panitia PSB.
Jangan menyatakan jurusan, tanggal, biaya, kuota, beasiswa, nomor telepon, atau alamat sebagai fakta resmi jika belum diverifikasi.
Jika di luar topik PSB, jawab singkat bahwa kamu hanya membantu informasi PSB.

DATA SEKOLAH
${s.nama}
Jurusan:
${jurusan}
Syarat:
${s.syarat.map(x=>`- ${x}`).join('\n')}
Alur:
${s.alur.map((a,i)=>`${i+1}. ${a.judul}: ${a.deskripsi}`).join('\n')}
Jadwal:
${s.jadwal.map(j=>`- ${j.tahap}: ${j.tanggal}`).join('\n')}
Kontak: ${s.telepon}; ${s.whatsapp}; ${s.email}; ${s.alamat}; ${s.jamLayanan}.`;
}
const SYSTEM_INSTRUCTION=buatSystemInstruction(sekolah);
const hits=new Map();
function rateLimit(max=15,windowMs=60000){return(req,res,next)=>{const now=Date.now();const recent=(hits.get(req.ip)||[]).filter(t=>now-t<windowMs);if(recent.length>=max)return res.status(429).json({message:'Terlalu banyak pesan. Tunggu sebentar lalu coba lagi.'});recent.push(now);hits.set(req.ip,recent);next();};}
setInterval(()=>{const now=Date.now();for(const[ip,list]of hits)if(!list.some(t=>now-t<60000))hits.delete(ip);},300000).unref();

const app=express();
app.set('trust proxy',1);
app.use(cors(process.env.CORS_ORIGIN?{origin:process.env.CORS_ORIGIN}:undefined));
app.use(express.json({limit:'20kb'}));
app.use(express.static(path.join(__dirname,'public')));
app.get('/api/sekolah',(_req,res)=>{const{_catatan,...publik}=sekolah;res.json(publik);});
app.get('/api/health',(_req,res)=>res.json({ok:true,gemini:Boolean(ai)}));
app.post('/api/chat',rateLimit(),async(req,res)=>{
  if(!ai)return res.status(503).json({message:'Chatbot belum dikonfigurasi. Isi GEMINI_API_KEY di .env.'});
  const{history}=req.body??{};
  if(!Array.isArray(history)||!history.length)return res.status(400).json({message:'history harus berupa array dan tidak boleh kosong.'});
  let contents=history.filter(m=>m&&typeof m.text==='string'&&m.text.trim()).slice(-12).map(m=>({role:m.role==='model'?'model':'user',parts:[{text:m.text.trim().slice(0,500)}]}));
  while(contents.length&&contents[0].role!=='user')contents.shift();
  if(!contents.length||contents.at(-1).role!=='user')return res.status(400).json({message:'Pesan terakhir harus berasal dari pengguna.'});
  try{
    const response=await ai.models.generateContent({model:GEMINI_MODEL,contents,config:{temperature:.3,systemInstruction:SYSTEM_INSTRUCTION}});
    res.json({result:response.text});
  }catch(e){console.error('Gemini error:',e?.message||e);res.status(500).json({message:'Asisten sedang sibuk. Coba lagi sebentar.'});}
});
app.listen(PORT,()=>console.log(`Server berjalan di http://localhost:${PORT}`));