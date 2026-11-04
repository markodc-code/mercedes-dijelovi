// Predložak dijelova po grupama — prilagođava se gorivu, mjenjaču, pogonu, karoseriji i opremi auta.
const DIJELOVI = (() => {
  const GRUPE = [
    { id: 'motor', n: 'Motor', i: '⚙️' },
    { id: 'gorivo', n: 'Gorivo i ispuh', i: '⛽' },
    { id: 'hladenje', n: 'Hlađenje, grijanje i klima', i: '❄️' },
    { id: 'elektrika', n: 'Elektrika i upravljačke jedinice', i: '🔌' },
    { id: 'mjenjac', n: 'Mjenjač i pogon', i: '🔧' },
    { id: 'ovjesP', n: 'Prednji ovjes i upravljanje', i: '🛞' },
    { id: 'ovjesS', n: 'Stražnji ovjes', i: '🛞' },
    { id: 'kocnice', n: 'Kočnice', i: '🛑' },
    { id: 'kotaci', n: 'Kotači', i: '⭕' },
    { id: 'limarija', n: 'Limarija (karoserija)', i: '🚗' },
    { id: 'stakla', n: 'Stakla i retrovizori', i: '🪟' },
    { id: 'svjetla', n: 'Svjetla', i: '💡' },
    { id: 'unutra', n: 'Unutrašnjost i sigurnost', i: '💺' },
    { id: 'multimedija', n: 'Multimedija', i: '📻' },
    { id: 'brisaci', n: 'Brisači i pranje', i: '🌧️' },
    { id: 'ostalo', n: 'Ostalo', i: '📦' },
  ];

  const KAROSERIJE = ['Limuzina', 'Karavan', 'Hatchback', 'Coupé', 'Kabriolet', 'Roadster', 'SUV', 'Kombi', 'Pick-up'];
  const GORIVA = ['Dizel', 'Benzin', 'Hibrid', 'Plug-in hibrid', 'Električni'];
  const MJENJACI = ['Automatski', 'Ručni'];
  const POGONI = ['Stražnji', 'Prednji', '4MATIC'];
  const OPREMA = [
    ['turbo', 'Turbo / kompresor (benzin)'],
    ['xenon', 'Xenon / LED farovi'], ['panorama', 'Panorama / šiber krov'], ['navi', 'Navigacija (COMAND)'],
    ['kamera', 'Kamera za vožnju unatrag'], ['airmatic', 'Zračni ovjes (Airmatic)'], ['kuka', 'Kuka za vuču'],
    ['adblue', 'AdBlue (dizel)'], ['grijanjeSj', 'Grijanje / el. sjedala'], ['harman', 'Ozvučenje (Harman / Burmester)'],
  ];

  function generate(c) {
    const L = [];
    const o = c.oprema || {};
    const add = (g, n, ok = true) => { if (ok) L.push({ grupa: g, naziv: n }); };
    const lr = (g, n, ok = true) => { if (ok) { add(g, n + ' (L)'); add(g, n + ' (D)'); } };

    const E = c.gorivo === 'Električni';
    const H = c.gorivo === 'Hibrid' || c.gorivo === 'Plug-in hibrid';
    const D = c.gorivo === 'Dizel';
    const B = c.gorivo === 'Benzin' || H;
    const ICE = !E;
    const auto = c.mjenjac !== 'Ručni';
    const awd = c.pogon === '4MATIC';
    const fwd = c.pogon === 'Prednji';
    const k = c.karoserija;
    const kombi = k === 'Kombi';
    const dvoVrata = ['Coupé', 'Kabriolet', 'Roadster'].includes(k);
    const otvoren = ['Kabriolet', 'Roadster'].includes(k);
    const petaVrata = ['Karavan', 'Hatchback', 'SUV'].includes(k);

    // Motor
    if (ICE) {
      add('motor', 'Motor komplet');
      add('motor', 'Glava motora');
      add('motor', 'Blok motora');
      add('motor', 'Radilica');
      add('motor', 'Klipovi s klipnjačama (set)');
      add('motor', 'Bregaste osovine');
      add('motor', 'Poklopac ventila');
      add('motor', 'Karter (korito ulja)');
      add('motor', 'Pumpa ulja');
      add('motor', 'Kućište filtera ulja s hladnjakom');
      add('motor', 'Lanac razvoda s vodilicama');
      add('motor', 'Usisna grana');
      add('motor', 'Kućište filtera zraka');
      add('motor', 'Mjerač protoka zraka');
      lr('motor', 'Nosač motora');
      add('motor', 'Remenica radilice');
      add('motor', 'Zatezač remena');
      add('motor', 'Poklopac motora (plastični)');
      add('motor', 'Turbina', D || o.turbo);
      add('motor', 'Interkuler', D || o.turbo);
      add('motor', 'Cijevi interkulera (set)', D || o.turbo);
      add('motor', 'Brizgaljke (set)');
      add('motor', 'Visokotlačna pumpa', D);
      add('motor', 'Common rail letva', D);
      add('motor', 'EGR ventil', D);
      add('motor', 'Hladnjak EGR-a', D);
      add('motor', 'Grijači (žarnice, set)', D);
      add('motor', 'Upravljač grijača', D);
      add('motor', 'Bobine (set)', B);
      add('motor', 'Leptir gasa', B);
    }
    add('motor', 'Elektromotor (pogonski)', E || H);
    add('motor', 'Visokonaponska baterija', E || H);
    add('motor', 'Inverter / energetska elektronika', E || H);
    add('motor', 'Punjač (on-board)', E || c.gorivo === 'Plug-in hibrid');
    add('motor', 'Kabel za punjenje', E || c.gorivo === 'Plug-in hibrid');

    // Gorivo i ispuh
    if (ICE) {
      add('gorivo', 'Rezervoar goriva');
      add('gorivo', 'Pumpa goriva u rezervoaru');
      add('gorivo', 'Kućište filtera goriva', D);
      add('gorivo', 'Spremnik aktivnog ugljena', B);
      add('gorivo', 'Ispušna grana');
      add('gorivo', 'Katalizator');
      add('gorivo', 'DPF filter', D);
      add('gorivo', 'Srednji lonac');
      add('gorivo', 'Zadnji lonac');
      add('gorivo', 'Lambda sonde (set)');
      add('gorivo', 'Senzor diferencijalnog tlaka DPF', D);
      add('gorivo', 'AdBlue rezervoar s pumpom', D && o.adblue);
      add('gorivo', 'AdBlue brizgaljka', D && o.adblue);
      add('gorivo', 'NOx senzori', D && o.adblue);
    }
    add('gorivo', 'Poklopac / vratašca rezervoara');

    // Hlađenje i klima
    add('hladenje', 'Hladnjak vode');
    add('hladenje', 'Hladnjak klime (kondenzator)');
    add('hladenje', 'Ventilator hladnjaka s motorom');
    add('hladenje', 'Pumpa vode', ICE);
    add('hladenje', 'Elektro pumpa vode (dodatna)', E || H);
    add('hladenje', 'Termostat', ICE);
    add('hladenje', 'Ekspanzijska posuda');
    add('hladenje', 'Kompresor klime');
    add('hladenje', 'Isparivač klime');
    add('hladenje', 'Radijator grijanja');
    add('hladenje', 'Ventilator kabine (puhalo)');
    add('hladenje', 'Regulator puhala');
    add('hladenje', 'Komandna ploča klime');
    add('hladenje', 'Cijevi klime (set)');
    add('hladenje', 'Kućište klime komplet');

    // Elektrika
    add('elektrika', 'Alternator', ICE);
    add('elektrika', 'Elektropokretač', ICE);
    add('elektrika', 'Akumulator');
    add('elektrika', 'Kabelski snop motora');
    add('elektrika', 'Kabelski snop kabine');
    add('elektrika', 'SAM modul prednji (osigurači)');
    add('elektrika', 'SAM modul stražnji');
    add('elektrika', 'Upravljačka jedinica motora (ECU)');
    add('elektrika', 'Upravljačka jedinica mjenjača', auto);
    add('elektrika', 'Kontakt brava (EZS) s ključem');
    add('elektrika', 'ELV blokada volana');
    add('elektrika', 'Upravljačka jedinica airbaga');
    add('elektrika', 'Gateway / središnji modul');
    add('elektrika', 'Moduli vrata (set)');
    add('elektrika', 'Modul parkirnih senzora (PDC)');
    add('elektrika', 'Parkirni senzori (set)');
    add('elektrika', 'Modul kuke', o.kuka);
    add('elektrika', 'Upravljačka jedinica zračnog ovjesa', o.airmatic);
    add('elektrika', 'Modul krova', otvoren);

    // Mjenjač i pogon
    add('mjenjac', auto ? 'Automatski mjenjač' : 'Ručni mjenjač');
    add('mjenjac', 'Hidrodinamički pretvarač (konvertor)', auto && ICE);
    add('mjenjac', 'Kvačilo komplet', !auto);
    add('mjenjac', 'Dvomaseni zamašnjak', !auto && ICE);
    add('mjenjac', 'Cilindar kvačila (glavni i radni)', !auto);
    add('mjenjac', auto ? 'Ručica mjenjača (selektor)' : 'Ručica mjenjača sa sajlama');
    add('mjenjac', 'Nosač mjenjača', ICE);
    add('mjenjac', 'Hladnjak ulja mjenjača', auto && ICE);
    add('mjenjac', 'Kardan', !fwd && !E);
    add('mjenjac', 'Stražnji diferencijal', !fwd && !E);
    lr('mjenjac', 'Stražnja poluosovina', !fwd);
    lr('mjenjac', 'Prednja poluosovina', fwd || awd);
    add('mjenjac', 'Razvodnik 4MATIC', awd && ICE);
    add('mjenjac', 'Prednji diferencijal', awd && !fwd);
    add('mjenjac', 'Stražnji kardan (4MATIC)', awd && fwd);
    add('mjenjac', 'Reduktor elektromotora', E);

    // Prednji ovjes i upravljanje
    lr('ovjesP', o.airmatic ? 'Prednji zračni amortizer' : 'Prednji amortizer');
    lr('ovjesP', 'Prednja opruga', !o.airmatic);
    lr('ovjesP', 'Rukavac s glavčinom');
    lr('ovjesP', 'Donje rame');
    lr('ovjesP', 'Gornje rame / poluga');
    add('ovjesP', 'Prednji stabilizator');
    add('ovjesP', 'Prednji nosač (podokvir)');
    add('ovjesP', 'Letva volana');
    add('ovjesP', 'Pumpa servo upravljanja', c.godina && +c.godina < 2012 && ICE);
    add('ovjesP', 'Stup volana');
    add('ovjesP', 'Volan');
    add('ovjesP', 'Spiralni kabel volana (kontakt traka)');
    add('ovjesP', 'Prekidači pod volanom (pokazivači / brisači)');
    add('ovjesP', 'Kompresor zračnog ovjesa', o.airmatic);
    add('ovjesP', 'Ventilski blok zračnog ovjesa', o.airmatic);

    // Stražnji ovjes
    lr('ovjesS', o.airmatic ? 'Stražnji zračni amortizer' : 'Stražnji amortizer');
    lr('ovjesS', 'Stražnja opruga', !o.airmatic);
    lr('ovjesS', 'Stražnja glavčina s nosačem');
    add('ovjesS', 'Stražnja ramena (set)');
    add('ovjesS', 'Stražnji stabilizator');
    add('ovjesS', 'Stražnji nosač (podokvir)');

    // Kočnice
    lr('kocnice', 'Prednje kočione kliješte');
    lr('kocnice', 'Stražnje kočione kliješte');
    add('kocnice', 'Prednji diskovi (par)');
    add('kocnice', 'Stražnji diskovi (par)');
    add('kocnice', 'ABS / ESP pumpa s modulom');
    add('kocnice', 'Servo kočnice s glavnim cilindrom');
    add('kocnice', 'Ručna kočnica (sajle / elektro modul)');
    add('kocnice', 'ABS senzori (set)');
    add('kocnice', 'Vakuum pumpa', D);

    // Kotači
    add('kotaci', 'Alu felge (set 4)');
    add('kotaci', 'Gume (set 4)');
    add('kotaci', 'Rezervni kotač / komplet za krpanje');
    add('kotaci', 'Dizalica i alat');
    add('kotaci', 'Senzori tlaka guma (set)');

    // Limarija
    add('limarija', 'Hauba');
    add('limarija', 'Prednji branik komplet');
    add('limarija', 'Stražnji branik komplet');
    add('limarija', 'Maska (rešetka hladnjaka)');
    add('limarija', 'Čelo (nosač hladnjaka)');
    add('limarija', 'Ojačanje prednjeg branika');
    add('limarija', 'Ojačanje stražnjeg branika');
    lr('limarija', 'Prednji blatobran (krilo)');
    lr('limarija', 'Podblatnik plastični');
    lr('limarija', 'Prednja vrata');
    lr('limarija', 'Stražnja vrata', !dvoVrata && !kombi);
    lr('limarija', 'Klizna vrata', kombi);
    if (kombi) lr('limarija', 'Stražnja krila vrata');
    else add('limarija', petaVrata ? 'Peta vrata (gepek vrata)' : 'Poklopac prtljažnika');
    lr('limarija', 'Stražnji blatobran (četvrtina, rezanje)');
    lr('limarija', 'Prag');
    add('limarija', 'Krov (rezanje)', !otvoren);
    add('limarija', 'Krovni nosači', ['Karavan', 'SUV'].includes(k));
    add('limarija', 'Mehanizam krova komplet', otvoren);
    add('limarija', 'Platneni / limeni krov', otvoren);
    add('limarija', 'Hidraulična pumpa krova', otvoren);
    add('limarija', 'Poklopac spremišta krova', otvoren);
    lr('limarija', 'Vanjska kvaka vrata');
    add('limarija', 'Lajsne i ukrasi (set)');
    add('limarija', 'Kuka za vuču', o.kuka);
    add('limarija', 'Teretni sanduk', k === 'Pick-up');

    // Stakla i retrovizori
    add('stakla', 'Vjetrobransko staklo');
    add('stakla', 'Stražnje staklo', k !== 'Roadster');
    lr('stakla', 'Staklo prednjih vrata');
    lr('stakla', 'Staklo stražnjih vrata', !dvoVrata && !kombi);
    lr('stakla', 'Podizač stakla prednji');
    lr('stakla', 'Podizač stakla stražnji', !dvoVrata && !kombi);
    lr('stakla', 'Bočno fiksno staklo', ['Karavan', 'SUV', 'Kombi'].includes(k));
    lr('stakla', 'Retrovizor komplet');
    add('stakla', 'Unutarnji retrovizor');
    add('stakla', 'Panorama / šiber krov komplet', o.panorama);
    add('stakla', 'Motor šiber krova', o.panorama);

    // Svjetla
    const far = o.xenon ? 'Far xenon / LED' : 'Far';
    lr('svjetla', far);
    lr('svjetla', 'Stop svjetlo vanjsko');
    lr('svjetla', 'Stop svjetlo unutarnje (na poklopcu)', ['Limuzina', 'Karavan', 'Coupé', 'Kabriolet'].includes(k));
    lr('svjetla', 'Maglenka');
    add('svjetla', 'Treće stop svjetlo');
    lr('svjetla', 'Xenon balast / LED modul', o.xenon);
    lr('svjetla', 'Pokazivač u retrovizoru');
    add('svjetla', 'Svjetlo registracije');
    add('svjetla', 'Stropna svjetla (set)');
    add('svjetla', 'Prekidač svjetala');

    // Unutrašnjost i sigurnost
    add('unutra', 'Armaturna ploča');
    add('unutra', 'Instrumenti (kilometar sat)');
    add('unutra', 'Airbag volana');
    add('unutra', 'Airbag suvozača');
    lr('unutra', 'Zračna zavjesa');
    lr('unutra', 'Bočni airbag sjedala');
    add('unutra', 'Airbag za koljena', c.godina && +c.godina >= 2009);
    lr('unutra', 'Sigurnosni pojas prednji');
    add('unutra', 'Sigurnosni pojasevi stražnji (set)', k !== 'Roadster');
    add('unutra', 'Sjedalo vozača');
    add('unutra', 'Sjedalo suvozača');
    add('unutra', 'Stražnja klupa (sjedište i naslon)', k !== 'Roadster');
    add('unutra', 'Središnja konzola');
    add('unutra', 'Naslon za ruku');
    add('unutra', 'Pretinac (glovebox)');
    lr('unutra', 'Obloga prednjih vrata');
    lr('unutra', 'Obloga stražnjih vrata', !dvoVrata && !kombi);
    add('unutra', 'Tapecirung krova', !otvoren);
    add('unutra', 'Stropna konzola s prekidačima');
    add('unutra', 'Tepisi (set)');
    add('unutra', 'Obloge prtljažnika');
    add('unutra', 'Roleta prtljažnika', ['Karavan', 'SUV'].includes(k));
    add('unutra', 'Mreža za prtljagu', ['Karavan', 'SUV'].includes(k));
    add('unutra', 'Polica prtljažnika', k === 'Hatchback');
    add('unutra', 'Vjetrobran (zaštita od vjetra)', otvoren);
    add('unutra', 'Prekidači podizača stakala (set)');
    add('unutra', 'Pedale (komplet)');
    add('unutra', 'Upravljačka jedinica i motori sjedala', o.grijanjeSj);

    // Multimedija
    add('multimedija', o.navi ? 'COMAND / navigacija glavna jedinica' : 'Radio / Audio jedinica');
    add('multimedija', 'Ekran');
    add('multimedija', 'Upravljač multimedije (kotačić / touchpad)');
    add('multimedija', 'Zvučnici (set)');
    add('multimedija', o.harman ? 'Pojačalo (Harman / Burmester)' : 'Pojačalo');
    add('multimedija', 'Antena modul');
    add('multimedija', 'Telefon / Bluetooth modul');
    add('multimedija', 'Kamera za vožnju unatrag', o.kamera);
    add('multimedija', 'USB / AUX priključak');

    // Brisači
    add('brisaci', 'Motor brisača prednji');
    add('brisaci', 'Mehanizam brisača');
    add('brisaci', 'Motor brisača stražnji', petaVrata || kombi);
    add('brisaci', 'Posuda tekućine s pumpom');
    add('brisaci', 'Senzor kiše i svjetla');
    add('brisaci', 'Pranje farova (pumpa i dizne)', o.xenon);

    // Ostalo
    add('ostalo', 'Ključ (dodatni)');
    add('ostalo', 'Servisna knjižica');
    add('ostalo', 'Prva pomoć / trokut');

    return L;
  }

  return { GRUPE, KAROSERIJE, GORIVA, MJENJACI, POGONI, OPREMA, generate };
})();
