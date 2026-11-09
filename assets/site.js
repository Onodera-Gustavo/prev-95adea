/* M3BS Advogados - comportamento compartilhado */
(function(){
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveal on scroll */
  var rvEls = document.querySelectorAll('.rv');
  if(reduce){
    rvEls.forEach(function(el){ el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    rvEls.forEach(function(el){ io.observe(el); });
  }

  /* Header shadow/compress após sair do topo (sentinela, sem scroll listener) */
  var hdr = document.querySelector('header.site');
  if(hdr){
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;pointer-events:none';
    document.body.prepend(sentinel);
    new IntersectionObserver(function(entries){
      hdr.classList.toggle('scrolled', !entries[entries.length - 1].isIntersecting);
    }).observe(sentinel);
  }

  /* Menu mobile: hambúrguer vira X, overlay com reveal escalonado */
  var btn = document.getElementById('menuBtn');
  var menu = document.getElementById('mobileMenu');
  if(btn && menu){
    btn.addEventListener('click', function(){
      var open = menu.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        menu.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* Contadores (data-count / data-from opcionais) */
  var counters = document.querySelectorAll('[data-count]');
  if(counters.length){
    if(reduce){
      counters.forEach(function(el){ el.textContent = el.getAttribute('data-count'); });
    } else {
      var cio = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(!e.isIntersecting) return;
          cio.unobserve(e.target);
          var el = e.target;
          var to = parseInt(el.getAttribute('data-count'), 10);
          var from = parseInt(el.getAttribute('data-from') || '0', 10);
          var dur = 1200, t0 = null;
          function step(ts){
            if(t0 === null) t0 = ts;
            var p = Math.min((ts - t0) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(from + (to - from) * eased));
            if(p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      }, { threshold: 0.6 });
      counters.forEach(function(el){ cio.observe(el); });
    }
  }

  /* Âncora na URL (#relacao-com-a-ans etc.): refaz a rolagem depois que fontes e imagens assentam o layout.
     Salto instantâneo de propósito: a rolagem suave do CSS pode ser cancelada pelo navegador durante o carregamento. */
  if(location.hash && location.hash.length > 1){
    window.addEventListener('load', function(){
      setTimeout(function(){
        var alvo = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if(alvo) alvo.scrollIntoView({ block: 'start', behavior: 'instant' });
      }, 350);
    });
  }

  /* Página 404 tem <base href>: links internos (#conteudo) voltariam para a home; rolar na própria página */
  if(document.querySelector('base')){
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(ev){
        var alvo = document.getElementById(a.getAttribute('href').slice(1));
        if(!alvo) return;
        ev.preventDefault();
        alvo.scrollIntoView({ block: 'start' });
        if(alvo.tabIndex < 0) alvo.tabIndex = -1;
        alvo.focus({ preventScroll: true });
      });
    });
  }

  /* Formulários sem destino ainda: validação no navegador e mensagem no lugar do envio (nada sai do site) */
  document.querySelectorAll('form.js-form').forEach(function(form){
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var msg = form.querySelector('.form-msg');
      var hp = form.querySelector('.hp input');
      if(hp && hp.value){ return; } /* campo armadilha preenchido: robô */
      if(!form.checkValidity()){
        form.reportValidity();
        if(msg) msg.textContent = 'Confira os campos destacados antes de enviar.';
        return;
      }
      if(msg) msg.textContent = 'Formulário pronto. O destino do envio ainda será configurado; por enquanto, use o e-mail ou o WhatsApp indicados ao lado.';
    });
  });

  /* Mapa do Google só com consentimento (clique) */
  document.querySelectorAll('[data-carrega-mapa]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var gate = btn.closest('.map-gate');
      if(!gate) return;
      var f = document.createElement('iframe');
      f.src = gate.getAttribute('data-src');
      f.title = 'Mapa da sede do M3BS na Avenida Paulista, 854';
      f.loading = 'lazy';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.setAttribute('allowfullscreen', '');
      gate.replaceWith(f);
    });
  });

  /* Cookies e medição de audiência (GA4) só no domínio oficial e só com consentimento */
  var GA_ID = 'G-0187QN1XTF';
  var oficial = /(^|\.)m3bs\.com\.br$/.test(location.hostname);
  var consent = document.getElementById('consent');
  function lerEscolha(){ try { return localStorage.getItem('m3bs-cookies'); } catch(e){ return null; } }
  function gravarEscolha(v){ try { localStorage.setItem('m3bs-cookies', v); } catch(e){} }
  function ligarGA(){
    if(!oficial || window.__gaLigado) return;
    window.__gaLigado = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }
  function mostrarAviso(){ if(consent) consent.hidden = false; }
  if(consent){
    consent.querySelectorAll('[data-consent]').forEach(function(b){
      b.addEventListener('click', function(){
        var v = b.getAttribute('data-consent');
        gravarEscolha(v);
        consent.hidden = true;
        if(v === 'sim') ligarGA();
      });
    });
    document.querySelectorAll('[data-consent-abrir]').forEach(function(b){ b.addEventListener('click', mostrarAviso); });
    if(oficial){
      var escolha = lerEscolha();
      if(escolha === 'sim') ligarGA();
      else if(escolha !== 'nao') mostrarAviso();
    }
  }
})();
