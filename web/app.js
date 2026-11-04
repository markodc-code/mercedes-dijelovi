// Mercedes dijelovi — sučelje.
const app = document.getElementById('app');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? null : n; };
const eur = n => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('hr-HR', { maximumFractionDigits: 2 }) + ' €';
const today = () => new Date().toISOString().slice(0, 10);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

const STATUSI = ['Na autu', 'Skinuto', 'Na polici', 'Prodano', 'Oštećeno', 'Otpad'];
const DOSTUPNO = new Set(['Na autu', 'Skinuto', 'Na polici']);
const GRUPA = Object.fromEntries(DIJELOVI.GRUPE.map(g => [g.id, g]));
const badge = s => `<span class="badge b-${h(String(s).replace(/ /g, '-'))}">${h(s)}</span>`;
const opts = (arr, sel) => arr.map(x => `<option${x === sel ? ' selected' : ''}>${h(x)}</option>`).join('');

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200);
}
const carTitle = a => `${a.model || a.klasa || 'Mercedes'}${a.kod ? ' (' + a.kod + ')' : ''}`;
const carSub = a => [a.godina, a.motor, a.kw ? a.kw + ' kW' : null, a.km ? Number(a.km).toLocaleString('hr-HR') + ' km' : null, a.boja].filter(Boolean).join(' · ');

function stats(parts, car) {
  let naPolici = 0, prodano = 0, prihod = 0, vrijednost = 0;
  for (const p of parts) {
    if (p.status === 'Prodano') { prodano++; prihod += p.prodanoZa ?? p.cijena ?? 0; }
    else if (DOSTUPNO.has(p.status)) { if (p.status !== 'Na autu') naPolici++; vrijednost += p.cijena || 0; }
  }
  const trosak = car ? (car.nabava || 0) + (car.troskovi || 0) : 0;
  return { ukupno: parts.length, naPolici, prodano, prihod, vrijednost, trosak, zarada: prihod - trosak };
}

// ---------- fotke ----------
const photoUrl = id => PHOTO.url(id);
async function resize(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise(r => cv.toBlob(b => r(b || file), 'image/jpeg', 0.82));
  } catch { return file; }
}
async function addPhotos(files, obj, store) {
  for (const f of files) {
    let id;
    try { id = await PHOTO.save(await resize(f)); }
    catch (e) { await info('Fotka nije spremljena: ' + (e.message || e.code || e)); break; }
    (obj.fotke ||= []).push(id);
  }
  await DB.put(store, obj);
}
async function removePhoto(obj, id, store) {
  obj.fotke = (obj.fotke || []).filter(x => x !== id);
  await PHOTO.del(id);
  await DB.put(store, obj);
}
function lightbox(url) {
  const d = document.createElement('div'); d.className = 'lightbox';
  d.innerHTML = `<img src="${url}" alt="">`; d.onclick = () => d.remove();
  document.body.appendChild(d);
}
async function photoStrip(el, obj, store, onChange) {
  const ids = obj.fotke || [];
  const urls = await Promise.all(ids.map(photoUrl));
  el.innerHTML = ids.map((id, i) => `<div class="photo" data-id="${id}" style="background-image:url('${urls[i]}')"><button title="Obriši fotku">✕</button></div>`).join('') +
    (PHOTO.enabled ? `<label class="addphoto noprint">📷<br>Dodaj fotku<input type="file" accept="image/*" multiple hidden></label>` : '');
  $$('.photo', el).forEach((p, i) => {
    p.onclick = () => lightbox(urls[i]);
    if (!PHOTO.enabled) $('button', p).remove(); else $('button', p).onclick = async e => {
      e.stopPropagation();
      if (!(await ask('Obrisati ovu fotku?'))) return;
      await removePhoto(obj, p.dataset.id, store); photoStrip(el, obj, store, onChange); onChange?.();
    };
  });
  const fin = $('input', el); if (fin) fin.onchange = async e => {
    const files = [...e.target.files]; if (!files.length) return;
    toast('Spremam fotke…');
    await addPhotos(files, obj, store); photoStrip(el, obj, store, onChange); onChange?.();
  };
}

async function download(name, data, type) {
  if (DB.mode === 'cloud') {
    if (!DOWNLOADS) { info('Preuzimanje datoteka ovdje nije dostupno.'); return; }
    try { await DOWNLOADS.save({ filename: name, data: new Blob([data], { type }) }); }
    catch (e) { if (e?.code !== 'declined') info('Preuzimanje nije uspjelo: ' + (e?.message || e?.code)); }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Kopirano'); }
  catch {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="box" style="max-width:520px"><p style="margin-top:0">Označi tekst i kopiraj ga (Ctrl+C / dugi pritisak):</p>
      <textarea rows="8" readonly>${h(t)}</textarea><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="primary">Zatvori</button></div></div>`;
    document.body.appendChild(m); $('textarea', m).select(); $('button', m).onclick = () => m.remove();
  }
}
// Vlastiti prozor za potvrdu (objavljena stranica ne smije koristiti confirm/alert).
function ask(msg, ok = 'U redu', cancel = 'Odustani') {
  return new Promise(res => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="box" style="max-width:440px"><p style="white-space:pre-line;margin-top:0">${h(msg)}</p>
      <div class="row" style="justify-content:flex-end">${cancel ? `<button data-r="0">${h(cancel)}</button>` : ''}<button class="primary" data-r="1">${h(ok)}</button></div></div>`;
    document.body.appendChild(m);
    $$('button', m).forEach(b => b.onclick = () => { m.remove(); res(b.dataset.r === '1'); });
  });
}
const info = msg => ask(msg, 'U redu', null);

