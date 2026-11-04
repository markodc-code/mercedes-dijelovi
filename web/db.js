// Spremanje podataka. Dva načina rada, isto sučelje (DB i PHOTO):
//  - lokalno: IndexedDB u pregledniku (kad se pokrene preko Pokreni.bat)
//  - online: zajednička baza i spremište fotki objavljene stranice na claude.ai
//    (mobitel i PC vide iste podatke). Jedan dokument po autu, dijelovi su unutra.
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));

// ---------- lokalno (IndexedDB) ----------
const LocalDB = (() => {
  let dbp;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('mercedes-dijelovi', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('auti', { keyPath: 'id' });
        d.createObjectStore('dijelovi', { keyPath: 'id' }).createIndex('autoId', 'autoId');
        d.createObjectStore('fotke', { keyPath: 'id' });
        d.createObjectStore('tipovi', { keyPath: 'typ' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function st(name, mode = 'readonly') { return (await open()).transaction(name, mode).objectStore(name); }
  async function batch(name, fn) {
    const tx = (await open()).transaction(name, 'readwrite');
    fn(tx.objectStore(name));
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  }
  return {
    mode: 'local',
    ready: () => open(),
    onRemote() { },
    pending: () => false,
    all: async n => req((await st(n)).getAll()),
    get: async (n, k) => req((await st(n)).get(k)),
    put: async (n, v) => req((await st(n, 'readwrite')).put(v)),
    del: async (n, k) => req((await st(n, 'readwrite')).delete(k)),
    byAuto: async id => req((await st('dijelovi')).index('autoId').getAll(id)),
    putMany: (n, arr) => batch(n, s => arr.forEach(v => s.put(v))),
    delMany: (n, keys) => batch(n, s => keys.forEach(k => s.delete(k))),
  };
})();

const LocalPhoto = (() => {
  const cache = new Map();
  return {
    enabled: true,
    async save(blob) { const id = uid(); await LocalDB.put('fotke', { id, blob }); return id; },
    async url(id) {
      if (cache.has(id)) return cache.get(id);
      const f = await LocalDB.get('fotke', id);
      const u = f ? URL.createObjectURL(f.blob) : '';
      cache.set(id, u); return u;
    },
    async blob(id) { const f = await LocalDB.get('fotke', id); return f ? f.blob : null; },
    async del(id) { cache.delete(id); await LocalDB.del('fotke', id); },
  };
})();

// ---------- online (zajednička baza) ----------
function makeCloud(db) {
  const cars = new Map();   // id -> auto s poljem dijelovi
  const tipovi = new Map();
  const myRevs = new Set(), dirty = new Set(), writing = new Set(), timers = {};
  const remoteFns = [], statusFns = [];
  let failed = null;
  const status = s => statusFns.forEach(f => f(s));
  const strip = c => { const x = clone(c); delete x.dijelovi; delete x.rev; return x; };
  const busy = id => dirty.has(id) || writing.has(id);

  async function flush(id) {
    if (writing.has(id)) { dirty.add(id); return; }
    writing.add(id); dirty.delete(id); status('spremam');
    try {
      const c = cars.get(id);
      if (!c) await db.doc('auti/' + id).delete();
      else { c.rev = uid(); myRevs.add(c.rev); await db.doc('auti/' + id).set(clone(c)); }
      failed = null;
    } catch (e) {
      failed = e; dirty.add(id);
      status(e && e.code === 'quota_exceeded' ? 'puno' : 'greska');
      console.error('Spremanje nije uspjelo', e);
      setTimeout(() => flush(id), 5000);
      return;
    } finally { writing.delete(id); }
    if (dirty.has(id)) flush(id);
    else if (!dirty.size && !writing.size) status('ok');
  }
  function schedule(id) {
    dirty.add(id); status('spremam');
    clearTimeout(timers[id]);
    timers[id] = setTimeout(() => { dirty.delete(id); flush(id); }, 500);
  }

  function ready() {
    return new Promise(res => {
      let gotA = false, gotT = false, first = true;
      const done = () => { if (gotA && gotT && first) { first = false; res(); } };
      const slow = setTimeout(() => status('sporo'), 10000);
      db.collection('auti').onSnapshot(snap => {
        let changed = false;
        for (const ch of snap.docChanges()) {
          const id = ch.doc.id;
          if (busy(id)) continue;
          if (ch.type === 'removed') { if (cars.delete(id)) changed = true; continue; }
          const d = ch.doc.data();
          if (d && myRevs.has(d.rev)) continue;
          cars.set(id, clone(d)); changed = true;
        }
        if (!snap.metadata.fromCache) { clearTimeout(slow); if (!dirty.size && !writing.size) status('ok'); }
        if (!gotA) { gotA = true; done(); } else if (changed) remoteFns.forEach(f => f());
      }, e => { console.error(e); status('greska'); gotA = true; done(); });
      db.collection('tipovi').onSnapshot(snap => {
        for (const ch of snap.docChanges()) {
          const d = ch.doc.data();
          if (ch.type === 'removed') tipovi.delete(ch.doc.data()?.typ || ch.doc.id); else if (d) tipovi.set(d.typ, clone(d));
        }
        if (!gotT) { gotT = true; done(); }
      }, () => { gotT = true; done(); });
    });
  }

  const tipDoc = typ => db.doc('tipovi/' + String(typ).replace(/[^A-Za-z0-9_\-.~:@+]/g, '_'));
  const findCarOfPart = pid => { for (const c of cars.values()) if ((c.dijelovi || []).some(p => p.id === pid)) return c; return null; };

  const api = {
    mode: 'cloud',
    ready,
    onRemote: f => remoteFns.push(f),
    onStatus: f => statusFns.push(f),
    pending: () => dirty.size > 0 || writing.size > 0,
    async all(n) {
      if (n === 'auti') return [...cars.values()].map(strip);
      if (n === 'dijelovi') return [...cars.values()].flatMap(c => clone(c.dijelovi || []));
      if (n === 'tipovi') return [...tipovi.values()].map(clone);
      return [];
    },
    async get(n, k) {
      if (n === 'auti') return cars.has(k) ? strip(cars.get(k)) : undefined;
      if (n === 'tipovi') return clone(tipovi.get(k));
    },
    async put(n, v) {
      if (n === 'auti') {
        const old = cars.get(v.id);
        cars.set(v.id, { ...clone(v), dijelovi: old ? old.dijelovi : (v.dijelovi || []) });
        schedule(v.id);
      } else if (n === 'dijelovi') {
        const c = cars.get(v.autoId); if (!c) return;
        const i = c.dijelovi.findIndex(p => p.id === v.id);
        if (i >= 0) c.dijelovi[i] = clone(v); else c.dijelovi.push(clone(v));
        schedule(c.id);
      } else if (n === 'tipovi') {
        tipovi.set(v.typ, clone(v));
        await tipDoc(v.typ).set(clone(v));
      }
    },
    async del(n, k) {
      if (n === 'auti') { if (cars.delete(k)) schedule(k); }
      else if (n === 'dijelovi') { const c = findCarOfPart(k); if (c) { c.dijelovi = c.dijelovi.filter(p => p.id !== k); schedule(c.id); } }
      else if (n === 'tipovi') { tipovi.delete(k); await tipDoc(k).delete(); }
    },
    async byAuto(id) { const c = cars.get(id); return c ? clone(c.dijelovi || []) : []; },
    async putMany(n, arr) { for (const v of arr) await api.put(n, v); },
    async delMany(n, keys) { for (const k of keys) await api.del(n, k); },
  };
  return api;
}

function makeCloudPhoto(assets) {
  return {
    enabled: !!assets,
    async save(blob) {
      if (!assets) throw new Error('Fotke može dodavati samo vlasnik ili urednik stranice.');
      const r = await assets.upload(blob, { type: 'image/jpeg' });
      return r.id;
    },
    async url(id) { return '/_blob/' + id; },
    async blob(id) { try { const r = await fetch('/_blob/' + id); return r.ok ? await r.blob() : null; } catch { return null; } },
    async del(id) { try { if (assets) await assets.delete(id); } catch (e) { console.warn(e); } },
  };
}

// Odabir načina rada — online ako je stranica objavljena na claude.ai
let DB = LocalDB, PHOTO = LocalPhoto, DOWNLOADS = null;
async function initStorage() {
  const local = ['localhost', '127.0.0.1', ''].includes(location.hostname) || /^192\.168\.|^10\./.test(location.hostname);
  if (local || location.hostname.endsWith('github.io')) { await LocalDB.ready(); return 'local'; }
  for (let i = 0; i < 20 && typeof window.claude?.use !== 'function'; i++) await new Promise(r => setTimeout(r, 100));
  if (typeof window.claude?.use !== 'function') { await LocalDB.ready(); return 'local'; }
  const db = await window.claude.use('db');
  if (!db) return 'nema-pristupa';
  const [assets, downloads] = await Promise.all([window.claude.use('assets').catch(() => null), window.claude.use('downloads').catch(() => null)]);
  DB = makeCloud(db); PHOTO = makeCloudPhoto(assets); DOWNLOADS = downloads;
  await DB.ready();
  return 'cloud';
}
