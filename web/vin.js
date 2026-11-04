// Dekodiranje Mercedes VIN-a (broja šasije) bez interneta + dopuna s NHTSA (besplatno).
//
// Europski Mercedes VIN:  W D D 2 0 5 0 0 4 1 R 1 2 3 4 5 6
//                         └WMI┘ └serija┘└tip┘ │ │ └─serijski─┘
//                                             │ └ tvornica
//                                             └ volan (1 lijevi, 2 desni)
// Godina NIJE zapisana u europskom VIN-u — upisuje se ručno (iz prometne).
const VIN = (() => {
  const WMI = {
    WDB: 'Mercedes-Benz, osobno vozilo (Njemačka, do ~2007.)',
    WDD: 'Daimler AG, osobno vozilo (Njemačka, 2007.–2019.)',
    WDC: 'Mercedes-Benz, SUV / terenac',
    WDF: 'Mercedes-Benz, kombi / dostavno vozilo',
    WD3: 'Mercedes-Benz Sprinter (izvozna oznaka)',
    WD4: 'Mercedes-Benz Sprinter (izvozna oznaka)',
    W1K: 'Mercedes-Benz AG, osobno vozilo (od 2019.)',
    W1N: 'Mercedes-Benz AG, SUV (od 2019.)',
    W1V: 'Mercedes-Benz AG, kombi (od 2019.)',
    W1W: 'Mercedes-Benz AG, Sprinter (od 2019.)',
    W1T: 'Mercedes-Benz, kamion',
    WMX: 'Mercedes-AMG',
    VSA: 'Mercedes-Benz España (Vitoria) — Vito / Viano / V',
    '4JG': 'Mercedes-Benz USA (Tuscaloosa) — SUV',
    '55S': 'Mercedes-Benz USA',
    ADB: 'Mercedes-Benz Južnoafrička Republika',
    LE4: 'Beijing Benz (Kina)',
    WME: 'smart',
  };

  // Slovo na 11. mjestu — orijentacijski (nije službena tablica).
  const PLANT = {
    A: 'Sindelfingen (DE)', F: 'Bremen (DE)', R: 'Bremen (DE)', J: 'Rastatt (DE)',
    N: 'Kecskemét (HU)', X: 'Graz (AT)', S: 'Düsseldorf (DE)', P: 'Ludwigsfelde (DE)',
  };

  // Motori: šifra → [gorivo, opis]
  const ENG = {
    OM601: ['Dizel', '2.0/2.3 R4'], OM602: ['Dizel', '2.5/2.9 R5'], OM603: ['Dizel', '3.0/3.5 R6'],
    OM604: ['Dizel', '2.0/2.2 R4'], OM605: ['Dizel', '2.5 R5'], OM606: ['Dizel', '3.0 R6'],
    OM611: ['Dizel', '2.2 CDI R4'], OM612: ['Dizel', '2.7 CDI R5'], OM613: ['Dizel', '3.2 CDI R6'],
    OM628: ['Dizel', '4.0 CDI V8'], OM629: ['Dizel', '4.0 CDI V8'], OM640: ['Dizel', '1.7/2.0 CDI R4'],
    OM642: ['Dizel', '3.0 CDI V6'], OM646: ['Dizel', '2.2 CDI R4'], OM647: ['Dizel', '2.7 CDI R5'],
    OM648: ['Dizel', '3.2 CDI R6'], OM651: ['Dizel', '1.8/2.1 CDI R4'], OM654: ['Dizel', '2.0 R4'],
    OM656: ['Dizel', '2.9 R6'], OM668: ['Dizel', '1.7 CDI R4'], OM607: ['Dizel', '1.5 R4 (Renault)'],
    OM608: ['Dizel', '1.5 R4 (Renault)'], OM622: ['Dizel', '1.6 R4 (Renault)'], OM626: ['Dizel', '1.6 R4 (Renault)'],
    M102: ['Benzin', '2.0/2.3 R4'], M103: ['Benzin', '2.6/3.0 R6'], M104: ['Benzin', '2.8–3.6 R6'],
    M111: ['Benzin', '1.8–2.3 R4'], M112: ['Benzin', '2.4–3.7 V6'], M113: ['Benzin', '4.3–5.4 V8'],
    M119: ['Benzin', '4.2–5.0 V8'], M120: ['Benzin', '6.0 V12'], M137: ['Benzin', '5.8 V12'],
    M152: ['Benzin', '5.5 V8 AMG'], M155: ['Benzin', '5.4 V8 kompresor'], M156: ['Benzin', '6.2 V8 AMG'],
    M157: ['Benzin', '5.5 V8 biturbo AMG'], M159: ['Benzin', '6.2 V8 AMG'], M166: ['Benzin', '1.4–2.1 R4'],
    M200: ['Benzin', '1.2 R4 (Renault)'], M254: ['Benzin', '1.5/2.0 R4 blagi hibrid'], M256: ['Benzin', '3.0 R6 blagi hibrid'],
    M260: ['Benzin', '2.0 R4'], M264: ['Benzin', '1.5/2.0 R4'], M266: ['Benzin', '1.5–2.0 R4'],
    M270: ['Benzin', '1.6/2.0 R4'], M271: ['Benzin', '1.6/1.8 R4'], M272: ['Benzin', '2.5–3.5 V6'],
    M273: ['Benzin', '4.7/5.5 V8'], M274: ['Benzin', '1.6/2.0 R4'], M275: ['Benzin', '5.5/6.0 V12 biturbo'],
    M276: ['Benzin', '3.0/3.5 V6'], M278: ['Benzin', '4.7 V8 biturbo'], M279: ['Benzin', '6.0 V12 biturbo'],
    M282: ['Benzin', '1.3 R4'], M133: ['Benzin', '2.0 R4 AMG'], M139: ['Benzin', '2.0 R4 AMG'],
    M176: ['Benzin', '4.0 V8 biturbo'], M177: ['Benzin', '4.0 V8 biturbo AMG'], M178: ['Benzin', '4.0 V8 biturbo AMG GT'],
    EM: ['Električni', 'elektromotor'],
  };

  // Serije (pozicije 4–6). v = varijante po 1. znamenci tipa: [znamenka, karoserija, interna oznaka, naziv]
  const SERIES = {};
  function S(codes, klasa, kod, god, kar, motori, opt = {}) {
    for (const c of [].concat(codes)) SERIES[c] = { klasa, kod: kod || ('W' + c), god, kar, motori, ...opt };
  }
  const p4 = { pogon: '4MATIC' }, fw = { pogon: 'Prednji' };
  // Klasika
  S('123', 'E-klasa (W123)', 'W123', '1976–1986', 'Limuzina', ['M102', 'M110', 'OM615', 'OM616', 'OM617']);
  S('126', 'S-klasa', 'W126', '1979–1991', 'Limuzina', ['M103', 'M116', 'M117', 'OM603']);
  S('107', 'SL', 'R107', '1971–1989', 'Roadster', ['M110', 'M116', 'M117']);
  S('201', '190 (C)', 'W201', '1982–1993', 'Limuzina', ['M102', 'M103', 'OM601', 'OM602']);
  S('124', 'E-klasa', 'W124', '1984–1997', 'Limuzina', ['M102', 'M103', 'M104', 'M111', 'M119', 'OM601', 'OM602', 'OM603', 'OM605', 'OM606']);
  S('129', 'SL', 'R129', '1989–2001', 'Roadster', ['M104', 'M111', 'M112', 'M113', 'M119', 'M120']);
  S('140', 'S-klasa', 'W140', '1991–1998', 'Limuzina', ['M104', 'M119', 'M120', 'OM603', 'OM606']);
  // C
  S('202', 'C-klasa', 'W202', '1993–2001', 'Limuzina', ['M111', 'M104', 'M112', 'M113', 'OM601', 'OM604', 'OM605', 'OM611']);
  S('203', 'C-klasa', 'W203', '2000–2007', 'Limuzina', ['M111', 'M271', 'M112', 'M272', 'M113', 'OM611', 'OM646', 'OM612', 'OM647', 'OM642'],
    { v: [['0', 'Limuzina', 'W203'], ['2', 'Karavan', 'S203'], ['7', 'Coupé', 'CL203', 'C-klasa Sportcoupé']] });
  S('204', 'C-klasa', 'W204', '2007–2014', 'Limuzina', ['M271', 'M274', 'M272', 'M276', 'M156', 'OM646', 'OM651', 'OM642'],
    { v: [['0', 'Limuzina', 'W204'], ['2', 'Karavan', 'S204'], ['3', 'Coupé', 'C204'], ['9', 'SUV', 'X204', 'GLK', '2008–2015', '4MATIC']] });
  S('205', 'C-klasa', 'W205', '2014–2021', 'Limuzina', ['M274', 'M264', 'M276', 'M177', 'OM626', 'OM651', 'OM654', 'OM642'],
    { v: [['0', 'Limuzina', 'W205'], ['2', 'Karavan', 'S205'], ['3', 'Coupé', 'C205'], ['4', 'Kabriolet', 'A205']] });
  S('206', 'C-klasa', 'W206', '2021–', 'Limuzina', ['M254', 'M139', 'OM654'],
    { v: [['0', 'Limuzina', 'W206'], ['2', 'Karavan', 'S206']] });
  // E
  S('210', 'E-klasa', 'W210', '1995–2003', 'Limuzina', ['M111', 'M104', 'M112', 'M113', 'OM604', 'OM605', 'OM606', 'OM611', 'OM612', 'OM613'],
    { v: [['0', 'Limuzina', 'W210'], ['2', 'Karavan', 'S210']] });
  S('211', 'E-klasa', 'W211', '2002–2009', 'Limuzina', ['M271', 'M112', 'M272', 'M113', 'M273', 'M156', 'OM646', 'OM647', 'OM648', 'OM642', 'OM628'],
    { v: [['0', 'Limuzina', 'W211'], ['2', 'Karavan', 'S211']] });
  S('212', 'E-klasa', 'W212', '2009–2016', 'Limuzina', ['M271', 'M274', 'M272', 'M276', 'M278', 'M157', 'M156', 'OM651', 'OM642'],
    { v: [['0', 'Limuzina', 'W212'], ['2', 'Karavan', 'S212']] });
  S('207', 'E-klasa Coupé/Kabriolet', 'C207', '2009–2017', 'Coupé', ['M271', 'M274', 'M272', 'M276', 'M278', 'OM651', 'OM642'],
    { v: [['3', 'Coupé', 'C207'], ['4', 'Kabriolet', 'A207']] });
  S('213', 'E-klasa', 'W213', '2016–2023', 'Limuzina', ['M274', 'M264', 'M276', 'M256', 'M177', 'OM654', 'OM656', 'OM642'],
    { v: [['0', 'Limuzina', 'W213'], ['2', 'Karavan', 'S213']] });
  S('238', 'E-klasa Coupé/Kabriolet', 'C238', '2017–2023', 'Coupé', ['M274', 'M264', 'M276', 'M256', 'OM654', 'OM656'],
    { v: [['3', 'Coupé', 'C238'], ['4', 'Kabriolet', 'A238']] });
  S('214', 'E-klasa', 'W214', '2023–', 'Limuzina', ['M254', 'M256', 'OM654'],
    { v: [['0', 'Limuzina', 'W214'], ['2', 'Karavan', 'S214']] });
  S('236', 'CLE', 'C236', '2023–', 'Coupé', ['M254', 'M256', 'OM654'],
    { v: [['3', 'Coupé', 'C236'], ['4', 'Kabriolet', 'A236']] });
  S('208', 'CLK', 'C208', '1997–2003', 'Coupé', ['M111', 'M112', 'M113'],
    { v: [['3', 'Coupé', 'C208'], ['4', 'Kabriolet', 'A208']] });
  S('209', 'CLK', 'C209', '2002–2010', 'Coupé', ['M271', 'M112', 'M272', 'M113', 'M273', 'M156', 'OM612', 'OM646', 'OM642'],
    { v: [['3', 'Coupé', 'C209'], ['4', 'Kabriolet', 'A209']] });
  // CLS (4 vrata → limuzina)
  S('219', 'CLS', 'C219', '2004–2010', 'Limuzina', ['M272', 'M273', 'M113', 'M156', 'OM642']);
  S('218', 'CLS', 'C218', '2011–2018', 'Limuzina', ['M276', 'M278', 'M157', 'OM651', 'OM642'],
    { v: [['3', 'Limuzina', 'C218'], ['9', 'Karavan', 'X218', 'CLS Shooting Brake']] });
  S('257', 'CLS', 'C257', '2018–2023', 'Limuzina', ['M264', 'M256', 'OM654', 'OM656']);
  // S, CL
  S('220', 'S-klasa', 'W220', '1998–2005', 'Limuzina', ['M112', 'M113', 'M137', 'M275', 'OM613', 'OM628']);
  S('221', 'S-klasa', 'W221', '2005–2013', 'Limuzina', ['M272', 'M273', 'M276', 'M278', 'M156', 'M157', 'M275', 'OM642', 'OM651', 'OM629']);
  S('222', 'S-klasa', 'W222', '2013–2020', 'Limuzina', ['M276', 'M278', 'M157', 'M177', 'M256', 'M279', 'OM642', 'OM656']);
  S('223', 'S-klasa', 'W223', '2020–', 'Limuzina', ['M256', 'M176', 'M177', 'OM656']);
  S('217', 'S-klasa Coupé/Kabriolet', 'C217', '2014–2020', 'Coupé', ['M278', 'M176', 'M177', 'M157', 'M279'],
    { v: [['3', 'Coupé', 'C217'], ['4', 'Kabriolet', 'A217']] });
  S('215', 'CL', 'C215', '1999–2006', 'Coupé', ['M113', 'M137', 'M275']);
  S('216', 'CL', 'C216', '2006–2014', 'Coupé', ['M273', 'M278', 'M156', 'M157', 'M275']);
  // A, B, CLA, GLA, GLB
  S('168', 'A-klasa', 'W168', '1997–2004', 'Hatchback', ['M166', 'OM668'], fw);
  S('169', 'A-klasa', 'W169', '2004–2012', 'Hatchback', ['M266', 'OM640'], fw);
  S('176', 'A-klasa', 'W176', '2012–2018', 'Hatchback', ['M270', 'M133', 'OM607', 'OM651'], fw);
  S('177', 'A-klasa', 'W177', '2018–', 'Hatchback', ['M282', 'M260', 'M139', 'OM608', 'OM654'],
    { ...fw, v: [['0', 'Hatchback', 'W177'], ['1', 'Limuzina', 'V177', 'A-klasa limuzina']] });
  S('245', 'B-klasa', 'W245', '2005–2011', 'Hatchback', ['M266', 'OM640'], fw);
  S('246', 'B-klasa', 'W246', '2011–2018', 'Hatchback', ['M270', 'OM607', 'OM651'], fw);
  S('242', 'B-klasa Electric Drive', 'W242', '2014–2017', 'Hatchback', ['EM'], fw);
  S('247', 'B-klasa', 'W247', '2018–', 'Hatchback', ['M282', 'M260', 'M139', 'OM608', 'OM654'],
    { ...fw, v: [['0', 'Hatchback', 'W247'], ['6', 'SUV', 'X247', 'GLB'], ['7', 'SUV', 'H247', 'GLA']] });
  S('117', 'CLA', 'C117', '2013–2019', 'Limuzina', ['M270', 'M133', 'OM607', 'OM651'],
    { ...fw, v: [['3', 'Limuzina', 'C117'], ['9', 'Karavan', 'X117', 'CLA Shooting Brake']] });
  S('118', 'CLA', 'C118', '2019–', 'Limuzina', ['M282', 'M260', 'M139', 'OM608', 'OM654'],
    { ...fw, v: [['3', 'Limuzina', 'C118'], ['6', 'Karavan', 'X118', 'CLA Shooting Brake']] });
  S('156', 'GLA', 'X156', '2013–2019', 'SUV', ['M270', 'M133', 'OM607', 'OM651'], fw);
  S('243', 'EQA', 'H243', '2021–', 'SUV', ['EM'], fw);
  // SUV
  S('253', 'GLC', 'X253', '2015–2022', 'SUV', ['M274', 'M264', 'M276', 'M177', 'OM651', 'OM654', 'OM642'],
    { ...p4, v: [['9', 'SUV', 'X253'], ['3', 'SUV', 'C253', 'GLC Coupé']] });
  S('254', 'GLC', 'X254', '2022–', 'SUV', ['M254', 'M139', 'OM654'], p4);
  S('293', 'EQC', 'N293', '2019–', 'SUV', ['EM'], p4);
  S('163', 'ML', 'W163', '1997–2005', 'SUV', ['M112', 'M113', 'OM612', 'OM628'], p4);
  S('164', 'ML', 'W164', '2005–2011', 'SUV', ['M272', 'M273', 'M113', 'M156', 'OM642', 'OM629'],
    { ...p4, v: [['1', 'SUV', 'W164'], ['8', 'SUV', 'X164', 'GL', '2006–2012']] });
  S('166', 'ML / GLE', 'W166', '2011–2019', 'SUV', ['M276', 'M278', 'M157', 'OM651', 'OM642'],
    { ...p4, v: [['0', 'SUV', 'W166'], ['8', 'SUV', 'X166', 'GL / GLS', '2012–2019']] });
  S('292', 'GLE Coupé', 'C292', '2015–2019', 'SUV', ['M276', 'M157', 'OM642'], p4);
  S('167', 'GLE', 'V167', '2019–', 'SUV', ['M264', 'M256', 'M176', 'M177', 'OM654', 'OM656'],
    { ...p4, v: [['1', 'SUV', 'V167'], ['3', 'SUV', 'C167', 'GLE Coupé'], ['9', 'SUV', 'X167', 'GLS']] });
  S('251', 'R-klasa', 'W251', '2005–2013', 'Karavan', ['M272', 'M273', 'M113', 'OM642'], p4);
  S('461', 'G-klasa', 'W461', '1990–', 'SUV', ['OM602', 'OM603', 'OM606', 'OM642'], p4);
  S('463', 'G-klasa', 'W463', '1990–', 'SUV', ['M112', 'M113', 'M273', 'M157', 'M176', 'M177', 'OM606', 'OM628', 'OM642', 'OM656'], p4);
  S('470', 'X-klasa', 'X470', '2017–2020', 'Pick-up', ['OM642'], p4);
  // Roadsteri, sportski
  S('170', 'SLK', 'R170', '1996–2004', 'Roadster', ['M111', 'M112']);
  S('171', 'SLK', 'R171', '2004–2011', 'Roadster', ['M271', 'M272', 'M113']);
  S('172', 'SLK / SLC', 'R172', '2011–2020', 'Roadster', ['M270', 'M274', 'M276', 'M152', 'OM651']);
  S('230', 'SL', 'R230', '2001–2012', 'Roadster', ['M113', 'M272', 'M273', 'M275', 'M156']);
  S('231', 'SL', 'R231', '2012–2020', 'Roadster', ['M276', 'M278', 'M157', 'M279']);
  S('232', 'SL', 'R232', '2021–', 'Roadster', ['M139', 'M177']);
  S('190', 'AMG GT', 'C190', '2014–2021', 'Coupé', ['M178']);
  S('290', 'AMG GT 4-vrata', 'X290', '2018–', 'Limuzina', ['M256', 'M177']);
  S('197', 'SLS AMG', 'C197', '2010–2014', 'Coupé', ['M159']);
  S('199', 'SLR McLaren', 'C199', '2003–2009', 'Coupé', ['M155']);
  // Električni
  S('295', 'EQE', 'V295', '2022–', 'Limuzina', ['EM']);
  S('294', 'EQE SUV', 'X294', '2022–', 'SUV', ['EM']);
  S('297', 'EQS', 'V297', '2021–', 'Hatchback', ['EM']);
  S('296', 'EQS SUV', 'X296', '2022–', 'SUV', ['EM'], p4);
  // Kombi i dostavna
  S('638', 'Vito / V-klasa', 'W638', '1996–2003', 'Kombi', ['M111', 'OM601', 'OM611'], fw);
  S('639', 'Vito / Viano', 'W639', '2003–2014', 'Kombi', ['M272', 'M112', 'OM646', 'OM651', 'OM642']);
  S('447', 'Vito / V-klasa', 'W447', '2014–', 'Kombi', ['OM622', 'OM651', 'OM654', 'M274']);
  S('414', 'Vaneo', 'W414', '2002–2005', 'Kombi', ['M166', 'OM668'], fw);
  S('415', 'Citan', 'W415', '2012–2021', 'Kombi', ['M200', 'OM607'], fw);
  S('420', 'Citan / T-klasa', 'W420', '2021–', 'Kombi', ['M282', 'OM608'], fw);
  S(['901', '902', '903', '904', '905'], 'Sprinter', 'T1N', '1995–2006', 'Kombi', ['M111', 'OM601', 'OM602', 'OM611', 'OM612']);
  S('906', 'Sprinter', 'W906', '2006–2018', 'Kombi', ['M271', 'M272', 'OM646', 'OM651', 'OM642']);
  S('907', 'Sprinter', 'W907', '2018–', 'Kombi', ['M274', 'OM651', 'OM654', 'OM642']);
  S('910', 'Sprinter', 'W910', '2018–', 'Kombi', ['OM651'], fw);
  Object.assign(ENG, { M110: ['Benzin', '2.8 R6'], M116: ['Benzin', '3.5/3.8/4.2 V8'], M117: ['Benzin', '4.5–5.6 V8'],
    OM615: ['Dizel', '2.0/2.2 R4'], OM616: ['Dizel', '2.4 R4'], OM617: ['Dizel', '3.0 R5'] });

  const TRANS = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
  const W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const YEARS = 'ABCDEFGHJKLMNPRSTVWXY123456789';

  function clean(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[IOQ]/g, c => ({ I: '1', O: '0', Q: '0' })[c]);
  }
  function checkOk(v) {
    let s = 0;
    for (let i = 0; i < 17; i++) s += (/\d/.test(v[i]) ? +v[i] : TRANS[v[i]]) * W[i];
    const r = s % 11;
    return v[8] === (r === 10 ? 'X' : String(r));
  }
  function naYear(v) {
    const i = YEARS.indexOf(v[9]);
    if (i < 0) return null;
    const y = 1980 + i;
    // slovo na 7. mjestu = 2010.+ (pravilo za osobna vozila)
    return /[A-Z]/.test(v[6]) ? y + 30 : y;
  }

  function decode(raw) {
    const v = clean(raw);
    const out = { vin: v, greske: [], podaci: [] };
    if (v.length !== 17) { out.greske.push(`VIN mora imati 17 znakova (upisano ${v.length}).`); return out; }
    const wmi = v.slice(0, 3);
    out.proizvodac = WMI[wmi] || null;
    if (!out.proizvodac) out.greske.push(`Oznaka proizvođača „${wmi}“ nije poznata Mercedesova oznaka — provjeri VIN.`);
    out.podaci.push(['Proizvođač (WMI)', `${wmi} — ${out.proizvodac || 'nepoznato'}`]);

    if (/^\d{6}$/.test(v.slice(3, 9))) {
      // europski zapis
      out.format = 'EU';
      out.serija = v.slice(3, 6);
      out.tip = v.slice(6, 9);
      out.typ = out.serija + '.' + out.tip;
      const s = SERIES[out.serija];
      if (s) {
        let kar = s.kar, kod = s.kod, naziv = s.klasa, god = s.god, pogon = s.pogon || 'Stražnji';
        const vv = (s.v || []).find(x => x[0] === out.tip[0]);
        if (vv) { kar = vv[1]; kod = vv[2]; if (vv[3]) naziv = vv[3]; if (vv[4]) god = vv[4]; if (vv[5]) pogon = vv[5]; }
        Object.assign(out, { klasa: naziv, kod, godine: god, karoserija: kar, pogon, motori: s.motori, znanaSerija: true, karSigurna: !!vv || !s.v });
        out.podaci.push(['Model', `${naziv} (${kod})`], ['Proizvodnja serije', god], ['Karoserija', kar + (out.karSigurna ? '' : ' (provjeri)')]);
      } else {
        out.znanaSerija = false;
        out.podaci.push(['Serija', `${out.serija} — nije u tablici, upiši model ručno`]);
      }
      out.podaci.push(['Tip (Typ)', out.typ]);
      out.volan = v[9] === '1' ? 'Lijevi' : v[9] === '2' ? 'Desni' : null;
      if (out.volan) out.podaci.push(['Volan', out.volan]);
      out.tvornica = PLANT[v[10]] || null;
      out.podaci.push(['Tvornica (orijentacijski)', out.tvornica ? `${v[10]} — ${out.tvornica}` : v[10]]);
      out.podaci.push(['Serijski broj', v.slice(11)]);
    } else {
      // sjevernoamerički zapis (s kontrolnom znamenkom i godinom)
      out.format = 'US';
      out.kontrola = checkOk(v);
      if (!out.kontrola) out.greske.push('Kontrolna znamenka (9. znak) ne odgovara — možda je VIN krivo upisan.');
      out.godina = naYear(v);
      if (out.godina) out.podaci.push(['Modelna godina', String(out.godina)]);
      out.podaci.push(['Zapis', 'američki VIN — više podataka dolazi iz NHTSA baze']);
    }
    return out;
  }

  // NHTSA vPIC — besplatna američka baza; za europske Mercedese vrati malo, za US VIN puno.
  async function nhtsa(vin) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`, { signal: ctl.signal });
      const j = await r.json();
      const x = (j.Results || [])[0] || {};
      const pick = {
        Model: x.Model, 'Godina': x.ModelYear, Serija: x.Series, Izvedba: x.Trim, Karoserija: x.BodyClass,
        'Obujam (L)': x.DisplacementL, Cilindri: x.EngineCylinders, 'Motor': x.EngineModel,
        'Snaga (kW)': x.EngineKW, Gorivo: x.FuelTypePrimary, Pogon: x.DriveType, 'Mjenjač': x.TransmissionStyle,
        Tvornica: [x.PlantCity, x.PlantCountry].filter(Boolean).join(', '),
      };
      const res = {};
      for (const [k, val] of Object.entries(pick)) if (val && val !== 'Not Applicable' && val !== '0') res[k] = String(val).trim();
      return res;
    } catch (e) {
      return null;
    } finally { clearTimeout(t); }
  }

  function motorOpis(code) {
    const e = ENG[code];
    return e ? `${code} — ${e[0].toLowerCase()} ${e[1]}` : code;
  }

  return { decode, nhtsa, clean, ENG, SERIES, motorOpis };
})();
