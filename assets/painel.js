/* ============================================================
   Painel das Áreas M3BS (protótipo)
   Entrada de mentira, abas por frente, apresentações por área
   (adicionar, abrir, baixar em PDF ou PowerPoint, renomear,
   substituir, reordenar, excluir).
   Leitura de PDF copiada do Painel de Gestão (pdf.js com intent
   'print', que não depende do quadro de animação).
   Dados: metadados no localStorage, arquivos e páginas no IndexedDB.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- utilidades ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var semMov = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  function uid(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function hoje() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dois(n) { return ('0' + n).slice(-2); }
  function semAcento(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function nomeArquivo(t) { return semAcento(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'apresentacao'; }
  function tituloDoArquivo(n) { return n.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  var tToast = null;
  function toast(m, ms) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tToast); tToast = setTimeout(function () { t.classList.remove('on'); }, ms || 2600); }
  function avisoFixo(m) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tToast); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------------- as 10 frentes (textos do site) ---------------- */
  var FRENTES = [
    { id: 'ans', nome: 'Relação com a ANS', curto: 'ANS', sub: 'Prevenção, operação e defesa na relação regulatória com a Agência.', img: 'area-relacao-com-a-ans.jpg', tema: 'Agenda regulatória da ANS' },
    { id: 'regulatorio', nome: 'Intervenções Regulatórias Críticas', curto: 'Regulatório', sub: 'Direção fiscal, técnica, regimes especiais e momentos críticos da operadora.', img: 'area-intervencoes-regulatorias.webp', tema: 'Mapa de riscos regulatórios' },
    { id: 'judicial', nome: 'Contencioso Judicial', curto: 'Contencioso Judicial', sub: 'Defesa estratégica das operadoras em todas as instâncias.', img: 'area-contencioso-judicial.jpg', tema: 'Teses em destaque' },
    { id: 'administrativo', nome: 'Contencioso Administrativo', curto: 'Administrativo', sub: 'Processos sancionadores, NIPs e defesa perante a ANS e outros órgãos.', img: 'area-contencioso-administrativo.webp', tema: 'Panorama dos processos administrativos' },
    { id: 'economico', nome: 'Equilíbrio Econômico-Financeiro', curto: 'Econômico-Financeiro', sub: 'Equilíbrio econômico-financeiro das operadoras perante a ANS.', img: 'area-equilibrio-economico-financeiro.webp', tema: 'Reajustes e revisões técnicas' },
    { id: 'tributario', nome: 'Tributário e Fiscal', curto: 'Tributário', sub: 'Planejamento, contencioso e recuperação tributária no setor de saúde.', img: 'area-tributario-fiscal.webp', tema: 'Calendário fiscal' },
    { id: 'trabalhista', nome: 'Trabalhista', curto: 'Trabalhista', sub: 'Estratégia, prevenção e contencioso trabalhista.', img: 'area-trabalhista.jpg', tema: 'Prevenção de passivo trabalhista' },
    { id: 'societario', nome: 'Movimentos Societários', curto: 'Societário', sub: 'Operações societárias, M&A e governança.', img: 'area-societario-operacoes.webp', tema: 'Operações em andamento' },
    { id: 'publicos', nome: 'Negócios Públicos e Licitações', curto: 'Negócios Públicos', sub: 'Negócios públicos e licitações no setor de saúde.', img: 'area-negocios-publicos.jpg', tema: 'Licitações em acompanhamento' },
    { id: 'academia', nome: 'Academia M3BS', curto: 'Academia', sub: 'Formação e conteúdo jurídico para o mercado de saúde suplementar.', img: 'area-academia-m3bs.jpg', tema: 'Calendário de cursos 2027' }
  ];
  /* subáreas iniciais: tiradas dos grupos de serviço de cada frente no site, três por área;
     o coordenador renomeia, acrescenta e remove em "Editar subáreas" */
  var SUBS_INICIAIS = {
    ans: ['Operação Regulatória', 'Interlocução com a ANS', 'Prevenção e Inteligência Regulatória'],
    regulatorio: ['Regimes Especiais', 'Direção Técnica e Fiscal', 'Alienação de Carteira e Liquidação'],
    judicial: ['Judicialização da Saúde', 'Contencioso em Saúde Suplementar', 'Recuperação de Crédito'],
    administrativo: ['Defesa do Consumidor', 'Processos Sancionatórios', 'Profissionais da Saúde'],
    economico: ['Processos Econômico-Financeiros', 'Execuções Fiscais e Débitos', 'Cobranças Indevidas'],
    tributario: ['Assessoria e Planejamento', 'Autuações e Execuções Fiscais', 'Transação com a PGFN'],
    trabalhista: ['Contencioso Trabalhista', 'Preventivo e Estrutural', 'Pareceres'],
    societario: ['Estrutura Societária', 'Contratos e Due Diligence', 'Governança e Integridade'],
    publicos: ['Inteligência Comercial', 'Certames e Contencioso', 'Contratos Públicos'],
    academia: ['Capacitação Técnica', 'Programas In-Company', 'Painéis e Workshops']
  };
  var MAX_SUBS = 8;
  function frente(id) { return FRENTES.filter(function (f) { return f.id === id; })[0]; }
  function coord(f) { return 'Coordenação ' + (f.id === 'academia' ? 'da Academia' : f.id === 'ans' ? 'de Relação com a ANS' : 'de ' + f.curto); }
  function coordMin(f) { return 'c' + coord(f).slice(1); }
  function iniciais(f) { var p = f.curto.split(/[\s-]+/).filter(Boolean); return (p[0][0] + (p[1] ? p[1][0] : (p[0][1] || ''))).toUpperCase(); }

  /* ---------------- estado ---------------- */
  var CHAVE = 'm3bs-painel-areas-v1', CHAVE_SESSAO = 'm3bs-painel-areas-sessao';
  var estado = null, sessao = null, atual = null, atualSub = null, termo = '';
  var MODELOS = ['resultados', 'plano', 'tema'];

  function subsIniciais() {
    var s = {};
    FRENTES.forEach(function (f) { s[f.id] = SUBS_INICIAIS[f.id].map(function (n, i) { return { id: f.id + '-s' + (i + 1), nome: n }; }); });
    return s;
  }
  function exemplos() {
    var itens = [], subs = subsIniciais();
    FRENTES.forEach(function (f) {
      [
        { modelo: 'resultados', titulo: 'Resultados do 3º trimestre de 2026', paginas: 5, data: '06/11/2026' },
        { modelo: 'plano', titulo: 'Plano de trabalho 2027', paginas: 4, data: '29/10/2026' },
        { modelo: 'tema', titulo: f.tema, paginas: 4, data: '14/10/2026' }
      ].forEach(function (m, i) {
        itens.push({ id: uid('ap'), frente: f.id, sub: subs[f.id][i].id, titulo: m.titulo, exemplo: m.modelo, paginas: m.paginas, pdf: null, pptx: null, nomePdf: '', nomePptx: '', criadoEm: m.data, atualizadoEm: m.data, por: coord(f), versao: 1 });
      });
    });
    return { versao: 2, subs: subs, itens: itens };
  }
  function itensOk(o) { return Array.isArray(o.itens) && o.itens.every(function (i) { return i && i.id && i.frente && typeof i.titulo === 'string'; }); }
  function valido(o) { return o && o.versao === 2 && o.subs && typeof o.subs === 'object' && itensOk(o); }
  /* versão 1 (sem subáreas): ganha as subáreas iniciais; exemplos vão cada um para uma subárea, o resto fica sem subárea */
  function migra(o) {
    if (!o || o.versao !== 1 || !itensOk(o)) return null;
    o.versao = 2; o.subs = subsIniciais();
    o.itens.forEach(function (i) { var k = MODELOS.indexOf(i.exemplo); i.sub = k >= 0 && o.subs[i.frente] ? o.subs[i.frente][k].id : null; });
    return o;
  }
  function carrega() {
    var o = null; try { o = JSON.parse(ls(CHAVE) || 'null'); } catch (e) { o = null; }
    if (valido(o)) { estado = o; }
    else { estado = migra(o) || exemplos(); salva(); }
    FRENTES.forEach(function (f) { if (!Array.isArray(estado.subs[f.id])) estado.subs[f.id] = []; });
  }
  function salva() { ls(CHAVE, JSON.stringify(estado)); }
  function item(id) { return estado.itens.filter(function (i) { return i.id === id; })[0]; }
  function daFrente(fid) { return estado.itens.filter(function (i) { return i.frente === fid; }); }
  function subsDe(fid) { return estado.subs[fid] || []; }
  function subNome(fid, sid) { var s = subsDe(fid).filter(function (x) { return x.id === sid; })[0]; return s ? s.nome : ''; }
  function subValida(fid, sid) { return !!subNome(fid, sid); }
  /* SEM = apresentações sem subárea (ou de subárea removida) */
  var SEM = 'sem';
  function naSub(i, sid) { return sid === null ? true : sid === SEM ? !subValida(i.frente, i.sub) : i.sub === sid; }
  function visiveis(fid, sid) { return daFrente(fid).filter(function (i) { return naSub(i, sid); }); }
  function pode(fid) { return !!sessao && sessao === fid; }

  /* ---------------- IndexedDB: arquivos originais e páginas ---------------- */
  var idb = null;
  function abreIdb() {
    return new Promise(function (ok) {
      try {
        var rq = indexedDB.open('m3bs-painel-areas', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('arquivos'); rq.result.createObjectStore('paginas'); };
        rq.onsuccess = function () { idb = rq.result; ok(true); };
        rq.onerror = rq.onblocked = function () { ok(false); };
      } catch (e) { ok(false); }
    });
  }
  function idbGet(st, k) {
    if (!idb) return Promise.resolve(undefined);
    return new Promise(function (ok) {
      try { var r = idb.transaction(st, 'readonly').objectStore(st).get(k); r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ok(undefined); }; } catch (e) { ok(undefined); }
    });
  }
  function idbPut(st, mapa) {
    if (!idb) return Promise.reject(new Error('sem-idb'));
    return new Promise(function (ok, erro) {
      try {
        var tx = idb.transaction(st, 'readwrite'), s = tx.objectStore(st);
        Object.keys(mapa).forEach(function (k) { s.put(mapa[k], k); });
        tx.oncomplete = function () { ok(); }; tx.onerror = tx.onabort = function () { erro(tx.error || new Error('idb')); };
      } catch (e) { erro(e); }
    });
  }
  function idbDel(st, chaves) {
    if (!idb || !chaves.length) return Promise.resolve();
    return new Promise(function (ok) {
      try { var tx = idb.transaction(st, 'readwrite'), s = tx.objectStore(st); chaves.forEach(function (k) { s.delete(k); }); tx.oncomplete = tx.onerror = tx.onabort = function () { ok(); }; } catch (e) { ok(); }
    });
  }
  function idbLimpa() {
    if (!idb) return Promise.resolve();
    return new Promise(function (ok) {
      try { var tx = idb.transaction(['arquivos', 'paginas'], 'readwrite'); tx.objectStore('arquivos').clear(); tx.objectStore('paginas').clear(); tx.oncomplete = tx.onerror = tx.onabort = function () { ok(); }; } catch (e) { ok(); }
    });
  }
  function apagaArquivosDe(it) {
    var a = [it.pdf, it.pptx].filter(Boolean);
    delete PAG[it.id]; delete MINI[it.id];
    return Promise.all([idbDel('arquivos', a), idbDel('paginas', [it.id, it.id + '_m'])]);
  }

  /* ---------------- páginas: cache em memória ---------------- */
  var PAG = {}, MINI = {};
  function miniDe(it) {
    if (MINI[it.id]) return Promise.resolve(MINI[it.id]);
    if (it.exemplo) return desenhaExemplo(it, 0, .3).then(function (u) { MINI[it.id] = u; return u; });
    if (!it.paginas) return Promise.resolve(null);
    return idbGet('paginas', it.id + '_m').then(function (u) { if (u) MINI[it.id] = u; return u || null; });
  }
  function paginasDe(it) {
    if (PAG[it.id]) return Promise.resolve(PAG[it.id]);
    if (it.exemplo) {
      var ps = [], c = Promise.resolve();
      for (var i = 0; i < it.paginas; i++) (function (n) { c = c.then(function () { return desenhaExemplo(it, n, 1).then(function (u) { ps.push(u); }); }); })(i);
      return c.then(function () { PAG[it.id] = ps; return ps; });
    }
    if (!it.paginas) return Promise.resolve([]);
    return idbGet('paginas', it.id).then(function (ps) { if (ps && ps.length) PAG[it.id] = ps; return ps || []; });
  }

  /* ---------------- apresentações de exemplo (desenhadas no navegador) ---------------- */
  var W = 1280, H = 720, LOGO = null, fontesProm = null;
  function fontes() {
    if (fontesProm) return fontesProm;
    var lista = ['700 60px "Playfair Display"', '600 60px "Playfair Display"', '400 24px Inter', '600 24px Inter', '700 24px Inter'];
    fontesProm = Promise.all(lista.map(function (f) { return document.fonts && document.fonts.load ? document.fonts.load(f).catch(function () {}) : null; })).then(function () {
      if (!/^https?:/.test(location.protocol)) return; /* aberto do disco, a imagem sujaria o canvas */
      return new Promise(function (ok) { var im = new Image(); im.onload = function () { LOGO = im; ok(); }; im.onerror = function () { ok(); }; im.src = 'assets/img/marca/m3bs-horizontal-logo-claro.svg'; });
    });
    return fontesProm;
  }
  function semente(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function quebra(x, txt, larg) {
    var pal = String(txt).split(' '), linhas = [], l = '';
    pal.forEach(function (p) { var t = l ? l + ' ' + p : p; if (x.measureText(t).width > larg && l) { linhas.push(l); l = p; } else l = t; });
    if (l) linhas.push(l); return linhas;
  }
  function conteudoExemplo(it, f) {
    var s = semente(f.id + it.exemplo), n1 = 60 + s % 140, n2 = 88 + s % 11, n3 = 6 + s % 19;
    var capa = { t: 'capa' }, fim = { t: 'fim' };
    if (it.exemplo === 'resultados') return [capa,
      { t: 'numeros', tit: 'Números do trimestre', nums: [[String(n1), 'casos ativos na frente'], [n2 + '%', 'prazos cumpridos no período'], [String(n3), 'novos clientes atendidos']] },
      { t: 'lista', tit: 'Destaques do período', itens: ['Entregas dentro do prazo combinado com os clientes', 'Dois temas novos levados ao comitê da área', 'Revisão dos modelos de peça mais usados', 'Treinamento interno concluído pela equipe'] },
      { t: 'lista', tit: 'Próximos passos', itens: ['Fechar o planejamento de 2027 com os sócios', 'Revisar a carteira com os clientes prioritários', 'Atualizar os indicadores da área no painel'] },
      fim];
    if (it.exemplo === 'plano') return [capa,
      { t: 'lista', tit: 'Prioridades para 2027', itens: ['Crescer a carteira com qualidade de entrega', 'Padronizar os relatórios enviados aos clientes', 'Formar a equipe nos temas novos da área', 'Medir prazo e resultado de cada frente de trabalho'] },
      { t: 'lista', tit: 'Cronograma', itens: ['1º trimestre: diagnóstico e metas por equipe', '2º trimestre: revisão dos fluxos de trabalho', '2º semestre: acompanhamento mensal no painel'] },
      fim];
    return [capa,
      { t: 'lista', tit: 'Visão geral', itens: ['O que mudou nos últimos meses', 'Como isso afeta os clientes da área', 'O que a equipe está acompanhando'] },
      { t: 'numeros', tit: 'Em números', nums: [[String(n3 + 4), 'itens em acompanhamento'], [String(2 + s % 7), 'prioridades para o mês'], [String(n2 - 10) + '%', 'concluído no ano']] },
      fim];
  }
  function rodapeSlide(x, f, n, tot, claro) {
    x.font = '600 15px Inter'; x.fillStyle = claro ? 'rgba(235,220,201,.85)' : '#85672E';
    x.textAlign = 'left'; x.fillText('M3BS  ·  ' + f.nome.toUpperCase(), 64, H - 40);
    x.textAlign = 'right'; x.fillText('EXEMPLO · CONTEÚDO FICTÍCIO     ' + dois(n + 1) + ' / ' + dois(tot), W - 64, H - 40);
    x.textAlign = 'left';
  }
  function fundoBordo(x) {
    var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#6B1F2A'); g.addColorStop(.6, '#4A1219'); g.addColorStop(1, '#2B0A0F');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var r = x.createRadialGradient(W * .85, 0, 10, W * .85, 0, 620); r.addColorStop(0, 'rgba(139,42,58,.55)'); r.addColorStop(1, 'rgba(139,42,58,0)');
    x.fillStyle = r; x.fillRect(0, 0, W, H);
  }
  function desenhaExemplo(it, n, escala) {
    return fontes().then(function () {
      var f = frente(it.frente), pags = conteudoExemplo(it, f), p = pags[Math.min(n, pags.length - 1)];
      var c = document.createElement('canvas'); c.width = Math.round(W * escala); c.height = Math.round(H * escala);
      var x = c.getContext('2d'); x.scale(escala, escala); x.textBaseline = 'alphabetic';
      if (p.t === 'capa' || p.t === 'fim') {
        fundoBordo(x);
        x.fillStyle = '#B69253'; x.fillRect(64, 64, 6, H - 128);
        if (LOGO) x.drawImage(LOGO, W - 64 - 260, 76, 260, 260 * 107 / 874); /* logo oficial, versão horizontal clara */ else { x.font = '700 30px Inter'; x.fillStyle = '#E2CDA4'; x.textAlign = 'right'; x.fillText('M3BS', W - 64, 100); x.textAlign = 'left'; }
        x.font = '600 18px Inter'; x.fillStyle = '#C9AB74'; x.fillText((f.nome + (it.sub && subNome(f.id, it.sub) ? '  ·  ' + subNome(f.id, it.sub) : '')).toUpperCase(), 104, 112);
        if (p.t === 'capa') {
          x.font = '700 62px "Playfair Display"'; x.fillStyle = '#FFFFFF';
          var ls_ = quebra(x, it.titulo, W - 300).slice(0, 3), y0 = 330 - (ls_.length - 1) * 42;
          ls_.forEach(function (l, i) { x.fillText(l, 104, y0 + i * 84); });
          x.fillStyle = '#B69253'; x.fillRect(104, y0 + ls_.length * 84 - 40, 72, 4);
          x.font = '400 24px Inter'; x.fillStyle = '#EBDCC9'; x.fillText(coord(f) + '  ·  ' + it.criadoEm, 104, y0 + ls_.length * 84 + 14);
        } else {
          x.font = '700 72px "Playfair Display"'; x.fillStyle = '#FFFFFF'; x.fillText('Obrigado', 104, 340);
          x.fillStyle = '#B69253'; x.fillRect(104, 372, 72, 4);
          x.font = '400 26px Inter'; x.fillStyle = '#EBDCC9'; x.fillText('Dúvidas e próximos passos com a ' + coordMin(f) + '.', 104, 430);
        }
        rodapeSlide(x, f, n, pags.length, true);
      } else {
        x.fillStyle = '#FAF7F2'; x.fillRect(0, 0, W, H);
        x.fillStyle = '#6B1F2A'; x.fillRect(0, 0, 14, H);
        x.font = '600 16px Inter'; x.fillStyle = '#85672E'; x.fillText(it.titulo.toUpperCase().slice(0, 70), 64, 82);
        x.font = '700 46px "Playfair Display"'; x.fillStyle = '#6B1F2A'; x.fillText(p.tit, 64, 152);
        x.fillStyle = '#B69253'; x.fillRect(64, 176, 56, 3);
        if (p.t === 'lista') {
          p.itens.forEach(function (t, i) {
            var y = 250 + i * 92;
            x.fillStyle = '#FFFFFF'; x.strokeStyle = '#E6E0D6'; x.lineWidth = 1.5; caixa(x, 64, y - 44, W - 128, 74, 12); x.fill(); x.stroke();
            x.fillStyle = '#6B1F2A'; x.beginPath(); x.arc(108, y - 7, 20, 0, Math.PI * 2); x.fill();
            x.font = '700 18px Inter'; x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.fillText(dois(i + 1), 108, y - 1); x.textAlign = 'left';
            x.font = '400 26px Inter'; x.fillStyle = '#1F1B18'; x.fillText(t, 148, y + 2);
          });
        } else {
          var lw = (W - 128 - 2 * 28) / 3;
          p.nums.forEach(function (nu, i) {
            var x0 = 64 + i * (lw + 28);
            x.fillStyle = '#FFFFFF'; x.strokeStyle = '#E6E0D6'; x.lineWidth = 1.5; caixa(x, x0, 230, lw, 340, 14); x.fill(); x.stroke();
            x.fillStyle = '#6B1F2A'; x.fillRect(x0, 230, lw, 6);
            x.font = '700 96px "Playfair Display"'; x.fillStyle = '#6B1F2A'; x.fillText(nu[0], x0 + 36, 400);
            x.font = '400 24px Inter'; x.fillStyle = '#544D47'; quebra(x, nu[1], lw - 72).forEach(function (l, j) { x.fillText(l, x0 + 36, 462 + j * 34); });
          });
        }
        rodapeSlide(x, f, n, pags.length, false);
      }
      var u = c.toDataURL('image/jpeg', escala < 1 ? .8 : .88); c.width = c.height = 0; return u;
    });
  }
  function caixa(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  /* ---------------- bibliotecas sob demanda ---------------- */
  var LIBS = {
    pdfjs: { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', glob: 'pdfjsLib' },
    jspdf: { url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', glob: 'jspdf' },
    pptx: { url: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', glob: 'PptxGenJS' }
  };
  var libProm = {};
  function lib(nome) {
    var L = LIBS[nome];
    if (window[L.glob]) return Promise.resolve(window[L.glob]);
    if (libProm[nome]) return libProm[nome];
    libProm[nome] = new Promise(function (ok, erro) {
      var sc = document.createElement('script'); sc.src = L.url; sc.crossOrigin = 'anonymous';
      sc.onload = function () {
        if (!window[L.glob]) { libProm[nome] = null; erro(new Error('internet')); return; }
        if (nome === 'pdfjs') window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        ok(window[L.glob]);
      };
      sc.onerror = function () { libProm[nome] = null; erro(new Error('internet')); };
      document.head.appendChild(sc);
    });
    return libProm[nome];
  }

  /* ---------------- ler PDF em páginas (do Painel de Gestão) ---------------- */
  var MAX_PAG = 80, MAX_L = 1920, MAX_A = 1080, MAX_MB = 60;
  function exporta(w, h, desenha) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    return Promise.resolve(desenha(x)).then(function () {
      var grande = c.toDataURL('image/jpeg', .86), mini = null;
      var m = document.createElement('canvas'), mw = 400, mh = Math.round(400 * h / w); m.width = mw; m.height = mh;
      m.getContext('2d').drawImage(c, 0, 0, mw, mh); mini = m.toDataURL('image/jpeg', .78);
      c.width = c.height = m.width = m.height = 0;
      return { grande: grande, mini: mini };
    });
  }
  function lePdf(arq, aviso) {
    return lib('pdfjs').then(function (pdfjs) {
      return arq.arrayBuffer().then(function (buf) { return pdfjs.getDocument({ data: buf }).promise; });
    }).then(function (doc) {
      var n = Math.min(doc.numPages, MAX_PAG), saida = [], cadeia = Promise.resolve();
      for (var p = 1; p <= n; p++) {
        (function (pn) {
          cadeia = cadeia.then(function () {
            aviso('Lendo ' + arq.name + ': página ' + pn + ' de ' + n);
            return doc.getPage(pn).then(function (page) {
              var v1 = page.getViewport({ scale: 1 }), e_ = Math.min(MAX_L / v1.width, MAX_A / v1.height), vp = page.getViewport({ scale: e_ });
              return exporta(Math.round(vp.width), Math.round(vp.height), function (x) { return page.render({ canvasContext: x, viewport: vp, intent: 'print' }).promise; })
                .then(function (im) { page.cleanup(); saida.push(im); });
            });
          });
        })(p);
      }
      return cadeia.then(function () { var total = doc.numPages; doc.destroy(); return { paginas: saida, total: total }; });
    });
  }
  function ePdf(f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name); }
  function ePptx(f) { return /\.pptx$/i.test(f.name) || f.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; }

  /* agrupa os arquivos pelo nome: "Plano 2027.pdf" e "Plano 2027.pptx" viram uma apresentação só */
  function agrupa(lista) {
    var grupos = {}, ordem = [], recusados = [];
    [].slice.call(lista).forEach(function (f) {
      if (!ePdf(f) && !ePptx(f)) { recusados.push(f); return; }
      if (f.size > MAX_MB * 1024 * 1024) { recusados.push(f); toast(f.name + ' passa de ' + MAX_MB + ' MB e ficou de fora.', 4000); return; }
      var k = semAcento(tituloDoArquivo(f.name));
      if (!grupos[k]) { grupos[k] = { titulo: tituloDoArquivo(f.name), pdf: null, pptx: null }; ordem.push(k); }
      if (ePdf(f)) grupos[k].pdf = f; else grupos[k].pptx = f;
    });
    var msg = '';
    if (recusados.length) {
      var r = recusados[0];
      if (/\.ppt$/i.test(r.name)) msg = r.name + ' é do PowerPoint antigo. Abra no PowerPoint e salve como .pptx ou exporte em PDF.';
      else if (/\.(key|odp)$/i.test(r.name)) msg = r.name + ' não entra. Exporte em PDF ou PowerPoint (.pptx).';
      else if (r.size <= MAX_MB * 1024 * 1024) msg = 'Arquivo não aceito: ' + r.name + '. Use PDF ou PowerPoint (.pptx).';
    }
    return { grupos: ordem.map(function (k) { return grupos[k]; }), msg: msg };
  }

  /* guarda os arquivos de um grupo e devolve os campos da apresentação */
  function processaGrupo(g, idAp) {
    var campos = { pdf: null, pptx: null, nomePdf: '', nomePptx: '', paginas: 0 }, gravar = {};
    if (g.pptx) { campos.pptx = uid('arq'); campos.nomePptx = g.pptx.name; gravar[campos.pptx] = g.pptx; }
    var lendo = g.pdf ? lePdf(g.pdf, avisoFixo).then(function (r) {
      campos.pdf = uid('arq'); campos.nomePdf = g.pdf.name; gravar[campos.pdf] = g.pdf;
      campos.paginas = r.paginas.length; campos.total = r.total;
      var mapa = {}; mapa[idAp] = r.paginas.map(function (p) { return p.grande; }); mapa[idAp + '_m'] = r.paginas[0] ? r.paginas[0].mini : null;
      return idbPut('paginas', mapa).then(function () { PAG[idAp] = mapa[idAp]; MINI[idAp] = mapa[idAp + '_m']; });
    }) : Promise.resolve();
    return lendo.then(function () { return Object.keys(gravar).length ? idbPut('arquivos', gravar) : null; }).then(function () { return campos; });
  }

  var ocupado = false;
  function adiciona(lista) {
    if (!pode(atual)) { toast('Você só pode adicionar apresentações na sua área.'); return; }
    if (ocupado) { toast('Ainda estou lendo os arquivos anteriores; aguarde.'); return; }
    var a = agrupa(lista);
    if (a.msg) toast(a.msg, 5200);
    if (!a.grupos.length) return;
    if (!idb) { toast('Este navegador não deixou guardar arquivos (modo privado?). Nada foi adicionado.', 5200); return; }
    ocupado = true;
    var f = frente(atual), sub = atualSub && atualSub !== SEM && subValida(f.id, atualSub) ? atualSub : null, novos = 0, cortes = [], cadeia = Promise.resolve();
    a.grupos.forEach(function (g) {
      cadeia = cadeia.then(function () {
        var id = uid('ap');
        return processaGrupo(g, id).then(function (c) {
          if (c.total > MAX_PAG) cortes.push(g.titulo);
          estado.itens.push({ id: id, frente: f.id, sub: sub, titulo: g.titulo, exemplo: null, paginas: c.paginas, pdf: c.pdf, pptx: c.pptx, nomePdf: c.nomePdf, nomePptx: c.nomePptx, criadoEm: hoje(), atualizadoEm: hoje(), por: coord(f), versao: 1 });
          salva(); novos++;
        });
      });
    });
    cadeia.then(function () {
      ocupado = false; render();
      var onde = sub ? ' em ' + subNome(f.id, sub) : ' sem subárea (use "Mover para subárea" no menu do cartão)';
      var m = (novos === 1 ? 'Apresentação adicionada' : novos + ' apresentações adicionadas') + onde + '.';
      if (cortes.length) m += ' O PDF "' + cortes[0] + '" passou de ' + MAX_PAG + ' páginas; a prévia mostra as ' + MAX_PAG + ' primeiras, e o arquivo baixado vem inteiro.';
      toast(m, cortes.length ? 6000 : 3000);
    }, function (er) {
      ocupado = false; render();
      toast(er && er.message === 'internet' ? 'Não consegui carregar o leitor de PDF (precisa de internet).' : 'Não consegui ler um dos arquivos. ' + (novos ? novos + ' entraram antes do erro.' : 'Nada foi adicionado.'), 5200);
    });
  }

  var trocando = null;
  function substitui(id, lista) {
    var it = item(id); if (!it || !pode(it.frente)) return;
    var a = agrupa(lista);
    if (a.msg) toast(a.msg, 5200);
    var g = { titulo: it.titulo, pdf: null, pptx: null };
    a.grupos.forEach(function (x) { g.pdf = g.pdf || x.pdf; g.pptx = g.pptx || x.pptx; });
    if (!g.pdf && !g.pptx) return;
    if (ocupado) { toast('Ainda estou lendo outros arquivos; aguarde.'); return; }
    ocupado = true;
    var velho = { id: it.id, pdf: it.pdf, pptx: it.pptx }, idNovo = uid('ap');
    processaGrupo(g, idNovo).then(function (c) {
      return apagaArquivosDe(velho).then(function () {
        it.id = idNovo; it.exemplo = null; it.pdf = c.pdf; it.pptx = c.pptx; it.nomePdf = c.nomePdf; it.nomePptx = c.nomePptx; it.paginas = c.paginas;
        it.atualizadoEm = hoje(); it.por = coord(frente(it.frente)); it.versao = (it.versao || 1) + 1;
        salva(); ocupado = false; render();
        toast('Arquivos substituídos. Esta é a versão ' + it.versao + '.' + (!c.pdf ? ' Sem o PDF, a prévia fica indisponível até ele subir.' : ''), 4200);
      });
    }).catch(function (er) {
      ocupado = false; render();
      toast(er && er.message === 'internet' ? 'Não consegui carregar o leitor de PDF (precisa de internet).' : 'Não consegui ler o arquivo novo. A versão anterior ficou como estava.', 5200);
    });
  }

  /* ---------------- baixar ---------------- */
  function baixaBlob(blob, nome) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function dims(src) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok({ w: im.naturalWidth, h: im.naturalHeight }); }; im.onerror = function () { ok({ w: 16, h: 9 }); }; im.src = src; }); }
  function baixaPdf(it) {
    if (it.pdf) return idbGet('arquivos', it.pdf).then(function (b) { if (b) { baixaBlob(b, it.nomePdf || nomeArquivo(it.titulo) + '.pdf'); toast('PDF baixado.'); } else toast('O arquivo não está neste navegador.'); });
    if (!it.paginas) { toast('Esta apresentação só tem o PowerPoint. No PowerPoint, use Arquivo, Exportar, PDF, e suba os dois pelo Substituir. Na versão real, o SharePoint converte sozinho.', 7000); return Promise.resolve(); }
    avisoFixo('Montando o PDF…');
    return Promise.all([lib('jspdf'), paginasDe(it)]).then(function (r) {
      var ps = r[1]; return dims(ps[0]).then(function (d) {
        var w = 960, h = Math.round(960 * d.h / d.w), doc = new r[0].jsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'pt', format: [w, h], compress: true });
        ps.forEach(function (src, i) { if (i) doc.addPage([w, h], w >= h ? 'landscape' : 'portrait'); doc.addImage(src, 'JPEG', 0, 0, w, h, undefined, 'FAST'); });
        baixaBlob(doc.output('blob'), nomeArquivo(it.titulo) + '.pdf'); toast('PDF baixado.');
      });
    }).catch(function () { toast('Não consegui montar o PDF (a biblioteca precisa de internet).', 4500); });
  }
  function baixaPptx(it) {
    if (it.pptx) return idbGet('arquivos', it.pptx).then(function (b) { if (b) { baixaBlob(b, it.nomePptx || nomeArquivo(it.titulo) + '.pptx'); toast('PowerPoint baixado (arquivo original).'); } else toast('O arquivo não está neste navegador.'); });
    if (!it.paginas) { toast('Não há páginas para montar o PowerPoint.'); return Promise.resolve(); }
    avisoFixo('Montando o PowerPoint…');
    return Promise.all([lib('pptx'), paginasDe(it)]).then(function (r) {
      var ps = r[1];
      return Promise.all(ps.map(dims)).then(function (ds) {
        var LW = 13.333, LH = +(LW * ds[0].h / ds[0].w).toFixed(3), P = new r[0]();
        P.defineLayout({ name: 'M3BS', width: LW, height: LH }); P.layout = 'M3BS';
        P.author = coord(frente(it.frente)); P.company = 'M3BS Advogados'; P.title = it.titulo;
        ps.forEach(function (src, i) {
          var d = ds[i], k = Math.min(LW / d.w, LH / d.h), w = d.w * k, h = d.h * k, s = P.addSlide();
          s.background = { color: 'FFFFFF' };
          s.addImage({ data: src, x: (LW - w) / 2, y: (LH - h) / 2, w: w, h: h });
        });
        return P.write({ outputType: 'blob' }).then(function (b) {
          b = new Blob([b], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
          baixaBlob(b, nomeArquivo(it.titulo) + '.pptx');
          toast('PowerPoint baixado: uma página por slide. Serve para apresentar; para editar o texto, use o arquivo original.', 5200);
        });
      });
    }).catch(function () { toast('Não consegui montar o PowerPoint (a biblioteca precisa de internet).', 4500); });
  }

  /* ---------------- desenho da tela ---------------- */
  var ICO = {
    pdf: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    baixa: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mais: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>',
    alca: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g></svg>',
    ppt: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="6" width="32" height="36" rx="3" fill="#fff" stroke="#D9CFBF" stroke-width="1.5"/><rect x="4" y="13" width="22" height="22" rx="3" fill="#B7472A"/><path d="M11 30V18h5a4 4 0 010 8h-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M30 16h8M30 22h8M30 28h8" stroke="#D9CFBF" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  function renderHero() {
    var f = frente(atual), its = daFrente(f.id), ult = its.map(function (i) { return i.atualizadoEm; }).sort(function (a, b) { return b.split('/').reverse().join('').localeCompare(a.split('/').reverse().join('')); })[0];
    $('#hero').innerHTML = '<div class="wrap"><div>' +
      '<h1>' + esc(f.nome) + '</h1>' +
      '<p class="sub">' + esc(f.sub) + '</p>' +
      '<div class="pa-hero__fatos"><span><b>' + its.length + '</b> ' + (its.length === 1 ? 'apresentação' : 'apresentações') + ' em <b>' + subsDe(f.id).length + '</b> ' + (subsDe(f.id).length === 1 ? 'subárea' : 'subáreas') + '</span>' +
      (ult ? '<span>Última atualização em <b>' + ult + '</b></span>' : '') +
      (pode(f.id) ? '<span class="pa-selo">Você coordena esta área</span>' : '<span class="pa-selo pa-selo--leitura">Somente leitura: abrir e baixar. Quem altera é a ' + esc(coordMin(f)) + '</span>') + '</div>' +
      '</div><figure class="pa-hero__foto"><img src="assets/img/' + f.img + '" alt="" width="700" height="466" decoding="async"></figure></div>';
  }
  function renderBarra() {
    var f = frente(atual), ed = pode(f.id);
    $('#bt-add').hidden = !ed;
    $('#aviso-leitura').hidden = true; /* o aviso de leitura fica no selo da faixa, para os cartões caberem na primeira tela */
    $('#solta-txt').textContent = 'Solte para adicionar em ' + (atualSub && atualSub !== SEM && subValida(f.id, atualSub) ? subNome(f.id, atualSub) : f.curto);
  }
  function renderSubs() {
    var f = frente(atual), subs = subsDe(f.id), nSem = visiveis(f.id, SEM).length;
    var link = function (sid, nome, n, cls) {
      var href = '#/' + f.id + (sid ? '/' + sid : ''), on = (sid || null) === atualSub;
      return '<li><a href="' + href + '"' + (cls ? ' class="' + cls + '"' : '') + (on ? ' aria-current="page"' : '') + '>' + esc(nome) + '<span>' + n + '</span></a></li>';
    };
    $('#subs').innerHTML = link(null, 'Todas', daFrente(f.id).length) +
      subs.map(function (s) { return link(s.id, s.nome, visiveis(f.id, s.id).length); }).join('') +
      (nSem || atualSub === SEM ? link(SEM, 'Sem subárea', nSem, 'sem') : '');
    $('#bt-subs').hidden = !pode(f.id);
    var a = $('#subs a[aria-current]');
    if (a) { var ul = $('#subs'), r = a.getBoundingClientRect(), ru = ul.getBoundingClientRect(); if (r.left < ru.left || r.right > ru.right) ul.scrollLeft += r.left - ru.left - 24; }
  }
  function cartao(it, i, ed, total) {
    var tags = (it.pdf || it.exemplo ? '<span class="ap__tag ap__tag--pdf">PDF</span>' : '') + (it.pptx ? '<span class="ap__tag ap__tag--ppt">PPTX</span>' : '') + (it.exemplo ? '<span class="ap__tag ap__tag--ex">Exemplo</span>' : '');
    var pags = it.paginas ? it.paginas + (it.paginas === 1 ? ' página' : ' páginas') : 'Só PowerPoint, sem prévia';
    var meta = pags + ' · ' + (it.versao > 1 ? 'versão ' + it.versao + ' de ' : 'enviada em ') + it.atualizadoEm + ' · ' + esc(it.por);
    var menuBaixar = '<details class="menu"><summary class="bt-p">' + ICO.baixa + 'Baixar</summary><div class="menu__lista">' +
      '<button type="button" data-acao="pdf">PDF<small>' + (it.pdf ? 'Arquivo original' : it.paginas ? 'Montado a partir das páginas' : 'Precisa do PDF; veja a dica ao clicar') + '</small></button>' +
      '<button type="button" data-acao="ppt">PowerPoint<small>' + (it.pptx ? 'Arquivo original' : 'Uma página por slide') + '</small></button></div></details>';
    var menuMais = ed ? '<details class="menu"><summary class="bt-p bt-p--ic" aria-label="Mais ações para ' + esc(it.titulo) + '">' + ICO.mais + '</summary><div class="menu__lista menu__lista--dir">' +
      '<button type="button" data-acao="renomear">Renomear</button>' +
      '<button type="button" data-acao="substituir">Substituir arquivos</button>' +
      '<hr><button type="button" data-acao="antes"' + (i === 0 ? ' disabled' : '') + '>Mover para antes</button>' +
      '<button type="button" data-acao="depois"' + (i === total - 1 ? ' disabled' : '') + '>Mover para depois</button>' +
      '<hr><span class="rot">Mover para subárea</span>' +
      subsDe(it.frente).map(function (s) { var on = s.id === it.sub; return '<button type="button" data-acao="sub" data-sub="' + s.id + '"' + (on ? ' aria-current="true" disabled' : '') + '>' + esc(s.nome) + (on ? '<small>Está aqui</small>' : '') + '</button>'; }).join('') +
      (subValida(it.frente, it.sub) ? '<button type="button" data-acao="sub" data-sub="">Sem subárea</button>' : '') +
      '<hr><button type="button" class="perigo" data-acao="excluir">Excluir</button></div></details>' : '';
    var eyebrow = atualSub === null && subValida(it.frente, it.sub) ? '<span class="ap__sub">' + esc(subNome(it.frente, it.sub)) + '</span>' : '';
    return '<li class="ap" data-id="' + it.id + '" style="--i:' + i + '"' + (ed ? ' draggable="true" tabindex="0" aria-label="' + esc(it.titulo) + ', posição ' + (i + 1) + ' de ' + total + '. Alt e setas para mudar a ordem."' : '') + '>' +
      '<button class="ap__thumb" type="button" data-acao="abrir" aria-label="Abrir ' + esc(it.titulo) + '">' +
      (it.paginas || it.exemplo ? '<div class="ap__carrega" data-mini="' + it.id + '"></div>' : '<div class="ap__ppt">' + ICO.ppt + '<span>PowerPoint sem prévia no protótipo.<br>Suba o PDF junto para ver aqui.</span></div>') +
      '<span class="ap__ord">' + dois(i + 1) + '</span><span class="ap__tags">' + tags + '</span></button>' +
      '<div class="ap__corpo">' + eyebrow + '<h3>' + esc(it.titulo) + '</h3><p class="ap__meta">' + meta + '</p>' +
      '<div class="ap__acoes"><button class="bt-p bt-p--cheio" type="button" data-acao="abrir">Abrir</button>' + menuBaixar + menuMais +
      (ed ? '<span class="ap__alca" title="Arraste para mudar a ordem" aria-hidden="true">' + ICO.alca + '</span>' : '') + '</div></div></li>';
  }
  function renderGrade() {
    var ed = pode(atual), todos = visiveis(atual, atualSub), t = semAcento(termo.trim());
    var vis = t ? todos.filter(function (i) { return semAcento(i.titulo).indexOf(t) >= 0; }) : todos;
    var nomeSub = atualSub === SEM ? 'Sem subárea' : atualSub ? subNome(atual, atualSub) : '';
    $('#barra-tit').innerHTML = 'Apresentações' + (t ? '<small>' + vis.length + ' de ' + todos.length + '</small>' : '');
    var g = $('#grade');
    if (!todos.length) g.innerHTML = '<li class="pa-vazio"><b>' + (nomeSub ? 'Nada em ' + esc(nomeSub) + ' ainda' : 'Nenhuma apresentação ainda') + '</b>' + (ed ? (atualSub === SEM ? 'Aqui ficam as apresentações que ainda não têm subárea.' : 'Use "Adicionar apresentação" ou arraste PDF e PowerPoint para cá.') : 'A coordenação desta área ainda não subiu nada aqui.') + '</li>';
    else if (!vis.length) g.innerHTML = '<li class="pa-vazio"><b>Nada encontrado</b>Nenhum título com "' + esc(termo.trim()) + '" ' + (nomeSub ? 'em ' + esc(nomeSub) : 'nesta área') + '.</li>';
    else g.innerHTML = vis.map(function (it) { return cartao(it, todos.indexOf(it), ed && !t, todos.length); }).join('');
    if (semMov()) $$('.ap', g).forEach(function (e) { e.style.animation = 'none'; e.style.opacity = 1; e.style.transform = 'none'; });
    vis.forEach(function (it) {
      var alvo = $('[data-mini="' + it.id + '"]', g); if (!alvo) return;
      miniDe(it).then(function (u) {
        var a2 = $('[data-mini="' + it.id + '"]'); if (!a2) return;
        if (u) a2.outerHTML = '<img src="' + u + '" alt="" draggable="false">';
        else a2.outerHTML = '<div class="ap__ppt">' + ICO.pdf + '<span>Prévia não encontrada neste navegador.</span></div>';
      });
    });
  }
  function render() {
    if (!sessao) { mostraLogin(); return; }
    renderHero(); renderBarra(); renderSubs(); renderGrade();
  }
  function rota() {
    /* cada coordenador só vê a própria área: para mudar de área, sai e entra com outra conta */
    var m = /^#\/([a-z]+)(?:\/([a-z0-9-]+))?/.exec(location.hash), id = sessao;
    if (m && m[1] !== sessao) { history.replaceState(null, '', location.pathname + location.search + '#/' + sessao); m = null; }
    var sid = m && id === m[1] && m[2] ? (m[2] === SEM || subValida(id, m[2]) ? m[2] : null) : null;
    if (id !== atual || sid !== atualSub) { termo = ''; $('#busca').value = ''; }
    atual = id; atualSub = sid;
    render();
  }

  /* ---------------- entrada ---------------- */
  function mostraLogin() {
    $('#app').hidden = true; $('#login').hidden = false;
    $('#login-passo1').hidden = false; $('#login-passo2').hidden = true;
    document.title = 'Entrar | Painel das Áreas M3BS';
  }
  function entra(fid, manterHash) {
    sessao = fid; ls(CHAVE_SESSAO, fid);
    var f = frente(fid);
    $('#user-av').textContent = iniciais(f); $('#user-nome').textContent = coord(f); $('#user-papel').textContent = 'Coordenador(a) · exemplo';
    $('#login').hidden = true; $('#app').hidden = false;
    document.title = 'Painel das Áreas | M3BS Advogados';
    var m = /^#\/([a-z]+)/.exec(location.hash);
    if (manterHash && m && frente(m[1])) rota();
    else if (location.hash !== '#/' + fid) location.hash = '#/' + fid; else rota();
  }
  $('#login-area').innerHTML = FRENTES.map(function (f) { return '<option value="' + f.id + '">' + esc(coord(f)) + '</option>'; }).join('');
  $('#bt-ms').addEventListener('click', function () { $('#login-passo1').hidden = true; $('#login-passo2').hidden = false; $('#login-area').focus(); });
  $('#bt-voltar').addEventListener('click', function () { $('#login-passo2').hidden = true; $('#login-passo1').hidden = false; $('#bt-ms').focus(); });
  $('#login-passo2').addEventListener('submit', function (e) { e.preventDefault(); entra($('#login-area').value); });
  $('#bt-sair').addEventListener('click', function () { sessao = null; atual = null; ls(CHAVE_SESSAO, null); history.replaceState(null, '', location.pathname + location.search); mostraLogin(); window.scrollTo(0, 0); });
  $('#lk-inicio').addEventListener('click', function (e) { e.preventDefault(); location.hash = '#/' + sessao; });

  /* ---------------- ações dos cartões ---------------- */
  var aoConfirmar = null;
  function confirma(t, msg, bt, fn) { $('#dc-t').textContent = t; $('#dc-msg').textContent = msg; $('#dc-sim').textContent = bt; aoConfirmar = fn; $('#dlg-conf').showModal(); $('#dc-nao').focus(); }
  $('#dc-sim').addEventListener('click', function () { var fn = aoConfirmar; aoConfirmar = null; $('#dlg-conf').close(); if (fn) fn(); });
  $('#dc-nao').addEventListener('click', function () { aoConfirmar = null; $('#dlg-conf').close(); });

  var renomeando = null;
  $('#form-nome').addEventListener('submit', function (e) {
    e.preventDefault(); var it = item(renomeando), v = $('#dn-tit').value.trim();
    if (it && v) { it.titulo = v.slice(0, 120); salva(); renderGrade(); toast('Título salvo.'); var c = $('.ap[data-id="' + it.id + '"]'); if (c) c.focus(); }
    $('#dlg-nome').close();
  });
  $('#dn-nao').addEventListener('click', function () { $('#dlg-nome').close(); });
  $('#dt-nao').addEventListener('click', function () { trocando = null; $('#dlg-troca').close(); });
  $('#dt-sim').addEventListener('click', function () { $('#dlg-troca').close(); var i = $('#arq-troca'); i.value = ''; i.click(); });
  $('#arq-troca').addEventListener('change', function (e) { if (trocando && e.target.files.length) substitui(trocando, e.target.files); trocando = null; });

  function move(id, delta) {
    var it = item(id); if (!it || !pode(it.frente)) return false;
    var lst = visiveis(it.frente, atualSub), i = lst.indexOf(it), alvo = lst[i + delta]; if (!alvo) return false;
    var a = estado.itens.indexOf(it), b = estado.itens.indexOf(alvo);
    estado.itens[a] = alvo; estado.itens[b] = it; salva(); renderGrade(); return true;
  }
  function moveAte(id, idAlvo) {
    var it = item(id), alvo = item(idAlvo); if (!it || !alvo || it === alvo || it.frente !== alvo.frente) return;
    var lst = visiveis(it.frente, atualSub), de = lst.indexOf(it), para = lst.indexOf(alvo);
    estado.itens.splice(estado.itens.indexOf(it), 1);
    var pos = estado.itens.indexOf(alvo); estado.itens.splice(de < para ? pos + 1 : pos, 0, it);
    salva(); renderGrade(); toast('Ordem salva.');
  }

  $('#grade').addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao]'); if (!b) return;
    var li = b.closest('.ap'); if (!li) return;
    var it = item(li.dataset.id), a = b.dataset.acao; if (!it) return;
    var d = b.closest('details'); if (d) d.open = false;
    if (a === 'abrir') abreVisor(it);
    else if (a === 'pdf') baixaPdf(it);
    else if (a === 'ppt') baixaPptx(it);
    else if (!pode(it.frente)) return;
    else if (a === 'renomear') { renomeando = it.id; $('#dn-tit').value = it.titulo; $('#dlg-nome').showModal(); $('#dn-tit').select(); }
    else if (a === 'substituir') { trocando = it.id; $('#dt-msg').textContent = 'Nova versão de "' + it.titulo + '".'; $('#dlg-troca').showModal(); $('#dt-sim').focus(); }
    else if (a === 'sub') {
      it.sub = b.dataset.sub || null; salva(); render();
      toast(it.sub ? '"' + it.titulo + '" foi para ' + subNome(it.frente, it.sub) + '.' : '"' + it.titulo + '" ficou sem subárea.');
    }
    else if (a === 'antes' || a === 'depois') { if (move(it.id, a === 'antes' ? -1 : 1)) { toast('Ordem salva.'); var c = $('.ap[data-id="' + it.id + '"]'); if (c) c.focus(); } }
    else if (a === 'excluir') confirma('Excluir apresentação', 'Excluir "' + it.titulo + '" de ' + frente(it.frente).curto + '? Os arquivos saem deste navegador e não dá para desfazer.', 'Excluir', function () {
      estado.itens.splice(estado.itens.indexOf(it), 1); salva(); apagaArquivosDe(it); render(); toast('Apresentação excluída.');
    });
  });
  $('#grade').addEventListener('keydown', function (e) {
    var li = e.target.classList && e.target.classList.contains('ap') ? e.target : null; if (!li) return;
    if (e.altKey && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
      e.preventDefault(); var id = li.dataset.id;
      if (move(id, /Left|Up/.test(e.key) ? -1 : 1)) { var c = $('.ap[data-id="' + id + '"]'); if (c) { c.style.animation = 'none'; c.style.opacity = 1; c.style.transform = 'none'; c.focus(); } toast('Ordem salva.'); }
    } else if (e.key === 'Enter' && e.target === li) { var it = item(li.dataset.id); if (it) abreVisor(it); }
  });
  document.addEventListener('click', function (e) { $$('details.menu[open]').forEach(function (d) { if (!d.contains(e.target)) d.open = false; }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $$('details.menu[open]').forEach(function (d) { d.open = false; var s = $('summary', d); if (s) s.focus(); }); });

  /* arrastar cartões (ordem) e arrastar arquivos (adicionar) */
  var arrastado = null;
  $('#grade').addEventListener('dragstart', function (e) {
    var li = e.target.closest && e.target.closest('.ap'); if (!li || !pode(atual)) return;
    arrastado = li.dataset.id; li.classList.add('arrastando');
    e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', arrastado); } catch (er) {}
  });
  $('#grade').addEventListener('dragover', function (e) {
    if (!arrastado) return; var li = e.target.closest('.ap'); if (!li) return;
    e.preventDefault(); $$('.ap.alvo').forEach(function (x) { if (x !== li) x.classList.remove('alvo'); }); if (li.dataset.id !== arrastado) li.classList.add('alvo');
  });
  $('#grade').addEventListener('drop', function (e) {
    if (!arrastado) return; var li = e.target.closest('.ap'); e.preventDefault(); e.stopPropagation();
    var de = arrastado; arrastado = null; if (li) moveAte(de, li.dataset.id);
  });
  $('#grade').addEventListener('dragend', function () { arrastado = null; $$('.ap').forEach(function (x) { x.classList.remove('arrastando', 'alvo'); }); });
  var zona = $('#zona'), contaZona = 0;
  function temArquivos(e) { return e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
  zona.addEventListener('dragenter', function (e) { if (arrastado || !temArquivos(e) || !pode(atual)) return; contaZona++; zona.classList.add('ativa'); });
  zona.addEventListener('dragleave', function () { if (contaZona > 0 && --contaZona === 0) zona.classList.remove('ativa'); });
  zona.addEventListener('dragover', function (e) { if (!arrastado && temArquivos(e) && pode(atual)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  zona.addEventListener('drop', function (e) {
    if (arrastado || !temArquivos(e)) return; e.preventDefault(); contaZona = 0; zona.classList.remove('ativa');
    if (pode(atual)) adiciona(e.dataTransfer.files);
  });
  window.addEventListener('dragover', function (e) { if (temArquivos(e)) e.preventDefault(); });
  window.addEventListener('drop', function (e) { if (temArquivos(e)) e.preventDefault(); });

  $('#bt-add').addEventListener('click', function () { var i = $('#arq-add'); i.value = ''; i.click(); });
  $('#arq-add').addEventListener('change', function (e) { if (e.target.files.length) adiciona(e.target.files); });
  $('#busca').addEventListener('input', function (e) { termo = e.target.value; renderGrade(); });
  $('#bt-restaurar').addEventListener('click', function () {
    confirma('Restaurar exemplos', 'Apagar tudo o que foi subido ou mudado neste navegador, em todas as áreas, e voltar às apresentações de exemplo?', 'Restaurar', function () {
      PAG = {}; MINI = {}; idbLimpa().then(function () { estado = exemplos(); salva(); atualSub = null; if (location.hash !== '#/' + atual) location.hash = '#/' + atual; else render(); toast('Exemplos restaurados.'); });
    });
  });

  /* ---------------- editar subáreas ---------------- */
  var removidas = [];
  function linhaSub(s) {
    var n = s.id ? visiveis(atual, s.id).length : 0;
    return '<li data-id="' + (s.id || '') + '"><span class="n"></span><input type="text" maxlength="60" value="' + esc(s.nome) + '" aria-label="Nome da subárea" placeholder="Nome da subárea">' +
      '<small>' + (s.id ? n + (n === 1 ? ' apresentação' : ' apresentações') : 'nova') + '</small>' +
      '<button type="button" data-rem aria-label="Remover subárea"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></li>';
  }
  function numeraSubs() { $$('#ds-lista li').forEach(function (li, i) { $('.n', li).textContent = dois(i + 1); }); $('#ds-add').disabled = $$('#ds-lista li').length >= MAX_SUBS; }
  $('#bt-subs').addEventListener('click', function () {
    if (!pode(atual)) return;
    removidas = [];
    $('#ds-frente').textContent = frente(atual).curto;
    $('#ds-lista').innerHTML = subsDe(atual).map(linhaSub).join('');
    numeraSubs(); $('#dlg-subs').showModal();
    var p = $('#ds-lista input'); if (p) p.focus();
  });
  $('#ds-add').addEventListener('click', function () {
    if ($$('#ds-lista li').length >= MAX_SUBS) { toast('Até ' + MAX_SUBS + ' subáreas por área.'); return; }
    $('#ds-lista').insertAdjacentHTML('beforeend', linhaSub({ id: '', nome: '' })); numeraSubs();
    var ins = $$('#ds-lista input'); ins[ins.length - 1].focus();
  });
  $('#ds-lista').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rem]'); if (!b) return;
    var li = b.closest('li'); if (li.dataset.id) removidas.push(li.dataset.id);
    li.remove(); numeraSubs();
  });
  $('#ds-nao').addEventListener('click', function () { $('#dlg-subs').close(); });
  $('#form-subs').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = frente(atual), velhas = subsDe(f.id), nova = [], seq = 1;
    $$('#ds-lista li').forEach(function (li) {
      var nome = $('input', li).value.trim().slice(0, 60), id = li.dataset.id;
      if (id) { if (!nome) nome = subNome(f.id, id); nova.push({ id: id, nome: nome }); }
      else if (nome) {
        while (velhas.concat(nova).some(function (s) { return s.id === f.id + '-n' + seq; })) seq++;
        nova.push({ id: f.id + '-n' + seq, nome: nome }); seq++;
      }
    });
    var tirados = 0;
    estado.itens.forEach(function (i) { if (i.frente === f.id && i.sub && removidas.indexOf(i.sub) >= 0) { i.sub = null; tirados++; } });
    estado.subs[f.id] = nova; salva(); $('#dlg-subs').close();
    if (atualSub && atualSub !== SEM && !subValida(f.id, atualSub)) { atualSub = null; location.hash = '#/' + f.id; }
    render();
    toast('Subáreas salvas.' + (tirados ? ' ' + tirados + (tirados === 1 ? ' apresentação ficou' : ' apresentações ficaram') + ' em "Sem subárea".' : ''), tirados ? 4200 : 2400);
  });
  window.addEventListener('hashchange', rota);

  /* ---------------- visor ---------------- */
  var vItem = null, vPags = [], vIdx = 0, vVolta = null, dicaT = null, mexeT = null;
  function abreVisor(it) {
    vItem = it; vIdx = 0; vVolta = document.activeElement;
    var f = frente(it.frente);
    $('#vs-area').textContent = f.nome; $('#vs-tit').textContent = it.titulo;
    $('#visor').hidden = false; document.body.style.overflow = 'hidden';
    $('#vs-pagina').innerHTML = '<div class="vs-sem">Carregando…</div>'; $('#vs-minis').innerHTML = ''; $('#vs-num').textContent = '';
    $('#vs-fechar').focus();
    paginasDe(it).then(function (ps) {
      if (vItem !== it) return; vPags = ps || [];
      if (!vPags.length) {
        $('#vs-pagina').innerHTML = '<div class="vs-sem">' + ICO.ppt + '<b>Sem prévia para este PowerPoint</b>No protótipo, o navegador não consegue mostrar o .pptx. Baixe o arquivo para abrir no PowerPoint, ou suba o PDF junto pelo Substituir. Na versão real, o SharePoint mostra o PowerPoint aqui mesmo.</div>';
        $('#vs-ant').disabled = $('#vs-prox').disabled = true; $('#vs-cheia').hidden = true; return;
      }
      $('#vs-cheia').hidden = false;
      $('#vs-minis').innerHTML = vPags.map(function (src, i) { return '<button class="vs-mini" type="button" data-i="' + i + '" aria-label="Página ' + (i + 1) + '"><img src="' + src + '" alt="" loading="lazy"><span>' + (i + 1) + '</span></button>'; }).join('');
      mostraPag(0); dica();
    });
  }
  function mostraPag(n) {
    vIdx = Math.max(0, Math.min(vPags.length - 1, n));
    $('#vs-pagina').innerHTML = '<img class="' + (semMov() ? '' : 'entra') + '" src="' + vPags[vIdx] + '" alt="Página ' + (vIdx + 1) + ' de ' + vPags.length + ': ' + esc(vItem.titulo) + '">';
    $('#vs-num').textContent = dois(vIdx + 1) + ' / ' + dois(vPags.length);
    $('#vs-ant').disabled = vIdx === 0; $('#vs-prox').disabled = vIdx === vPags.length - 1;
    $$('.vs-mini').forEach(function (b) { var on = +b.dataset.i === vIdx; b.setAttribute('aria-current', on); if (on && b.scrollIntoView) { var m = $('#vs-minis'), r = b.getBoundingClientRect(), rm = m.getBoundingClientRect(); if (r.left < rm.left || r.right > rm.right) m.scrollLeft += r.left - rm.left - rm.width / 2 + r.width / 2; } });
  }
  function dica() { var d = $('#vs-dica'); d.classList.add('on'); clearTimeout(dicaT); dicaT = setTimeout(function () { d.classList.remove('on'); }, 2600); }
  function emCheia() { return $('#visor').classList.contains('cheia'); }
  function entraCheia() {
    var v = $('#visor'); v.classList.add('cheia'); dica();
    if (v.requestFullscreen && !document.fullscreenElement) { try { var p = v.requestFullscreen({ navigationUI: 'hide' }); if (p && p.catch) p.catch(function () {}); } catch (er) {} }
  }
  function saiCheia() {
    $('#visor').classList.remove('cheia', 'mexe');
    if (document.fullscreenElement && document.exitFullscreen) { try { var p = document.exitFullscreen(); if (p && p.catch) p.catch(function () {}); } catch (er) {} }
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && emCheia()) $('#visor').classList.remove('cheia', 'mexe'); });
  $('#visor').addEventListener('mousemove', function () { var v = $('#visor'); if (!emCheia()) return; v.classList.add('mexe'); clearTimeout(mexeT); mexeT = setTimeout(function () { v.classList.remove('mexe'); }, 2200); });
  function fechaVisor() {
    if (emCheia()) saiCheia();
    $('#visor').hidden = true; document.body.style.overflow = ''; vItem = null; vPags = [];
    if (vVolta && vVolta.focus && document.body.contains(vVolta)) vVolta.focus();
  }
  $('#vs-fechar').addEventListener('click', fechaVisor);
  $('#vs-ant').addEventListener('click', function () { mostraPag(vIdx - 1); });
  $('#vs-prox').addEventListener('click', function () { mostraPag(vIdx + 1); });
  $('#vs-minis').addEventListener('click', function (e) { var b = e.target.closest('.vs-mini'); if (b) mostraPag(+b.dataset.i); });
  $('#vs-cheia').addEventListener('click', function () { this.blur(); entraCheia(); });
  $('#vs-pdf').addEventListener('click', function () { if (vItem) baixaPdf(vItem); });
  $('#vs-ppt').addEventListener('click', function () { if (vItem) baixaPptx(vItem); });
  document.addEventListener('keydown', function (e) {
    if ($('#visor').hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target && e.target.closest && e.target.closest('dialog[open]')) return;
    var k = e.key;
    if (k === 'Escape') { e.preventDefault(); if (emCheia()) saiCheia(); else fechaVisor(); return; }
    if (!vPags.length) return;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); mostraPag(vIdx + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); mostraPag(vIdx - 1); }
    else if (k === 'Home') { e.preventDefault(); mostraPag(0); }
    else if (k === 'End') { e.preventDefault(); mostraPag(vPags.length - 1); }
    else if (k === 'f' || k === 'F') { e.preventDefault(); if (emCheia()) saiCheia(); else entraCheia(); }
  });

  /* ---------------- início ---------------- */
  carrega();
  var s = ls(CHAVE_SESSAO); sessao = s && frente(s) ? s : null;
  abreIdb().then(function () {
    if (sessao) entra(sessao, true); else mostraLogin();
  });
})();
