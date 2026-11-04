// Uvoz dijelova iz kataloga (PartSouq i sl.): korisnik kopira stranicu kataloga i zalijepi je.
// Program izvuče originalne brojeve, prevede nazive na hrvatski i upari ih s listom dijelova auta.
const KATALOG = (() => {
  // ---------- čitanje teksta ----------
  const BROJ = /^(A\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2}(\s?\d{2,4})?|A\d{10}(\d{2,4})?|N\s?\d{9,15})$/;
  const normBroj = s => s.replace(/\s+/g, '').toUpperCase();
  const lijepiBroj = b => /^A\d{10}/.test(b) ? `A ${b.slice(1, 4)} ${b.slice(4, 7)} ${b.slice(7, 9)} ${b.slice(9, 11)}${b.length > 11 ? ' ' + b.slice(11) : ''}` : b;

  function parse(text) {
    const tok = String(text || '').split(/[\r\n\t]+/).map(s => s.trim()).filter(Boolean);
    const items = [];
    let cur = null, naslov = '';
    const tt = tok.find(t => / - Mercedes .*\| *PartSouq/i.test(t));
    if (tt) naslov = tt.replace(/^Title:\s*/i, '').split(' - Mercedes')[0];
    for (let k = 0; k < tok.length; k++) {
      const t = tok[k];
      if (/^ILLUSTRATION$/i.test(t)) { if (tok[k + 1] && !/^\d+%$/.test(tok[k + 1])) naslov = tok[k + 1]; break; }
      if (BROJ.test(t)) { cur = { broj: normBroj(t), naziv: '', napomene: [] }; items.push(cur); continue; }
      if (!cur) continue;
      if (!cur.naziv) { if (/[A-Z]{2,}/.test(t) && !/^QTY/i.test(t)) cur.naziv = t.toUpperCase(); continue; }
      const q = t.match(/^QTY:?\s*(\d+)/i); if (q) { cur.kol = +q[1]; continue; }
      if (/^\d{1,4}$/.test(t)) { cur.poz = cur.poz || t; continue; }
      const z = t.match(/REPLACED BY\s+(A\s?[\d\s]{10,16}|N\s?\d{9,15})/i);
      if (z) cur.zamjena = normBroj(z[1]);
      if (cur.napomene.length < 6 && !/^REPLACED BY/i.test(t)) cur.napomene.push(t);
    }
    // zamjene: koristi zadnji važeći broj, izbaci duplikate
    const po = new Map(items.map(i => [i.broj, i]));
    const konacni = b => { const seen = new Set(); while (po.get(b)?.zamjena && !seen.has(b)) { seen.add(b); b = po.get(b).zamjena; } return b; };
    const out = new Map();
    for (const i of items) {
      if (!i.naziv) continue;
      const b = konacni(i.broj);
      if (out.has(b)) continue;
      const nov = po.get(b) || i;
      out.set(b, { broj: b, prikaz: lijepiBroj(b), naziv: (nov.naziv || i.naziv), napomene: [...new Set([...(nov.napomene || []), ...i.napomene])].join(' · '), kol: nov.kol || i.kol, zamijenjen: b !== i.broj ? i.broj : null });
    }
    const rez = [...out.values()];
    rez.naslov = naslov;
    return rez;
  }

  // ---------- prijevod na hrvatski ----------
  // riječ → [nominativ, genitiv]
  const W = {
    ENGINE: ['motor', 'motora'], OIL: ['ulje', 'ulja'], FILTER: ['filter', 'filtera'], SEAL: ['brtva', 'brtve'], GASKET: ['brtva', 'brtve'],
    RING: ['prsten', 'prstena'], 'O-RING': ['O-prsten', 'O-prstena'], BOLT: ['vijak', 'vijka'], SCREW: ['vijak', 'vijka'], NUT: ['matica', 'matice'],
    WASHER: ['podloška', 'podloške'], CLIP: ['kopča', 'kopče'], COVER: ['poklopac', 'poklopca'], HOUSING: ['kućište', 'kućišta'],
    PUMP: ['pumpa', 'pumpe'], SENSOR: ['senzor', 'senzora'], VALVE: ['ventil', 'ventila'], PIPE: ['cijev', 'cijevi'], HOSE: ['crijevo', 'crijeva'],
    LINE: ['vod', 'voda'], BRACKET: ['nosač', 'nosača'], HOLDER: ['držač', 'držača'], MOUNT: ['nosač', 'nosača'], MOUNTING: ['nosač', 'nosača'],
    SUPPORT: ['oslonac', 'oslonca'], CABLE: ['kabel', 'kabela'], HARNESS: ['snop kabela', 'snopa kabela'], WIRING: ['instalacija', 'instalacije'],
    SWITCH: ['prekidač', 'prekidača'], RELAY: ['relej', 'releja'], FUSE: ['osigurač', 'osigurača'], CONTROL: ['upravljanje', 'upravljanja'],
    UNIT: ['jedinica', 'jedinice'], MODULE: ['modul', 'modula'], LAMP: ['svjetlo', 'svjetla'], LIGHT: ['svjetlo', 'svjetla'], BULB: ['žarulja', 'žarulje'],
    DOOR: ['vrata', 'vrata'], WINDOW: ['staklo', 'stakla'], MIRROR: ['retrovizor', 'retrovizora'], SEAT: ['sjedalo', 'sjedala'],
    BELT: ['remen', 'remena'], CHAIN: ['lanac', 'lanca'], TENSIONER: ['zatezač', 'zatezača'], PULLEY: ['remenica', 'remenice'], ROLLER: ['valjak', 'valjka'],
    GUIDE: ['vodilica', 'vodilice'], RAIL: ['vodilica', 'vodilice'], SPRING: ['opruga', 'opruge'], SHAFT: ['osovina', 'osovine'], BEARING: ['ležaj', 'ležaja'],
    SHELL: ['školjka', 'školjke'], SHELLS: ['školjke', 'školjki'], BUSHING: ['čahura', 'čahure'], BUSH: ['čahura', 'čahure'], HUB: ['glavčina', 'glavčine'],
    DISC: ['disk', 'diska'], DISK: ['disk', 'diska'], PAD: ['pločica', 'pločice'], PADS: ['pločice', 'pločica'], CALIPER: ['kliješta', 'kliješta'],
    TANK: ['spremnik', 'spremnika'], RESERVOIR: ['posuda', 'posude'], CAP: ['čep', 'čepa'], PLUG: ['čep', 'čepa'], DIPSTICK: ['šipka za ulje', 'šipke za ulje'],
    PAN: ['korito', 'korita'], SUMP: ['korito', 'korita'], CYLINDER: ['cilindar', 'cilindra'], HEAD: ['glava', 'glave'], BLOCK: ['blok', 'bloka'],
    CRANKCASE: ['kućište radilice', 'kućišta radilice'], PISTON: ['klip', 'klipa'], ROD: ['šipka', 'šipke'], CRANKSHAFT: ['radilica', 'radilice'],
    CAMSHAFT: ['bregasta osovina', 'bregaste osovine'], TIMING: ['razvod', 'razvoda'], INTAKE: ['usis', 'usisa'], EXHAUST: ['ispuh', 'ispuha'],
    AIR: ['zrak', 'zraka'], FUEL: ['gorivo', 'goriva'], WATER: ['voda', 'vode'], COOLANT: ['rashladna tekućina', 'rashladne tekućine'],
    RADIATOR: ['hladnjak', 'hladnjaka'], COOLER: ['hladnjak', 'hladnjaka'], FAN: ['ventilator', 'ventilatora'], HEATER: ['grijač', 'grijača'],
    GLASS: ['staklo', 'stakla'], TRIM: ['obloga', 'obloge'], PANEL: ['ploča', 'ploče'], HANDLE: ['ručka', 'ručke'], LOCK: ['brava', 'brave'],
    HINGE: ['šarka', 'šarke'], MOLDING: ['lajsna', 'lajsne'], MOULDING: ['lajsna', 'lajsne'], STRIP: ['traka', 'trake'], EMBLEM: ['znak', 'znaka'],
    GRILLE: ['maska', 'maske'], BUMPER: ['branik', 'branika'], FENDER: ['blatobran', 'blatobrana'], HOOD: ['hauba', 'haube'], BONNET: ['hauba', 'haube'],
    ROOF: ['krov', 'krova'], WHEEL: ['kotač', 'kotača'], TIRE: ['guma', 'gume'], TYRE: ['guma', 'gume'], RIM: ['felga', 'felge'], BRAKE: ['kočnica', 'kočnice'],
    STEERING: ['upravljač', 'upravljača'], GEAR: ['zupčanik', 'zupčanika'], TRANSMISSION: ['mjenjač', 'mjenjača'], GEARBOX: ['mjenjač', 'mjenjača'],
    CLUTCH: ['kvačilo', 'kvačila'], AXLE: ['osovina', 'osovine'], ARM: ['rame', 'ramena'], LINK: ['poluga', 'poluge'], STABILIZER: ['stabilizator', 'stabilizatora'],
    ABSORBER: ['amortizer', 'amortizera'], STRUT: ['amortizer', 'amortizera'], NOZZLE: ['mlaznica', 'mlaznice'], INJECTOR: ['brizgaljka', 'brizgaljke'],
    INJECTION: ['ubrizgavanje', 'ubrizgavanja'], IGNITION: ['paljenje', 'paljenja'], COIL: ['bobina', 'bobine'], STARTER: ['elektropokretač', 'elektropokretača'],
    ALTERNATOR: ['alternator', 'alternatora'], GENERATOR: ['alternator', 'alternatora'], BATTERY: ['akumulator', 'akumulatora'], THERMOSTAT: ['termostat', 'termostata'],
    TURBOCHARGER: ['turbina', 'turbine'], MANIFOLD: ['grana', 'grane'], MUFFLER: ['lonac', 'lonca'], SILENCER: ['lonac', 'lonca'], CATALYST: ['katalizator', 'katalizatora'],
    CONVERTER: ['pretvarač', 'pretvarača'], DRAIN: ['ispust', 'ispusta'], LEVEL: ['razina', 'razine'], INDICATOR: ['pokazivač', 'pokazivača'], DISPLAY: ['ekran', 'ekrana'],
    SPEAKER: ['zvučnik', 'zvučnika'], LOUDSPEAKER: ['zvučnik', 'zvučnika'], AMPLIFIER: ['pojačalo', 'pojačala'], ANTENNA: ['antena', 'antene'], CAMERA: ['kamera', 'kamere'],
    WIPER: ['brisač', 'brisača'], WASHER_: ['perač', 'perača'], MOTOR: ['motor', 'motora'], BLOWER: ['puhalo', 'puhala'], COMPRESSOR: ['kompresor', 'kompresora'],
    CONDENSER: ['kondenzator', 'kondenzatora'], EVAPORATOR: ['isparivač', 'isparivača'], AIRBAG: ['airbag', 'airbaga'], BAG: ['airbag', 'airbaga'],
    CONSOLE: ['konzola', 'konzole'], ARMREST: ['naslon za ruku', 'naslona za ruku'], CARPET: ['tepih', 'tepiha'], LINING: ['obloga', 'obloge'],
    TUBE: ['cijev', 'cijevi'], CONNECTOR: ['konektor', 'konektora'], ELECTRIC: ['električni', 'električnog'], NECK: ['grlo', 'grla'], FILLER: ['punjenje', 'punjenja'],
    BREATHER: ['odzračivač', 'odzračivača'], VENT: ['odzrač', 'odzrača'], DRIVE: ['pogon', 'pogona'], FLYWHEEL: ['zamašnjak', 'zamašnjaka'],
    LIFTER: ['podizač', 'podizača'], REGULATOR: ['regulator', 'regulatora'], ROCKER: ['klackalica', 'klackalice'], COLLET: ['klinčić', 'klinčića'],
    ELEMENT: ['uložak', 'uloška'], PARTS: ['dijelovi', 'dijelova'], SET: ['set', 'seta'], KIT: ['komplet', 'kompleta'], ASSEMBLY: ['sklop', 'sklopa'],
    FRAME: ['okvir', 'okvira'], FLAP: ['zaklopka', 'zaklopke'], LID: ['poklopac', 'poklopca'], TAILGATE: ['peta vrata', 'petih vrata'], SILL: ['prag', 'praga'],
    WINDSHIELD: ['vjetrobran', 'vjetrobrana'], WINDSCREEN: ['vjetrobran', 'vjetrobrana'], HEADLAMP: ['far', 'fara'], HEADLIGHT: ['far', 'fara'],
    CLUSTER: ['instrumenti', 'instrumenata'], SPEEDOMETER: ['kilometar sat', 'kilometar sata'], KNUCKLE: ['rukavac', 'rukavca'], MAT: ['podmetač', 'podmetača'],
    'ADJ.': ['podešavanje', 'podešavanja'], ADJUSTING: ['podešavanje', 'podešavanja'], VIEW: ['', ''], DUST: ['prašina', 'prašine'],
    BLEED: ['odzračni', 'odzračni'], BLEEDER: ['odzračni', 'odzračni'], SLEEVE: ['čahura', 'čahure'], BELLOW: ['manžeta', 'manžete'], BELLOWS: ['manžeta', 'manžete'],
    ACTUATOR: ['aktuator', 'aktuatora'], PROTECTION: ['zaštita', 'zaštite'], PLATE: ['ploča', 'ploče'], CARRIER: ['nosač', 'nosača'], ANCHOR: ['nosač', 'nosača'],
    PARKING: ['parkiranje', 'parkiranja'], HALOGEN: ['halogena', 'halogene'], TURN: ['', ''], SIGNAL: ['žmigavac', 'žmigavca'], INDICATOR_: ['', ''],
    LINING: ['obloga', 'obloge'], LININGS: ['obloge', 'obloga'], HEX: ['šesterokutni', 'šesterokutnog'], 'HEX.': ['šesterokutni', 'šesterokutnog'],
    FIT: ['', ''], FEATURE: ['', ''], WITH: ['', ''], HEAD_: ['', ''], SOCKET: ['utičnica', 'utičnice'], CONNECTOR_: ['', ''],
    HEXALOBULAR: ['torx', 'torx'], ELASTOMER: ['gumeni', 'gumenog'], MOLDED: ['', ''], TS: ['', ''], STARPARTS: ['', ''],
  };
  const SMJER = { LEFT: ' (L)', RIGHT: ' (D)', LH: ' (L)', RH: ' (D)', FRONT: ' – naprijed', REAR: ' – straga', UPPER: ' – gornji', LOWER: ' – donji',
    INNER: ' – unutarnji', OUTER: ' – vanjski', OUTSIDE: ' – vanjski', INSIDE: ' – unutarnji', CENTER: ' – sredina', CENTRE: ' – sredina' };
  const FRAZE = [
    [/ADJ\. DRIVE, MIRROR|MIRROR ADJUST/, 'Motor podešavanja retrovizora'], [/COVERING PANEL|COVER PANEL/, 'Pokrovna ploča'],
    [/ENGINE OIL FILTER|OIL FILTER ELEMENT/, 'Filter ulja'], [/MIRROR GLASS/, 'Staklo retrovizora'], [/MIRROR HOUSING/, 'Kućište retrovizora'],
    [/MIRROR FRAME/, 'Okvir retrovizora'], [/TURN (SIGNAL|INDICATOR)/, 'Žmigavac'],
    [/PARKING BRAKE ACTUATOR/, 'Motor ručne kočnice'], [/BRAKE CALIPER BRACKET|BRAKE CARRIER/, 'Nosač kočionih kliješta'], [/DISC BRAKE PROTECTION|COVER PLATE/, 'Zaštitni lim diska'],
    [/BLEED(ER)? VALVE/, 'Odzračni ventil'], [/DUST CAP/, 'Zaštitna kapica'], [/GUIDE SLEEVE/, 'Vodilica kliješta'], [/HALOGEN LAMP|^BULB/, 'Žarulja'], [/AIR FILTER/, 'Filter zraka'], [/FUEL FILTER/, 'Filter goriva'], [/CABIN FILTER|DUST FILTER|COMBINATION FILTER/, 'Filter kabine'],
    [/OIL FILTER COVER/, 'Poklopac filtera ulja'], [/TIMING CHAIN/, 'Lanac razvoda'], [/SPARK PLUG/, 'Svjećica'], [/GLOW PLUG/, 'Grijač (žarnica)'],
    [/CONNECTING ROD/, 'Klipnjača'], [/PISTON RINGS?/, 'Klipni prstenovi'], [/BEARING SHELL/, 'Ležajna školjka'], [/DRIVE BELT|V-RIBBED BELT|POLY V-BELT/, 'Pogonski remen'],
    [/HYDRAULIC LIFTER|VALVE LIFTER/, 'Hidropodizač ventila'], [/VVT VALVE|CAMSHAFT ADJUSTER/, 'Varijator bregaste osovine'], [/DECORATIVE COVER|ENGINE COVER/, 'Poklopac motora (plastični)'],
    [/HEADLAMP|HEADLIGHT/, 'Far'], [/TAIL ?LAMP|TAIL ?LIGHT|REAR LAMP|REAR LIGHT/, 'Stop svjetlo'], [/FOG ?LAMP|FOG ?LIGHT/, 'Maglenka'],
    [/OUTSIDE MIRROR|EXTERIOR MIRROR|OUTSIDE REARVIEW/, 'Retrovizor'], [/INSIDE REARVIEW|INTERIOR MIRROR/, 'Unutarnji retrovizor'],
    [/WHEEL ARCH LINER|WHEELHOUSE LINER|WHEEL HOUSE LINER/, 'Podblatnik'], [/SHOCK ABSORBER|SPRING STRUT/, 'Amortizer'], [/COIL SPRING/, 'Opruga'],
    [/BRAKE DISC|BRAKE DISK/, 'Kočioni disk'], [/BRAKE PADS?/, 'Kočione pločice'], [/BRAKE CALIPER|FIXED CALIPER|FLOATING CALIPER/, 'Kočiona kliješta'],
    [/WINDOW REGULATOR|WINDOW LIFTER/, 'Podizač stakla'], [/DOOR HANDLE/, 'Kvaka vrata'], [/DOOR LOCK/, 'Brava vrata'], [/SEAT BELT|SAFETY BELT|BELT RETRACTOR/, 'Sigurnosni pojas'],
    [/STEERING WHEEL/, 'Volan'], [/STEERING GEAR|STEERING RACK/, 'Letva volana'], [/INSTRUMENT CLUSTER/, 'Instrumenti (kilometar sat)'],
    [/WATER PUMP|COOLANT PUMP/, 'Pumpa vode'], [/OIL PUMP/, 'Pumpa ulja'], [/FUEL PUMP/, 'Pumpa goriva'], [/HIGH.PRESSURE PUMP/, 'Visokotlačna pumpa'],
    [/OIL PAN|OIL SUMP/, 'Karter (korito ulja)'], [/DRAIN PLUG/, 'Čep za ispust ulja'], [/OIL LEVEL/, 'Senzor razine ulja'], [/OIL INTAKE TUBE/, 'Usisna cijev pumpe ulja'],
    [/CYLINDER HEAD COVER/, 'Poklopac ventila'], [/CYLINDER HEAD GASKET/, 'Brtva glave motora'], [/CYLINDER HEAD/, 'Glava motora'],
    [/INTAKE MANIFOLD/, 'Usisna grana'], [/EXHAUST MANIFOLD/, 'Ispušna grana'], [/TURBOCHARGER/, 'Turbina'], [/CHARGE AIR COOLER|INTERCOOLER/, 'Interkuler'],
    [/IGNITION COIL/, 'Bobina'], [/AIR MASS|MASS AIR/, 'Mjerač protoka zraka'], [/THROTTLE/, 'Leptir gasa'], [/OXYGEN SENSOR|LAMBDA/, 'Lambda sonda'],
    [/CATALYTIC CONVERTER|CATALYST/, 'Katalizator'], [/PARTICULATE FILTER/, 'DPF filter'], [/EXPANSION TANK|COOLANT RESERVOIR/, 'Ekspanzijska posuda'],
    [/REFRIGERANT COMPRESSOR|A\/C COMPRESSOR|AIR CONDITIONING COMPRESSOR/, 'Kompresor klime'], [/BLOWER MOTOR/, 'Motor puhala kabine'],
    [/WIPER MOTOR/, 'Motor brisača'], [/WIPER BLADE/, 'Metlica brisača'], [/RAIN SENSOR|RAIN.LIGHT SENSOR/, 'Senzor kiše i svjetla'],
    [/ENGINE MOUNT/, 'Nosač motora'], [/STABILIZER LINK/, 'Spona stabilizatora'], [/CONTROL ARM|WISHBONE|TRANSVERSE LINK/, 'Rame'],
    [/WHEEL BOLT/, 'Vijak kotača'], [/LICENSE PLATE LAMP|NUMBER PLATE LAMP/, 'Svjetlo registracije'], [/PARKING SENSOR|PARKTRONIC/, 'Parkirni senzor'],
  ];

  function hr(enRaw) {
    const en = String(enRaw || '').toUpperCase().replace(/[;]/g, ',').replace(/\s+/g, ' ').trim()
      .replace(/(OUTSIDE |EXTERIOR )?REAR ?VIEW MIRROR/g, 'MIRROR');
    let suf = '';
    const dodaj = w => { if (SMJER[w] && !suf.includes(SMJER[w])) suf += SMJER[w]; };
    // smjerovi bilo gdje u nazivu
    for (const w of en.split(/[\s,./-]+/)) dodaj(w);
    for (const [re, t] of FRAZE) if (re.test(en)) return t + suf;
    const glavni = en.split(',')[0].split(' ').filter(w => !SMJER[w] && !/^\d/.test(w));
    if (!glavni.length) return en;
    const tr = glavni.map(w => W[w] || W[w.replace(/S$/, '')] || null);
    if (tr.some(x => !x)) {
      const prevedene = glavni.map((w, i) => tr[i] ? tr[i][0] : w.toLowerCase()).join(' ');
      return prevedene.charAt(0).toUpperCase() + prevedene.slice(1) + suf;
    }
    // zadnja riječ je glavna (nominativ), ostale idu iza nje u genitivu obrnutim redom
    const glava = [...tr].reverse().find(x => x[0]) || tr[tr.length - 1];
    const dijelovi = [glava[0], ...tr.slice(0, tr.lastIndexOf(glava)).reverse().map(x => x[1])].filter(Boolean);
    const s = dijelovi.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1) + suf;
  }

  // ---------- uparivanje s listom dijelova ----------
  const SITNO = /\b(BOLT|SCREW|NUT|WASHER|CLIP|GASKET|SEAL|O-RING|SEAL RING|SEALING RING|GROMMET|CLAMP|PIN|RIVET|SPACER|LABEL|STICKER|CABLE TIE|DOWEL|STUD|RETAINER|COLLET|SHIM|PLUG|BUFFER|STOPPER|EXPANDING|CAP|BEARING SHELL|PISTON RINGS?|VALVE COLLET|ADHESIVE|GREASE|FLUID|OIL|BULB|HALOGEN LAMP|BLEED|BLEEDER|DUST CAP|BELLOWS?|SLEEVE)\b/;
  // sastavni dio sklopa: ne uparuj ga s cijelim sklopom (npr. kućište retrovizora ≠ retrovizor)
  const SASTAVNI = /\b(GLASS|HOUSING|COVER|FRAME|BRACKET|HOLDER|CAP|TRIM|MOLDING|MOULDING|SEAL|GASKET|HOSE|PIPE|LINE|CONNECTOR|HARNESS|CARRIER|PROTECTION|PLATE|BULB|ADJ\.|DRIVE|ACTUATOR|LINING|SLEEVE|PARTS KIT|REPAIR KIT)\b/;
  // [EN uzorak, (f) => mogući početci naziva u listi, grupa]
  const PRAVILA = [
    [/HEADLAMP|HEADLIGHT/, () => ['Far'], 'svjetla'],
    [/TAIL ?LAMP|TAIL ?LIGHT|REAR LAMP|REAR LIGHT|COMBINATION LAMP/, f => f.inner ? ['Stop svjetlo unutarnje'] : ['Stop svjetlo vanjsko', 'Stop svjetlo'], 'svjetla'],
    [/FOG ?LAMP|FOG ?LIGHT/, () => ['Maglenka'], 'svjetla'],
    [/ADDITIONAL BRAKE|THIRD BRAKE|HIGH.MOUNTED/, () => ['Treće stop svjetlo'], 'svjetla'],
    [/LICENSE PLATE LAMP|NUMBER PLATE LAMP/, () => ['Svjetlo registracije'], 'svjetla'],
    [/BALLAST|LED MODULE|CONTROL UNIT.*HEADLAMP|HEADLAMP.*CONTROL/, () => ['Xenon balast'], 'svjetla'],
    [/INSIDE REARVIEW|INTERIOR MIRROR|INSIDE MIRROR/, () => ['Unutarnji retrovizor'], 'stakla'],
    [/OUTSIDE MIRROR|EXTERIOR MIRROR|OUTSIDE REARVIEW|^MIRROR|REARVIEW MIRROR/, () => ['Retrovizor komplet'], 'stakla'],
    [/ALTERNATOR|GENERATOR/, () => ['Alternator'], 'elektrika'],
    [/^BATTERY|STARTER BATTERY/, () => ['Akumulator'], 'elektrika'],
    [/STARTER/, () => ['Elektropokretač'], 'elektrika'],
    [/TURBOCHARGER/, () => ['Turbina'], 'motor'],
    [/CHARGE AIR COOLER|INTERCOOLER/, () => ['Interkuler'], 'motor'],
    [/INJECTOR|INJECTION VALVE|INJECTION NOZZLE/, () => ['Brizgaljke'], 'motor'],
    [/HIGH.PRESSURE PUMP/, () => ['Visokotlačna pumpa'], 'motor'],
    [/RAIL|PRESSURE ACCUMULATOR/, f => f.rail ? ['Common rail'] : [], 'motor'],
    [/IGNITION COIL/, () => ['Bobine'], 'motor'],
    [/THROTTLE/, () => ['Leptir gasa'], 'motor'],
    [/AIR MASS|MASS AIR/, () => ['Mjerač protoka zraka'], 'motor'],
    [/AIR FILTER HOUSING|AIR CLEANER|AIR FILTER BOX/, () => ['Kućište filtera zraka'], 'motor'],
    [/INTAKE MANIFOLD/, () => ['Usisna grana'], 'motor'],
    [/EGR VALVE|EXHAUST GAS RECIRCULATION VALVE|RECIRCULATION VALVE/, () => ['EGR ventil'], 'motor'],
    [/EGR COOLER|EXHAUST GAS RECIRCULATION COOLER/, () => ['Hladnjak EGR'], 'motor'],
    [/GLOW PLUG/, () => ['Grijači'], 'motor'],
    [/OIL PUMP/, () => ['Pumpa ulja'], 'motor'],
    [/OIL PAN|OIL SUMP/, () => ['Karter'], 'motor'],
    [/OIL FILTER HOUSING|OIL COOLER/, () => ['Kućište filtera ulja'], 'motor'],
    [/CYLINDER HEAD COVER|VALVE COVER/, () => ['Poklopac ventila'], 'motor'],
    [/^CYLINDER HEAD$|^CYLINDER HEAD,/, () => ['Glava motora'], 'motor'],
    [/^CRANKSHAFT$|^CRANKSHAFT,/, () => ['Radilica'], 'motor'],
    [/^CAMSHAFT$|^CAMSHAFT,|INTAKE CAMSHAFT|EXHAUST CAMSHAFT/, () => ['Bregaste osovine'], 'motor'],
    [/TIMING CHAIN/, () => ['Lanac razvoda'], 'motor'],
    [/ENGINE MOUNT|ENGINE SUPPORT|ENGINE BEARING/, () => ['Nosač motora'], 'motor'],
    [/TENSIONER/, () => ['Zatezač remena'], 'motor'],
    [/DECORATIVE COVER|ENGINE COVER|IC ENGINE.*COVER/, () => ['Poklopac motora'], 'motor'],
    [/CONNECTING ROD|^PISTON$/, () => ['Klipovi s klipnjačama'], 'motor'],
    [/VACUUM PUMP/, () => ['Vakuum pumpa'], 'kocnice'],
    [/EXHAUST MANIFOLD/, () => ['Ispušna grana'], 'gorivo'],
    [/CATALYTIC CONVERTER|CATALYST/, () => ['Katalizator'], 'gorivo'],
    [/PARTICULATE FILTER/, () => ['DPF filter'], 'gorivo'],
    [/OXYGEN SENSOR|LAMBDA/, () => ['Lambda sonde'], 'gorivo'],
    [/NOX SENSOR/, () => ['NOx senzori'], 'gorivo'],
    [/ADBLUE|UREA|REDUCING AGENT/, () => ['AdBlue rezervoar'], 'gorivo'],
    [/FUEL TANK/, () => ['Rezervoar goriva'], 'gorivo'],
    [/FUEL PUMP|FUEL DELIVERY|FUEL SUPPLY MODULE/, () => ['Pumpa goriva'], 'gorivo'],
    [/FUEL FILTER/, () => ['Kućište filtera goriva'], 'gorivo'],
    [/REAR MUFFLER|REAR SILENCER|END MUFFLER/, () => ['Zadnji lonac'], 'gorivo'],
    [/MUFFLER|SILENCER/, () => ['Srednji lonac'], 'gorivo'],
    [/TANK FLAP|FUEL FILLER FLAP|FILLER FLAP/, () => ['Poklopac / vratašca rezervoara'], 'gorivo'],
    [/^RADIATOR|COOLANT RADIATOR|ENGINE RADIATOR/, () => ['Hladnjak vode'], 'hladenje'],
    [/CONDENSER/, () => ['Hladnjak klime'], 'hladenje'],
    [/BLOWER MOTOR|^BLOWER/, () => ['Ventilator kabine'], 'hladenje'],
    [/FAN|ELECTRIC SUCTION FAN/, () => ['Ventilator hladnjaka'], 'hladenje'],
    [/WATER PUMP|COOLANT PUMP/, f => f.electric ? ['Elektro pumpa vode', 'Pumpa vode'] : ['Pumpa vode'], 'hladenje'],
    [/THERMOSTAT/, () => ['Termostat'], 'hladenje'],
    [/EXPANSION TANK|COOLANT RESERVOIR|SURGE TANK/, () => ['Ekspanzijska posuda'], 'hladenje'],
    [/REFRIGERANT COMPRESSOR|A\/C COMPRESSOR|AIR CONDITIONING COMPRESSOR/, () => ['Kompresor klime'], 'hladenje'],
    [/EVAPORATOR/, () => ['Isparivač'], 'hladenje'],
    [/HEATER CORE|HEAT EXCHANGER/, () => ['Radijator grijanja'], 'hladenje'],
    [/SERIES RESISTOR|BLOWER REGULATOR|BLOWER CONTROL/, () => ['Regulator puhala'], 'hladenje'],
    [/CLIMATE CONTROL|AIR CONDITIONING CONTROL|A\/C CONTROL|HEATER CONTROL/, () => ['Komandna ploča klime'], 'hladenje'],
    [/ENGINE CONTROL|ENGINE ELECTRONICS|ME-SFI|CDI CONTROL|^ECU/, () => ['Upravljačka jedinica motora'], 'elektrika'],
    [/TRANSMISSION CONTROL|GEARBOX CONTROL|VGS|TCU/, () => ['Upravljačka jedinica mjenjača'], 'elektrika'],
    [/IGNITION LOCK|IGNITION SWITCH|ELECTRONIC IGNITION|EIS/, () => ['Kontakt brava'], 'elektrika'],
    [/STEERING LOCK/, () => ['ELV blokada volana'], 'elektrika'],
    [/AIRBAG CONTROL|RESTRAINT SYSTEM/, () => ['Upravljačka jedinica airbaga'], 'elektrika'],
    [/PARKING SENSOR|PARKTRONIC|PDC SENSOR|ULTRASONIC SENSOR/, () => ['Parkirni senzori'], 'elektrika'],
    [/SAM|SIGNAL ACQUISITION/, f => f.rear ? ['SAM modul stražnji'] : ['SAM modul prednji'], 'elektrika'],
    [/TORQUE CONVERTER/, () => ['Hidrodinamički pretvarač'], 'mjenjac'],
    [/AUTOMATIC TRANSMISSION|^TRANSMISSION$|MANUAL TRANSMISSION|DUAL.CLUTCH TRANSMISSION/, () => ['Automatski mjenjač', 'Ručni mjenjač'], 'mjenjac'],
    [/DUAL.MASS FLYWHEEL|FLYWHEEL/, () => ['Dvomaseni zamašnjak'], 'mjenjac'],
    [/CLUTCH KIT|CLUTCH DISC|CLUTCH PRESSURE/, () => ['Kvačilo komplet'], 'mjenjac'],
    [/PROPELLER SHAFT|PROP SHAFT|CARDAN/, () => ['Kardan'], 'mjenjac'],
    [/AXLE SHAFT|DRIVESHAFT|DRIVE SHAFT|HALF SHAFT|JOINT SHAFT/, f => f.front ? ['Prednja poluosovina'] : ['Stražnja poluosovina', 'Prednja poluosovina'], 'mjenjac'],
    [/TRANSFER CASE/, () => ['Razvodnik 4MATIC'], 'mjenjac'],
    [/DIFFERENTIAL|AXLE DRIVE/, f => f.front ? ['Prednji diferencijal'] : ['Stražnji diferencijal'], 'mjenjac'],
    [/SELECTOR LEVER|GEAR LEVER|SHIFT LEVER|DIRECT SELECT/, () => ['Ručica mjenjača'], 'mjenjac'],
    [/SHOCK ABSORBER|SPRING STRUT|STRUT|DAMPER/, f => f.rear ? ['Stražnji zračni amortizer', 'Stražnji amortizer'] : ['Prednji zračni amortizer', 'Prednji amortizer'], 'ovjesP'],
    [/COIL SPRING|^SPRING$|SUSPENSION SPRING/, f => f.rear ? ['Stražnja opruga'] : ['Prednja opruga'], 'ovjesP'],
    [/AIR SUSPENSION COMPRESSOR|COMPRESSOR.*LEVEL/, () => ['Kompresor zračnog ovjesa'], 'ovjesP'],
    [/STEERING KNUCKLE|^KNUCKLE/, () => ['Rukavac s glavčinom'], 'ovjesP'],
    [/WHEEL HUB|^HUB/, f => f.rear ? ['Stražnja glavčina'] : ['Rukavac s glavčinom'], 'ovjesP'],
    [/CONTROL ARM|WISHBONE|TRANSVERSE LINK|TRAILING ARM|SUSPENSION ARM/, f => f.rear ? ['Stražnja ramena'] : f.upper ? ['Gornje rame'] : ['Donje rame'], 'ovjesP'],
    [/STABILIZER BAR|ANTI.ROLL BAR|TORSION BAR|^STABILIZER$/, f => f.rear ? ['Stražnji stabilizator'] : ['Prednji stabilizator'], 'ovjesP'],
    [/AXLE CARRIER|SUBFRAME|INTEGRAL CARRIER/, f => f.rear ? ['Stražnji nosač'] : ['Prednji nosač'], 'ovjesP'],
    [/STEERING GEAR|STEERING RACK/, () => ['Letva volana'], 'ovjesP'],
    [/POWER STEERING PUMP|STEERING PUMP/, () => ['Pumpa servo upravljanja'], 'ovjesP'],
    [/STEERING COLUMN SWITCH|COMBINATION SWITCH/, () => ['Prekidači pod volanom'], 'ovjesP'],
    [/STEERING COLUMN/, () => ['Stup volana'], 'ovjesP'],
    [/STEERING WHEEL/, () => ['Volan'], 'ovjesP'],
    [/CLOCK SPRING|CONTACT SPIRAL|SPIRAL CABLE|COIL SPRING CONTACT/, () => ['Spiralni kabel volana'], 'ovjesP'],
    [/BRAKE CALIPER|FIXED CALIPER|FLOATING CALIPER|^CALIPER/, f => f.rear ? ['Stražnje kočione kliješte'] : ['Prednje kočione kliješte'], 'kocnice'],
    [/BRAKE DIS[CK]/, f => f.rear ? ['Stražnji diskovi'] : ['Prednji diskovi'], 'kocnice'],
    [/HYDRAULIC UNIT|ESP|ABS UNIT|ABS CONTROL|^ABS/, () => ['ABS / ESP pumpa'], 'kocnice'],
    [/BRAKE BOOSTER|BRAKE MASTER|TANDEM MASTER/, () => ['Servo kočnice'], 'kocnice'],
    [/PARKING BRAKE|ELECTRIC PARKING/, () => ['Ručna kočnica'], 'kocnice'],
    [/RPM SENSOR|WHEEL SPEED SENSOR|ABS SENSOR/, () => ['ABS senzori'], 'kocnice'],
    [/LIGHT.ALLOY WHEEL|ALLOY WHEEL|WHEEL RIM|^RIM|^WHEEL$/, () => ['Alu felge'], 'kotaci'],
    [/TIRE PRESSURE|TYRE PRESSURE/, () => ['Senzori tlaka guma'], 'kotaci'],
    [/SPARE WHEEL|TIREFIT|TIRE SEALANT/, () => ['Rezervni kotač'], 'kotaci'],
    [/ENGINE HOOD|^HOOD|BONNET/, () => ['Hauba'], 'limarija'],
    [/RADIATOR GRILLE|^GRILLE/, () => ['Maska'], 'limarija'],
    [/BUMPER/, f => f.rear ? ['Stražnji branik', 'Ojačanje stražnjeg branika'] : ['Prednji branik', 'Ojačanje prednjeg branika'], 'limarija'],
    [/WHEEL ARCH LINER|WHEELHOUSE LINER|WHEEL HOUSE LINER/, () => ['Podblatnik'], 'limarija'],
    [/FENDER|^WING|MUDGUARD/, () => ['Prednji blatobran'], 'limarija'],
    [/SLIDING DOOR/, () => ['Klizna vrata'], 'limarija'],
    [/DOOR HANDLE|OUTSIDE HANDLE|EXTERIOR HANDLE/, () => ['Vanjska kvaka vrata'], 'limarija'],
    [/^DOOR|DOOR SHELL|DOOR, |DOOR ASSY|SHELL.*DOOR/, f => f.rear ? ['Stražnja vrata', 'Stražnja krila vrata'] : ['Prednja vrata'], 'limarija'],
    [/TRUNK LID|BOOT LID|DECKLID/, () => ['Poklopac prtljažnika'], 'limarija'],
    [/TAILGATE|LIFTGATE|REAR FLAP|REAR END DOOR/, () => ['Peta vrata'], 'limarija'],
    [/SIDE SILL|ROCKER PANEL|SILL PANEL/, () => ['Prag'], 'limarija'],
    [/RADIATOR SUPPORT|FRONT END CARRIER|FRONT MODULE/, () => ['Čelo'], 'limarija'],
    [/ROOF RAIL/, () => ['Krovni nosači'], 'limarija'],
    [/TRAILER HITCH|TOWING|TOW BAR/, () => ['Kuka za vuču'], 'limarija'],
    [/WINDSHIELD|WINDSCREEN/, () => ['Vjetrobransko staklo'], 'stakla'],
    [/REAR WINDOW|BACKLITE/, () => ['Stražnje staklo'], 'stakla'],
    [/WINDOW REGULATOR|WINDOW LIFTER|POWER WINDOW/, f => f.rear ? ['Podizač stakla stražnji'] : ['Podizač stakla prednji'], 'stakla'],
    [/DOOR WINDOW|SIDE WINDOW|DOOR GLASS|WINDOW GLASS|WINDOWPANE/, f => f.rear ? ['Staklo stražnjih vrata'] : ['Staklo prednjih vrata'], 'stakla'],
    [/SLIDING ROOF|SUNROOF|PANORAMIC|SLIDING.TILTING/, () => ['Panorama / šiber krov komplet'], 'stakla'],
    [/INSTRUMENT CLUSTER|SPEEDOMETER|COMBINATION INSTRUMENT/, () => ['Instrumenti'], 'unutra'],
    [/INSTRUMENT PANEL|DASHBOARD|COCKPIT/, () => ['Armaturna ploča'], 'unutra'],
    [/KNEE AIRBAG|KNEEBAG/, () => ['Airbag za koljena'], 'unutra'],
    [/WINDOW ?BAG|CURTAIN AIRBAG|HEAD AIRBAG/, () => ['Zračna zavjesa'], 'unutra'],
    [/SIDE ?BAG|SIDE AIRBAG|THORAX/, () => ['Bočni airbag sjedala'], 'unutra'],
    [/PASSENGER AIRBAG|CO-DRIVER|FRONT PASSENGER AIRBAG/, () => ['Airbag suvozača'], 'unutra'],
    [/DRIVER AIRBAG|AIRBAG.*STEERING|STEERING.*AIRBAG|AIRBAG UNIT/, () => ['Airbag volana'], 'unutra'],
    [/SEAT BELT|SAFETY BELT|BELT RETRACTOR|AUTOMATIC BELT/, f => f.rear ? ['Sigurnosni pojasevi stražnji'] : ['Sigurnosni pojas prednji'], 'unutra'],
    [/REAR SEAT|BENCH SEAT|SEAT CUSHION.*REAR/, () => ['Stražnja klupa'], 'unutra'],
    [/^SEAT|FRONT SEAT|DRIVER SEAT|PASSENGER SEAT/, f => f.D ? ['Sjedalo suvozača'] : ['Sjedalo vozača'], 'unutra'],
    [/CENTER CONSOLE|CENTRE CONSOLE/, () => ['Središnja konzola'], 'unutra'],
    [/ARMREST/, () => ['Naslon za ruku'], 'unutra'],
    [/GLOVE BOX|GLOVE COMPARTMENT|GLOVEBOX/, () => ['Pretinac'], 'unutra'],
    [/DOOR TRIM|DOOR PANEL|DOOR LINING|DOOR CENTER PANEL/, f => f.rear ? ['Obloga stražnjih vrata'] : ['Obloga prednjih vrata'], 'unutra'],
    [/HEADLINER|ROOF LINING|HEADLINING/, () => ['Tapecirung krova'], 'unutra'],
    [/OVERHEAD CONTROL|ROOF CONTROL PANEL/, () => ['Stropna konzola'], 'unutra'],
    [/LOAD COMPARTMENT COVER|ROLLER BLIND|LUGGAGE COVER/, () => ['Roleta prtljažnika'], 'unutra'],
    [/PARCEL SHELF/, () => ['Polica prtljažnika'], 'unutra'],
    [/ACCELERATOR PEDAL|BRAKE PEDAL|PEDAL/, () => ['Pedale'], 'unutra'],
    [/COMAND|HEAD UNIT|NAVIGATION|RADIO|AUDIO/, () => ['COMAND', 'Radio'], 'multimedija'],
    [/DISPLAY|SCREEN|MONITOR/, () => ['Ekran'], 'multimedija'],
    [/CONTROLLER|TOUCHPAD/, () => ['Upravljač multimedije'], 'multimedija'],
    [/LOUDSPEAKER|SPEAKER|TWEETER|WOOFER/, () => ['Zvučnici'], 'multimedija'],
    [/AMPLIFIER/, () => ['Pojačalo'], 'multimedija'],
    [/ANTENNA/, () => ['Antena modul'], 'multimedija'],
    [/REVERSING CAMERA|REAR VIEW CAMERA|^CAMERA/, () => ['Kamera za vožnju unatrag'], 'multimedija'],
    [/WIPER MOTOR/, f => f.rear ? ['Motor brisača stražnji'] : ['Motor brisača prednji'], 'brisaci'],
    [/WIPER LINKAGE|WIPER SYSTEM|WIPER FRAME/, () => ['Mehanizam brisača'], 'brisaci'],
    [/WASHER FLUID|WASHER RESERVOIR|WASHER PUMP|WASHING FLUID/, () => ['Posuda tekućine s pumpom'], 'brisaci'],
    [/RAIN SENSOR|RAIN.LIGHT/, () => ['Senzor kiše i svjetla'], 'brisaci'],
  ];
  const GRUPA_KLJUC = [
    [/BRAKE|ABS|ESP/, 'kocnice'], [/LAMP|LIGHT|BULB/, 'svjetla'], [/DOOR|BUMPER|FENDER|HOOD|GRILLE|ROOF|PANEL|MOLDING|SILL/, 'limarija'],
    [/WINDOW|GLASS|MIRROR|WINDSHIELD/, 'stakla'], [/SEAT|AIRBAG|BELT|TRIM|CONSOLE|CARPET|LINING/, 'unutra'], [/RADIO|SPEAKER|DISPLAY|ANTENNA|CAMERA/, 'multimedija'],
    [/WIPER|WASHER/, 'brisaci'], [/FUEL|EXHAUST|MUFFLER|CATALY/, 'gorivo'], [/RADIATOR|COOLANT|THERMOSTAT|HEATER|BLOWER|A\/C|REFRIGERANT/, 'hladenje'],
    [/CONTROL UNIT|MODULE|HARNESS|SWITCH|RELAY|FUSE|SENSOR|ALTERNATOR|STARTER|BATTERY/, 'elektrika'], [/TRANSMISSION|CLUTCH|SHAFT|DIFFERENTIAL/, 'mjenjac'],
    [/STEERING|ARM|SPRING|ABSORBER|STRUT|STABILIZER|HUB|KNUCKLE/, 'ovjesP'], [/WHEEL|TIRE|TYRE|RIM/, 'kotaci'],
    [/ENGINE|OIL|CYLINDER|PISTON|CRANK|CAM|VALVE|TIMING|INTAKE|INJECT|TURBO|BELT|PULLEY/, 'motor'],
  ];

  function zastavice(en) {
    const s = ' ' + en + ' ';
    return {
      L: /\bLEFT\b|\bLH\b|\bL\.H\./.test(s), D: /\bRIGHT\b|\bRH\b|\bR\.H\./.test(s),
      front: /\bFRONT\b/.test(s), rear: /\bREAR\b/.test(s), upper: /\bUPPER\b/.test(s), inner: /\bINNER\b|TRUNK LID|TAILGATE/.test(s),
      electric: /\bELECTRIC/.test(s), rail: /\bRAIL\b/.test(s) && /FUEL|PRESSURE|INJECT/.test(s),
    };
  }

  // vrati { partId, sigurno, napomena, grupa }
  function upari(item, parts, naslov = '') {
    const en = item.naziv, sve = (item.naziv + ' ' + item.napomene).toUpperCase();
    const f = zastavice(sve), fn = zastavice(String(naslov).toUpperCase());
    // strana / naprijed-straga iz naslova crteža kad ih dio sam nema
    if (f.L === f.D && (fn.L || fn.D)) { f.L = fn.L; f.D = fn.D; }
    if (!f.front && !f.rear) { f.front = fn.front; f.rear = fn.rear; }
    item.strana = f.L && !f.D ? 'L' : f.D && !f.L ? 'D' : '';
    const sast = en.match(SASTAVNI);
    const sitno = SITNO.test(en) && !/FILTER|PUMP|SENSOR|COOLER|SWITCH|LAMP|MIRROR/.test(en);
    let grupa = null;
    for (const [re, fnP, g] of PRAVILA) {
      if (!re.test(en)) continue;
      grupa = g;
      if (sitno) break;
      if (sast && !re.source.includes(sast[1])) continue;
      const pocetci = fnP(f).map(norm);
      let kand = parts.filter(p => pocetci.some(b => norm(p.naziv).startsWith(b)));
      if (!kand.length) continue;
      const imaStrane = kand.some(p => /\((L|D)\)$/.test(p.naziv));
      let napomena = '';
      if (imaStrane) {
        if (f.L && !f.D) kand = kand.filter(p => p.naziv.endsWith('(L)'));
        else if (f.D && !f.L) kand = kand.filter(p => p.naziv.endsWith('(D)'));
        else napomena = 'strana nije navedena — provjeri L/D';
      }
      if (!kand.length) continue;
      return { partId: kand[0].id, sigurno: !napomena, napomena, grupa: kand[0].grupa };
    }
    if (!grupa) for (const [re, g] of GRUPA_KLJUC) if (re.test(en)) { grupa = g; break; }
    return { partId: null, grupa: grupa || 'ostalo', sitno };
  }
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

  return { parse, hr, upari, lijepiBroj };
})();

