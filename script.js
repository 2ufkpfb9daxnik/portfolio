// アニメーション管理クラス
class AnimationManager {
    constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentAnimation = null;
    this.time = 0;
    this.switchInterval = 500 + Math.random() * 500; // 0.5-1秒
    this.lastSwitchTime = 0;
    
    this.animations = [
        'particles',
        'ripples',
        'geometry',
        'constellation',
        'flowField',
        'spirals'
    ];
    
    this.resize();
    this.initAnimation();
    this.animate();
    
    window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.currentAnimation) {
        this.initAnimation();
    }
    }
    
    initAnimation() {
    const animationType = this.animations[Math.floor(Math.random() * this.animations.length)];
    
    switch (animationType) {
        case 'particles':
        this.initParticles();
        break;
        case 'ripples':
        this.initRipples();
        break;
        case 'geometry':
        this.initGeometry();
        break;
        case 'constellation':
        this.initConstellation();
        break;
        case 'flowField':
        this.initFlowField();
        break;
        case 'spirals':
        this.initSpirals();
        break;
    }
    
    this.currentAnimation = animationType;
    this.switchInterval = 500 + Math.random() * 500;
    this.lastSwitchTime = this.time;
    }
    
    // パーティクルネットワーク
    initParticles() {
    this.particles = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
        this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 8 + 4,
        alpha: Math.random() * 0.5 + 0.2
        });
    }
    }
    
    // 波紋効果
    initRipples() {
    this.ripples = [];
    this.rippleSpawnTimer = 0;
    }
    
    // 幾何学模様
    initGeometry() {
    this.geometryTime = 0;
    this.shapes = [];
    for (let i = 0; i < 12; i++) {
        this.shapes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        size: Math.random() * 100 + 60
        });
    }
    }
    
    // 星座風
    initConstellation() {
    this.stars = [];
    const count = 25;
    for (let i = 0; i < count; i++) {
        this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 6 + 3,
        brightness: Math.random(),
        twinkle: Math.random() * 0.05 + 0.02
        });
    }
    }
    
    // フローフィールド
    initFlowField() {
    this.flowParticles = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
        this.flowParticles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 4 + 2,
        trail: []
        });
    }
    }
    
    // スパイラル
    initSpirals() {
    this.spiralTime = 0;
    const spiralCount = Math.floor(Math.random() * 5) + 1; // 1〜5個
    this.spiralCenters = [];
    for (let i = 0; i < spiralCount; i++) {
        this.spiralCenters.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height
        });
    }
    }
    
    update() {
    this.time += 16; // 約60fps
    
    // アニメーション切り替え
    if (this.time - this.lastSwitchTime > this.switchInterval) {
        this.initAnimation();
    }
    
    switch (this.currentAnimation) {
        case 'particles':
        this.updateParticles();
        break;
        case 'ripples':
        this.updateRipples();
        break;
        case 'geometry':
        this.updateGeometry();
        break;
        case 'constellation':
        this.updateConstellation();
        break;
        case 'flowField':
        this.updateFlowField();
        break;
        case 'spirals':
        this.updateSpirals();
        break;
    }
    }
    
    updateParticles() {
    this.particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
        
        particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
    });
    }
    
    updateRipples() {
    this.rippleSpawnTimer++;
    if (this.rippleSpawnTimer > 6) {
        this.ripples.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: 0,
        alpha: 1
        });
        this.rippleSpawnTimer = 0;
    }
    
    this.ripples = this.ripples.filter(ripple => {
        ripple.radius += 10;
        ripple.alpha -= 0.008;
        return ripple.alpha > 0 && ripple.radius < 400;
    });
    }
    
    updateGeometry() {
    this.geometryTime += 0.02;
    this.shapes.forEach(shape => {
        shape.rotation += shape.rotationSpeed;
        shape.x += shape.vx;
        shape.y += shape.vy;
        
        // 境界で反射
        if (shape.x < -shape.size || shape.x > this.canvas.width + shape.size) shape.vx *= -1;
        if (shape.y < -shape.size || shape.y > this.canvas.height + shape.size) shape.vy *= -1;
        
        shape.x = Math.max(-shape.size, Math.min(this.canvas.width + shape.size, shape.x));
        shape.y = Math.max(-shape.size, Math.min(this.canvas.height + shape.size, shape.y));
    });
    }
    
    updateConstellation() {
    this.stars.forEach(star => {
        star.x += star.vx;
        star.y += star.vy;
        star.brightness += star.twinkle;
        if (star.brightness > 1 || star.brightness < 0) star.twinkle *= -1;
        
        if (star.x < 0 || star.x > this.canvas.width) star.vx *= -1;
        if (star.y < 0 || star.y > this.canvas.height) star.vy *= -1;
        
        star.x = Math.max(0, Math.min(this.canvas.width, star.x));
        star.y = Math.max(0, Math.min(this.canvas.height, star.y));
    });
    }
    
    updateFlowField() {
    this.flowParticles.forEach(particle => {
        const angle = Math.sin(particle.x * 0.005) * Math.cos(particle.y * 0.005) * 6;
        const vx = Math.cos(angle) * 2;
        const vy = Math.sin(angle) * 2;
        
        particle.trail.push({ x: particle.x, y: particle.y });
        if (particle.trail.length > 30) particle.trail.shift();
        
        particle.x += vx;
        particle.y += vy;
        
        if (particle.x < 0) particle.x = this.canvas.width;
        if (particle.x > this.canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = this.canvas.height;
        if (particle.y > this.canvas.height) particle.y = 0;
    });
    }
    
    updateSpirals() {
    this.spiralTime += 0.05;
    }
    
    draw() {
    const isDark = document.body.classList.contains('theme-dark');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    switch (this.currentAnimation) {
        case 'particles':
        this.drawParticles(isDark);
        break;
        case 'ripples':
        this.drawRipples(isDark);
        break;
        case 'geometry':
        this.drawGeometry(isDark);
        break;
        case 'constellation':
        this.drawConstellation(isDark);
        break;
        case 'flowField':
        this.drawFlowField(isDark);
        break;
        case 'spirals':
        this.drawSpirals(isDark);
        break;
    }
    }
    
    drawParticles(isDark) {
    // 線を描画
    this.ctx.strokeStyle = isDark ? 'rgba(144, 255, 144, 0.1)' : 'rgba(0, 153, 0, 0.1)';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 180) {
            const opacity = (1 - distance / 180) * 0.3;
            this.ctx.globalAlpha = opacity;
            this.ctx.beginPath();
            this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
            this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
            this.ctx.stroke();
        }
        }
    }
    
    // パーティクルを描画
    this.particles.forEach(particle => {
        this.ctx.globalAlpha = particle.alpha;
        this.ctx.fillStyle = isDark ? '#90ff90' : '#009900';
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
    });
    
    this.ctx.globalAlpha = 1;
    }
    
    drawRipples(isDark) {
    this.ctx.strokeStyle = isDark ? 'rgba(144, 255, 144, 0.3)' : 'rgba(0, 153, 0, 0.3)';
    this.ctx.lineWidth = 2;
    
    this.ripples.forEach(ripple => {
        this.ctx.globalAlpha = ripple.alpha;
        this.ctx.beginPath();
        this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        this.ctx.stroke();
    });
    
    this.ctx.globalAlpha = 1;
    }
    
    drawGeometry(isDark) {
    this.ctx.strokeStyle = isDark ? 'rgba(144, 255, 144, 0.2)' : 'rgba(0, 153, 0, 0.2)';
    this.ctx.lineWidth = 2;
    
    this.shapes.forEach(shape => {
        this.ctx.save();
        this.ctx.translate(shape.x, shape.y);
        this.ctx.rotate(shape.rotation);
        
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * shape.size;
        const y = Math.sin(angle) * shape.size;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.restore();
    });
    }
    
    drawConstellation(isDark) {
    // 星を描画
    this.stars.forEach(star => {
        this.ctx.globalAlpha = star.brightness * 0.6;
        this.ctx.fillStyle = isDark ? '#90ff90' : '#009900';
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        this.ctx.fill();
    });
    
    // 星座の線
    this.ctx.strokeStyle = isDark ? 'rgba(144, 255, 144, 0.1)' : 'rgba(0, 153, 0, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.3;
    
    for (let i = 0; i < this.stars.length; i++) {
        for (let j = i + 1; j < this.stars.length; j++) {
        const dx = this.stars[i].x - this.stars[j].x;
        const dy = this.stars[i].y - this.stars[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200 && Math.random() < 0.15) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.stars[i].x, this.stars[i].y);
            this.ctx.lineTo(this.stars[j].x, this.stars[j].y);
            this.ctx.stroke();
        }
        }
    }
    
    this.ctx.globalAlpha = 1;
    }
    
    drawFlowField(isDark) {
    this.ctx.strokeStyle = isDark ? 'rgba(144, 255, 144, 0.15)' : 'rgba(0, 153, 0, 0.15)';
    this.ctx.lineWidth = 2;
    
    this.flowParticles.forEach(particle => {
        if (particle.trail.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
        for (let i = 1; i < particle.trail.length; i++) {
            this.ctx.globalAlpha = (i / particle.trail.length) * 0.4;
            this.ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
        }
        this.ctx.stroke();
        }
        
        // パーティクル自体も描画
        this.ctx.globalAlpha = 0.6;
        this.ctx.fillStyle = isDark ? '#90ff90' : '#009900';
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
    });
    
    this.ctx.globalAlpha = 1;
    }
    
    drawSpirals(isDark) {
    this.ctx.strokeStyle = isDark ? 'rgba(144, 255, 144, 0.25)' : 'rgba(0, 153, 0, 0.25)';
    this.ctx.lineWidth = 3;
    
    this.spiralCenters.forEach((center, index) => {
        this.ctx.beginPath();
        for (let angle = 0; angle < Math.PI * 8; angle += 0.08) {
        const radius = angle * 5 + Math.sin(this.spiralTime + index) * 20;
        const x = center.x + Math.cos(angle + this.spiralTime) * radius;
        const y = center.y + Math.sin(angle + this.spiralTime) * radius;
        
        if (angle === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
    });
    }
    
    animate() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.animate());
    }
}

