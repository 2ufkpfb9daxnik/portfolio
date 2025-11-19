// ...existing code...
(function () {
  // === グローバル設定（ここだけ触れば各アニメの主要パラメータを変更できます） ===
  // すべてのコメントは日本語です。各アニメクラス先頭にもクラス固有の設定ブロックを置いてあります。
  const ANIM_CONFIG = {
    // 全体の速度倍率（移動/回転/スケール速度に掛かります）
    speedMultiplier: 1.0,

    // --- 六角形アニメ固有設定 ---
    // ※ユーザーの指定どおり現在の値を保持しています
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

    // --- 点（Dot）アニメ固有設定 ---
    dot: {
      // 1トリガーあたりの生成個数範囲
      spawnCountRange: [20, 50],
      // dot の初期サイズ(px)
      sizeRange: [2, 8],
      // 速度(px/s)（speedMultiplier が掛かる）
      vxRange: [-120, 120],
      vyRange: [-120, 120],
      // （点に寿命は付けない要求のため life は使わない。必要なら設定して管理可能）
      // チカチカ（アルファ変化）頻度範囲 (Hz) — ゆったり目に設定
      flickerHzRange: [0.4, 1.2],
      // キャンバス最大保持点数（安全装置）
      maxDots: 600
    },

    // --- 円枠（Ring）アニメ固有設定（新規追加） ---
    circle: {
      // 1トリガーで発生させる円の個数
      spawnCountRange: [12, 20],
      // 初期半径(px)
      initialRadiusRange: [6, 24],
      // 成長速度(px/s)
      growthRange: [10, 500],
      // 線幅(px)
      lineWidthRange: [1, 4],
      // 寿命(ms) — 寿命経過で消える
      lifeRange: [800, 4400],
      // 初期アルファ
      alphaRange: [0.18, 0.6],
      // キャンバス最大保持数
      maxRings: 240
    },

    // --- スケジューラ設定（複数アニメからランダムに選んでトリガー） ---
    scheduler: {
      // 次のトリガーまでの間隔(ms)
      intervalRange: [1000, 2000],
      // 同時にトリガーする最大アニメ数（1以上）
      concurrent: 1
    }
  };

  // --- ユーティリティ（日本語コメント） ---
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function slugify(text) {
    return (text || '').toLowerCase().replace(/[\s\/\\]+/g, '-').replace(/[^a-z0-9\-]/g, '').replace(/\-+/g, '-').replace(/^\-|\-$/g, '');
  }

  // --- テーマ切替（既存互換） ---
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
    if (window._hexManager && typeof window._hexManager.onThemeChange === 'function') {
      try { window._hexManager.onThemeChange(); } catch (e) { /* ignore */ }
    }
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
  }

  // --- DOM 補助（既存機能） ---
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
        let base = id;
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

  // --- カラー補助（ベースカラー優先） ---
  function parseRgb(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(p => parseFloat(p));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    }
    const mh = str.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
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
    const body = document.body;
    const cs = getComputedStyle(body).backgroundColor || '';
    const rgb = parseRgb(cs);
    let L = 95;
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      L = clamp(Math.round(hsl.l), 6, 94);
    }
    return { h: 0, s: 0, l: L };
  }
  function monoColor(alpha, deltaL=0) {
    const g = getBaseGrayHSL();
    let L = clamp(g.l + deltaL, 0, 100);
    return `hsla(0 0% ${L}% / ${alpha})`;
  }

  function getBaseColorHSL() {
    const doc = document.documentElement;
    let v = getComputedStyle(doc).getPropertyValue('--base-color').trim();
    if (!v) {
      const el = document.querySelector('.home-link') || document.body;
      v = getComputedStyle(el).color || '';
    }
    const rgb = parseRgb(v) || parseRgb(getComputedStyle(document.body).color) || { r: 120, g: 120, b: 120, a: 1 };
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { h: Math.round(hsl.h), s: Math.min(40, Math.round(hsl.s*0.6)), l: Math.round(hsl.l) };
  }
  function baseColorAlpha(alpha, deltaL = 0) {
    const c = getBaseColorHSL();
    const L = clamp(c.l + deltaL, 0, 100);
    return `hsla(${c.h} ${c.s}% ${L}% / ${alpha})`;
  }

  // === 六角形アウトラインアニメクラス ===
  class HexOutlineManager {
    constructor() {
      // --- クラス固有設定（ここは参照用。変更は ANIM_CONFIG.hex を編集してください） ---
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

      // アクティブフラグ（別アニメに切り替えると deactivate() で false にする）
      this.active = true;

      this.resize();
      window.addEventListener('resize', () => this.resize());

      // 初期個数を生成して以降は増減させない
      this.spawnInitialShapes();

      this.loop();
    }

    // テーマ変更時
    onThemeChange() {
      if (!document.body.classList.contains('theme-dark')) {
        const baseGray = getBaseGrayHSL();
        document.body.style.background = `hsl(0 0% ${baseGray.l}% )`;
      } else {
        document.body.style.background = '';
      }
    }

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

    // 外部からのトリガ（スケジューラが選んだとき呼ぶ）
    triggerBurst() {
      // 六角形は「アクティブにして再生成」を行う
      this.activate();
    }

    // アクティブ化（表示開始 / 再初期化）
    activate() {
      if (this.active) return;
      this.active = true;
      this.spawnInitialShapes();
    }

    // 非アクティブ化（描画停止・全消去）
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
        this.ctx.strokeStyle = baseColorAlpha(alpha, -6);
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
      // --- クラス固有設定（ここは参照用。変更は ANIM_CONFIG.dot を編集してください） ---
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

      // 初期は非アクティブ（スケジューラが activate -> triggerBurst して使用する）
      this.active = false;

      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() {
      // ベースカラー優先なので特別処理不要
    }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    // 外部からのトリガ：アクティブ化してバースト生成
    triggerBurst() {
      this.activate();
      const count = randInt(this.cfg.spawnCountRange[0], this.cfg.spawnCountRange[1]);
      for (let i = 0; i < count; i++) {
        if (this.dots.length >= this.cfg.maxDots) break;
        const size = rand(this.cfg.sizeRange[0], this.cfg.sizeRange[1]);
        const x = rand(0, this.w);
        const y = rand(0, this.h);
        // vx/vy は px/s 単位。update では dt が秒なのでそのまま使う。
        const vx = rand(this.cfg.vxRange[0], this.cfg.vxRange[1]) * this.speedMul;
        const vy = rand(this.cfg.vyRange[0], this.cfg.vyRange[1]) * this.speedMul;
        const flickerHz = rand(this.cfg.flickerHzRange[0], this.cfg.flickerHzRange[1]);
        const dot = {
          x, y, vx, vy, size,
          created: performance.now(),
          flickerHz, baseAlpha: rand(0.4, 0.9)
          // 注：寿命は付けない（常に存在し続ける要求に対応）
        };
        this.dots.push(dot);
      }
    }

    // アクティブ化（点アニメを受け付ける）
    activate() {
      this.active = true;
    }

    // 非アクティブ化（点を全消去して描画停止）
    deactivate() {
      this.active = false;
      this.dots.length = 0;
      if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0);
    }

    update(dt) {
      if (!this.active) return;
      const now = performance.now();
      // dt は秒単位
      for (let i = this.dots.length - 1; i >= 0; i--) {
        const d = this.dots[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        // ゆったりしたチカチカ（アルファ変化）
        const age = (now - d.created) / 1000;
        const flicker = 0.6 + 0.4 * Math.sin(2 * Math.PI * d.flickerHz * age + d.size);
        d.alpha = clamp(d.baseAlpha * flicker, 0.08, 1.0);
        // 画面外でも特に削除せず残すが、数が多い場合は上限で切る（trigger時に制御）
      }
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      for (const d of this.dots) {
        this.ctx.beginPath();
        this.ctx.fillStyle = baseColorAlpha(d.alpha || 0.6, -6);
        this.ctx.arc(d.x, d.y, Math.max(0.5, d.size * (d.alpha || 1)), 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001; // 秒単位
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

  // === 円枠（Ring）アニメクラス（新規追加） ===
  class CircleOutlineManager {
    constructor() {
      // --- クラス固有設定（ここは参照用。変更は ANIM_CONFIG.circle を編集してください） ---
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

      // 初期は非アクティブ（スケジューラが切り替える）
      this.active = false;

      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop();
    }

    onThemeChange() {
      // ベースカラー優先なので特別処理不要
    }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    // トリガで複数の円を生成（円は寿命で消える）
    triggerBurst() {
      this.activate();
      const count = randInt(this.cfg.spawnCountRange[0], this.cfg.spawnCountRange[1]);
      for (let i = 0; i < count; i++) {
        if (this.rings.length >= this.cfg.maxRings) break;
        const r0 = rand(this.cfg.initialRadiusRange[0], this.cfg.initialRadiusRange[1]);
        const x = rand(0, this.w);
        const y = rand(0, this.h);
        const growth = rand(this.cfg.growthRange[0], this.cfg.growthRange[1]) * this.speedMul; // px/s
        const lineWidth = rand(this.cfg.lineWidthRange[0], this.cfg.lineWidthRange[1]);
        const life = randInt(this.cfg.lifeRange[0], this.cfg.lifeRange[1]);
        const alpha = rand(this.cfg.alphaRange[0], this.cfg.alphaRange[1]);
        const ring = {
          x, y, r: r0, growth, lineWidth, life, created: performance.now(), alphaStart: alpha
        };
        this.rings.push(ring);
      }
    }

    // アクティブ化 / 非アクティブ化
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
        R.r += R.growth * dt; // dt は秒単位で来る（loop で調整）
        const age = now - R.created;
        const t = clamp(age / R.life, 0, 1);
        // フェードアウト
        R.alpha = R.alphaStart * (1 - t);
        if (age >= R.life) {
          this.rings.splice(i, 1);
        }
      }
    }

    draw() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.w, this.h);
      for (const R of this.rings) {
        this.ctx.save();
        this.ctx.globalAlpha = clamp(R.alpha, 0, 1);
        this.ctx.lineWidth = Math.max(0.5, R.lineWidth);
        this.ctx.strokeStyle = baseColorAlpha(1.0, -6);
        this.ctx.beginPath();
        this.ctx.arc(R.x, R.y, Math.max(0.5, R.r), 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    loop() {
      const now = performance.now();
      const dt = (now - this.time) * 0.001; // 秒
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

  // === アニメレイヤ登録とスケジューラ ===
  class AnimationScheduler {
    constructor() {
      this.layers = []; // トリガ可能なレイヤ（activate/deactivate/triggerBurst を持つ）
      this.time = performance.now();
      this.last = 0;
      this.nextInterval = rand(ANIM_CONFIG.scheduler.intervalRange[0], ANIM_CONFIG.scheduler.intervalRange[1]);
      this.running = true;
      this.loop();
    }

    register(layer) {
      // レイヤは activate/deactivate を持つことが期待される
      if (layer) this.layers.push(layer);
    }

    // 全レイヤを一旦停止（切り替え前に現在のアニメを全消去）
    deactivateAll() {
      for (const l of this.layers) {
        if (typeof l.deactivate === 'function') {
          try { l.deactivate(); } catch (e) { /* ignore */ }
        } else if (typeof l.triggerBurst === 'function') {
          // 退避用にドット等は deactive が無ければ arrays をクリア
          try { if (l.dots) l.dots.length = 0; if (l.shapes) l.shapes.length = 0; if (l.rings) l.rings.length = 0; } catch (e) {}
        }
      }
    }

    // ランダムに1つ以上のレイヤを選んで activate + triggerBurst を呼ぶ
    triggerRandom() {
      if (this.layers.length === 0) return;
      // 切り替え前に全消去
      this.deactivateAll();

      const n = Math.max(1, ANIM_CONFIG.scheduler.concurrent);
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * this.layers.length);
        const layer = this.layers[idx];
        if (!layer) continue;
        // まずアクティブ化（存在する場合）
        if (typeof layer.activate === 'function') {
          try { layer.activate(); } catch (e) { /* ignore */ }
        }
        // 次にトリガ（存在する場合）
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

    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
    }
  }

  // --- 初期化処理（インスタンス生成と登録） ---
  function initAnimationSystem() {
    if (!window._animLayers) window._animLayers = [];
    if (!window._hexManager) window._hexManager = new HexOutlineManager();
    if (!window._dotManager) window._dotManager = new DotManager();
    if (!window._ringManager) window._ringManager = new CircleOutlineManager();

    // レイヤ配列（拡張性：新しいアニメを追加したら register すればスケジューラで選べる）
    window._animLayers = [window._hexManager, window._dotManager, window._ringManager];

    // スケジューラ生成（singleton）
    if (!window._animScheduler) {
      window._animScheduler = new AnimationScheduler();
      // 登録はレイヤをそのまま
      for (const l of window._animLayers) {
        window._animScheduler.register(l);
      }
    }
  }

  // --- DOM 初期化 ---
  document.addEventListener('DOMContentLoaded', function () {
    loadTheme();
    splitContentToSections();
    buildTocFromHeadings();
    window.toggleTheme = toggleTheme;
    window.loadTheme = loadTheme;
    window.initAnimationSystem = initAnimationSystem;
    // 自動開始
    initAnimationSystem();
  });

})();