// ---------- prozor za uvoz ----------
async function openUvoz(car, onDone) {
  let parts = await DB.byAuto(car.id);
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box" style="max-width:760px">
    <div class="row"><h3 class="grow" style="margin:0">Uvoz iz kataloga</h3><button id="x">✕</button></div>
    <div id="korak1">
      <ol class="small muted" style="padding-left:20px;line-height:1.6;margin:10px 0">
        <li>Klikni <a target="_blank" rel="noopener noreferrer" href="${h(katalogUrl(car))}">📘 Otvori katalog za ovaj VIN</a> i otvori jedan crtež (npr. Svjetla → Far).</li>
        <li>Označi cijelu stranicu i kopiraj: <b>Ctrl+A</b> pa <b>Ctrl+C</b> (mobitel: dugi pritisak → Označi sve → Kopiraj).</li>
        <li>Zalijepi ovdje i klikni <b>Obradi</b>. Ponovi za druge crteže.</li>
      </ol>
      <textarea id="tekst" rows="7" placeholder="Ovdje zalijepi stranicu iz kataloga…"></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="obradi">Obradi</button><span id="info1" class="small muted"></span></div>
    </div>
    <div id="korak2" hidden>
      <div class="row" style="margin:8px 0">
        <span id="info2" class="small grow"></span>
        <label class="small" style="display:flex;gap:8px;align-items:center">Sitni dijelovi <input type="checkbox" id="sitni"></label>
      </div>
      <div id="lista"></div>
      <div class="row" style="margin-top:12px"><button class="primary" id="uvezi">Uvezi označene</button><button id="natrag">Zalijepi drugu stranicu</button></div>
    </div>
  </div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  $('#x', m).onclick = close;
  m.addEventListener('click', e => { if (e.target === m) close(); });

  const grupaOpts = DIJELOVI.GRUPE.map(g => `<optgroup label="${h(g.n)}">` +
    sortParts(parts.filter(p => p.grupa === g.id)).map(p => `<option value="${p.id}">${h(p.naziv)}${p.oe ? ' · ' + h(p.oe) : ''}</option>`).join('') + '</optgroup>').join('');
  let stavke = [], naslovCrteza = '';

  const crtaj = () => {
    const sitni = $('#sitni', m).checked;
    const vid = stavke.filter(s => sitni || !s.sitno || s.partId);
    const nUp = stavke.filter(s => s.partId).length;
    $('#info2', m).innerHTML = `${naslovCrteza ? '<b>' + h(naslovCrteza) + '</b> · ' : ''}Pronađeno <b>${stavke.length}</b> dijelova · <span class="ok">${nUp} upareno s listom</span>${stavke.some(s => s.sitno) && !sitni ? ' · sitni dijelovi (vijci, brtve…) skriveni' : ''}`;
    $('#lista', m).innerHTML = vid.map(s => {
      const i = stavke.indexOf(s);
      return `<div class="res" style="grid-template-columns:auto 1fr;align-items:start;cursor:default" data-i="${i}">
        <input type="checkbox" class="uz" ${s.ukljuci ? 'checked' : ''} style="margin-top:4px">
        <div style="min-width:0">
          <b>${h(s.hr)}</b> <span class="mono small">${h(s.prikaz)}</span>
          <div class="small muted">${h(s.naziv)}${s.kol > 1 ? ' · kom ' + s.kol : ''}${s.zamijenjen ? ' · zamjenjuje ' + h(KATALOG.lijepiBroj(s.zamijenjen)) : ''}</div>
          ${s.napomena ? `<div class="small" style="color:var(--warn)">${h(s.napomena)}</div>` : ''}
          <select class="cilj" style="margin-top:6px">
            <option value="">+ dodaj kao novi dio (${h(GRUPA[s.grupa]?.n || 'Ostalo')})</option>
            ${grupaOpts}
          </select>
        </div></div>`;
    }).join('') || '<div class="muted small">Nema dijelova za prikaz.</div>';
    $$('.res', $('#lista', m)).forEach(row => {
      const s = stavke[+row.dataset.i];
      const sel = $('.cilj', row); sel.value = s.partId || '';
      sel.onchange = () => { s.partId = sel.value || null; s.ukljuci = true; $('.uz', row).checked = true; };
      $('.uz', row).onchange = e => { s.ukljuci = e.target.checked; };
    });
  };

  $('#obradi', m).onclick = () => {
    const nadjeni = KATALOG.parse($('#tekst', m).value);
    naslovCrteza = nadjeni.naslov || '';
    if (!nadjeni.length) { $('#info1', m).innerHTML = '<span class="err">Nisam našao brojeve dijelova. Kopiraj stranicu s popisom dijelova (onu s brojevima A …).</span>'; return; }
    stavke = nadjeni.map(n => {
      const u = KATALOG.upari(n, parts, nadjeni.naslov);
      let hrn = KATALOG.hr(n.naziv);
      if (n.strana && !/\((L|D)\)/.test(hrn)) hrn += ` (${n.strana})`;
      return { ...n, ...u, hr: hrn, ukljuci: !!u.partId };
    });
    $('#info1', m).textContent = '';
    $('#korak1', m).hidden = true; $('#korak2', m).hidden = false; crtaj();
  };
  $('#sitni', m).onchange = crtaj;
  $('#natrag', m).onclick = () => { $('#tekst', m).value = ''; $('#info1', m).textContent = ''; $('#korak2', m).hidden = true; $('#korak1', m).hidden = false; };
  $('#uvezi', m).onclick = async () => {
    const odabrane = stavke.filter(s => s.ukljuci);
    if (!odabrane.length) { toast('Ništa nije označeno'); return; }
    let upisano = 0, novih = 0, prosireno = 0;
    for (const s of odabrane) {
      let p = s.partId ? parts.find(x => x.id === s.partId) : null;
      if (p) {
        p.oe = p.oe && p.oe !== s.broj && !p.oeAuto ? (p.oe.includes(s.broj) ? p.oe : p.oe + ', ' + s.broj) : s.broj;
        p.oeAuto = false; p.oeIzvor = 'katalog';
        upisano++;
      } else {
        p = noviDio(car, s.grupa, s.hr, Date.now() + novih, null);
        p.oe = s.broj; p.oeIzvor = 'katalog'; p.napomena = s.naziv;
        parts.push(p); novih++;
      }
      await DB.put('dijelovi', p);
      prosireno += await zapamtiOE(car, p);
    }
    close();
    toast(`Uvezeno: ${upisano} brojeva upisano${novih ? `, ${novih} novih dijelova` : ''}${prosireno ? `, ${prosireno} kopirano na druge aute` : ''}`);
    onDone?.();
  };
}
