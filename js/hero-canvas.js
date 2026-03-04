/* ══════════════════════════════════════
   HERO CANVAS — Particles + Geometry
   ══════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], shapes = [], mouse = { x: null, y: null };
  const PARTICLE_COUNT = 80;
  const SHAPE_COUNT = 6;
  const COLORS = ['#f5c518', '#f07020', '#8b3cf7', '#b06cf9', '#f07020'];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : H + 10;
      this.r  = Math.random() * 1.8 + 0.4;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -(Math.random() * 0.6 + 0.2);
      this.alpha = Math.random() * 0.6 + 0.2;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.fade  = Math.random() * 0.003 + 0.001;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.fade;
      if (this.alpha <= 0 || this.y < -10) this.reset();
      // mouse repulsion
      if (mouse.x && mouse.y) {
        const dx = this.x - mouse.x, dy = this.y - mouse.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 80) {
          this.vx += dx / dist * 0.05;
          this.vy += dy / dist * 0.05;
        }
      }
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle   = this.color;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class FloatingShape {
    constructor(i) {
      this.i     = i;
      this.type  = ['hex', 'tri', 'square', 'circle', 'hex', 'tri'][i % 6];
      this.x     = (W / (SHAPE_COUNT + 1)) * (i + 1) + (Math.random() - 0.5) * 200;
      this.y     = Math.random() * H;
      this.size  = Math.random() * 40 + 25;
      this.rot   = Math.random() * Math.PI * 2;
      this.vrot  = (Math.random() - 0.5) * 0.006;
      this.vy    = (Math.random() - 0.5) * 0.15;
      this.vx    = (Math.random() - 0.5) * 0.1;
      this.color = COLORS[i % COLORS.length];
      this.alpha = Math.random() * 0.12 + 0.05;
    }
    update() {
      this.rot += this.vrot;
      this.y   += this.vy;
      this.x   += this.vx;
      if (this.y > H + 80) this.y = -80;
      if (this.y < -80)    this.y =  H + 80;
      if (this.x > W + 80) this.x = -80;
      if (this.x < -80)    this.x =  W + 80;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha   = this.alpha;
      ctx.strokeStyle   = this.color;
      ctx.lineWidth     = 1.5;
      ctx.shadowBlur    = 20;
      ctx.shadowColor   = this.color;
      ctx.beginPath();
      const s = this.size;
      if (this.type === 'hex') {
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k;
          k === 0 ? ctx.moveTo(Math.cos(a)*s, Math.sin(a)*s)
                  : ctx.lineTo(Math.cos(a)*s, Math.sin(a)*s);
        }
        ctx.closePath();
      } else if (this.type === 'tri') {
        for (let k = 0; k < 3; k++) {
          const a = (Math.PI * 2 / 3) * k - Math.PI / 2;
          k === 0 ? ctx.moveTo(Math.cos(a)*s, Math.sin(a)*s)
                  : ctx.lineTo(Math.cos(a)*s, Math.sin(a)*s);
        }
        ctx.closePath();
      } else if (this.type === 'square') {
        ctx.rect(-s/2, -s/2, s, s);
      } else {
        ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          ctx.save();
          ctx.globalAlpha = (1 - dist/100) * 0.12;
          ctx.strokeStyle = '#8b3cf7';
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  function drawGrid() {
    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.strokeStyle = '#8b3cf7';
    ctx.lineWidth   = 0.5;
    const CELL = 80;
    for (let x = 0; x < W; x += CELL) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += CELL) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    shapes    = Array.from({ length: SHAPE_COUNT    }, (_, i) => new FloatingShape(i));
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    shapes.forEach(s    => { s.update(); s.draw(); });
    drawConnections();
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { resize(); shapes.forEach((s,i) => new FloatingShape(i)); });
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

  init();
  loop();
})();
