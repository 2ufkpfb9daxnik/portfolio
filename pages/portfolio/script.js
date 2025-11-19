(function() {
  // ランダムで刺激が少ないベース色を生成
  function softColor() {
    const h = Math.floor(Math.random() * 360);
    const s = 16 + Math.random() * 18; // 16-34%
    const l = 82 + Math.random() * 8;  // 82-90%
    return `hsl(${h} ${s}% ${l}%)`;
  }

  // 背景キャンバス作成と簡易アニメ
  class AnimationManager {
    constructor() {
      this.canvas = document.getElementById('background-canvas');
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'background-canvas';
        Object.assign(this.canvas.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '-1',
          pointerEvents: 'none'
        });
        document.body.appendChild(this.canvas);
      }
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.initParticles();
      requestAnimationFrame(() => this.animate());
    }
    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      this.canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      this.ctx.scale(dpr, dpr);
    }
    initParticles() {
      this.particles = [];
      const count = Math.max(6, Math.floor(window.innerWidth / 120));
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: 8 + Math.random() * 28,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          hue: Math.random() * 360
        });
      }
    }
    update() {
      for (const p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -50) p.x = window.innerWidth + 50;
        if (p.x > window.innerWidth + 50) p.x = -50;
        if (p.y < -50) p.y = window.innerHeight + 50;
        if (p.y > window.innerHeight + 50) p.y = -50;
        p.hue = (p.hue + 0.05) % 360;
      }
    }
    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of this.particles) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `hsla(${p.hue} 60% 70% / 0.18)`);
        g.addColorStop(1, `hsla(${p.hue} 60% 60% / 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    animate() {
      this.update();
      this.draw();
      requestAnimationFrame(() => this.animate());
    }
  }

  // テーマ処理
  function setBaseBackground(color) {
    if (!document.body.classList.contains('theme-dark')) {
      document.body.style.background = color;
    } else {
      document.body.style.background = '';
    }
  }

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
    document.cookie = `theme=${currentTheme}; path=/; max-age=31536000`;
    // ダーク時は背景をリセット
    if (body.classList.contains('theme-dark')) {
      document.body.style.background = '';
    } else {
      setBaseBackground(_baseColor);
    }
  }

  function loadTheme() {
    const cookies = (document.cookie || '').split(';');
    let theme = 'tsuki';
    for (const c of cookies) {
      const [name, value] = c.trim().split('=');
      if (name === 'theme' && value) {
        theme = value;
        break;
      }
    }
    document.body.classList.remove('theme-tsuki', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
  }

  // 初期化
  let _baseColor = softColor();
  document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    setBaseBackground(_baseColor);
    // グローバル toggleTheme を使っているテンプレートと互換性を保つ
    window.toggleTheme = toggleTheme;
    window.loadTheme = loadTheme;
    // アニメーション開始
    new AnimationManager();
  });
})();