// アニメーションマネージャーを初期化
let animationManager;

function initAnimationSystem() {
    const canvas = document.getElementById('background-canvas');
    animationManager = new AnimationManager(canvas);
}

// ダークモード機能
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
    
    // 設定を保存
    const currentTheme = body.classList.contains('theme-dark') ? 'dark' : 'tsuki';
    document.cookie = `theme=${currentTheme}; path=/; max-age=31536000`; // 1年間保存
}

// ページ読み込み時にテーマを復元
function loadTheme() {
    const cookies = document.cookie.split(';');
    let theme = 'tsuki'; // デフォルト
    
    for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'theme') {
        theme = value;
        break;
    }
    }
    
    const body = document.body;
    body.classList.remove('theme-tsuki', 'theme-dark');
    body.classList.add(`theme-${theme}`);
}

document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    initAnimationSystem();

    // 共通記事リンクテンプレートをサイドバーとモバイル用に挿入
    (function populateArticleLinks() {
        const tpl = document.getElementById('article-links-template');
        if (!tpl) return;
        const sidebarTarget = document.getElementById('sidebar-links');
        const mobileTarget = document.getElementById('mobile-links');
        const clone = tpl.content.cloneNode(true);
        if (sidebarTarget) {
            // サイドバーには ul をそのまま挿入
            sidebarTarget.innerHTML = '';
            sidebarTarget.appendChild(clone.cloneNode(true));
        }
        if (mobileTarget) {
            mobileTarget.innerHTML = '';
            // mobileTarget は ul 要素なのでテンプレート内の ul の中身を移す
            const temp = tpl.content.querySelector('ul');
            if (temp) {
                mobileTarget.append(...temp.cloneNode(true).children);
            }
        }
    })();
});