// ---------- usmjeravanje ----------
let curId = null, curView = 'auti';
function go(view, id) { curId = id || null; if (location.hash.slice(1) === view) route(); else location.hash = view; }
document.addEventListener('click', e => {
  const a = e.target.closest('[data-car],[data-edit]'); if (!a) return;
  e.preventDefault(); a.dataset.car ? go('auto', a.dataset.car) : go('uredi', a.dataset.edit);
});
async function route(keep) {
  let view = location.hash.replace(/^#\/?/, '').split('/')[0] || 'auti';
  if ((view === 'auto' || view === 'uredi') && !curId) view = 'auti';
  const id = curId; curView = view;
  $$('nav a').forEach(a => a.classList.toggle('on', a.dataset.v === view || (view === 'auto' && a.dataset.v === 'auti')));
  const y = window.scrollY;
  try {
    if (view === 'auto') await viewAuto(id);
    else if (view === 'novi') await viewForm();
    else if (view === 'uredi') await viewForm(id);
    else if (view === 'trazi') await viewTrazi();
    else if (view === 'zarada') await viewZarada();
    else if (view === 'postavke') await viewPostavke();
    else await viewAuti();
    window.scrollTo(0, keep ? y : 0);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="card err">Greška: ${h(e.message)}</div>`;
  }
}
window.addEventListener('hashchange', route);

// ---------- popis auta ----------
async function viewAuti() {
  const [auti, dijelovi] = await Promise.all([DB.all('auti'), DB.all('dijelovi')]);
  if (!auti.length) {
    app.innerHTML = `<div class="card empty"><h2>Još nema auta</h2><p>Upiši broj šasije (VIN) i program će prepoznati model i složiti listu dijelova.</p>
      <a class="btn primary" href="#novi">+ Dodaj prvi auto</a></div>`;
    return;
  }
  const po = {}; for (const d of dijelovi) (po[d.autoId] ||= []).push(d);
  auti.sort((a, b) => (b.created || 0) - (a.created || 0));
  app.innerHTML = `<div class="row" style="margin-bottom:12px"><h2 class="grow" style="margin:0">Auti (${auti.length})</h2>
    <input id="q" placeholder="Traži po VIN-u, modelu, motoru…" style="max-width:320px"><a class="btn primary" href="#novi">+ Novi auto</a></div>
    <div class="cars" id="list"></div>`;
  const list = $('#list');
  const draw = async () => {
    const q = norm($('#q').value).split(/\s+/).filter(Boolean);
    const shown = auti.filter(a => { const s = norm([a.vin, a.model, a.klasa, a.kod, a.motor, a.godina, a.boja].join(' ')); return q.every(w => s.includes(w)); });
    list.innerHTML = shown.map(a => {
      const s = stats(po[a.id] || [], a);
      return `<div class="card carcard" data-id="${a.id}"><div class="thumb" data-f="${(a.fotke || [])[0] || ''}">🚗</div>
        <div class="grow"><b>${h(carTitle(a))}</b><div class="small muted">${h(carSub(a))}</div>
        <div class="small mono muted">${h(a.vin)}</div>
        <div class="small" style="margin-top:4px">${s.prodano}/${s.ukupno} prodano · na polici ${s.naPolici} ·
          <span class="${s.zarada >= 0 ? 'ok' : 'err'}">${eur(s.zarada)}</span></div></div></div>`;
    }).join('') || '<div class="muted">Ništa ne odgovara pretrazi.</div>';
    $$('.carcard', list).forEach(c => c.onclick = () => go('auto', c.dataset.id));
    for (const t of $$('.thumb[data-f]', list)) if (t.dataset.f) { const u = await photoUrl(t.dataset.f); if (u) { t.style.backgroundImage = `url('${u}')`; t.textContent = ''; } }
  };
  $('#q').oninput = draw; draw();
}

// ---------- novi auto / uređivanje ----------
async function viewForm(id) {
  const car = id ? await DB.get('auti', id) : { oprema: {}, datumNabave: today(), mjenjac: 'Automatski', gorivo: 'Dizel', pogon: 'Stražnji', karoserija: 'Limuzina' };
  if (!car) { app.innerHTML = '<div class="card">Auto nije pronađen.</div>'; return; }
  const o = car.oprema || {};
  const motorOpts = Object.keys(VIN.ENG).sort().map(k => `<option value="${k}">${h(VIN.motorOpis(k))}</option>`).join('');
  app.innerHTML = `
  <h2>${id ? 'Uredi auto' : 'Novi auto'}</h2>
  <div class="card">
    <label class="f"><span>Broj šasije (VIN) — 17 znakova</span>
    <div class="vinbox"><input id="vin" maxlength="25" value="${h(car.vin || '')}" placeholder="npr. WDD2040081A123456" autocomplete="off" spellcheck="false">
    <button class="primary" id="dek">Prepoznaj</button></div></label>
    <div id="dekRez" style="margin-top:12px"></div>
  </div>
  <div class="card">
    <h3>Podaci o autu</h3>
    <div class="grid">
      <label class="f"><span>Model (npr. C 220 CDI)</span><input name="model" value="${h(car.model || '')}"></label>
      <label class="f"><span>Klasa</span><input name="klasa" value="${h(car.klasa || '')}"></label>
      <label class="f"><span>Oznaka šasije</span><input name="kod" value="${h(car.kod || '')}" placeholder="W204"></label>
      <label class="f"><span>Karoserija</span><select name="karoserija">${opts(DIJELOVI.KAROSERIJE, car.karoserija)}</select></label>
      <label class="f"><span>Godište</span><input name="godina" inputmode="numeric" value="${h(car.godina || '')}"></label>
      <label class="f"><span>Kilometraža</span><input name="km" inputmode="numeric" value="${h(car.km || '')}"></label>
      <label class="f"><span>Motor (šifra)</span><input name="motor" list="motori" value="${h(car.motor || '')}" placeholder="OM651"></label>
      <label class="f"><span>Broj motora</span><input name="brojMotora" value="${h(car.brojMotora || '')}"></label>
      <label class="f"><span>Snaga (kW)</span><input name="kw" inputmode="numeric" value="${h(car.kw || '')}"></label>
      <label class="f"><span>Gorivo</span><select name="gorivo">${opts(DIJELOVI.GORIVA, car.gorivo)}</select></label>
      <label class="f"><span>Mjenjač</span><select name="mjenjac">${opts(DIJELOVI.MJENJACI, car.mjenjac)}</select></label>
      <label class="f"><span>Pogon</span><select name="pogon">${opts(DIJELOVI.POGONI, car.pogon)}</select></label>
      <label class="f"><span>Boja</span><input name="boja" value="${h(car.boja || '')}"></label>
      <label class="f"><span>Šifra boje</span><input name="kodBoje" value="${h(car.kodBoje || '')}" placeholder="npr. 197"></label>
      <label class="f"><span>Šifra unutrašnjosti</span><input name="kodUnutra" value="${h(car.kodUnutra || '')}"></label>
    </div>
    <datalist id="motori">${motorOpts}</datalist>
    <h3 style="margin-top:16px">Oprema <span class="small muted">(o njoj ovisi lista dijelova)</span></h3>
    <div class="checks">${DIJELOVI.OPREMA.map(([k, n]) => `<label><input type="checkbox" name="op_${k}"${o[k] ? ' checked' : ''}> ${h(n)}</label>`).join('')}</div>
  </div>
  <div class="card">
    <h3>Nabava</h3>
    <div class="grid">
      <label class="f"><span>Nabavna cijena (€)</span><input name="nabava" inputmode="decimal" value="${h(car.nabava ?? '')}"></label>
      <label class="f"><span>Ostali troškovi (€) — prijevoz, papiri…</span><input name="troskovi" inputmode="decimal" value="${h(car.troskovi ?? '')}"></label>
      <label class="f"><span>Datum nabave</span><input type="date" name="datumNabave" value="${h(car.datumNabave || '')}"></label>
      <label class="f"><span>Kupljeno od</span><input name="prodavac" value="${h(car.prodavac || '')}"></label>
    </div>
    <label class="f" style="margin-top:10px"><span>Napomena (oštećenja, stanje…)</span><textarea name="napomena" rows="2">${h(car.napomena || '')}</textarea></label>
  </div>
  <div class="row"><button class="primary" id="spremi">${id ? 'Spremi promjene' : 'Spremi i složi listu dijelova'}</button>
    <a class="btn" href="#auti"${id ? ` data-car="${id}"` : ''}>Odustani</a></div>`;

  const F = n => $(`[name="${n}"]`);
  const setIfEmpty = (n, v, force) => { if (v != null && v !== '' && (force || !F(n).value)) F(n).value = v; };
  let dek = car.vin ? VIN.decode(car.vin) : null;

  F('motor').addEventListener('change', () => {
    const e = VIN.ENG[F('motor').value.trim().toUpperCase()];
    if (e) { F('motor').value = F('motor').value.trim().toUpperCase(); F('gorivo').value = e[0]; }
  });

  async function prepoznaj(fill = true) {
    const raw = $('#vin').value;
    dek = VIN.decode(raw);
    $('#vin').value = dek.vin;
    const box = $('#dekRez');
    let html = dek.greske.map(g => `<div class="err">⚠ ${h(g)}</div>`).join('');
    html += `<table class="info">${dek.podaci.map(([k, v]) => `<tr><td>${h(k)}</td><td>${h(v)}</td></tr>`).join('')}</table>`;
    if (dek.motori) html += `<div class="small muted" style="margin-top:6px">Motori u ovoj seriji: ${dek.motori.map(m => `<a href="#" class="pickm" data-m="${m}">${h(VIN.motorOpis(m))}</a>`).join(', ')}</div>`;
    html += `<div id="naucen" class="small" style="margin-top:6px"></div><div id="nhtsa" class="small muted" style="margin-top:8px">${dek.vin.length === 17 ? 'Provjeravam NHTSA bazu…' : ''}</div>`;
    box.innerHTML = html;
    $$('.pickm', box).forEach(a => a.onclick = e => { e.preventDefault(); F('motor').value = a.dataset.m; F('motor').dispatchEvent(new Event('change')); });
    if (dek.vin.length !== 17) return;

    if (fill) {
      if (dek.znanaSerija) {
        setIfEmpty('klasa', dek.klasa, true); setIfEmpty('kod', dek.kod, true);
        F('karoserija').value = dek.karoserija; F('pogon').value = dek.pogon;
      }
      if (dek.godina) setIfEmpty('godina', dek.godina);
      if (dek.typ) {
        const t = await DB.get('tipovi', dek.typ);
        if (t) {
          for (const k of ['model', 'motor', 'kw']) setIfEmpty(k, t[k]);
          for (const k of ['gorivo', 'mjenjac', 'karoserija', 'pogon']) if (t[k]) F(k).value = t[k];
          $('#naucen').innerHTML = `<span class="ok">✔ Tip ${h(dek.typ)} već poznat iz ranijeg auta: ${h(t.model || '')} ${h(t.motor || '')}</span>`;
        } else if (dek.format === 'EU') {
          $('#naucen').innerHTML = `<span class="muted">Tip ${h(dek.typ)} još nije poznat. Upiši model i motor — program će ga zapamtiti za iduće aute.</span>`;
        }
      }
    }
    if (DB.mode === 'cloud') { const nb0 = $('#nhtsa'); if (nb0) nb0.textContent = ''; return; }
    const n = await VIN.nhtsa(dek.vin);
    const nb = $('#nhtsa'); if (!nb) return;
    if (!n) { nb.textContent = 'NHTSA baza nije dostupna (nema interneta?) — nije problem, podatke dopuni ručno.'; return; }
    const keys = Object.keys(n).filter(k => k !== 'Godina' || dek.format === 'US');
    if (!keys.length) { nb.textContent = 'NHTSA (američka baza) nema dodatnih podataka za ovaj europski VIN.'; return; }
    nb.innerHTML = `<b>Dodatno iz NHTSA baze:</b><table class="info">${keys.map(k => `<tr><td>${h(k)}</td><td>${h(n[k])}</td></tr>`).join('')}</table>`;
    if (fill) {
      if (n.Model) setIfEmpty('model', n.Model + (n.Izvedba ? ' ' + n.Izvedba : ''));
      if (dek.format === 'US' && n.Godina) setIfEmpty('godina', n.Godina);
      if (n['Snaga (kW)']) setIfEmpty('kw', Math.round(+n['Snaga (kW)']));
    }
  }
  $('#dek').onclick = () => prepoznaj(true);
  $('#vin').addEventListener('input', () => { if (VIN.clean($('#vin').value).length === 17) prepoznaj(true); });
  $('#vin').addEventListener('keydown', e => { if (e.key === 'Enter') prepoznaj(true); });
  if (car.vin) prepoznaj(false);

  $('#spremi').onclick = async () => {
    const vin = VIN.clean($('#vin').value);
    if (vin.length !== 17 && !(await ask(`VIN ima ${vin.length} znakova umjesto 17. Ipak spremiti?`))) return;
    const auti = await DB.all('auti');
    const dup = auti.find(a => a.vin === vin && a.id !== car.id);
    if (dup && !(await ask(`Auto s ovim VIN-om već postoji (${carTitle(dup)}). Ipak spremiti kao novi?`))) return;
    const old = JSON.stringify([car.gorivo, car.mjenjac, car.pogon, car.karoserija, car.oprema]);
    const d = dek && dek.vin === vin ? dek : VIN.decode(vin);
    Object.assign(car, {
      vin, typ: d.typ || null, serija: d.serija || null, volan: d.volan || null, tvornica: d.tvornica || null,
      model: F('model').value.trim(), klasa: F('klasa').value.trim(), kod: F('kod').value.trim(),
      karoserija: F('karoserija').value, godina: F('godina').value.trim(), km: num(F('km').value),
      motor: F('motor').value.trim().toUpperCase(), brojMotora: F('brojMotora').value.trim(), kw: num(F('kw').value),
      gorivo: F('gorivo').value, mjenjac: F('mjenjac').value, pogon: F('pogon').value,
      boja: F('boja').value.trim(), kodBoje: F('kodBoje').value.trim(), kodUnutra: F('kodUnutra').value.trim(),
      nabava: num(F('nabava').value), troskovi: num(F('troskovi').value), datumNabave: F('datumNabave').value,
      prodavac: F('prodavac').value.trim(), napomena: F('napomena').value.trim(),
      oprema: Object.fromEntries(DIJELOVI.OPREMA.map(([k]) => [k, F('op_' + k).checked])),
    });
    if (car.typ) {
      const stari = (await DB.get('tipovi', car.typ)) || {};
      await DB.put('tipovi', { ...stari, typ: car.typ, model: car.model, motor: car.motor, kw: car.kw, gorivo: car.gorivo, mjenjac: car.mjenjac,
        karoserija: car.karoserija, pogon: car.pogon, klasa: car.klasa, kod: car.kod, updated: Date.now() });
    }
    if (!id) {
      car.id = uid(); car.created = Date.now();
      await DB.put('auti', car);
      const oeMap = await oeZaAuto(car);
      const parts = DIJELOVI.generate(car).map((p, i) => noviDio(car, p.grupa, p.naziv, i, oeMap));
      await DB.putMany('dijelovi', parts);
      const nOe = parts.filter(x => x.oe).length;
      toast(`Spremljeno — ${parts.length} dijelova${nOe ? `, ${nOe} OE brojeva iz ranijih auta` : ''}`);
    } else {
      await DB.put('auti', car);
      if (old !== JSON.stringify([car.gorivo, car.mjenjac, car.pogon, car.karoserija, car.oprema])) {
        const have = new Set((await DB.byAuto(car.id)).map(p => p.grupa + '|' + p.naziv));
        const nove = DIJELOVI.generate(car).filter(p => !have.has(p.grupa + '|' + p.naziv));
        if (nove.length && await ask(`Promijenili ste opremu/izvedbu. Dodati ${nove.length} dijelova koji nedostaju na listi?`)) {
          const oeMap = await oeZaAuto(car);
          await DB.putMany('dijelovi', nove.map((p, i) => noviDio(car, p.grupa, p.naziv, Date.now() + i, oeMap)));
        }
      }
      toast('Spremljeno');
    }
    go('auto', car.id);
  };
}

// ---------- jedan auto s listom dijelova ----------
const otvoreneGrupe = new Set();
let filterStatus = 'Svi';

async function viewAuto(id) {
  const car = await DB.get('auti', id);
  if (!car) { app.innerHTML = '<div class="card">Auto nije pronađen. <a href="#auti">Natrag</a></div>'; return; }
  let parts = await DB.byAuto(id);
  const info = [['Karoserija', car.karoserija], ['Gorivo', car.gorivo], ['Mjenjač', car.mjenjac], ['Pogon', car.pogon],
    ['Šifra boje', car.kodBoje], ['Unutrašnjost', car.kodUnutra], ['Broj motora', car.brojMotora], ['Tip', car.typ],
    ['Volan', car.volan], ['Tvornica', car.tvornica], ['Nabava', car.nabava != null ? eur(car.nabava) : null],
    ['Troškovi', car.troskovi != null ? eur(car.troskovi) : null], ['Datum nabave', car.datumNabave], ['Kupljeno od', car.prodavac]].filter(x => x[1]);
  app.innerHTML = `
  <div class="row noprint" style="margin-bottom:10px"><a href="#auti">← Svi auti</a></div>
  <div class="card">
    <div class="row"><div class="grow"><h2 style="margin:0">${h(carTitle(car))}</h2>
      <div class="muted">${h(carSub(car))}</div>
      <div class="mono" style="margin-top:4px">${h(car.vin)} <button class="noprint" id="kopVin" style="padding:2px 8px;font-size:12px">kopiraj</button></div></div>
      <div class="row noprint"><a class="btn" href="#uredi" data-edit="${car.id}">Uredi</a><a class="btn" target="_blank" rel="noopener noreferrer" href="${h(katalogUrl(car))}">📘 Katalog</a><button id="uvoz">📥 Uvezi iz kataloga</button><button id="csv">CSV</button>${DB.mode === 'cloud' ? '' : '<button id="ispis">Ispis</button>'}<button class="danger" id="obrisi">Obriši</button></div></div>
    <table class="info" style="margin-top:10px">${info.map(([k, v]) => `<tr><td>${h(k)}</td><td>${h(v)}</td></tr>`).join('')}
      ${Object.entries(car.oprema || {}).some(x => x[1]) ? `<tr><td>Oprema</td><td>${DIJELOVI.OPREMA.filter(([k]) => car.oprema[k]).map(x => h(x[1])).join(', ')}</td></tr>` : ''}</table>
    ${car.napomena ? `<p>${h(car.napomena)}</p>` : ''}
    <div class="photos" id="carFoto" style="margin-top:10px"></div>
  </div>
  <div class="card"><div class="stats" id="stats"></div></div>
  <div class="row noprint" style="margin:6px 0 10px"><div class="chips" id="chips"></div>
    <input id="fq" placeholder="Filtriraj dijelove…" style="max-width:240px;margin-left:auto">
    <button id="sveOtvori">Otvori sve</button></div>
  <div id="grupe"></div>`;

  photoStrip($('#carFoto'), car, 'auti');
  $('#kopVin').onclick = () => copyText(car.vin);
  $('#uvoz').onclick = () => openUvoz(car, async () => { parts = await DB.byAuto(id); drawStats(); drawChips(); drawGroups(); });
  $('#ispis')?.addEventListener('click', () => window.print());
  $('#obrisi').onclick = async () => {
    if (!(await ask(`Obrisati ${carTitle(car)} i svih ${parts.length} dijelova s fotkama? Ovo se ne može vratiti.`, 'Obriši'))) return;
    const fot = [...(car.fotke || []), ...parts.flatMap(p => p.fotke || [])];
    for (const f of fot) await PHOTO.del(f); await DB.delMany('dijelovi', parts.map(p => p.id)); await DB.del('auti', car.id);
    toast('Auto obrisan'); go('auti');
  };
  $('#csv').onclick = () => {
    const rows = [['Grupa', 'Dio', 'Status', 'OE broj', 'Lokacija', 'Cijena €', 'Prodano za €', 'Kupac', 'Datum prodaje', 'Napomena']];
    for (const p of sortParts(parts)) rows.push([GRUPA[p.grupa]?.n || p.grupa, p.naziv, p.status, p.oe, p.lokacija, p.cijena, p.prodanoZa, p.kupac, p.datumProdaje, p.napomena]);
    download(`${car.vin || 'auto'}-dijelovi.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  const drawStats = () => {
    const s = stats(parts, car);
    $('#stats').innerHTML = [['Dijelova', s.ukupno], ['Skinuto / na polici', s.naPolici], ['Prodano', s.prodano],
      ['Prihod', eur(s.prihod)], ['Nabava + troškovi', eur(s.trosak)], [s.zarada >= 0 ? 'Zarada' : 'Još do isplate', eur(s.zarada)],
      ['Vrijednost na lageru', eur(s.vrijednost)]].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
  };
  const drawChips = () => {
    const cnt = st => st === 'Svi' ? parts.length : parts.filter(p => p.status === st).length;
    $('#chips').innerHTML = ['Svi', ...STATUSI].filter(s => s === 'Svi' || cnt(s)).map(s => `<span class="chip${s === filterStatus ? ' on' : ''}" data-s="${s}">${s} ${cnt(s)}</span>`).join('');
    $$('.chip', $('#chips')).forEach(c => c.onclick = () => { filterStatus = c.dataset.s; drawChips(); drawGroups(); });
  };
  const drawGroups = () => {
    const q = norm($('#fq').value).split(/\s+/).filter(Boolean);
    const vis = parts.filter(p => (filterStatus === 'Svi' || p.status === filterStatus) &&
      q.every(w => norm(`${p.naziv} ${p.oe || ''} ${p.lokacija || ''} ${p.napomena || ''}`).includes(w)));
    const filtering = q.length > 0 || filterStatus !== 'Svi';
    $('#grupe').innerHTML = DIJELOVI.GRUPE.map(g => {
      const all = parts.filter(p => p.grupa === g.id);
      const ps = sortParts(vis.filter(p => p.grupa === g.id));
      if (!ps.length && filtering) return '';
      const prod = all.filter(p => p.status === 'Prodano').length;
      return `<details class="grp" data-g="${g.id}"${otvoreneGrupe.has(g.id) || filtering ? ' open' : ''}>
        <summary>${g.i} ${h(g.n)}<span class="cnt">${prod ? prod + ' prodano · ' : ''}${all.length} dijelova</span></summary>
        ${ps.map(partRow).join('')}
        <div class="addpart"><input placeholder="Dodaj dio u grupu ${h(g.n)}…"><button>Dodaj</button></div>
      </details>`;
    }).join('');
    $$('details.grp').forEach(d => d.addEventListener('toggle', () => d.open ? otvoreneGrupe.add(d.dataset.g) : otvoreneGrupe.delete(d.dataset.g)));
    $$('.part').forEach(row => {
      const p = parts.find(x => x.id === row.dataset.id);
      $('.nm', row).onclick = () => openPart(p, car, async () => { parts = await DB.byAuto(id); drawStats(); drawChips(); drawGroups(); });
      $('select', row).onchange = async e => {
        p.status = e.target.value;
        if (p.status === 'Prodano') { p.datumProdaje ||= today(); if (p.prodanoZa == null) p.prodanoZa = p.cijena ?? null; }
        await DB.put('dijelovi', p); row.className = 'part s-' + p.status.replace(/ /g, '-'); drawStats(); drawChips();
        if (p.status === 'Prodano' && p.prodanoZa == null) toast('Upiši cijenu za koliko je prodano');
      };
      $('input.price', row).onchange = async e => {
        const v = num(e.target.value);
        if (p.status === 'Prodano') p.prodanoZa = v; else p.cijena = v;
        await DB.put('dijelovi', p); drawStats();
      };
    });
    $$('.addpart').forEach(ap => {
      const go = async () => {
        const inp = $('input', ap); const n = inp.value.trim(); if (!n) return;
        const g = ap.closest('details').dataset.g;
        const p = noviDio(car, g, n, Date.now(), await oeZaAuto(car));
        await DB.put('dijelovi', p); parts.push(p); otvoreneGrupe.add(g); drawStats(); drawChips(); drawGroups();
        toast('Dio dodan');
      };
      $('button', ap).onclick = go; $('input', ap).onkeydown = e => { if (e.key === 'Enter') go(); };
    });
  };
  $('#fq').oninput = drawGroups;
  $('#sveOtvori').onclick = () => {
    const allOpen = DIJELOVI.GRUPE.every(g => otvoreneGrupe.has(g.id));
    DIJELOVI.GRUPE.forEach(g => allOpen ? otvoreneGrupe.delete(g.id) : otvoreneGrupe.add(g.id));
    $('#sveOtvori').textContent = allOpen ? 'Otvori sve' : 'Zatvori sve'; drawGroups();
  };
  drawStats(); drawChips(); drawGroups();
}

function sortParts(ps) {
  const order = Object.fromEntries(DIJELOVI.GRUPE.map((g, i) => [g.id, i]));
  return [...ps].sort((a, b) => (order[a.grupa] ?? 99) - (order[b.grupa] ?? 99) || (a.created || 0) - (b.created || 0));
}
function partRow(p) {
  const meta = [p.oe ? 'OE ' + p.oe + (p.oeAuto ? ' (provjeri)' : '') : '', p.lokacija ? '📍 ' + p.lokacija : '', (p.fotke || []).length ? '📷 ' + p.fotke.length : '',
    p.status === 'Prodano' && p.kupac ? '→ ' + p.kupac : ''].filter(Boolean).join(' · ');
  const price = p.status === 'Prodano' ? p.prodanoZa : p.cijena;
  return `<div class="part s-${h(p.status.replace(/ /g, '-'))}" data-id="${p.id}">
    <div class="nm"><b>${h(p.naziv)}</b>${meta ? `<div class="small muted">${h(meta)}</div>` : ''}</div>
    <select>${opts(STATUSI, p.status)}</select>
    <input class="price" inputmode="decimal" placeholder="${p.status === 'Prodano' ? 'prodano €' : 'cijena €'}" value="${price ?? ''}">
  </div>`;
}
function toCsv(rows) {
  return '﻿' + rows.map(r => r.map(c => { const s = c == null ? '' : String(c); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(';')).join('\r\n');
}

// ---------- prozor jednog dijela ----------
// ---------- OE brojevi: pamćenje po tipu auta ----------
const oeKljuc = car => car.typ || (car.kod ? 'kod:' + car.kod : null);
async function oeZaAuto(car) { const k = oeKljuc(car); const t = k ? await DB.get('tipovi', k) : null; return (t && t.oe) || {}; }
function noviDio(car, grupa, naziv, created, oeMap) {
  const p = { id: uid(), autoId: car.id, grupa, naziv, status: 'Na autu', fotke: [], created };
  const oe = oeMap && oeMap[grupa + '|' + naziv];
  if (oe) { p.oe = oe; p.oeAuto = true; }
  return p;
}
async function zapamtiOE(car, p) {
  const k = oeKljuc(car); if (!k || !p.oe) return 0;
  const t = (await DB.get('tipovi', k)) || { typ: k, model: car.model, motor: car.motor, kod: car.kod, klasa: car.klasa, gorivo: car.gorivo, mjenjac: car.mjenjac };
  t.oe = { ...(t.oe || {}), [p.grupa + '|' + p.naziv]: p.oe }; t.updated = Date.now();
  await DB.put('tipovi', t);
  // isti dio na drugim autima istog tipa, ako još nema broj
  let n = 0;
  for (const a of await DB.all('auti')) {
    if (a.id === car.id || oeKljuc(a) !== k) continue;
    const q = (await DB.byAuto(a.id)).find(x => x.grupa === p.grupa && x.naziv === p.naziv && !x.oe);
    if (q) { q.oe = p.oe; q.oeAuto = true; await DB.put('dijelovi', q); n++; }
  }
  return n;
}
async function oePrijedlozi(car, p) {
  if (!car.kod) return [];
  const key = p.grupa + '|' + p.naziv, out = new Set();
  for (const t of await DB.all('tipovi')) if (t.kod === car.kod && t.oe && t.oe[key]) out.add(t.oe[key]);
  return [...out].slice(0, 5);
}
const katalogUrl = car => car.vin && car.vin.length === 17
  ? 'https://partsouq.com/en/search/all?q=' + encodeURIComponent(car.vin) : 'https://partsouq.com/';
function oeGoogle(p, car) {
  const q = `Mercedes ${car.kod || ''} ${car.model || car.klasa || ''} ${p.naziv.replace(/\((L|D)\)/, m => m === '(L)' ? 'lijevi' : 'desni')} OE broj`;
  return 'https://www.google.com/search?q=' + encodeURIComponent(q.replace(/\s+/g, ' ').trim());
}

function oglas(p, car) {
  return [
    `${p.naziv} — Mercedes-Benz ${car.model || car.klasa || ''}${car.kod ? ' (' + car.kod + ')' : ''}`,
    [car.godina ? 'Godište ' + car.godina : '', car.motor ? 'motor ' + car.motor : '', car.kw ? car.kw + ' kW' : '', car.gorivo].filter(Boolean).join(', '),
    p.oe ? 'Originalni broj (OE): ' + p.oe : '',
    car.km ? 'Kilometraža vozila: ' + Number(car.km).toLocaleString('hr-HR') + ' km' : '',
    car.kodBoje && GRUPA[p.grupa]?.id === 'limarija' ? 'Šifra boje: ' + car.kodBoje : '',
    p.napomena || '',
    p.cijena != null ? 'Cijena: ' + eur(p.cijena) : '',
  ].filter(Boolean).join('\n');
}

function openPart(p, car, onDone) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box">
    <div class="row"><h3 class="grow" style="margin:0">${h(p.naziv)}</h3><button id="x">✕</button></div>
    <div class="small muted" style="margin-bottom:10px">${h(carTitle(car))} · ${h(car.vin)}</div>
    <div class="grid">
      <label class="f" style="grid-column:1/-1"><span>Naziv dijela</span><input name="naziv" value="${h(p.naziv)}"></label>
      <label class="f"><span>Grupa</span><select name="grupa">${DIJELOVI.GRUPE.map(g => `<option value="${g.id}"${g.id === p.grupa ? ' selected' : ''}>${h(g.n)}</option>`).join('')}</select></label>
      <label class="f"><span>Status</span><select name="status">${opts(STATUSI, p.status)}</select></label>
      <div class="oebox" style="grid-column:1/-1">
        <label class="f"><span>OE broj (originalni Mercedes broj, A…)</span><input name="oe" value="${h(p.oe || '')}" placeholder="A2048200559" autocomplete="off"></label>
        <div id="oeNote" class="small" style="margin:6px 4px 0"></div>
        <div class="row" style="margin-top:8px">
          <a class="btn" target="_blank" rel="noopener noreferrer" href="${h(oeGoogle(p, car))}">🔍 Google</a>
          <a class="btn" target="_blank" rel="noopener noreferrer" href="${h(katalogUrl(car))}">📘 Katalog za ovaj VIN</a>
          <button type="button" id="kopVin2">Kopiraj VIN</button>
        </div>
        <div class="small muted" style="margin:6px 4px 0">Katalog (PartSouq, besplatno) otvara točno ovaj auto po VIN-u: odaberi grupu, nađi dio i kopiraj broj ovamo (bez razmaka je u redu). Program ga zapamti za iduće aute istog tipa.</div>
      </div>
      <label class="f"><span>Lokacija (polica)</span><input name="lokacija" value="${h(p.lokacija || '')}" placeholder="R3-P2"></label>
      <label class="f"><span>Tražena cijena (€)</span><input name="cijena" inputmode="decimal" value="${h(p.cijena ?? '')}"></label>
      <label class="f"><span>Prodano za (€)</span><input name="prodanoZa" inputmode="decimal" value="${h(p.prodanoZa ?? '')}"></label>
      <label class="f"><span>Kupac</span><input name="kupac" value="${h(p.kupac || '')}"></label>
      <label class="f"><span>Datum prodaje</span><input type="date" name="datumProdaje" value="${h(p.datumProdaje || '')}"></label>
    </div>
    <label class="f" style="margin-top:10px"><span>Napomena (stanje, oštećenja…)</span><textarea name="napomena" rows="2">${h(p.napomena || '')}</textarea></label>
    <div class="photos" id="pf" style="margin:12px 0"></div>
    <div class="row"><button class="primary" id="save">Spremi</button><button id="ad">Kopiraj tekst oglasa</button>
      <span class="grow"></span><button class="danger" id="del">Obriši dio</button></div>
  </div>`;
  document.body.appendChild(m);
  const F = n => $(`[name="${n}"]`, m);
  let changed = false;
  const close = () => { m.remove(); if (changed) onDone?.(); };
  $('#x', m).onclick = close;
  m.addEventListener('click', e => { if (e.target === m) close(); });
  photoStrip($('#pf', m), p, 'dijelovi', () => { changed = true; });
  const read = () => Object.assign(p, {
    naziv: F('naziv').value.trim() || p.naziv, grupa: F('grupa').value, status: F('status').value, oe: F('oe').value.trim().toUpperCase().replace(/\s/g, ''),
    lokacija: F('lokacija').value.trim(), cijena: num(F('cijena').value), prodanoZa: num(F('prodanoZa').value),
    kupac: F('kupac').value.trim(), datumProdaje: F('datumProdaje').value, napomena: F('napomena').value.trim(),
  });
  F('status').onchange = () => {
    if (F('status').value === 'Prodano') { if (!F('datumProdaje').value) F('datumProdaje').value = today(); if (!F('prodanoZa').value) F('prodanoZa').value = F('cijena').value; }
  };
  $('#kopVin2', m).onclick = () => copyText(car.vin);
  (async () => {
    const note = $('#oeNote', m);
    if (p.oe && p.oeAuto) { note.innerHTML = '<span style="color:var(--warn)">Upisano automatski iz ranijeg auta istog tipa — provjeri i spremi.</span>'; return; }
    if (p.oe) return;
    const prij = await oePrijedlozi(car, p);
    if (prij.length) {
      note.innerHTML = 'Na drugim autima (' + h(car.kod) + '): ' + prij.map(o => `<a href="#" data-oe="${h(o)}" class="mono">${h(o)}</a>`).join(', ') + ' <span class="muted">— dodirni za upis</span>';
      $$('a[data-oe]', note).forEach(a => a.onclick = e => { e.preventDefault(); F('oe').value = a.dataset.oe; });
    }
  })();
  $('#save', m).onclick = async () => {
    read();
    if (p.oe) p.oeAuto = false; else delete p.oeAuto;
    await DB.put('dijelovi', p); changed = true;
    let n = 0;
    if (p.oe) n = await zapamtiOE(car, p);
    toast(n ? `Spremljeno — OE broj dodan i na ${n} ${n === 1 ? 'drugi auto' : 'druga auta'}` : 'Spremljeno');
    close();
  };
  $('#ad', m).onclick = () => { read(); copyText(oglas(p, car)); };
  $('#del', m).onclick = async () => {
    if (!(await ask(`Obrisati „${p.naziv}“ s liste?`, 'Obriši'))) return;
    for (const f of p.fotke || []) await PHOTO.del(f); await DB.del('dijelovi', p.id); changed = true; close();
  };
}

// ---------- pretraga kroz sve aute ----------
async function viewTrazi() {
  const [auti, dijelovi] = await Promise.all([DB.all('auti'), DB.all('dijelovi')]);
  const A = Object.fromEntries(auti.map(a => [a.id, a]));
  const kodovi = [...new Set(auti.map(a => a.kod).filter(Boolean))].sort();
  const motori = [...new Set(auti.map(a => a.motor).filter(Boolean))].sort();
  app.innerHTML = `<h2>Pretraga dijelova</h2>
  <div class="card"><div class="grid">
    <label class="f" style="grid-column:1/-1"><span>Što kupac traži? (npr. „far lijevi“, „turbina“, OE broj)</span><input id="q" autofocus></label>
    <label class="f"><span>Šasija</span><select id="kod"><option value="">sve</option>${opts(kodovi)}</select></label>
    <label class="f"><span>Motor</span><select id="mot"><option value="">svi</option>${opts(motori)}</select></label>
    <label class="f"><span>Stanje</span><select id="st"><option value="dost">dostupno (na autu, skinuto, polica)</option><option value="pol">samo skinuto / na polici</option><option value="">sve</option><option value="Prodano">prodano</option></select></label>
  </div></div>
  <div class="card"><div id="rez" class="small muted">Upiši pojam za pretragu.</div></div>`;
  const run = () => {
    const q = norm($('#q').value).split(/\s+/).filter(Boolean)
      .map(w => ({ lijevi: '(l)', lijeva: '(l)', lijevo: '(l)', desni: '(d)', desna: '(d)', desno: '(d)' })[w] || w);
    const kod = $('#kod').value, mot = $('#mot').value, st = $('#st').value;
    if (!q.length && !kod && !mot) { $('#rez').innerHTML = 'Upiši pojam za pretragu.'; return; }
    const hits = dijelovi.filter(p => {
      const a = A[p.autoId]; if (!a) return false;
      if (kod && a.kod !== kod) return false;
      if (mot && a.motor !== mot) return false;
      if (st === 'dost' && !DOSTUPNO.has(p.status)) return false;
      if (st === 'pol' && !['Skinuto', 'Na polici'].includes(p.status)) return false;
      if (st === 'Prodano' && p.status !== 'Prodano') return false;
      const s = norm(`${p.naziv} ${p.oe || ''} ${p.lokacija || ''} ${p.napomena || ''} ${GRUPA[p.grupa]?.n || ''} ${a.model} ${a.klasa} ${a.kod} ${a.motor} ${a.godina}`);
      return q.every(w => s.includes(w));
    });
    $('#rez').innerHTML = `<div class="muted" style="margin-bottom:4px">Pronađeno: ${hits.length}${hits.length > 300 ? ' (prikazano 300)' : ''}</div>` +
      hits.slice(0, 300).map(p => {
        const a = A[p.autoId];
        return `<div class="res" data-id="${p.id}"><div><b>${h(p.naziv)}</b> ${badge(p.status)}
          <div class="small muted">${h(carTitle(a))} · ${h([a.godina, a.motor, a.boja].filter(Boolean).join(' · '))}${p.oe ? ' · OE ' + h(p.oe) : ''}</div></div>
          <div style="text-align:right"><b>${eur(p.status === 'Prodano' ? p.prodanoZa : p.cijena)}</b><div class="small muted">${p.lokacija ? '📍 ' + h(p.lokacija) : ''}</div></div></div>`;
      }).join('');
    $$('.res', $('#rez')).forEach(r => r.onclick = () => { const p = dijelovi.find(x => x.id === r.dataset.id); openPart(p, A[p.autoId], run); });
  };
  ['q', 'kod', 'mot', 'st'].forEach(i => $('#' + i).addEventListener(i === 'q' ? 'input' : 'change', run));
}

// ---------- zarada ----------
async function viewZarada() {
  const [auti, dijelovi] = await Promise.all([DB.all('auti'), DB.all('dijelovi')]);
  const po = {}; for (const d of dijelovi) (po[d.autoId] ||= []).push(d);
  const rows = auti.map(a => ({ a, s: stats(po[a.id] || [], a) })).sort((x, y) => y.s.zarada - x.s.zarada);
  const T = rows.reduce((t, { s }) => ({ trosak: t.trosak + s.trosak, prihod: t.prihod + s.prihod, vrijednost: t.vrijednost + s.vrijednost, prodano: t.prodano + s.prodano }), { trosak: 0, prihod: 0, vrijednost: 0, prodano: 0 });
  const mj = {};
  for (const p of dijelovi) if (p.status === 'Prodano') {
    const k = (p.datumProdaje || '').slice(0, 7) || 'bez datuma';
    (mj[k] ||= { n: 0, iznos: 0 }); mj[k].n++; mj[k].iznos += p.prodanoZa ?? p.cijena ?? 0;
  }
  const mjeseci = Object.keys(mj).sort().reverse().slice(0, 12);
  app.innerHTML = `<h2>Zarada</h2>
  <div class="card"><div class="stats">
    <div class="stat"><b>${auti.length}</b><span>Auta</span></div>
    <div class="stat"><b>${eur(T.trosak)}</b><span>Uloženo (nabava + troškovi)</span></div>
    <div class="stat"><b>${eur(T.prihod)}</b><span>Prihod od dijelova</span></div>
    <div class="stat"><b class="${T.prihod - T.trosak >= 0 ? 'ok' : 'err'}">${eur(T.prihod - T.trosak)}</b><span>Razlika</span></div>
    <div class="stat"><b>${eur(T.vrijednost)}</b><span>Lager (tražene cijene)</span></div>
    <div class="stat"><b>${T.prodano}</b><span>Prodanih dijelova</span></div>
  </div></div>
  <div class="card scroll"><h3>Po autu</h3><table class="t"><tr><th>Auto</th><th class="n">Uloženo</th><th class="n">Prodano</th><th class="n">Prihod</th><th class="n">Zarada</th><th class="n">Lager</th></tr>
    ${rows.map(({ a, s }) => `<tr><td><a href="#auti" data-car="${a.id}">${h(carTitle(a))}</a><div class="small muted mono">${h(a.vin)}</div></td>
      <td class="n">${eur(s.trosak)}</td><td class="n">${s.prodano}/${s.ukupno}</td><td class="n">${eur(s.prihod)}</td>
      <td class="n ${s.zarada >= 0 ? 'ok' : 'err'}">${eur(s.zarada)}</td><td class="n">${eur(s.vrijednost)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nema auta.</td></tr>'}
  </table></div>
  <div class="card scroll"><h3>Prodaja po mjesecima</h3><table class="t"><tr><th>Mjesec</th><th class="n">Dijelova</th><th class="n">Iznos</th></tr>
    ${mjeseci.map(k => `<tr><td>${h(k)}</td><td class="n">${mj[k].n}</td><td class="n">${eur(mj[k].iznos)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Još nema prodaje.</td></tr>'}
  </table></div>`;
}

// ---------- kopija i postavke ----------
const blobToData = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });

async function viewPostavke() {
  const [auti, dijelovi, tipovi] = await Promise.all([DB.all('auti'), DB.all('dijelovi'), DB.all('tipovi')]);
  let kvota = '';
  try { const e = await navigator.storage.estimate(); kvota = `Zauzeto ${(e.usage / 1048576).toFixed(1)} MB od dostupnih ${(e.quota / 1073741824).toFixed(1)} GB.`; } catch { }
  const trajno = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
  app.innerHTML = `<h2>Kopija i postavke</h2>
  <div class="card"><h3>Sigurnosna kopija</h3>
    <p class="small muted">Podaci se čuvaju u ovom pregledniku na ovom uređaju. Redovito spremi kopiju (npr. jednom tjedno) na disk ili USB — i fotke su unutra.
    Kopijom se podaci prebacuju i na drugo računalo ili mobitel.</p>
    <p class="small">${auti.length} auta · ${dijelovi.length} dijelova · ${h(kvota)} ${trajno ? '<span class="ok">Trajna pohrana uključena.</span>' : ''}</p>
    <div class="row"><button class="primary" id="izvoz">Spremi kopiju (.json)</button>
      <label class="btn">Učitaj kopiju<input type="file" id="uvoz" accept=".json,application/json" hidden></label>
      <button id="csvSve">Svi dijelovi u CSV (Excel)</button>
      ${trajno ? '' : '<button id="trajno">Zaštiti podatke od brisanja</button>'}</div></div>
  <div class="card"><h3>Naučeni tipovi (${tipovi.length})</h3>
    <p class="small muted">Kad spremiš auto, program zapamti koji model i motor odgovaraju tipu iz VIN-a (npr. 204.008). Idući auto istog tipa popuni se sam.</p>
    <div class="scroll"><table class="t"><tr><th>Tip</th><th>Model</th><th>Motor</th><th>Gorivo</th><th>Mjenjač</th><th class="n">OE brojeva</th><th></th></tr>
    ${tipovi.map(t => `<tr><td class="mono">${h(t.typ)}</td><td>${h(t.model)}</td><td>${h(t.motor)}</td><td>${h(t.gorivo)}</td><td>${h(t.mjenjac)}</td><td class="n">${Object.keys(t.oe || {}).length || ''}</td>
      <td><button class="danger" data-t="${h(t.typ)}" style="padding:2px 8px">✕</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Još ništa.</td></tr>'}
    </table></div></div>
  <div class="card small muted"><h3 style="color:var(--ink)">O VIN-u</h3>
    Iz europskog Mercedesovog VIN-a čita se proizvođač, serija (npr. 204 = C-klasa W204), tip, karoserija, volan i tvornica.
    Godina i oprema nisu zapisani u VIN-u — upisuju se iz prometne / naljepnice. Za američke VIN-ove dodatne podatke daje besplatna NHTSA baza.</div>`;

  $$('button[data-t]').forEach(b => b.onclick = async () => { await DB.del('tipovi', b.dataset.t); viewPostavke(); });
  $('#trajno')?.addEventListener('click', async () => { const ok = await navigator.storage.persist(); toast(ok ? 'Trajna pohrana uključena' : 'Preglednik nije dopustio'); viewPostavke(); });
  $('#csvSve').onclick = () => {
    const A = Object.fromEntries(auti.map(a => [a.id, a]));
    const rows = [['VIN', 'Auto', 'Godište', 'Motor', 'Grupa', 'Dio', 'Status', 'OE broj', 'Lokacija', 'Cijena €', 'Prodano za €', 'Kupac', 'Datum prodaje']];
    for (const p of dijelovi) { const a = A[p.autoId] || {}; rows.push([a.vin, carTitle(a), a.godina, a.motor, GRUPA[p.grupa]?.n, p.naziv, p.status, p.oe, p.lokacija, p.cijena, p.prodanoZa, p.kupac, p.datumProdaje]); }
    download(`svi-dijelovi-${today()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };
  $('#izvoz').onclick = async () => {
    toast('Pripremam kopiju…');
    const fotke = [];
    const ids = [...new Set([...auti, ...dijelovi].flatMap(x => x.fotke || []))];
    for (const id of ids) { const b = await PHOTO.blob(id); if (b) fotke.push({ id, data: await blobToData(b) }); }
    download(`mercedes-dijelovi-kopija-${today()}.json`, JSON.stringify({ app: 'mercedes-dijelovi', verzija: 1, datum: new Date().toISOString(), auti, dijelovi, tipovi, fotke }), 'application/json');
  };
  $('#uvoz').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== 'mercedes-dijelovi') throw new Error('Ovo nije kopija ovog programa.');
      if (!(await ask(`Učitati ${d.auti.length} auta, ${d.dijelovi.length} dijelova i ${d.fotke.length} fotki? Isti zapisi bit će zamijenjeni, ostali ostaju.`, 'Učitaj'))) return;
      toast('Učitavam…');
      const map = {};
      for (const x of d.fotke) { try { map[x.id] = await PHOTO.save(await (await fetch(x.data)).blob()); } catch { } }
      for (const o of [...d.auti, ...d.dijelovi]) o.fotke = (o.fotke || []).map(i => map[i]).filter(Boolean);
      await DB.putMany('auti', d.auti); await DB.putMany('dijelovi', d.dijelovi); await DB.putMany('tipovi', d.tipovi || []);
      toast('Kopija učitana'); viewPostavke();
    } catch (err) { info('Učitavanje nije uspjelo: ' + err.message); }
  };
}

window.addEventListener('beforeprint', () => $$('details.grp').forEach(d => d.open = true));
const T0 = performance.now();
function hideSplash() {
  const s = document.getElementById('splash'); if (!s) return;
  setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 600); }, Math.max(0, 2000 - (performance.now() - T0)));
}
async function start() {
  app.innerHTML = '<div class="card empty">Učitavam podatke…</div>';
  const mode = await initStorage();
  if (mode === 'nema-pristupa') {
    app.innerHTML = '<div class="card empty"><h2>Nema pristupa podacima</h2><p>Prijavi se na claude.ai računom s kojim je ova stranica podijeljena.</p></div>';
    hideSplash(); return;
  }
  if (DB.mode === 'cloud') {
    const SY = { ok: '✓ spremljeno', spremam: 'spremam…', greska: '⚠ greška pri spremanju', puno: '⚠ baza je puna', sporo: '⚠ spora veza' };
    DB.onStatus(s => { $('#sync').textContent = SY[s] || ''; });
    DB.onRemote(() => {
      if ($('.modal') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || ['novi', 'uredi'].includes(curView)) { toast('Podaci su promijenjeni na drugom uređaju'); return; }
      route(true);
    });
    window.addEventListener('beforeunload', e => { if (DB.pending()) { e.preventDefault(); e.returnValue = ''; } });
    $('#sync').textContent = '✓ online';
  } else {
    $('#sync').textContent = 'podaci na ovom uređaju';
    if ('serviceWorker' in navigator && (['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol === 'https:'))
      navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  await route();
  hideSplash();
}
start().catch(e => { console.error(e); hideSplash(); });
