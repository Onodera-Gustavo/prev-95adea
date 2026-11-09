/* M3BS - mar de particulas douradas em perspectiva 3D no hero da home.
   Canvas 2D puro (projecao manual de camera), sem dependencias externas. */
(function(){
  'use strict';
  var canvas = document.getElementById('heroCanvas');
  if(!canvas) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* boot preguicoso: se a janela abrir estreita, inicializa quando alargar */
  var mq = window.matchMedia('(min-width: 769px)');
  if(mq.matches){
    boot();
  } else if(mq.addEventListener){
    mq.addEventListener('change', function h(e){
      if(e.matches){ mq.removeEventListener('change', h); boot(); }
    });
  } else if(mq.addListener){
    mq.addListener(function h(e){
      if(e.matches){ mq.removeListener(h); boot(); }
    });
  }

  function boot(){
    var ctx = canvas.getContext('2d');
    var hero = canvas.parentElement;
    var dpr = 1, W = 0, H = 0;

    /* malha: COLS no eixo x (dimensionado pela largura), ROWS em profundidade */
    var COLS = 96, ROWS = 30, SP = 34;
    var FOCAL = 460;       /* distancia focal da projecao */
    var CAM_Z = 300;       /* recuo da camera */
    var CAM_Y = 130;       /* altura do "mar" abaixo do olhar */
    var DEPTH = ROWS * SP;
    var S_FAR = FOCAL / (DEPTH + 30 + CAM_Z);
    var xs = null, w1 = null;

    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth;
      H = hero.clientHeight;
      canvas.width = Math.round(W * dpr);   /* reseta o estado do contexto */
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgb(201,171,116)';
      /* colunas suficientes para o horizonte cobrir a largura + folga de paralaxe */
      COLS = Math.max(96, Math.ceil((W + 108) / S_FAR / SP / 2) * 2);
      xs = new Float32Array(COLS);
      w1 = new Float32Array(COLS);
      for(var i = 0; i < COLS; i++) xs[i] = (i - (COLS - 1) / 2) * SP;
    }
    resize();
    window.addEventListener('resize', resize);

    /* paralaxe suave ao mouse */
    var tx = 0, ty = 0, mx = 0, my = 0;
    hero.addEventListener('mousemove', function(e){
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - .5;
      ty = (e.clientY - r.top) / r.height - .5;
    });
    hero.addEventListener('mouseleave', function(){ tx = 0; ty = 0; });

    /* o loop so roda com o canvas visivel (display:none no mobile e fora da viewport pausam) */
    var visible = false, running = false;
    new IntersectionObserver(function(entries){
      visible = entries[entries.length - 1].isIntersecting;
      if(visible && !running){ running = true; requestAnimationFrame(frame); }
    }).observe(canvas);

    var t = 0, last = 0;

    function frame(ts){
      if(!visible){ running = false; last = 0; return; }
      requestAnimationFrame(frame);
      if(document.hidden){ last = 0; return; }
      /* delta-time: mesma velocidade em 60, 120 ou 144 Hz */
      var dt = last ? Math.min((ts - last) / 16.667, 3) : 1;
      last = ts;
      t += 0.0085 * dt;
      var k = 1 - Math.pow(0.955, dt);
      mx += (tx - mx) * k;
      my += (ty - my) * k;

      ctx.clearRect(0, 0, W, H);
      var cx = W * 0.5 - mx * 46;
      var cy = H * 0.60 - my * 26;

      /* onda 1 depende so da coluna: calcula uma vez por frame */
      var i;
      for(i = 0; i < COLS; i++) w1[i] = Math.sin(xs[i] * 0.011 + t * 1.9) * 26;

      var lastA = -1;
      for(var j = ROWS - 1; j >= 0; j--){
        var z = j * SP + 30;
        var rowAlpha = 0.62 * (1 - (z / DEPTH) * 0.85);
        var s = FOCAL / (z + CAM_Z);
        var size = Math.max(0.7, 2.4 * s);
        var wave2 = Math.cos(z * 0.013 + t * 1.4) * 22;
        for(i = 0; i < COLS; i++){
          var x = xs[i];
          var px = cx + x * s;
          if(px < -8 || px > W + 8) continue;
          var y = w1[i] + wave2 + Math.sin((x + z) * 0.006 + t) * 14;
          var py = cy + (y + CAM_Y) * s;
          if(py < -8 || py > H + 8) continue;
          /* cristas mais brilhantes que os vales */
          var crest = 0.55 + 0.45 * Math.max(0, Math.min(1, (y + 62) / 124));
          var a = rowAlpha * crest;
          if(a < 0.045) continue;
          /* alpha quantizado em 24 niveis: menos trocas de estado no rasterizador */
          var q = ((a * 24) | 0) / 24;
          if(q !== lastA){ ctx.globalAlpha = q; lastA = q; }
          ctx.fillRect(px, py, size, size);
        }
      }
      ctx.globalAlpha = 1;
    }
  }
})();
