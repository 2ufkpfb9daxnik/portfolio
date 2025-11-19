// 統合スクリプト：テーマ / TOC・セクション分割 / 背景アニメーション
(function () {
  // --- ユーティリティ ---
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function slugify(text) {
    return text.toLowerCase().replace(/[\s\/\\]+/g, '-').replace(/[^a-z0-9\-]/g, '').replace(/\-+/g, '-').replace(/^\-|\-$/g, '');
  }

  // --- テーマ処理 ---
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

  // --- コンテンツをセクション化（h2/h3 を境に .container-section を作る） ---
  function splitContentToSections() {
    const wrapper = document.getElementById('content-wrapper');
    if (!wrapper) return;
    // 既に分割済みなら何もしない
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
        // 新しいセクション開始（h2/h3 は見出しとして先頭に入れる）
        startNewSection(node.cloneNode(true));
      } else {
        if (!section) startNewSection();
        section.appendChild(node.cloneNode(true));
      }
    }

    // 置換
    wrapper.innerHTML = '';
    wrapper.appendChild(container);
  }

  // --- TOC を生成（nav .toc が空なら content-wrapper の見出しから作る） ---
  function buildTocFromHeadings() {
    const tocEl = document.querySelector('.toc');
    const wrapper = document.getElementById('content-wrapper');
    if (!tocEl || !wrapper) return;
    // pandoc が挿入した $toc$ があればそれを尊重する
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
        // 衝突回避
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

  // --- 背景アニメーション（モジュール群 + 管理器） ---
  const Modules = {
    FlashParticles: {
      init(ctx, w, h) {
        this.w = w; this.h = h;
        this.p = Array.from({ length: Math.max(30, Math.floor(w / 30)) }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          vx: rand(-6, 6), vy: rand(-6, 6),
          r: rand(1.5, 6), hue: rand(60, 160)
        }));
      },
      update(dt) {
        for (const p of this.p) {
          p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06;
          if (p.x < -50) p.x = this.w + 50;
          if (p.x > this.w + 50) p.x = -50;
          if (p.y < -50) p.y = this.h + 50;
          if (p.y > this.h + 50) p.y = -50;
          p.hue = (p.hue + 0.3 * dt * 0.06) % 360;
        }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.p) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
          g.addColorStop(0, `hsla(${p.hue} 70% 60% / 0.28)`);
          g.addColorStop(1, `hsla(${p.hue} 70% 50% / 0)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    },

    RapidRipples: {
      init(ctx, w, h) { this.w = w; this.h = h; this.ripples = []; this.t = 0; },
      update(dt) {
        this.t += dt;
        if (Math.random() < 0.45) {
          this.ripples.push({ x: Math.random() * this.w, y: Math.random() * this.h, r: 0, a: 1, hue: rand(80, 200) });
        }
        this.ripples.forEach(r => { r.r += 40 * dt * 0.06; r.a -= 0.018 * dt * 0.06; });
        this.ripples = this.ripples.filter(r => r.a > 0.02 && r.r < Math.max(this.w, this.h) * 1.5);
      },
      draw(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 2;
        for (const r of this.ripples) {
          ctx.strokeStyle = `hsla(${r.hue} 60% 60% / ${r.a * 0.6})`;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    },

    SpinningPolygons: {
      init(ctx, w, h) {
        this.w = w; this.h = h; this.items = [];
        const count = 8;
        for (let i = 0; i < count; i++) {
          this.items.push({
            x: Math.random() * w, y: Math.random() * h,
            size: rand(40, 160), sides: Math.floor(rand(3, 8)),
            rot: Math.random() * Math.PI * 2, speed: rand(-0.05, 0.12),
            hue: rand(40, 220)
          });
        }
      },
      update(dt) { for (const it of this.items) it.rot += it.speed * dt * 0.06; },
      draw(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        for (const it of this.items) {
          ctx.save();
          ctx.translate(it.x, it.y); ctx.rotate(it.rot);
          const s = it.size;
          ctx.beginPath();
          for (let i = 0; i < it.sides; i++) {
            const a = (i / it.sides) * Math.PI * 2;
            const x = Math.cos(a) * s, y = Math.sin(a) * s;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = `hsla(${it.hue} 60% 60% / 0.2)`;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    },

    Scanlines: {
      init(ctx, w, h) { this.w = w; this.h = h; this.offset = 0; this.angle = rand(-0.6, 0.6); this.speed = rand(6, 18); this.hue = rand(80, 160); },
      update(dt) { this.offset += this.speed * dt * 0.06; },
      draw(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(this.w/2, this.h/2); ctx.rotate(this.angle);
        const step = 12;
        for (let y = -this.h; y < this.h; y += step) {
          const alpha = 0.06 + 0.12 * Math.abs(Math.sin((y + this.offset) * 0.05));
          ctx.fillStyle = `hsla(${this.hue} 60% 50% / ${alpha})`;
          ctx.fillRect(-this.w, y, this.w*2, step*0.6);
        }
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
      }
    },

    FlowField: {
      init(ctx, w, h) {
        this.w = w; this.h = h; this.p = [];
        const count = Math.max(60, Math.floor(w * h / 30000));
        for (let i = 0; i < count; i++) this.p.push({ x: Math.random()*w, y: Math.random()*h, trail: [] , hue: rand(80,160)});
        this.t = 0;
      },
      update(dt) {
        this.t += dt * 0.004;
        for (const k of this.p) {
          const angle = Math.sin((k.x + this.t) * 0.0025) * Math.cos((k.y - this.t) * 0.0027) * Math.PI * 2;
          k.x += Math.cos(angle) * 1.8 * dt * 0.06;
          k.y += Math.sin(angle) * 1.8 * dt * 0.06;
          k.trail.push({ x: k.x, y: k.y });
          if (k.trail.length > 18) k.trail.shift();
          if (k.x < 0) k.x = this.w;
          if (k.x > this.w) k.x = 0;
          if (k.y < 0) k.y = this.h;
          if (k.y > this.h) k.y = 0;
        }
      },
      draw(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        for (const k of this.p) {
          for (let i = 1; i < k.trail.length; i++) {
            const a = i / k.trail.length;
            ctx.strokeStyle = `hsla(${k.hue} 70% 50% / ${0.08 * a})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(k.trail[i-1].x, k.trail[i-1].y);
            ctx.lineTo(k.trail[i].x, k.trail[i].y);
            ctx.stroke();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    },

    GeoBurst: {
      init(ctx, w, h) { this.w = w; this.h = h; this.puffs = []; this.spawnTimer = 0; },
      update(dt) {
        this.spawnTimer += dt;
        if (this.spawnTimer > 40) {
          this.spawnTimer = 0;
          for (let i=0;i<6;i++) this.puffs.push({
            x: Math.random()*this.w, y: Math.random()*this.h,
            dir: rand(0, Math.PI*2), speed: rand(2, 14), size: rand(6,36),
            life: 1, hue: rand(40,200)
          });
        }
        this.puffs.forEach(p => { p.x += Math.cos(p.dir)*p.speed*0.06*dt; p.y += Math.sin(p.dir)*p.speed*0.06*dt; p.life -= 0.02*dt*0.06; });
        this.puffs = this.puffs.filter(p => p.life > 0);
      },
      draw(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.puffs) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.dir + p.life * 5);
          ctx.fillStyle = `hsla(${p.hue} 70% 55% / ${p.life * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.6, p.size);
          ctx.lineTo(-p.size * 0.6, p.size);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  };

  // 背景管理本体
  class BackgroundManager {
    constructor() {
      this.canvas = document.getElementById('background-canvas');
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'background-canvas';
        Object.assign(this.canvas.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', zIndex: '-1', pointerEvents: 'none' });
        document.body.appendChild(this.canvas);
      }
      this.ctx = this.canvas.getContext('2d');
      this.dpr = window.devicePixelRatio || 1;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.moduleNames = Object.keys(Modules);
      this.current = null;
      this.currentName = null;
      this.switchInterval = rand(400, 1200);
      this.lastSwitch = performance.now();
      this.time = performance.now();
      this.startLoop();
    }
    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w; this.h = h;
      if (this.current && this.current.init) this.current.init(this.ctx, this.w, this.h);
    }
    pickNext() {
      let name = this.moduleNames[Math.floor(Math.random() * this.moduleNames.length)];
      if (name === this.currentName && Math.random() < 0.6) {
        const others = this.moduleNames.filter(n => n !== name);
        name = others[Math.floor(Math.random() * others.length)];
      }
      this.currentName = name;
      this.current = Object.create(Modules[name]);
      if (this.current.init) this.current.init(this.ctx, this.w, this.h);
      this.switchInterval = rand(360, 1200);
      this.lastSwitch = performance.now();
    }
    loop(now) {
      const dt = now - this.time;
      this.time = now;
      if (!this.current) this.pickNext();
      if (now - this.lastSwitch > this.switchInterval) this.pickNext();
      this.ctx.fillStyle = 'rgba(0,0,0,0.04)';
      this.ctx.fillRect(0, 0, this.w, this.h);
      if (this.current.update) this.current.update(dt);
      if (this.current.draw) this.current.draw(this.ctx);
      requestAnimationFrame((t) => this.loop(t));
    }
    startLoop() { this.time = performance.now(); requestAnimationFrame((t) => this.loop(t)); }
  }

  function initAnimationSystem() {
    if (!window._bgManager) window._bgManager = new BackgroundManager();
  }

  // --- DOM 初期化 ---
  document.addEventListener('DOMContentLoaded', function () {
    loadTheme();
    // セクション分割と TOC を優先して行う（CSS 用の構造を整える）
    splitContentToSections();
    buildTocFromHeadings();

    // グローバル互換関数を設定
    window.toggleTheme = toggleTheme;
    window.loadTheme = loadTheme;
    window.initAnimationSystem = initAnimationSystem;

    // 背景アニメーション開始
    initAnimationSystem();
  });

})();