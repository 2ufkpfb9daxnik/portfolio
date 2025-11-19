// ...existing code...
(function () {
  // === グローバル設定（ここだけ触れば各アニメの主要パラメータを変更できます） ===
  // すべてのコメントは日本語です。各アニメクラス先頭にもクラス固有の設定ブロックを置いてあります。
const ANIM_CONFIG = {
  // 全体の速度倍率（移動/回転/スケール速度に掛かります）
  speedMultiplier: 1.0,

  // --- 六角形アニメ固有設定 ---
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
    // チカチカ（アルファ変化）頻度範囲 (Hz) — ゆったり目
    flickerHzRange: [0.4, 1.2],
    // キャンバス最大保持点数（安全装置）
    maxDots: 600
  },

  // --- 円枠（Ring）アニメ固有設定 ---
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

  // --- 木（Tree）アニメ固有設定（新規追加） ---
  tree: {
    // トリガーで作る「枝の起点」個数
    spawnCountRange: [10, 12],
    // 最初の枝の長さ(px)
    initialLengthRange: [100, 160],
    // セグメントの成長速度(px/s)
    growthRange: [500, 1200],
    // 子枝へ繋ぐ際の長さ係数（子 = parent.length * lengthDecay）
    lengthDecay: 1,
    // 最大分岐深度（0が起点）
    maxDepth: 500,
    // 分岐確率（各完了セグメントごと）
    branchProb: 1,
    // 1セグメントが伸びきった時に分岐する子数の範囲
    splitRange: [2, 4],
    // 分岐角の広がり（度）
    spreadDegRange: [18, 48],
    // 線幅の初期範囲
    thicknessRange: [3.0, 0.6],
    // 子枝ごとの太さ減衰（掛ける）
    thicknessDecay: 1,
    // 完了してから表示を残す時間(ms)
    holdAfterComplete: 1200,
    // 最大保持枝数（安全装置）
    maxBranches: 4800
  },

  fractal: {
    dragon: {
      orderRange: [12, 14],       // ドラゴン曲線のイテレーション数
      segmentLenRange: [6, 16],   // 各セグメントの長さ（px）
      drawSpeedRange: [800, 1800] // 1トリガーあたりの描画に掛かる時間（ms）
    },
    koch: {
      orderRange: [5, 6],         // コッホ曲線の深さ
      segmentLenRange: [8, 28],
      drawSpeedRange: [700, 2200]
    },
    // 更新済み：Sierpinski 用設定（大きな三角形→内部三角形を順次描画する実装に合わせる）
    sierpinski: {
      // 再帰深さ（描画の細かさ）
      depthRange: [3, 6],
      // 全体の描画にかける時間（ms）
      drawDurationRange: [900, 2000],
      // 各三角形のフェード時間（ms）
      triFadeMs: 220,
      // 互換性のために残す（Chaos Game 等で使う可能性がある場合）
      pointsPerBurstRange: [1200, 2800],
      plotPerFrame: 16
    },
    peano: {
      orderRange: [2, 3],         // ペアノ曲線のオーダー（増やすと重い）
      segmentLenRange: [6, 18],
      drawSpeedRange: [900, 2400]
    }
  },

  // バウンスする短い線分（射出して跳ね返る）アニメ設定
  bouncer: {
    spawnCountRange: [8, 18],
    lengthRange: [20, 80],
    speedRange: [140, 420],    // px/s
    lineWidthRange: [1, 3],
    lifeRange: [2200, 6000],   // ms（寿命で消す）
    maxItems: 400
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
  function degToRad(d) { return d * Math.PI / 180; }
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

  // === 円枠（Ring）アニメクラス ===
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
        R.r += R.growth * dt; // dt は秒単位
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

// ...existing code...
class TreeManager {
  constructor() {
    // --- クラス固有設定（ここは参照用。変更は ANIM_CONFIG.tree を編集してください） ---
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
    this.branches = []; // 全ての枝セグメントオブジェクト（FIFO: 先頭が最も古い）
    this.time = performance.now();

    // 初期非アクティブ（スケジューラが切り替える）
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

  // 古い枝を先頭から削って必要な空きスペースを確保する
  _ensureSpace(needCount) {
    const max = this.cfg.maxBranches;
    while (this.branches.length + needCount > max) {
      // 先頭（最も古い）を削除
      this.branches.shift();
    }
  }

  // 外部トリガ：起点を複数生成して成長を開始する
  triggerBurst() {
    this.activate();
    const n = randInt(this.cfg.spawnCountRange[0], this.cfg.spawnCountRange[1]);
    // 事前に空き確保（古いものから削る）
    this._ensureSpace(n);
    for (let i = 0; i < n; i++) {
      if (this.branches.length >= this.cfg.maxBranches) break;
      // 枝の起点は画面のランダム位置（根は描かないため画面中央付近でも可）
      const x = rand(0, this.w);
      const y = rand(0, this.h);
      const len = rand(this.cfg.initialLengthRange[0], this.cfg.initialLengthRange[1]);
      const angle = rand(0, Math.PI * 2); // 全方向に伸びる枝に対応
      const growth = rand(this.cfg.growthRange[0], this.cfg.growthRange[1]) * this.speedMul;
      const thickness = rand(this.cfg.thicknessRange[0], this.cfg.thicknessRange[1]);
      const branch = this._createBranch(x, y, angle, len, growth, thickness, 0);
      this.branches.push(branch);
    }
    // 追加直後の超過チェック（念のため）
    if (this.branches.length > this.cfg.maxBranches) {
      this.branches.splice(0, this.branches.length - this.cfg.maxBranches);
    }
  }

  // アクティブ化 / 非アクティブ化
  activate() { this.active = true; }
  deactivate() {
    this.active = false;
    this.branches.length = 0;
    if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0);
  }

  // 単一枝オブジェクト生成
  _createBranch(x, y, angle, targetLength, growth, thickness, depth) {
    return {
      x, y, angle, targetLength, currentLength: 0,
      growth, thickness, depth,
      childrenSpawned: false,
      finished: false,
      finishedAt: null,
      created: performance.now()
    };
  }

  update(dt) {
    if (!this.active) return;
    const now = performance.now();
    // dt は秒単位
    for (let i = this.branches.length - 1; i >= 0; i--) {
      const b = this.branches[i];
      if (!b.finished) {
        b.currentLength += b.growth * dt;
        if (b.currentLength >= b.targetLength) {
          b.currentLength = b.targetLength;
          b.finished = true;
          b.finishedAt = now;
        }
      } else if (b.finished && b.childrenSpawned === false) {
        // 成長完了したら分岐を試みる（確率）
        if (b.depth < this.cfg.maxDepth && Math.random() < this.cfg.branchProb) {
          const splits = randInt(this.cfg.splitRange[0], this.cfg.splitRange[1]);
          // 分岐を作る前に必要数分の空き確保（古い枝から削る）
          this._ensureSpace(splits);
          for (let s = 0; s < splits; s++) {
            if (this.branches.length >= this.cfg.maxBranches) break;
            const endX = b.x + Math.cos(b.angle) * b.targetLength;
            const endY = b.y + Math.sin(b.angle) * b.targetLength;
            const spread = rand(this.cfg.spreadDegRange[0], this.cfg.spreadDegRange[1]);
            const sign = Math.random() < 0.5 ? -1 : 1;
            const childAngle = b.angle + degToRad(spread * sign * rand(0.4, 1.0));
            // 子の長さ・太さは親と同じ（減衰しない）
            const childLen = b.targetLength;
            const childGrowth = rand(this.cfg.growthRange[0], this.cfg.growthRange[1]) * this.speedMul;
            const childThickness = b.thickness;
            const child = this._createBranch(endX, endY, childAngle, childLen, childGrowth, childThickness, b.depth + 1);
            this.branches.push(child);
          }
        }
        b.childrenSpawned = true;
      } else if (b.finished && b.finishedAt) {
        // 表示保持時間を過ぎたら削除
        if (now - b.finishedAt > this.cfg.holdAfterComplete) {
          this.branches.splice(i, 1);
        }
      }
    }
    // 常に上限を超えないように先頭から削る（ここでも安全確保）
    if (this.branches.length > this.cfg.maxBranches) {
      this.branches.splice(0, this.branches.length - this.cfg.maxBranches);
    }
  }

  draw() {
    if (!this.active) return;
    this.ctx.clearRect(0, 0, this.w, this.h);
    for (const b of this.branches) {
      // 線は始点から現在の長さ分だけ描く
      const len = Math.max(0.5, b.currentLength);
      const ex = b.x + Math.cos(b.angle) * len;
      const ey = b.y + Math.sin(b.angle) * len;
      this.ctx.save();
      // 深さに応じてやや薄くする（見た目調整） — ただし大幅な細分化はしない
      const depthFade = 1 - clamp(b.depth / (this.cfg.maxDepth + 1), 0, 0.9);
      this.ctx.globalAlpha = depthFade * 1.0;
      this.ctx.lineWidth = Math.max(0.3, b.thickness);
      this.ctx.strokeStyle = baseColorAlpha(1.0, -6);
      this.ctx.beginPath();
      this.ctx.moveTo(b.x, b.y);
      this.ctx.lineTo(ex, ey);
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
    const c = document.getElementById('tree-canvas');
    if (c && c.parentNode) c.parentNode.removeChild(c);
  }
}

// === フラクタル / カーブ系アニメクラス群（Dragon / Koch / Sierpinski / Peano） ===

// ドラゴン曲線：turn シーケンスを反復生成して順に描画する
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

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w; this.h = h;
  }

  // turns を order 回数分生成（false=left, true=right）
  _generateTurns(order) {
    let seq = [];
    for (let i = 0; i < order; i++) {
      const rev = seq.slice().reverse().map(t => !t);
      seq = seq.concat([true], rev); // true 表示右ターン (arbitrary)
    }
    return seq;
  }

  triggerBurst() {
    this.activate();
    const order = randInt(this.cfg.orderRange[0], this.cfg.orderRange[1]);
    const segLen = rand(this.cfg.segmentLenRange[0], this.cfg.segmentLenRange[1]);
    const totalMs = randInt(this.cfg.drawSpeedRange[0], this.cfg.drawSpeedRange[1]);
    this.turns = this._generateTurns(order);
    // build points
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
    if (t >= 1) {
      // hold a little then stop accepting drawing (will be cleared when scheduler deactivates)
    }
  }

  draw() {
    if (!this.active) return;
    this.ctx.clearRect(0, 0, this.w, this.h);
    if (this.points.length < 2) return;
    const upto = Math.floor(this.points.length * this.progress);
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeStyle = baseColorAlpha(0.95, -6);
    this.ctx.beginPath();
    this.ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i <= upto && i < this.points.length; i++) {
      this.ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    this.ctx.stroke();
    // 部分的にアンチエイリアス風に最後の線を描画
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

// コッホ曲線（Koch）: 再帰で点列を生成し徐々に描画
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

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w; this.h = h;
  }

  // 再帰でコッホの点列を生成
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
    // 座標を画面内で水平線として描く
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
    this.ctx.strokeStyle = baseColorAlpha(0.95, -6);
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

// シェルピンスキー（三角形）: Chaos Game を用いた点プロットで過程を表現
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

    // triangle items: {A:{x,y}, B:{x,y}, C:{x,y}, depth, start, fade, alpha}
    this.triangles = [];
    this.startTime = 0;
    this.duration = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop();
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

  // 前順（親→子）の再帰的生成（親を先に描画）
  _subdivide(A, B, C, depth, maxDepth, out) {
    out.push({ A, B, C, depth });
    if (depth >= maxDepth) return;
    // 中点
    const AB = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const BC = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
    const CA = { x: (C.x + A.x) / 2, y: (C.y + A.y) / 2 };

    // 子三角形候補（従来の順: 上, 左, 右）
    const children = [
      { A: A,  B: AB, C: CA },
      { A: AB, B: B,  C: BC },
      { A: CA, B: BC, C: C  }
    ];

    // Fisher-Yates で順序をランダム化してから再帰
    for (let i = children.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = children[i];
      children[i] = children[j];
      children[j] = tmp;
    }

    for (const ch of children) {
      this._subdivide(ch.A, ch.B, ch.C, depth + 1, maxDepth, out);
    }
  }

  triggerBurst() {
    this.activate();
    this.triangles.length = 0;
    const maxDepth = randInt(this.cfg.depthRange[0], this.cfg.depthRange[1]);
    const margin = 28;
    // 大きな三角形をキャンバス中央付近に配置
    const A = { x: this.w / 2, y: margin };
    const B = { x: margin, y: this.h - margin };
    const C = { x: this.w - margin, y: this.h - margin };
    const items = [];
    this._subdivide(A, B, C, 0, maxDepth, items);

    // 各三角形に描画開始オフセットとフェード時間を割り当てる（滑らかに順次）
    const total = items.length || 1;
    this.duration = randInt(this.cfg.drawDurationRange[0], this.cfg.drawDurationRange[1]);
    const per = Math.max(12, Math.floor(this.duration / total));
    const fade = this.cfg.triFadeMs || Math.max(80, per * 0.9);

    const now = performance.now();
    items.forEach((t, idx) => {
      this.triangles.push({
        A: t.A, B: t.B, C: t.C, depth: t.depth,
        start: now + idx * per,
        fade: fade,
        alpha: 0
      });
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
      // ease-in-out for smoother appearance
      const eased = cl < 0.5 ? 2 * cl * cl : -1 + (4 - 2 * cl) * cl;
      t.alpha = eased;
      if (now >= t.start && cl < 1) anyActive = true;
      if (now < t.start) anyActive = true;
    }
    // すべて描画完了から少し経ったら自動的に非アクティブにする（スケジューラで切り替わる想定）
    if (!anyActive) {
      // keep visible briefly then allow scheduler to clear when switching
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
    // 背景はクリアしてから描画
    this.ctx.clearRect(0, 0, this.w, this.h);
    // 描画は depth による順序（浅い→深い）にして重ねる
    this.triangles.sort((a, b) => a.depth - b.depth);
    for (const t of this.triangles) {
      if (!t.alpha || t.alpha <= 0) continue;
      this.ctx.save();
      // fill は薄め、輪郭は少し濃い
      this.ctx.globalAlpha = clamp(0.12 * t.alpha, 0, 0.45);
      this.ctx.fillStyle = baseColorAlpha(1.0, -6);
      this.drawTrianglePath(t);
      this.ctx.fill();
      this.ctx.globalAlpha = clamp(0.95 * t.alpha, 0, 1.0);
      this.ctx.lineWidth = Math.max(0.6, 1.0 - t.depth * 0.02);
      this.ctx.strokeStyle = baseColorAlpha(1.0, -6);
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

// ペアノ曲線（簡易実装）: 3x3分割の再帰的なパス生成（オーダーは小さめ推奨）
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
    this.pointsRight = []; // 右側コピー
    this.progress = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop();
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

  // 簡易ペアノ（3分割）パス生成（同じロジックを使う）
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

    // 2つ横に並べるためのサイズ計算（両方とも収まるように調整）
    const availableWidth = Math.max(0, this.w - margin * 3);
    const maxSizeByWidth = Math.floor(availableWidth / 2);
    const maxSizeByHeight = Math.max(0, this.h - margin * 2);
    const size = Math.max(8, Math.min(maxSizeByWidth, maxSizeByHeight));

    // 左側の原点
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
    for (let i = 1; i <= upto && i < pts.length; i++) {
      this.ctx.lineTo(pts[i].x, pts[i].y);
    }
    this.ctx.stroke();
  }

  draw() {
    if (!this.active) return;
    this.ctx.clearRect(0, 0, this.w, this.h);
    const uptoL = Math.floor(this.points.length * this.progress);
    const uptoR = Math.floor(this.pointsRight.length * this.progress);

    this.ctx.lineWidth = 1.2;
    this.ctx.strokeStyle = baseColorAlpha(0.95, -6);
    // 左
    this.drawPathFromPoints(this.points, uptoL);
    // 右
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

// === ランダム方向に射出して端で跳ね返る短い線分アニメ ===
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
    // 必要なら古いものから削る
    if (this.items.length > this.cfg.maxItems) this.items.splice(0, this.items.length - this.cfg.maxItems);
  }

  activate() { this.active = true; }
  deactivate() { this.active = false; this.items.length = 0; if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0); }

  update(dt) {
    if (!this.active) return;
    const now = performance.now();
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      // 移動
      it.x += Math.cos(it.angle) * it.speed * dt;
      it.y += Math.sin(it.angle) * it.speed * dt;
      // 境界で跳ね返し（角度反射 + 少しランダム性）
      let bounced = false;
      if (it.x < 0 || it.x > this.w) { it.angle = Math.PI - it.angle + rand(-0.3, 0.3); it.x = clamp(it.x, 0, this.w); bounced = true; }
      if (it.y < 0 || it.y > this.h) { it.angle = -it.angle + rand(-0.3, 0.3); it.y = clamp(it.y, 0, this.h); bounced = true; }
      // 寿命チェック
      if (now - it.created > it.life) {
        this.items.splice(i, 1);
        continue;
      }
      // 上限超過したら古いものから削る
      if (this.items.length > this.cfg.maxItems) this.items.splice(0, this.items.length - this.cfg.maxItems);
    }
  }

  draw() {
    if (!this.active) return;
    this.ctx.clearRect(0, 0, this.w, this.h);
    for (const it of this.items) {
      this.ctx.save();
      this.ctx.lineWidth = Math.max(0.5, it.lw);
      this.ctx.strokeStyle = baseColorAlpha(0.95, -6);
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
        } else {
          try { if (l.dots) l.dots.length = 0; if (l.shapes) l.shapes.length = 0; if (l.rings) l.rings.length = 0; if (l.branches) l.branches.length = 0; } catch (e) {}
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
    if (!window._treeManager) window._treeManager = new TreeManager();
    if (!window._dragonManager) window._dragonManager = new DragonCurveAnimator();
    if (!window._kochManager) window._kochManager = new KochCurveAnimator();
    if (!window._sierpinskiManager) window._sierpinskiManager = new SierpinskiAnimator();
    if (!window._peanoManager) window._peanoManager = new PeanoCurveAnimator();
    if (!window._bouncerManager) window._bouncerManager = new BouncingLinesManager();

    // レイヤ配列（拡張性：新しいアニメを追加したら register すればスケジューラで選べる）
    window._animLayers = [window._hexManager, window._dotManager, window._ringManager, window._treeManager, window._dragonManager, window._kochManager, window._sierpinskiManager, window._peanoManager, window._bouncerManager];

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