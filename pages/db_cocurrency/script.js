// ...existing code...
(function () {
  // === グローバル設定（ここだけ触れば各アニメの主要パラメータを変更できます） ===
  const ANIM_CONFIG = {
    speedMultiplier: 1.0,

    hex: {
      initialCountRange: [12, 24],
      rotSpeedMin: -0.06,
      rotSpeedMax: 3,
      vxRange: [-100, 100],
      vyRange: [-100, 100],
      scaleVelRange: [0.06, 2],
      sizeRange: [28, 120],
      targetScale: 10,
      maxShapes: 220
    },

    dot: {
      spawnCountRange: [20, 50],
      sizeRange: [2, 8],
      vxRange: [-120, 120],
      vyRange: [-120, 120],
      flickerHzRange: [0.4, 1.2],
      maxDots: 600
    },

    circle: {
      spawnCountRange: [12, 20],
      initialRadiusRange: [6, 24],
      growthRange: [10, 500],
      lineWidthRange: [1, 4],
      lifeRange: [800, 4400],
      alphaRange: [0.18, 0.6],
      maxRings: 240
    },

    tree: {
      spawnCountRange: [10, 12],
      initialLengthRange: [100, 160],
      growthRange: [500, 1200],
      lengthDecay: 1,
      maxDepth: 500,
      branchProb: 1,
      splitRange: [2, 4],
      spreadDegRange: [18, 48],
      thicknessRange: [3.0, 0.6],
      thicknessDecay: 1,
      holdAfterComplete: 1200,
      maxBranches: 4800
    },

    fractal: {
      dragon: {
        orderRange: [12, 14],
        segmentLenRange: [6, 16],
        drawSpeedRange: [800, 1800]
      },
      koch: {
        orderRange: [5, 6],
        segmentLenRange: [8, 28],
        drawSpeedRange: [700, 2200]
      },
      sierpinski: {
        depthRange: [3, 6],
        drawDurationRange: [900, 2000],
        triFadeMs: 220,
        pointsPerBurstRange: [1200, 2800],
        plotPerFrame: 16
      },
      peano: {
        orderRange: [2, 3],
        segmentLenRange: [6, 18],
        drawSpeedRange: [900, 2400]
      }
    },

    bouncer: {
      spawnCountRange: [8, 18],
      lengthRange: [20, 80],
      speedRange: [140, 420],
      lineWidthRange: [1, 3],
      lifeRange: [2200, 6000],
      maxItems: 400
    },

    scheduler: {
      intervalRange: [1000, 2000],
      concurrent: 1
    }
  };

  // --- ユーティリティ ---
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function degToRad(d) { return d * Math.PI / 180; }
  function slugify(text) {
    return (text || '').toLowerCase().replace(/[\s\/\\]+/g, '-').replace(/[^a-z0-9\-]/g, '').replace(/\-+/g, '-').replace(/^\-|\-$/g, '');
  }

  // --- カラー補助 ---
  function parseRgb(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(p => parseFloat(p));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    }
    const mh = (str || '').trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (mh) {
      let hex = mh[1];
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.slice(0,2),16);
      const g = parseInt(hex.slice(2,4),16);
      const b = parseInt(hex.slice(4,6),16);
      return { r, g, b, a: 1 };
    }
    return null;
  }
  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h=0, s=0, l=(max+min)/2;
    if(max!==min){
      const d = max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h=(g-b)/d + (g<b?6:0); break;
        case g: h=(b-r)/d + 2; break;
        case b: h=(r-g)/d + 4; break;
      }
      h/=6;
    }
    return { h: h*360, s: s*100, l: l*100 };
  }

  function getBaseGrayHSL() {
    const cs = getComputedStyle(document.body).backgroundColor || '';
    const rgb = parseRgb(cs);
    let L = 95;
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      L = clamp(Math.round(hsl.l), 6, 94);
    }
    return { h: 0, s: 0, l: L };
  }

  // --- カラー補助（修正版：CSS変数/hsl/rgb/hex/色名を確実に拾う） ---
  function parseColorToHsl(str) {
    if (!str) return null;
    str = String(str).trim();
    // hsl / hsla
    let m = str.match(/hsla?\(\s*([^\)]+)\)/i);
    if (m) {
      const parts = m[1].split(/[,\/\s]+/).filter(Boolean);
      const h = parseFloat(parts[0]) || 0;
      const s = parseFloat((parts[1] || '0').toString().replace('%', '')) || 0;
      const l = parseFloat((parts[2] || '0').toString().replace('%', '')) || 0;
      return { h: ((h % 360) + 360) % 360, s: clamp(Math.round(s), 0, 100), l: clamp(Math.round(l), 0, 100) };
    }
    // rgb / rgba
    m = str.match(/rgba?\(\s*([^\)]+)\)/i);
    if (m) {
      const parts = m[1].split(',').map(p => p.trim());
      const r = parseFloat(parts[0]) || 0;
      const g = parseFloat(parts[1]) || 0;
      const b = parseFloat(parts[2]) || 0;
      const hsl = rgbToHsl(r, g, b);
      return { h: Math.round(hsl.h), s: Math.round(hsl.s), l: Math.round(hsl.l) };
    }
    // hex (#rgb or #rrggbb)
    m = str.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      let hex = m[1];
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const hsl = rgbToHsl(r, g, b);
      return { h: Math.round(hsl.h), s: Math.round(hsl.s), l: Math.round(hsl.l) };
    }
    // 色名やその他の CSS 表記を解決するため、一時要素で computedStyle を使う
    try {
      const el = document.createElement('div');
      el.style.color = str;
      el.style.display = 'none';
      document.body.appendChild(el);
      const comp = getComputedStyle(el).color;
      document.body.removeChild(el);
      if (comp) return parseColorToHsl(comp);
    } catch (e) { /* ignore */ }
    return null;
  }

  function getBaseColorHSL() {
    // まず :root の --base-color を試す（開発側で設定している想定）
    let raw = getComputedStyle(document.documentElement).getPropertyValue('--base-color') || '';
    raw = raw.trim();
    // 取得できなければページ内の代表的な要素色を試す
    if (!raw) {
      const el = document.querySelector('.home-link') || document.querySelector('header') || document.body;
      raw = getComputedStyle(el).color || '';
    }
    // 解析して HSL を得る（失敗時は控えめな緑をデフォルト）
    const parsed = parseColorToHsl(raw) || parseColorToHsl(getComputedStyle(document.body).color) || { h: 120, s: 36, l: 48 };
    // 読みやすさのため saturation / lightness を一定範囲に制限
    parsed.s = clamp(parsed.s || 36, 18, 75);
    parsed.l = clamp(parsed.l || 48, 14, 72);
    return { h: Math.round(parsed.h), s: Math.round(parsed.s), l: Math.round(parsed.l) };
  }

  // 背景色ベースのカラー取得（全描画に使う）
  // 変更：優先してランダム生成済みの window._animBgHSL / window._animBaseHSL を使う
  function getBackgroundColorHSL() {
    if (window._animBgHSL) return Object.assign({}, window._animBgHSL);
    // try computed style (supports modern hsl(...) syntax via parseColorToHsl)
    const bodyBg = document.body.style.background || getComputedStyle(document.body).backgroundColor || getComputedStyle(document.documentElement).getPropertyValue('--bg-color') || '';
    const parsed = parseColorToHsl(bodyBg) || getBaseColorHSL();
    parsed.s = clamp(parsed.s || 0, 0, 100);
    parsed.l = clamp(parsed.l || 95, 0, 100);
    return { h: Math.round(parsed.h), s: Math.round(parsed.s), l: Math.round(parsed.l) };
  }

  // アニメの描画色はベースカラー（--base-color）を優先して使うようにする
  function backgroundColorAlpha(alpha, deltaL = 0) {
    const base = window._animBaseHSL || getBaseColorHSL();
    const L = clamp(base.l + deltaL, 0, 100);
    // modern CSS hsla with slash alpha for consistent parsing
    return `hsla(${base.h} ${base.s}% ${L}% / ${alpha})`;
  }

  // ランダムな淡色（薄め）のベースカラーと背景色を決めて CSS 変数にセットする
  function pickRandomPastelColors() {
    // ベース色（線・アクセント用）: hue 任意, saturation 中〜低, lightness 中程度（目立つが柔らかい）
    const hue = Math.floor(rand(0, 360));
    const sat = Math.floor(rand(20, 56)); // 適度な彩度
    const light = Math.floor(rand(36, 56)); // 中くらいの明るさ（線の色）
    const baseHsl = { h: hue, s: sat, l: light };

    // 背景色: 同じ hue を使いつつ飽和度を低く、明度を高めにして「薄い」背景を作る
    const bgS = Math.floor(clamp(baseHsl.s * rand(0.08, 0.28), 2, 18));
    const bgL = Math.floor(rand(92, 98)); // 非常に明るい背景
    const bgHsl = { h: hue, s: bgS, l: bgL };

    return { baseHsl, bgHsl };
  }

  function setRandomThemeColors(force = false) {
    // 既に生成済みで force=false の場合は上書きしない
    if (window._animBaseHSL && window._animBgHSL && !force) return;
    const picked = pickRandomPastelColors();
    window._animBaseHSL = picked.baseHsl;
    window._animBgHSL = picked.bgHsl;

    // CSS 変数へ設定（他のスタイルがこれを参照できる）
    document.documentElement.style.setProperty('--base-color', `hsl(${picked.baseHsl.h} ${picked.baseHsl.s}% ${picked.baseHsl.l}%)`);
    document.documentElement.style.setProperty('--bg-color', `hsl(${picked.bgHsl.h} ${picked.bgHsl.s}% ${picked.bgHsl.l}%)`);
  }

  // 背景の適用を中央管理（ダーク↔ライト切替で消える問題の修正）
  function applyBodyBackground() {
    // 再入ガード（レイヤー側の onThemeChange が再度ここを呼ぶループを防ぐ）
    if (window._animThemeApplying) return;
    window._animThemeApplying = true;
    try {
      // theme のクラスに応じて body.style.background を適切に設定
      const body = document.body;
      const isDark = body.classList.contains('theme-dark');

      if (isDark) {
        // ダークでは背景を暗く、アニメ色は明るめにする
        // ベース色がある場合はその hue を使ってダーク背景を作る（またはデフォルトの黒寄せ）
        const base = window._animBaseHSL || { h: 210, s: 10, l: 8 };
        // 背景を非常に暗くする（若干色味を残す）
        const darkBg = `hsl(${base.h} ${Math.max(4, Math.floor(base.s * 0.3))}% ${Math.max(6, Math.floor(base.l * 0.12))}%)`;
        body.style.background = darkBg;
        // アニメ描画用のベースは視認性のため明度を上げたものにする（ただし彩度は控えめ）
        window._animBaseHSL = { h: base.h, s: clamp(Math.max(28, base.s), 18, 90), l: clamp(Math.max(48, base.l), 14, 90) };
        // 確認のため CSS 変数も更新
        document.documentElement.style.setProperty('--base-color', `hsl(${window._animBaseHSL.h} ${window._animBaseHSL.s}% ${window._animBaseHSL.l}%)`);
      } else {
        // ライト系（theme-tsuki 等）はベースの薄い背景を使って背景を明示設定
        if (!window._animBgHSL) {
          setRandomThemeColors(true);
        }
        const g = window._animBgHSL || getBaseGrayHSL();
        body.style.background = `hsl(${g.h} ${g.s}% ${g.l}%)`;
        // アニメ描画用のベースは既に setRandomThemeColors で設定されていることを期待
        if (!window._animBaseHSL) setRandomThemeColors(true);
        document.documentElement.style.setProperty('--bg-color', `hsl(${g.h} ${g.s}% ${g.l}%)`);
        document.documentElement.style.setProperty('--base-color', `hsl(${window._animBaseHSL.h} ${window._animBaseHSL.s}% ${window._animBaseHSL.l}%)`);
      }

      // 既存のアニメレイヤーがあればテーマ変更ハンドラを呼ぶ（toggleTheme でも行われるがここでも安全に）
      if (window._animLayers) {
        for (const l of window._animLayers) {
          if (l && typeof l.onThemeChange === 'function') {
            try { l.onThemeChange(); } catch (e) { /* ignore */ }
          }
        }
      }
    } finally {
      window._animThemeApplying = false;
    }
  }

  // --- テーマ切替 ---
  // 1. ページ読み込み時にシンタックスハイライトを適用する（enhanceCodeBlocksより先に実行）
  document.addEventListener('DOMContentLoaded', (event) => {
    // enhanceCodeBlocksの前にハイライト処理を適用
    if (typeof hljs !== 'undefined') {
      hljs.highlightAll();
    }
    
    // enhanceCodeBlocksを実行
    try { enhanceCodeBlocks(); } catch (e) { /* ignore */ }
    
    // enhanceCodeBlocks後に、新しく作成されたコード要素に再度ハイライトを適用
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('.code-content code').forEach(el => {
        hljs.highlightElement(el);
      });
    }
  });

  function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('theme-dark');
    if (isDark) {
      body.classList.remove('theme-dark');
      body.classList.add('theme-tsuki');
    } else {
      body.classList.remove('theme-tsuki');
      body.classList.add('theme-dark');
    }
    const currentTheme = body.classList.contains('theme-dark') ? 'dark' : 'tsuki';
    document.cookie = 'theme=' + currentTheme + '; path=/; max-age=31536000';

    // テーマ切替ごとにアニメ色の最適化を行う（ダークなら明るめ、ライトなら淡背景）
    if (body.classList.contains('theme-dark')) {
      // keep base hue but adapt brightness/saturation for dark theme visibility
      if (!window._animBaseHSL) setRandomThemeColors(true);
      const b = window._animBaseHSL;
      window._animBaseHSL = { h: b.h, s: clamp(Math.max(30, b.s), 18, 90), l: clamp(Math.max(48, b.l), 20, 92) };
    } else {
      // ライトへ戻る際は背景とベース色を再生成して「毎回ランダム」を実現
      setRandomThemeColors(true);
    }

    applyBodyBackground();
    if (window._animLayers) {
      for (const l of window._animLayers) {
        if (l && typeof l.onThemeChange === 'function') {
          try { l.onThemeChange(); } catch (e) { /* ignore */ }
        }
      }
    }
  }

  function loadTheme() {
    const cookies = (document.cookie || '').split(';');
    let theme = 'tsuki';
    for (let c of cookies) {
      const kv = c.trim().split('=');
      if (kv[0] === 'theme' && kv[1]) { theme = kv[1]; break; }
    }
    document.body.classList.remove('theme-tsuki', 'theme-dark');
    document.body.classList.add('theme-' + theme);
    applyBodyBackground();
  }

  // --- 表示モード切替（厳密 / 具体） ---
  function updateModeButtons() {
    const isPrecise = document.body.classList.contains('mode-precise');
    const p = document.getElementById('btn-mode-precise');
    const c = document.getElementById('btn-mode-concrete');
    const pm = document.getElementById('btn-mode-precise-mobile');
    const cm = document.getElementById('btn-mode-concrete-mobile');
    if (p) p.classList.toggle('active', isPrecise);
    if (c) c.classList.toggle('active', !isPrecise);
    if (pm) pm.classList.toggle('active', isPrecise);
    if (cm) cm.classList.toggle('active', !isPrecise);
  }

  function setMode(mode) {
    const body = document.body;
    if (mode === 'precise') {
      body.classList.add('mode-precise');
      body.classList.remove('mode-concrete');
    } else {
      body.classList.remove('mode-precise');
      body.classList.add('mode-concrete');
    }
    try { localStorage.setItem('articleMode', mode); } catch (e) {}
    updateModeButtons();
  }

  function toggleMode() {
    const isPrecise = document.body.classList.contains('mode-precise');
    setMode(isPrecise ? 'concrete' : 'precise');
  }

  function loadMode() {
    let mode = 'concrete';
    try {
      const saved = localStorage.getItem('articleMode');
      if (saved === 'precise' || saved === 'concrete') mode = saved;
    } catch (e) {}
    setMode(mode);
  }

  // --- DOM 補助（既存） ---
  function splitContentToSections() {
    const wrapper = document.getElementById('content-wrapper');
    if (!wrapper) return;
    if (wrapper.querySelector('.container-section')) return;
    const nodes = Array.from(wrapper.childNodes);
    const container = document.createDocumentFragment();
    let section = null;
    function startNewSection(withHeadingNode) {
      section = document.createElement('section');
      section.className = 'container-section';
      if (withHeadingNode) section.appendChild(withHeadingNode);
      container.appendChild(section);
    }
    for (const node of nodes) {
      if (node.nodeType === Node.ELEMENT_NODE && /^H[23]$/.test(node.tagName)) {
        startNewSection(node.cloneNode(true));
      } else {
        if (!section) startNewSection();
        section.appendChild(node.cloneNode(true));
      }
    }
    wrapper.innerHTML = '';
    wrapper.appendChild(container);
  }

  function buildTocFromHeadings() {
    const tocEl = document.querySelector('.toc');
    const wrapper = document.getElementById('content-wrapper');
    if (!tocEl || !wrapper) return;
    if (tocEl.querySelector('ul') && tocEl.querySelector('ul').children.length > 0) return;
    const headings = wrapper.querySelectorAll('h2, h3');
    if (headings.length === 0) return;
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    headings.forEach(h => {
      let id = h.id;
      if (!id) {
        id = slugify(h.textContent || 'section');
        let attempt = 1;
        const base = id;
        while (document.getElementById(id)) { id = base + '-' + (attempt++); }
        h.id = id;
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + id;
      a.textContent = h.textContent.trim();
      a.style.textDecoration = 'none';
      a.style.color = 'inherit';
      li.appendChild(a);
      ul.appendChild(li);
    });
    tocEl.innerHTML = '';
    tocEl.appendChild(ul);
  }

  // === 六角形アウトラインアニメクラス ===
  class HexOutlineManager {
    constructor() {
      this.cfg = ANIM_CONFIG.hex;
      this.speedMul = ANIM_CONFIG.speedMultiplier;

      const old = document.getElementById('background-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'background-canvas';
      Object.assign(this.canvas.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        zIndex: '-2', pointerEvents: 'none'
      });
      document.body.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.shapes = [];
      this.time = performance.now();
      this.active = true;

      this.resize();
      window.addEventListener('resize', () => this.resize());

      this.spawnInitialShapes();
      this.loop();
    }

    onThemeChange() { applyBodyBackground(); }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    spawnInitialShapes() {
      const n = randInt(this.cfg.initialCountRange[0], this.cfg.initialCountRange[1]);
      for (let i = 0; i < n && this.shapes.length < this.cfg.maxShapes; i++) {
        this.shapes.push(this.createShape());
      }
    }

    createShape() {
      const size = rand(this.cfg.sizeRange[0], this.cfg.sizeRange[1]);
      const x = rand(size, this.w - size);
      const y = rand(size, this.h - size);
      const angle = rand(0, Math.PI * 2);
      const rotSpeed = rand(this.cfg.rotSpeedMin, this.cfg.rotSpeedMax) * this.speedMul;
      const vx = rand(this.cfg.vxRange[0], this.cfg.vxRange[1]) * this.speedMul;
      const vy = rand(this.cfg.vyRange[0], this.cfg.vyRange[1]) * this.speedMul;
      const scaleVel = rand(this.cfg.scaleVelRange[0], this.cfg.scaleVelRange[1]) * this.speedMul;

      return {
        x, y, size, angle, rotSpeed, vx, vy,
        scale: 0.01,
        scaleVel,
        state: 'opening',
        created: performance.now(),
        alpha: 0.28 * (0.7 + Math.random() * 0.6)
      };
    }

    triggerBurst() { this.activate(); }

    activate() {
      if (this.active) return;
      this.active = true;
      this.spawnInitialShapes();
    }

    deactivate() {
      this.active = false;
      this.shapes.length = 0;
      if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0);
    }

    update(dt) {
      if (!this.active) return;
      for (let i = 0; i < this.shapes.length; i++) {
        const s = this.shapes[i];
        s.angle += s.rotSpeed * dt * 0.001;
        s.x += s.vx * dt * 0.001;
        s.y += s.vy * dt * 0.001;
        s.scale += s.scaleVel * dt * 0.001;
        if (s.scale < 0.01) s.scale = 0.01;
      }
    }

    drawHexPath(ctx, cx, cy, r, angle) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = angle + i * Math.PI * 2 / 6;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      for (const s of this.shapes) {
        const alpha = Math.max(0.05, Math.min(0.95, s.alpha || 0.6));
        this.ctx.save();
        this.ctx.translate(s.x, s.y);
        this.ctx.rotate(s.angle);
        const r = s.size * 0.9 * (s.scale || 1);
        this.ctx.lineWidth = Math.max(1, 2.2 * (s.scale || 1));
        this.ctx.strokeStyle = backgroundColorAlpha(alpha, -12);
        this.drawHexPath(this.ctx, 0, 0, r, 0);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    loop() {
      const now = performance.now();
      const dt = now - this.time;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      const c = document.getElementById('background-canvas');
      if (c && c.parentNode) c.parentNode.removeChild(c);
    }
  }

  // === 点（Dot）アニメクラス ===
  class DotManager {
    constructor() {
      this.cfg = ANIM_CONFIG.dot;
      this.speedMul = ANIM_CONFIG.speedMultiplier;

      const old = document.getElementById('dot-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'dot-canvas';
      Object.assign(this.canvas.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        zIndex: '-1', pointerEvents: 'none'
      });
      document.body.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.dots = [];
      this.time = performance.now();
      this.active = false;

      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() { applyBodyBackground(); }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    triggerBurst() {
      this.activate();
      const count = randInt(this.cfg.spawnCountRange[0], this.cfg.spawnCountRange[1]);
      for (let i = 0; i < count; i++) {
        if (this.dots.length >= this.cfg.maxDots) break;
        const size = rand(this.cfg.sizeRange[0], this.cfg.sizeRange[1]);
        const x = rand(0, this.w);
        const y = rand(0, this.h);
        const vx = rand(this.cfg.vxRange[0], this.cfg.vxRange[1]) * this.speedMul;
        const vy = rand(this.cfg.vyRange[0], this.cfg.vyRange[1]) * this.speedMul;
        const flickerHz = rand(this.cfg.flickerHzRange[0], this.cfg.flickerHzRange[1]);
        const dot = { x, y, vx, vy, size, created: performance.now(), flickerHz, baseAlpha: rand(0.4, 0.9) };
        this.dots.push(dot);
      }
    }

    activate() { this.active = true; }
    deactivate() {
      this.active = false;
      this.dots.length = 0;
      if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0);
    }

    update(dt) {
      if (!this.active) return;
      const now = performance.now();
      for (let i = this.dots.length - 1; i >= 0; i--) {
        const d = this.dots[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const age = (now - d.created) / 1000;
        const flicker = 0.6 + 0.4 * Math.sin(2 * Math.PI * d.flickerHz * age + d.size);
        d.alpha = clamp(d.baseAlpha * flicker, 0.08, 1.0);
      }
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      for (const d of this.dots) {
        this.ctx.beginPath();
        this.ctx.fillStyle = backgroundColorAlpha(d.alpha || 0.6, -12);
        this.ctx.arc(d.x, d.y, Math.max(0.5, d.size * (d.alpha || 1)), 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      const c = document.getElementById('dot-canvas');
      if (c && c.parentNode) c.parentNode.removeChild(c);
    }
  }

  // === 円枠（Ring）アニメクラス ===
  class CircleOutlineManager {
    constructor() {
      this.cfg = ANIM_CONFIG.circle;
      this.speedMul = ANIM_CONFIG.speedMultiplier;

      const old = document.getElementById('ring-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'ring-canvas';
      Object.assign(this.canvas.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        zIndex: '-1', pointerEvents: 'none'
      });
      document.body.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.rings = [];
      this.time = performance.now();
      this.active = false;

      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() { applyBodyBackground(); }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    triggerBurst() {
      this.activate();
      const count = randInt(this.cfg.spawnCountRange[0], this.cfg.spawnCountRange[1]);
      for (let i = 0; i < count; i++) {
        if (this.rings.length >= this.cfg.maxRings) break;
        const r0 = rand(this.cfg.initialRadiusRange[0], this.cfg.initialRadiusRange[1]);
        const x = rand(0, this.w);
        const y = rand(0, this.h);
        const growth = rand(this.cfg.growthRange[0], this.cfg.growthRange[1]) * this.speedMul;
        const lineWidth = rand(this.cfg.lineWidthRange[0], this.cfg.lineWidthRange[1]);
        const life = randInt(this.cfg.lifeRange[0], this.cfg.lifeRange[1]);
        const alpha = rand(this.cfg.alphaRange[0], this.cfg.alphaRange[1]);
        const ring = { x, y, r: r0, growth, lineWidth, life, created: performance.now(), alphaStart: alpha };
        this.rings.push(ring);
      }
    }

    activate() { this.active = true; }
    deactivate() {
      this.active = false;
      this.rings.length = 0;
      if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0);
    }

    update(dt) {
      if (!this.active) return;
      const now = performance.now();
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const R = this.rings[i];
        R.r += R.growth * dt;
        const age = now - R.created;
        const t = clamp(age / R.life, 0, 1);
        R.alpha = R.alphaStart * (1 - t);
        if (age >= R.life) this.rings.splice(i, 1);
      }
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      for (const R of this.rings) {
        this.ctx.save();
        this.ctx.globalAlpha = clamp(R.alpha, 0, 1);
        this.ctx.lineWidth = Math.max(0.5, R.lineWidth);
        this.ctx.strokeStyle = backgroundColorAlpha(1.0, -12);
        this.ctx.beginPath();
        this.ctx.arc(R.x, R.y, Math.max(0.5, R.r), 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      const c = document.getElementById('ring-canvas');
      if (c && c.parentNode) c.parentNode.removeChild(c);
    }
  }

  // === 木（Tree）アニメクラス ===
  class TreeManager {
    constructor() {
      this.cfg = ANIM_CONFIG.tree;
      this.speedMul = ANIM_CONFIG.speedMultiplier;

      const old = document.getElementById('tree-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'tree-canvas';
      Object.assign(this.canvas.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        zIndex: '-1', pointerEvents: 'none'
      });
      document.body.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.branches = [];
      this.time = performance.now();
      this.active = false;

      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() { applyBodyBackground(); }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    _ensureSpace(needCount) {
      const max = this.cfg.maxBranches;
      while (this.branches.length + needCount > max) this.branches.shift();
    }

    triggerBurst() {
      this.activate();
      const n = randInt(this.cfg.spawnCountRange[0], this.cfg.spawnCountRange[1]);
      this._ensureSpace(n);
      for (let i = 0; i < n; i++) {
        if (this.branches.length >= this.cfg.maxBranches) break;
        const x = rand(0, this.w);
        const y = rand(0, this.h);
        const len = rand(this.cfg.initialLengthRange[0], this.cfg.initialLengthRange[1]);
        const angle = rand(0, Math.PI * 2);
        const growth = rand(this.cfg.growthRange[0], this.cfg.growthRange[1]) * this.speedMul;
        const thickness = rand(this.cfg.thicknessRange[0], this.cfg.thicknessRange[1]);
        const branch = this._createBranch(x, y, angle, len, growth, thickness, 0);
        this.branches.push(branch);
      }
      if (this.branches.length > this.cfg.maxBranches) this.branches.splice(0, this.branches.length - this.cfg.maxBranches);
    }

    activate() { this.active = true; }
    deactivate() {
      this.active = false;
      this.branches.length = 0;
      if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0);
    }

    _createBranch(x, y, angle, targetLength, growth, thickness, depth) {
      return { x, y, angle, targetLength, currentLength: 0, growth, thickness, depth, childrenSpawned: false, finished: false, finishedAt: null, created: performance.now() };
    }

    update(dt) {
      if (!this.active) return;
      const now = performance.now();
      for (let i = this.branches.length - 1; i >= 0; i--) {
        const b = this.branches[i];
        if (!b.finished) {
          b.currentLength += b.growth * dt;
          if (b.currentLength >= b.targetLength) { b.currentLength = b.targetLength; b.finished = true; b.finishedAt = now; }
        } else if (b.finished && b.childrenSpawned === false) {
          if (b.depth < this.cfg.maxDepth && Math.random() < this.cfg.branchProb) {
            const splits = randInt(this.cfg.splitRange[0], this.cfg.splitRange[1]);
            this._ensureSpace(splits);
            for (let s = 0; s < splits; s++) {
              if (this.branches.length >= this.cfg.maxBranches) break;
              const endX = b.x + Math.cos(b.angle) * b.targetLength;
              const endY = b.y + Math.sin(b.angle) * b.targetLength;
              const spread = rand(this.cfg.spreadDegRange[0], this.cfg.spreadDegRange[1]);
              const sign = Math.random() < 0.5 ? -1 : 1;
              const childAngle = b.angle + degToRad(spread * sign * rand(0.4, 1.0));
              const childLen = b.targetLength;
              const childGrowth = rand(this.cfg.growthRange[0], this.cfg.growthRange[1]) * this.speedMul;
              const childThickness = b.thickness;
              const child = this._createBranch(endX, endY, childAngle, childLen, childGrowth, childThickness, b.depth + 1);
              this.branches.push(child);
            }
          }
          b.childrenSpawned = true;
        } else if (b.finished && b.finishedAt) {
          if (now - b.finishedAt > this.cfg.holdAfterComplete) this.branches.splice(i, 1);
        }
      }
      if (this.branches.length > this.cfg.maxBranches) this.branches.splice(0, this.branches.length - this.cfg.maxBranches);
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      for (const b of this.branches) {
        const len = Math.max(0.5, b.currentLength);
        const ex = b.x + Math.cos(b.angle) * len;
        const ey = b.y + Math.sin(b.angle) * len;
        this.ctx.save();
        const depthFade = 1 - clamp(b.depth / (this.cfg.maxDepth + 1), 0, 0.9);
        this.ctx.globalAlpha = depthFade * 1.0;
        this.ctx.lineWidth = Math.max(0.3, b.thickness);
        this.ctx.strokeStyle = backgroundColorAlpha(1.0, -12);
        this.ctx.beginPath();
        this.ctx.moveTo(b.x, b.y);
        this.ctx.lineTo(ex, ey);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() { if (this.raf) cancelAnimationFrame(this.raf); const c = document.getElementById('tree-canvas'); if (c && c.parentNode) c.parentNode.removeChild(c); }
  }

  // === フラクタル / カーブ系アニメクラス群 ===

  class DragonCurveAnimator {
    constructor() {
      this.cfg = ANIM_CONFIG.fractal.dragon;
      const old = document.getElementById('dragon-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'dragon-canvas';
      Object.assign(this.canvas.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', zIndex: '-1', pointerEvents: 'none' });
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.time = performance.now();
      this.active = false;
      this.progress = 0;
      this.turns = [];
      this.points = [];
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() { applyBodyBackground(); }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    _generateTurns(order) {
      let seq = [];
      for (let i = 0; i < order; i++) {
        const rev = seq.slice().reverse().map(t => !t);
        seq = seq.concat([true], rev);
      }
      return seq;
    }

    triggerBurst() {
      this.activate();
      const order = randInt(this.cfg.orderRange[0], this.cfg.orderRange[1]);
      const segLen = rand(this.cfg.segmentLenRange[0], this.cfg.segmentLenRange[1]);
      const totalMs = randInt(this.cfg.drawSpeedRange[0], this.cfg.drawSpeedRange[1]);
      this.turns = this._generateTurns(order);
      const cx = this.w * rand(0.25, 0.75), cy = this.h * rand(0.25, 0.75);
      let angle = rand(0, Math.PI * 2);
      let x = cx, y = cy;
      this.points = [{ x, y }];
      for (let t of this.turns) {
        x += Math.cos(angle) * segLen;
        y += Math.sin(angle) * segLen;
        this.points.push({ x, y });
        angle += t ? Math.PI / 2 : -Math.PI / 2;
      }
      this.startTime = performance.now();
      this.duration = Math.max(200, totalMs);
      this.progress = 0;
    }

    activate() { this.active = true; }
    deactivate() { this.active = false; this.points = []; if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0); }

    update(dt) {
      if (!this.active || this.points.length === 0) return;
      const now = performance.now();
      const t = clamp((now - this.startTime) / this.duration, 0, 1);
      this.progress = t;
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      if (this.points.length < 2) return;
      const upto = Math.floor(this.points.length * this.progress);
      this.ctx.lineWidth = 1.2;
      this.ctx.strokeStyle = backgroundColorAlpha(0.95, -12);
      this.ctx.beginPath();
      this.ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i <= upto && i < this.points.length; i++) {
        this.ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      this.ctx.stroke();
      if (upto < this.points.length - 1) {
        this.ctx.globalAlpha = 0.6;
        this.ctx.beginPath();
        this.ctx.moveTo(this.points[upto].x, this.points[upto].y);
        this.ctx.lineTo(this.points[upto + 1].x, this.points[upto + 1].y);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
      }
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() { if (this.raf) cancelAnimationFrame(this.raf); const c = document.getElementById('dragon-canvas'); if (c && c.parentNode) c.parentNode.removeChild(c); }
  }

  class KochCurveAnimator {
    constructor() {
      this.cfg = ANIM_CONFIG.fractal.koch;
      const old = document.getElementById('koch-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'koch-canvas';
      Object.assign(this.canvas.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', zIndex: '-1', pointerEvents: 'none' });
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.time = performance.now();
      this.active = false;
      this.path = [];
      this.progress = 0;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() { applyBodyBackground(); }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    _koch(a, b, order, out) {
      if (order === 0) { out.push(a); return; }
      const dx = (b.x - a.x) / 3;
      const dy = (b.y - a.y) / 3;
      const p1 = { x: a.x + dx, y: a.y + dy };
      const p3 = { x: a.x + 2 * dx, y: a.y + 2 * dy };
      const ux = p3.x - p1.x;
      const uy = p3.y - p1.y;
      const p2 = { x: p1.x + (ux * Math.cos(Math.PI/3) - uy * Math.sin(Math.PI/3)), y: p1.y + (ux * Math.sin(Math.PI/3) + uy * Math.cos(Math.PI/3)) };
      this._koch(a, p1, order - 1, out);
      this._koch(p1, p2, order - 1, out);
      this._koch(p2, p3, order - 1, out);
      this._koch(p3, b, order - 1, out);
    }

    triggerBurst() {
      this.activate();
      const order = randInt(this.cfg.orderRange[0], this.cfg.orderRange[1]);
      const segLen = rand(this.cfg.segmentLenRange[0], this.cfg.segmentLenRange[1]);
      const totalMs = randInt(this.cfg.drawSpeedRange[0], this.cfg.drawSpeedRange[1]);
      const margin = 40;
      const a = { x: margin, y: this.h * rand(0.25, 0.75) };
      const b = { x: this.w - margin, y: a.y };
      const pts = [];
      this._koch(a, b, order, pts);
      pts.push(b);
      this.path = pts;
      this.startTime = performance.now();
      this.duration = Math.max(200, totalMs);
      this.progress = 0;
    }

    activate() { this.active = true; }
    deactivate() { this.active = false; this.path = []; if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0); }

    update(dt) {
      if (!this.active || this.path.length === 0) return;
      const now = performance.now();
      const t = clamp((now - this.startTime) / this.duration, 0, 1);
      this.progress = t;
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      if (this.path.length < 2) return;
      const upto = Math.floor(this.path.length * this.progress);
      this.ctx.lineWidth = 1.4;
      this.ctx.strokeStyle = backgroundColorAlpha(0.95, -12);
      this.ctx.beginPath();
      this.ctx.moveTo(this.path[0].x, this.path[0].y);
      for (let i = 1; i <= upto && i < this.path.length; i++) {
        this.ctx.lineTo(this.path[i].x, this.path[i].y);
      }
      this.ctx.stroke();
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() { if (this.raf) cancelAnimationFrame(this.raf); const c = document.getElementById('koch-canvas'); if (c && c.parentNode) c.parentNode.removeChild(c); }
  }

  // シェルピンスキー（親→子・子順はランダム）
  class SierpinskiAnimator {
    constructor() {
      this.cfg = ANIM_CONFIG.fractal.sierpinski;
      const old = document.getElementById('sierpinski-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'sierpinski-canvas';
      Object.assign(this.canvas.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', zIndex: '-1', pointerEvents: 'none' });
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.time = performance.now();
      this.active = false;
      this.triangles = [];
      this.startTime = 0;
      this.duration = 0;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() { applyBodyBackground(); }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    _subdivide(A, B, C, depth, maxDepth, out) {
      out.push({ A, B, C, depth });
      if (depth >= maxDepth) return;
      const AB = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const BC = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
      const CA = { x: (C.x + A.x) / 2, y: (C.y + A.y) / 2 };
      const children = [
        { A: A,  B: AB, C: CA },
        { A: AB, B: B,  C: BC },
        { A: CA, B: BC, C: C  }
      ];
      // ランダム順序化
      for (let i = children.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = children[i]; children[i] = children[j]; children[j] = tmp;
      }
      for (const ch of children) this._subdivide(ch.A, ch.B, ch.C, depth + 1, maxDepth, out);
    }

    triggerBurst() {
      this.activate();
      this.triangles.length = 0;
      const maxDepth = randInt(this.cfg.depthRange[0], this.cfg.depthRange[1]);
      const margin = 28;
      const A = { x: this.w / 2, y: margin };
      const B = { x: margin, y: this.h - margin };
      const C = { x: this.w - margin, y: this.h - margin };
      const items = [];
      this._subdivide(A, B, C, 0, maxDepth, items);
      const total = items.length || 1;
      this.duration = randInt(this.cfg.drawDurationRange[0], this.cfg.drawDurationRange[1]);
      const per = Math.max(12, Math.floor(this.duration / total));
      const fade = this.cfg.triFadeMs || Math.max(80, per * 0.9);
      const now = performance.now();
      items.forEach((t, idx) => {
        this.triangles.push({ A: t.A, B: t.B, C: t.C, depth: t.depth, start: now + idx * per, fade: fade, alpha: 0 });
      });
      this.startTime = now;
    }

    activate() { this.active = true; }
    deactivate() { this.active = false; this.triangles.length = 0; if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0); }

    update(dt) {
      if (!this.active || this.triangles.length === 0) return;
      const now = performance.now();
      let anyActive = false;
      for (const t of this.triangles) {
        const local = (now - t.start) / t.fade;
        const cl = clamp(local, 0, 1);
        const eased = cl < 0.5 ? 2 * cl * cl : -1 + (4 - 2 * cl) * cl;
        t.alpha = eased;
        if (now >= t.start && cl < 1) anyActive = true;
        if (now < t.start) anyActive = true;
      }
    }

    drawTrianglePath(t) {
      this.ctx.beginPath();
      this.ctx.moveTo(t.A.x, t.A.y);
      this.ctx.lineTo(t.B.x, t.B.y);
      this.ctx.lineTo(t.C.x, t.C.y);
      this.ctx.closePath();
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.triangles.sort((a, b) => a.depth - b.depth);
      for (const t of this.triangles) {
        if (!t.alpha || t.alpha <= 0) continue;
        this.ctx.save();
        this.ctx.globalAlpha = clamp(0.12 * t.alpha, 0, 0.45);
        this.ctx.fillStyle = backgroundColorAlpha(1.0, -10);
        this.drawTrianglePath(t);
        this.ctx.fill();
        this.ctx.globalAlpha = clamp(0.95 * t.alpha, 0, 1.0);
        this.ctx.lineWidth = Math.max(0.6, 1.0 - t.depth * 0.02);
        this.ctx.strokeStyle = backgroundColorAlpha(1.0, -12);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() { if (this.raf) cancelAnimationFrame(this.raf); const c = document.getElementById('sierpinski-canvas'); if (c && c.parentNode) c.parentNode.removeChild(c); }
  }

  class PeanoCurveAnimator {
    constructor() {
      this.cfg = ANIM_CONFIG.fractal.peano;
      const old = document.getElementById('peano-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'peano-canvas';
      Object.assign(this.canvas.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', zIndex: '-1', pointerEvents: 'none' });
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.time = performance.now();
      this.active = false;
      this.points = [];
      this.pointsRight = [];
      this.progress = 0;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() { applyBodyBackground(); }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    _peanoRecursive(x, y, size, order, out, pattern = [
      [0,0],[0,1],[0,2],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2]
    ]) {
      if (order === 0) { out.push({ x: x + size/2, y: y + size/2 }); return; }
      const sub = size / 3;
      for (let p of pattern) {
        const nx = x + p[0] * sub;
        const ny = y + p[1] * sub;
        this._peanoRecursive(nx, ny, sub, order - 1, out, pattern);
      }
    }

    triggerBurst() {
      this.activate();
      const order = randInt(this.cfg.orderRange[0], this.cfg.orderRange[1]);
      const margin = 24;
      const availableWidth = Math.max(0, this.w - margin * 3);
      const maxSizeByWidth = Math.floor(availableWidth / 2);
      const maxSizeByHeight = Math.max(0, this.h - margin * 2);
      const size = Math.max(8, Math.min(maxSizeByWidth, maxSizeByHeight));
      const leftX = margin;
      const leftY = margin;
      const rightX = margin + size + margin;
      const rightY = margin;
      const ptsLeft = [];
      const ptsRight = [];
      this._peanoRecursive(leftX, leftY, size, order, ptsLeft);
      this._peanoRecursive(rightX, rightY, size, order, ptsRight);
      this.points = ptsLeft;
      this.pointsRight = ptsRight;
      this.startTime = performance.now();
      this.duration = randInt(this.cfg.drawSpeedRange[0], this.cfg.drawSpeedRange[1]) || 1200;
      this.progress = 0;
    }

    activate() { this.active = true; }
    deactivate() { this.active = false; this.points = []; this.pointsRight = []; if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0); }

    update(dt) {
      if (!this.active || this.points.length === 0) return;
      const now = performance.now();
      const t = clamp((now - this.startTime) / this.duration, 0, 1);
      this.progress = t;
    }

    drawPathFromPoints(pts, upto) {
      if (!pts || pts.length < 1) return;
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= upto && i < pts.length; i++) this.ctx.lineTo(pts[i].x, pts[i].y);
      this.ctx.stroke();
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      const uptoL = Math.floor(this.points.length * this.progress);
      const uptoR = Math.floor(this.pointsRight.length * this.progress);
      this.ctx.lineWidth = 1.2;
      this.ctx.strokeStyle = backgroundColorAlpha(0.95, -12);
      this.drawPathFromPoints(this.points, uptoL);
      this.drawPathFromPoints(this.pointsRight, uptoR);
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() { if (this.raf) cancelAnimationFrame(this.raf); const c = document.getElementById('peano-canvas'); if (c && c.parentNode) c.parentNode.removeChild(c); }
  }

  // === ランダム射出して跳ね返る短い線分アニメ ===
  class BouncingLinesManager {
    constructor() {
      this.cfg = ANIM_CONFIG.bouncer;
      const old = document.getElementById('bouncer-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'bouncer-canvas';
      Object.assign(this.canvas.style, { position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', zIndex: '-1', pointerEvents: 'none' });
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.items = [];
      this.time = performance.now();
      this.active = false;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() { applyBodyBackground(); }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    triggerBurst() {
      this.activate();
      const n = randInt(this.cfg.spawnCountRange[0], this.cfg.spawnCountRange[1]);
      for (let i = 0; i < n; i++) {
        if (this.items.length >= this.cfg.maxItems) break;
        const len = rand(this.cfg.lengthRange[0], this.cfg.lengthRange[1]);
        const angle = rand(0, Math.PI * 2);
        const speed = rand(this.cfg.speedRange[0], this.cfg.speedRange[1]);
        const x = rand(len, this.w - len);
        const y = rand(len, this.h - len);
        const life = randInt(this.cfg.lifeRange[0], this.cfg.lifeRange[1]);
        const lw = rand(this.cfg.lineWidthRange[0], this.cfg.lineWidthRange[1]);
        this.items.push({ x, y, angle, speed, len, life, created: performance.now(), lw });
      }
      if (this.items.length > this.cfg.maxItems) this.items.splice(0, this.items.length - this.cfg.maxItems);
    }

    activate() { this.active = true; }
    deactivate() { this.active = false; this.items.length = 0; if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0); }

    update(dt) {
      if (!this.active) return;
      const now = performance.now();
      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.x += Math.cos(it.angle) * it.speed * dt;
        it.y += Math.sin(it.angle) * it.speed * dt;
        if (it.x < 0 || it.x > this.w) { it.angle = Math.PI - it.angle + rand(-0.3, 0.3); it.x = clamp(it.x, 0, this.w); }
        if (it.y < 0 || it.y > this.h) { it.angle = -it.angle + rand(-0.3, 0.3); it.y = clamp(it.y, 0, this.h); }
        if (now - it.created > it.life) { this.items.splice(i, 1); continue; }
        if (this.items.length > this.cfg.maxItems) this.items.splice(0, this.items.length - this.cfg.maxItems);
      }
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      for (const it of this.items) {
        this.ctx.save();
        this.ctx.lineWidth = Math.max(0.5, it.lw);
        this.ctx.strokeStyle = backgroundColorAlpha(0.95, -12);
        this.ctx.beginPath();
        const x2 = it.x + Math.cos(it.angle) * it.len;
        const y2 = it.y + Math.sin(it.angle) * it.len;
        this.ctx.moveTo(it.x, it.y);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    destroy() { if (this.raf) cancelAnimationFrame(this.raf); const c = document.getElementById('bouncer-canvas'); if (c && c.parentNode) c.parentNode.removeChild(c); }
  }

  // === スケジューラ ===
  class AnimationScheduler {
    constructor() {
      this.layers = [];
      this.time = performance.now();
      this.last = 0;
      this.nextInterval = rand(ANIM_CONFIG.scheduler.intervalRange[0], ANIM_CONFIG.scheduler.intervalRange[1]);
      this.running = true;
      this.loop();
    }

    register(layer) { if (layer) this.layers.push(layer); }

    deactivateAll() {
      for (const l of this.layers) {
        if (typeof l.deactivate === 'function') {
          try { l.deactivate(); } catch (e) { /* ignore */ }
        } else {
          try { if (l.dots) l.dots.length = 0; if (l.shapes) l.shapes.length = 0; if (l.rings) l.rings.length = 0; if (l.branches) l.branches.length = 0; } catch (e) {}
        }
      }
    }

    triggerRandom() {
      if (this.layers.length === 0) return;
      this.deactivateAll();
      const n = Math.max(1, ANIM_CONFIG.scheduler.concurrent);
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * this.layers.length);
        const layer = this.layers[idx];
        if (!layer) continue;
        if (typeof layer.activate === 'function') {
          try { layer.activate(); } catch (e) { /* ignore */ }
        }
        if (typeof layer.triggerBurst === 'function') {
          try { layer.triggerBurst(); } catch (e) { /* ignore */ }
        }
      }
    }

    loop() {
      if (!this.running) return;
      const now = performance.now();
      if (now - this.last >= this.nextInterval) {
        this.last = now;
        this.nextInterval = rand(ANIM_CONFIG.scheduler.intervalRange[0], ANIM_CONFIG.scheduler.intervalRange[1]);
        this.triggerRandom();
      }
      this.raf = requestAnimationFrame(() => this.loop());
    }

    stop() { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); }
  }

  // --- 初期化 ---
  function initAnimationSystem() {
    if (!window._animLayers) window._animLayers = [];

    // 先に色を決めておく（毎回ランダムな淡色）
    setRandomThemeColors(true);

    if (!window._hexManager) window._hexManager = new HexOutlineManager();
    if (!window._dotManager) window._dotManager = new DotManager();
    if (!window._ringManager) window._ringManager = new CircleOutlineManager();
    if (!window._treeManager) window._treeManager = new TreeManager();
    if (!window._dragonManager) window._dragonManager = new DragonCurveAnimator();
    if (!window._kochManager) window._kochManager = new KochCurveAnimator();
    if (!window._sierpinskiManager) window._sierpinskiManager = new SierpinskiAnimator();
    if (!window._peanoManager) window._peanoManager = new PeanoCurveAnimator();
    if (!window._bouncerManager) window._bouncerManager = new BouncingLinesManager();

    window._animLayers = [window._hexManager, window._dotManager, window._ringManager, window._treeManager, window._dragonManager, window._kochManager, window._sierpinskiManager, window._peanoManager, window._bouncerManager];

    if (!window._animScheduler) {
      window._animScheduler = new AnimationScheduler();
      for (const l of window._animLayers) window._animScheduler.register(l);
    }
  }

  // --- DOM 初期化 ---
  document.addEventListener('DOMContentLoaded', function () {
    // まず毎回ランダム色を決める（ライト側の背景／ベース色）
    setRandomThemeColors(true);
    loadTheme();
    loadMode();
    splitContentToSections();
    buildTocFromHeadings();
    window.toggleTheme = toggleTheme;
    window.loadTheme = loadTheme;
    window.initAnimationSystem = initAnimationSystem;
    // expose mode functions for onclick handlers and sync UI
    window.setMode = setMode;
    window.toggleMode = toggleMode;
    window.loadMode = loadMode;
    // ensure buttons reflect current mode
    try { updateModeButtons(); } catch (e) {}
    initAnimationSystem();
  });

})();

/* --- code block enhancement: titles, copy, line numbers, lineno start parsing --- */
function parseCodeAttrs(codeEl) {
  const attrs = {};
  // data-* attributes from pandoc (if present)
  if (codeEl.dataset) {
    if (codeEl.dataset.title) attrs.title = codeEl.dataset.title;
    if (codeEl.dataset.lineStart) attrs.lineStart = parseInt(codeEl.dataset.lineStart, 10);
    if (codeEl.dataset.linenostart) attrs.lineStart = parseInt(codeEl.dataset.linenostart, 10);
  }
  // try to parse info string encoded in className (common variants)
  const cls = (codeEl.className || '').trim();
  // examples we try to support:
  // class="language-js linenostart=5 title=Example"
  // or "language-js:linenostart=5:title=Example"
  if (cls) {
    const parts = cls.split(/\s+/);
    for (const p of parts) {
      const m = p.match(/(?:linenostart|line-start|start)=(\d+)/i);
      if (m) attrs.lineStart = parseInt(m[1], 10);
      const mt = p.match(/title=(.+)/i);
      if (mt) attrs.title = decodeURIComponent(mt[1].replace(/^["']|["']$/g, ''));
    }
    // colon-separated fallback
    const colon = cls.split(':').slice(1).join(':');
    if (colon) {
      const kvs = colon.split(':');
      for (const kv of kvs) {
        const m = kv.match(/linenostart=(\d+)/i);
        if (m) attrs.lineStart = parseInt(m[1], 10);
        const mt = kv.match(/title=(.+)/i);
        if (mt) attrs.title = decodeURIComponent(mt[1].replace(/^["']|["']$/g, ''));
      }
    }
  }
  return attrs;
}

function enhanceCodeBlocks() {
  document.querySelectorAll('pre > code').forEach(code => {
    const pre = code.parentNode;
    if (!pre || pre.classList.contains('enhanced')) return;
    pre.classList.add('enhanced');

    const attrs = parseCodeAttrs(code);
    const source = code.textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = source.split('\n');
    const start = Number.isFinite(attrs.lineStart) ? attrs.lineStart : 1;

    // wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    // header (optional)
    if (attrs.title || code.className) {
      const header = document.createElement('div');
      header.className = 'code-header';
      const left = document.createElement('div');
      left.className = 'code-title';
      left.textContent = attrs.title || (code.className || '').split(/\s+/)[0] || '';
      const right = document.createElement('div');
      right.className = 'code-meta';
      // copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy';
      copyBtn.type = 'button';
      copyBtn.textContent = 'コピー';
      copyBtn.addEventListener('click', async function () {
        try {
          await navigator.clipboard.writeText(source);
          copyBtn.textContent = 'コピー済';
          setTimeout(() => copyBtn.textContent = 'コピー', 1500);
        } catch (e) {
          // fallback for older browsers
          const ta = document.createElement('textarea');
          ta.value = source;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyBtn.textContent = 'コピー済';
          setTimeout(() => copyBtn.textContent = 'コピー', 1500);
        }
      });
      right.appendChild(copyBtn);
      header.appendChild(left);
      header.appendChild(right);
      wrapper.appendChild(header);
    }

    // code body: gutter + content
    const body = document.createElement('div');
    body.className = 'code-body';

    const gutter = document.createElement('pre');
    gutter.className = 'code-gutter';
    gutter.setAttribute('aria-hidden', 'true');
    gutter.style.whiteSpace = 'pre';
    gutter.style.overflowX = 'auto';
    const gutterLines = [];
    for (let i = 0; i < lines.length; i++) {
      gutterLines.push(String(start + i));
    }
    gutter.textContent = gutterLines.join('\n');

    const content = document.createElement('pre');
    content.className = 'code-content';
    content.style.whiteSpace = 'pre';
    content.style.overflowX = 'auto';
    // keep original classes for syntax highlighting (if any)
    const newCode = document.createElement('code');
    newCode.className = code.className || '';
    newCode.textContent = source;
    content.appendChild(newCode);

    body.appendChild(gutter);
    body.appendChild(content);
    wrapper.appendChild(body);

    // replace original pre with wrapper
    pre.parentNode.replaceChild(wrapper, pre);

    // selection handling: hide gutter while user selects or when copying selection
    function updateSelectionState() {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed) {
        wrapper.classList.remove('selection-active');
        return;
      }
      // if selection is inside wrapper -> hide gutter
      const anchor = sel.anchorNode;
      const focus = sel.focusNode;
      if (wrapper.contains(anchor) && wrapper.contains(focus)) {
        wrapper.classList.add('selection-active');
      } else {
        wrapper.classList.remove('selection-active');
      }
    }
    document.addEventListener('selectionchange', updateSelectionState);

    // keyboard copy (Ctrl/Cmd+C) inside wrapper: ensure copied text is code only
    wrapper.addEventListener('copy', function (ev) {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed) return;
      // if selection is inside this wrapper, override clipboard
      if (wrapper.contains(sel.anchorNode) && wrapper.contains(sel.focusNode)) {
        ev.preventDefault();
        const selected = sel.toString();
        // strip any numbered prefixes if user somehow selects rendered gutter+content text
        const cleaned = selected.split('\n').map(l => l.replace(/^\s*\d+\s*/, '')).join('\n');
        ev.clipboardData.setData('text/plain', cleaned);
      }
    });
  });
}

// === 実験用: 複数ターミナルコードブロックの自動グループ化 ===
function groupTerminalCodeBlocks() {
  // `data-terminal` 属性を持つコードブロックを検出
  const terminalBlocks = document.querySelectorAll('[data-terminal]');
  if (terminalBlocks.length === 0) return;

  // 連続するペアをgroup化
  let i = 0;
  while (i < terminalBlocks.length) {
    const blockA = terminalBlocks[i];
    const codeBlockA = blockA.closest('.code-block');
    
    if (!codeBlockA) {
      i++;
      continue;
    }

    // 次のブロックがあるかチェック
    let blockB = null;
    let codeBlockB = null;
    if (i + 1 < terminalBlocks.length) {
      blockB = terminalBlocks[i + 1];
      codeBlockB = blockB.closest('.code-block');
    }

    // ペアになっているかチェック（連続した兄弟要素）
    if (codeBlockB && codeBlockA.nextElementSibling === codeBlockB) {
      // wrapper作成
      const wrapper = document.createElement('div');
      wrapper.className = 'experiment-terminals';

      // A用のコンテナ
      const containerA = document.createElement('div');
      containerA.className = 'terminal-container-a';
      const labelA = document.createElement('div');
      labelA.className = 'terminal-label';
      labelA.textContent = 'A';
      containerA.appendChild(labelA);
      containerA.appendChild(codeBlockA.cloneNode(true));

      // B用のコンテナ
      const containerB = document.createElement('div');
      containerB.className = 'terminal-container-b';
      const labelB = document.createElement('div');
      labelB.className = 'terminal-label';
      labelB.textContent = 'B';
      containerB.appendChild(labelB);
      containerB.appendChild(codeBlockB.cloneNode(true));

      wrapper.appendChild(containerA);
      wrapper.appendChild(containerB);

      // 元のコードブロックを置き換え
      codeBlockA.parentNode.replaceChild(wrapper, codeBlockA);
      codeBlockB.parentNode.removeChild(codeBlockB);

      // インデックス調整
      i += 2;
    } else {
      i++;
    }
  }
}

// expose for manual re-run if content is mutated
window.enhanceCodeBlocks = function() {
  enhanceCodeBlocks();
  // Re-highlight after enhancing
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('.code-content code').forEach(el => {
      hljs.highlightElement(el);
    });
  }
  groupTerminalCodeBlocks();
};