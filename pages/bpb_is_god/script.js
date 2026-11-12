(function () {
  const TEXT_FLOW_CONFIG = {
    maxItems: 900,
    fontSizeRange: [14, 62],
    lineGapRange: [4, 14],
    segmentGapRange: [6, 22],
    speedRange: [80, 210],
    alphaRange: [0.12, 0.34],
    edgePadding: 28,
    maxSegmentChars: 36
  };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function slugify(text) {
    return (text || '').toLowerCase().replace(/[\s\/\\]+/g, '-').replace(/[^a-z0-9\-]/g, '').replace(/\-+/g, '-').replace(/^\-|\-$/g, '');
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function parseColorToHsl(str) {
    if (!str) return null;
    const value = String(str).trim();
    let m = value.match(/hsla?\(\s*([^\)]+)\)/i);
    if (m) {
      const parts = m[1].split(/[,\/\s]+/).filter(Boolean);
      return {
        h: ((parseFloat(parts[0]) || 0) + 360) % 360,
        s: clamp(parseFloat((parts[1] || '0').replace('%', '')) || 0, 0, 100),
        l: clamp(parseFloat((parts[2] || '0').replace('%', '')) || 0, 0, 100)
      };
    }
    m = value.match(/rgba?\(\s*([^\)]+)\)/i);
    if (m) {
      const parts = m[1].split(',').map(v => parseFloat(v.trim()) || 0);
      return rgbToHsl(parts[0], parts[1], parts[2]);
    }
    m = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      let hex = m[1];
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return rgbToHsl(r, g, b);
    }
    return null;
  }

  function pickRandomPastelColors() {
    const hue = Math.floor(rand(0, 360));
    const baseHsl = {
      h: hue,
      s: Math.floor(rand(22, 52)),
      l: Math.floor(rand(36, 56))
    };
    const bgHsl = {
      h: hue,
      s: Math.floor(rand(3, 14)),
      l: Math.floor(rand(92, 98))
    };
    return { baseHsl, bgHsl };
  }

  function setRandomThemeColors(force) {
    if (window._animBaseHSL && window._animBgHSL && !force) return;
    const picked = pickRandomPastelColors();
    window._animBaseHSL = picked.baseHsl;
    window._animBgHSL = picked.bgHsl;
  }

  function applyBodyBackground() {
    const body = document.body;
    const root = document.documentElement;
    const isDark = body.classList.contains('theme-dark');
    if (!window._animBaseHSL || !window._animBgHSL) setRandomThemeColors(true);

    if (isDark) {
      const base = window._animBaseHSL;
      body.style.background = `hsl(${Math.round(base.h)} ${Math.round(Math.max(6, base.s * 0.3))}% ${Math.round(Math.max(7, base.l * 0.16))}%)`;
      root.style.setProperty('--base-color', `hsl(${Math.round(base.h)} ${Math.round(clamp(base.s + 8, 20, 84))}% ${Math.round(clamp(base.l + 18, 50, 88))}%)`);
      root.style.setProperty('--bg-color', body.style.background);
    } else {
      const bg = window._animBgHSL;
      body.style.background = `hsl(${Math.round(bg.h)} ${Math.round(bg.s)}% ${Math.round(bg.l)}%)`;
      root.style.setProperty('--bg-color', body.style.background);
      root.style.setProperty('--base-color', `hsl(${Math.round(window._animBaseHSL.h)} ${Math.round(window._animBaseHSL.s)}% ${Math.round(window._animBaseHSL.l)}%)`);
    }

    if (window._textFlowManager && typeof window._textFlowManager.onThemeChange === 'function') {
      window._textFlowManager.onThemeChange();
    }
  }

  function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('theme-dark');
    if (isDark) {
      body.classList.remove('theme-dark');
      body.classList.add('theme-tsuki');
      setRandomThemeColors(true);
    } else {
      body.classList.remove('theme-tsuki');
      body.classList.add('theme-dark');
    }
    const currentTheme = body.classList.contains('theme-dark') ? 'dark' : 'tsuki';
    document.cookie = 'theme=' + currentTheme + '; path=/; max-age=31536000';
    applyBodyBackground();
  }

  function loadTheme() {
    const cookies = (document.cookie || '').split(';');
    let theme = 'tsuki';
    for (const c of cookies) {
      const kv = c.trim().split('=');
      if (kv[0] === 'theme' && kv[1]) {
        theme = kv[1];
        break;
      }
    }
    document.body.classList.remove('theme-tsuki', 'theme-dark');
    document.body.classList.add('theme-' + theme);
    applyBodyBackground();
  }

  function hasJapanese(text) {
    return /[\u3040-\u30ff\u3400-\u9fff\u3005\u303b\uff66-\uff9f]/.test(text);
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function splitTextToSegments(text) {
    const raw = String(text || '').replace(/\r\n?/g, '\n');
    const out = [];

    function pushWithLimit(segment) {
      const s = normalizeText(segment);
      if (!s || !hasJapanese(s)) return;
      const maxChars = TEXT_FLOW_CONFIG.maxSegmentChars;
      if (s.length <= maxChars) {
        out.push(s);
        return;
      }
      for (let i = 0; i < s.length; i += maxChars) {
        const part = normalizeText(s.slice(i, i + maxChars));
        if (part && hasJapanese(part)) out.push(part);
      }
    }

    const lines = raw.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // 句点類ごとに終端を保持して分割する
      const matches = trimmed.match(/[^。．.!?！？]+[。．.!?！？]?/g);
      if (!matches) {
        pushWithLimit(trimmed);
        continue;
      }
      for (const m of matches) {
        pushWithLimit(m);
      }
    }

    return out;
  }

  function appendTextFromRoot(root, bucket) {
    const skipTag = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (!parent || !skipTag.has(parent.tagName)) {
        const segments = splitTextToSegments(node.nodeValue);
        segments.forEach(seg => bucket.add(seg));
      }
      node = walker.nextNode();
    }
  }

  function collectJapaneseStringsFromHtml() {
    const out = new Set();
    appendTextFromRoot(document.documentElement, out);

    const templates = document.querySelectorAll('template');
    templates.forEach(tpl => appendTextFromRoot(tpl.content, out));

    document.querySelectorAll('[alt], [title], [aria-label], [placeholder]').forEach(el => {
      ['alt', 'title', 'aria-label', 'placeholder'].forEach(attr => {
        const segments = splitTextToSegments(el.getAttribute(attr));
        segments.forEach(seg => out.add(seg));
      });
    });

    if (out.size === 0) {
      out.add('日本語テキスト');
      out.add('背景アニメーション');
    }
    return Array.from(out);
  }

  function getBaseTextHsl() {
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--base-color').trim();
    const parsed = parseColorToHsl(cssVar);
    if (parsed) {
      return {
        h: Math.round(parsed.h),
        s: Math.round(clamp(parsed.s, 14, 84)),
        l: Math.round(clamp(parsed.l, 24, 84))
      };
    }
    return { h: 140, s: 36, l: 44 };
  }

  class TextFlowBackgroundManager {
    constructor(textPool) {
      this.textPool = (textPool || []).filter(Boolean);
      this.items = [];
      this.lanes = [];
      this.time = performance.now();
      this.baseHsl = getBaseTextHsl();

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'text-flow-canvas';
      Object.assign(this.canvas.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        zIndex: '-2',
        pointerEvents: 'none'
      });
      document.body.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.dpr = window.devicePixelRatio || 1;

      this.resize = this.resize.bind(this);
      this.loop = this.loop.bind(this);

      this.resize();
      window.addEventListener('resize', this.resize);
      this.loop();
    }

    onThemeChange() {
      this.baseHsl = getBaseTextHsl();
    }

    resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.w = w;
      this.h = h;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.rebuildLanes();
    }

    pickText() {
      if (this.textPool.length === 0) return '日本語テキスト';
      return this.textPool[Math.floor(Math.random() * this.textPool.length)];
    }

    spawnOne(lane) {
      if (this.items.length >= TEXT_FLOW_CONFIG.maxItems) return;
      const text = this.pickText();
      this.ctx.font = lane.font;
      const width = Math.max(8, this.ctx.measureText(text).width);
      const x = lane.nextSpawnX;
      const y = lane.y;
      const lJitter = rand(-10, 12);
      const alpha = rand(TEXT_FLOW_CONFIG.alphaRange[0], TEXT_FLOW_CONFIG.alphaRange[1]);

      this.items.push({
        text,
        font: lane.font,
        speed: lane.speed,
        alpha,
        width,
        x,
        y,
        lJitter,
        laneId: lane.id
      });

      lane.nextSpawnX += width + rand(TEXT_FLOW_CONFIG.segmentGapRange[0], TEXT_FLOW_CONFIG.segmentGapRange[1]);
    }

    rebuildLanes() {
      this.items.length = 0;
      this.lanes.length = 0;

      let yCursor = TEXT_FLOW_CONFIG.edgePadding;
      let laneId = 0;
      while (yCursor < this.h - TEXT_FLOW_CONFIG.edgePadding) {
        const size = rand(TEXT_FLOW_CONFIG.fontSizeRange[0], TEXT_FLOW_CONFIG.fontSizeRange[1]);
        const lineGap = rand(TEXT_FLOW_CONFIG.lineGapRange[0], TEXT_FLOW_CONFIG.lineGapRange[1]);
        const lineHeight = Math.round(size * rand(1.15, 1.34));
        const baselineY = yCursor + lineHeight * 0.5;
        if (baselineY > this.h - TEXT_FLOW_CONFIG.edgePadding) break;

        const lane = {
          id: laneId++,
          y: baselineY,
          speed: rand(TEXT_FLOW_CONFIG.speedRange[0], TEXT_FLOW_CONFIG.speedRange[1]),
          font: `${Math.random() < 0.35 ? 600 : 400} ${Math.round(size)}px "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`,
          nextSpawnX: this.w + rand(-lineHeight, lineHeight * 2.3)
        };
        this.lanes.push(lane);
        yCursor += lineHeight + lineGap;
      }

      this.populateInitialItems();
    }

    populateInitialItems() {
      for (const lane of this.lanes) {
        lane.nextSpawnX = -rand(50, 180);
        while (lane.nextSpawnX < this.w + rand(120, 260) && this.items.length < TEXT_FLOW_CONFIG.maxItems) {
          this.spawnOne(lane);
        }
      }
    }

    update(dt) {
      for (const lane of this.lanes) {
        lane.nextSpawnX -= lane.speed * dt;
        while (lane.nextSpawnX <= this.w + 160 && this.items.length < TEXT_FLOW_CONFIG.maxItems) {
          this.spawnOne(lane);
        }
      }

      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        it.x -= it.speed * dt;
        if (it.x + it.width < -200) {
          this.items.splice(i, 1);
        }
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.ctx.textBaseline = 'middle';
      for (const it of this.items) {
        this.ctx.save();
        this.ctx.font = it.font;
        const l = clamp(this.baseHsl.l + it.lJitter, 18, 92);
        this.ctx.fillStyle = `hsla(${this.baseHsl.h} ${this.baseHsl.s}% ${l}% / ${it.alpha})`;
        this.ctx.fillText(it.text, it.x, it.y);
        this.ctx.restore();
      }
    }

    loop() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.time) * 0.001);
      this.time = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(this.loop);
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener('resize', this.resize);
      if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  function destroyLegacyCanvases() {
    const ids = [
      'background-canvas',
      'dot-canvas',
      'ring-canvas',
      'tree-canvas',
      'dragon-canvas',
      'koch-canvas',
      'sierpinski-canvas',
      'peano-canvas',
      'bouncer-canvas'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function initAnimationSystem() {
    destroyLegacyCanvases();
    if (window._textFlowManager && typeof window._textFlowManager.destroy === 'function') {
      window._textFlowManager.destroy();
    }
    const strings = collectJapaneseStringsFromHtml();
    window._textFlowManager = new TextFlowBackgroundManager(strings);
  }

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
        while (document.getElementById(id)) id = base + '-' + (attempt++);
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

  function populateArticleLinks() {
    const tpl = document.getElementById('article-links-template');
    if (!tpl) return;
    const sidebarTarget = document.getElementById('sidebar-links');
    const mobileTarget = document.getElementById('mobile-links');
    const clone = tpl.content.cloneNode(true);
    if (sidebarTarget) {
      sidebarTarget.innerHTML = '';
      sidebarTarget.appendChild(clone.cloneNode(true));
    }
    if (mobileTarget) {
      mobileTarget.innerHTML = '';
      const temp = tpl.content.querySelector('ul');
      if (temp) mobileTarget.append(...temp.cloneNode(true).children);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    setRandomThemeColors(true);
    window.toggleTheme = toggleTheme;
    window.loadTheme = loadTheme;
    window.initAnimationSystem = initAnimationSystem;
    loadTheme();
    splitContentToSections();
    buildTocFromHeadings();
    populateArticleLinks();
    initAnimationSystem();
  });
})();