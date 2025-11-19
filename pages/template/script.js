// ...existing code...
(function () {
  // === グローバル設定（ここだけ触れば各アニメの主要パラメータを変更できます） ===
  // すべてのコメントは日本語です。各アニメクラスの先頭にもクラス固有の設定ブロックを置いてありますが、
  // 基本はこの ANIM_CONFIG を編集すれば統一的に調整できます。
  const ANIM_CONFIG = {
    // 全体の速度倍率（移動/回転/スケール速度に掛かります）
    speedMultiplier: 1.0,

    // --- 六角形アニメ固有設定 ---
    hex: {
      // 初回に生成する個数の範囲（起動時にランダムで生成し、その後増減しません）
      initialCountRange: [12, 24],

      // 角速度の範囲（ここを変えれば全インスタンスに反映されます）
      rotSpeedMin: -0.06,
      rotSpeedMax: 3,

      // 位置速度の範囲（vx, vy）。実際は speedMultiplier を掛けて決定されます。
      vxRange: [-0.6, 100],
      vyRange: [-0.6, 100],

      // スケール成長速度（範囲）。speedMultiplier を掛けて決定されます。
      scaleVelRange: [-0.06, 1],

      // 初期サイズの範囲（px）
      sizeRange: [12, 120],

      // 目標スケール（ここを超えても縮小はさせません／バウンス無し）
      targetScale: 1.0,

      // 最大保持個数（安全装置。initialCountRange を超えないように）
      maxShapes: 220
    }
  };

  // --- ユーティリティ（日本語コメント） ---
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function slugify(text) {
    return text.toLowerCase().replace(/[\s\/\\]+/g, '-').replace(/[^a-z0-9\-]/g, '').replace(/\-+/g, '-').replace(/^\-|\-$/g, '');
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
  // クラス冒頭に「このクラス固有の設定」を置いていますが、統一管理は上の ANIM_CONFIG.hex を使ってください。
  class HexOutlineManager {
    constructor() {
      // --- クラス固有設定（ここは参照用。変更は ANIM_CONFIG.hex を編集してください） ---
      this.cfg = ANIM_CONFIG.hex;
      this.speedMul = ANIM_CONFIG.speedMultiplier;

      // 既存キャンバスを削除（複数インスタンス防止）
      const old = document.getElementById('background-canvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);

      // キャンバス作成
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'background-canvas';
      Object.assign(this.canvas.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        zIndex: '-1', pointerEvents: 'none'
      });
      document.body.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;
      this.shapes = [];
      this.time = performance.now();

      this.resize();
      window.addEventListener('resize', () => this.resize());

      // 初期個数を生成して以降は増減させない
      this.spawnInitialShapes();

      this.loop();
    }

    // テーマ変更時（ライトモード時に body 背景を設定）
    onThemeChange() {
      if (!document.body.classList.contains('theme-dark')) {
        const baseGray = getBaseGrayHSL();
        document.body.style.background = `hsl(0 0% ${baseGray.l}% )`;
      } else {
        document.body.style.background = '';
      }
    }

    // リサイズ処理
    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
    }

    // 初期にランダム個数だけ生成（その後は増減無し）
    spawnInitialShapes() {
      const n = randInt(this.cfg.initialCountRange[0], this.cfg.initialCountRange[1]);
      for (let i = 0; i < n && this.shapes.length < this.cfg.maxShapes; i++) {
        this.shapes.push(this.createShape());
      }
    }

    // 形の生成（rotSpeedはANIM_CONFIGで一元管理）
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

    // 更新：バウンスは無し。回転・移動・拡大のみ。個数は変化しない。
    update(dt) {
      for (let i = 0; i < this.shapes.length; i++) {
        const s = this.shapes[i];

        // 回転（角速度は ANIM_CONFIG.hex で一元管理）
        s.angle += s.rotSpeed * dt * 0.001;

        // 移動（そのまま画面外へ出ても問題なし）
        s.x += s.vx * dt * 0.001;
        s.y += s.vy * dt * 0.001;

        // スケール成長（目標に達しても縮小させない）
        s.scale += s.scaleVel * dt * 0.001;
        if (s.scale < 0.01) s.scale = 0.01; // 最低保証
        // 必要なら最大スケールを設定する場合は ANIM_CONFIG.hex.targetScale を参照して clamp 可
        if (typeof this.cfg.targetScale === 'number') {
          // ここでは targetScale は「目標」で、超えても止めたければコメントを外す
          // s.scale = Math.min(s.scale, this.cfg.targetScale);
        }
      }
    }

    // 六角形パスを描画するヘルパー
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

    // 描画：枠のみ（内側描画は行わない）
    draw() {
      this.ctx.clearRect(0, 0, this.w, this.h);

      for (const s of this.shapes) {
        const alpha = Math.max(0.05, Math.min(0.95, s.alpha || 0.6));
        this.ctx.save();
        this.ctx.translate(s.x, s.y);
        this.ctx.rotate(s.angle);
        const r = s.size * 0.9 * (s.scale || 1);
        this.ctx.lineWidth = Math.max(1, 2.2 * (s.scale || 1));
        this.ctx.strokeStyle = baseColorAlpha(alpha, -6); // ベースカラー優先
        this.drawHexPath(this.ctx, 0, 0, r, 0);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    // メインループ
    loop() {
      const now = performance.now();
      const dt = now - this.time;
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    // 破棄処理
    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      const c = document.getElementById('background-canvas');
      if (c && c.parentNode) c.parentNode.removeChild(c);
    }
  }

  // 初期化処理
  function initAnimationSystem() {
    if (!window._hexManager) window._hexManager = new HexOutlineManager();
  }

  // DOM 初期化
  document.addEventListener('DOMContentLoaded', function () {
    loadTheme();
    splitContentToSections();
    buildTocFromHeadings();
    window.toggleTheme = toggleTheme;
    window.loadTheme = loadTheme;
    window.initAnimationSystem = initAnimationSystem;
    // 自動開始（停止する場合は window._hexManager.destroy() を呼ぶ）
    initAnimationSystem();
  });

})();