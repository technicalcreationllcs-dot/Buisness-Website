document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("intro-container");
    if (!container) return;

    // ── SHOW INTRO ONLY ONCE per session OR ON RELOAD ──
    let isReload = false;
    try {
        const navEntries = performance.getEntriesByType("navigation");
        if (navEntries.length > 0 && navEntries[0].type === 'reload') {
            isReload = true;
        } else if (performance.navigation && performance.navigation.type === 1) {
            isReload = true;
        }
    } catch (e) {
        // Fallback or ignore if performance API is not available
    }

    let hasSeenIntro = false;
    try {
        hasSeenIntro = sessionStorage.getItem('introSeen');
    } catch (e) {
        // Fallback for file:// security errors
    }

    // Play intro if it's the very first visit OR if explicitly reloaded
    if (hasSeenIntro && !isReload) {
        container.style.display = 'none';
        return;
    }

    // Mark as seen immediately so any fast navigation won't break it
    try {
        sessionStorage.setItem('introSeen', '1');
    } catch (e) {}

    document.body.style.overflow = 'hidden';

    // Hide the static instruction text immediately
    const instructionEl = document.getElementById('intro-instruction');
    if (instructionEl) instructionEl.style.display = 'none';

    // ── TIMED HINT SYSTEM ──
    // Click helper references (created after scene is set up)
    let hintTimers = [];
    let hintFlashEl = null;
    let hintCursorEl = null;

    function setupHintTimers(triggerClick) {
        // 5s — flash "Click the Bagel" at bottom
        hintTimers.push(setTimeout(() => {
            hintFlashEl = document.createElement('div');
            hintFlashEl.textContent = 'CLICK THE BAGEL';
            hintFlashEl.style.cssText = 'position:absolute;bottom:40px;left:50%;transform:translateX(-50%);font-family:"Courier New",monospace;font-size:16px;letter-spacing:4px;color:rgba(255,200,100,0.9);text-transform:uppercase;pointer-events:none;z-index:20;animation:hintFlash 2s ease-in-out infinite;text-shadow:0 0 20px rgba(255,200,100,0.5);';
            container.appendChild(hintFlashEl);

            // Add flash animation
            if (!document.getElementById('hint-flash-style')) {
                const style = document.createElement('style');
                style.id = 'hint-flash-style';
                style.textContent = '@keyframes hintFlash{0%,100%{opacity:0}50%{opacity:1}}';
                document.head.appendChild(style);
            }
        }, 5000));

        // 10s — auto-start the transition (5 seconds after flash)
        hintTimers.push(setTimeout(() => {
            clearHints();
            triggerClick();
        }, 10000));
    }

    function clearHints() {
        hintTimers.forEach(t => clearTimeout(t));
        hintTimers = [];
        if (hintFlashEl) { hintFlashEl.remove(); hintFlashEl = null; }
        if (hintCursorEl) { hintCursorEl.remove(); hintCursorEl = null; }
    }

    // ════════════════════════════════════════════
    // RENDERER SETUP (r128 compatible)
    // ════════════════════════════════════════════
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Subtle film grain
    const grainEl = document.createElement('canvas');
    grainEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:overlay;opacity:0.05;z-index:10;';
    grainEl.width = 256; grainEl.height = 256;
    container.appendChild(grainEl);
    const grainCtx = grainEl.getContext('2d');
    function tickGrain() {
        const d = grainCtx.createImageData(256, 256);
        for (let i = 0; i < d.data.length; i += 4) {
            const v = Math.random() * 255;
            d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
            d.data[i + 3] = 255;
        }
        grainCtx.putImageData(d, 0, 0);
    }

    // Flash overlay for transition
    const flashDiv = document.createElement('div');
    flashDiv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:30;';
    container.appendChild(flashDiv);

    // ════════════════════════════════════════════
    // LIGHTING — ominous with sun core
    // ════════════════════════════════════════════
    const ambient = new THREE.AmbientLight(0x111111, 0.15);
    const hemi = new THREE.HemisphereLight(0x222222, 0x000000, 0.1);
    // Back light — casts shadow silhouette
    const backLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    backLight.position.set(0, 2, -12);
    backLight.castShadow = true;
    // Bottom uplight — ominous underglow
    const bottomLight = new THREE.PointLight(0xff8844, 0.6, 30);
    bottomLight.position.set(0, -8, 2);
    // BLINDING SUN CORE
    const coreGlow = new THREE.PointLight(0xffffff, 20, 60);
    coreGlow.position.set(0, 0, 0);

    // SPOTLIGHT — flashlight blasting at the viewer
    const spotLight = new THREE.SpotLight(0xffffff, 8, 80, Math.PI / 3, 0.3, 0.5);
    spotLight.position.set(0, 0, 0);
    spotLight.target.position.set(0, 0, 10);

    scene.add(ambient, hemi, backLight, bottomLight);

    // VISIBLE SUN ORB — big blinding white core
    const sunGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);

    // Halo layer 1 — tight bright
    const halo1 = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, side: THREE.BackSide })
    );
    // Halo layer 2 — medium warm
    const halo2 = new THREE.Mesh(
        new THREE.SphereGeometry(2.5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffeedd, transparent: true, opacity: 0.2, side: THREE.BackSide })
    );
    // Halo layer 3 — wide faint
    const halo3 = new THREE.Mesh(
        new THREE.SphereGeometry(4.0, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffddbb, transparent: true, opacity: 0.08, side: THREE.BackSide })
    );

    const bagelGroup = new THREE.Group();
    bagelGroup.add(coreGlow, spotLight, spotLight.target, sunMesh, halo1, halo2, halo3);
    scene.add(bagelGroup);

    // ═══ ORGANIC FLASHLIGHT GLARE — Canvas-based, no geometric shapes ═══
    // Uses a canvas with painted irregular light blobs instead of CSS circles/lines
    const glareCanvas = document.createElement('canvas');
    glareCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;mix-blend-mode:screen;';
    container.appendChild(glareCanvas);
    const glareCtx = glareCanvas.getContext('2d');

    // Match canvas pixel size to container
    function resizeGlare() {
        glareCanvas.width = window.innerWidth;
        glareCanvas.height = window.innerHeight;
    }
    resizeGlare();
    window.addEventListener('resize', resizeGlare);

    // Helper: project bagel center to screen coordinates
    function getBagelScreenPos() {
        const v = new THREE.Vector3(0, bagelGroup.position.y, 0);
        v.project(camera);
        return {
            x: (v.x * 0.5 + 0.5) * window.innerWidth,
            y: (-v.y * 0.5 + 0.5) * window.innerHeight,
        };
    }

    // Paint a single frame of organic glare at position (cx, cy)
    function paintGlare(cx, cy, t) {
        const w = glareCanvas.width, h = glareCanvas.height;
        glareCtx.clearRect(0, 0, w, h);

        // Breathing intensity — organic, never static
        const breath = 0.88 + Math.sin(t * 2.3) * 0.12;
        const breath2 = 0.92 + Math.sin(t * 1.6 + 0.7) * 0.08;
        const breath3 = 0.9 + Math.sin(t * 3.1 + 1.4) * 0.1;

        // ── 1. BLINDING OVEREXPOSED CORE — large blown-out white mass ──
        const coreOffX = Math.sin(t * 1.1) * 4;
        const coreOffY = Math.cos(t * 0.9) * 3;
        const coreR = 120 * breath;
        const coreGrad = glareCtx.createRadialGradient(
            cx + coreOffX, cy + coreOffY, 0,
            cx + coreOffX, cy + coreOffY, coreR
        );
        coreGrad.addColorStop(0, 'rgba(255,255,255,1)');
        coreGrad.addColorStop(0.1, `rgba(255,255,255,${0.98 * breath})`);
        coreGrad.addColorStop(0.25, `rgba(255,255,252,${0.85 * breath})`);
        coreGrad.addColorStop(0.45, `rgba(255,250,240,${0.55 * breath})`);
        coreGrad.addColorStop(0.7, `rgba(255,240,220,${0.2 * breath})`);
        coreGrad.addColorStop(1, 'rgba(255,230,200,0)');
        glareCtx.fillStyle = coreGrad;
        glareCtx.fillRect(0, 0, w, h);

        // ── 2. SECOND CORE PASS — slight offset for irregular shape ──
        glareCtx.save();
        glareCtx.globalCompositeOperation = 'lighter';
        const core2 = glareCtx.createRadialGradient(
            cx - coreOffX * 1.5, cy + coreOffY * 0.8, 0,
            cx - coreOffX * 1.5, cy + coreOffY * 0.8, 90 * breath2
        );
        core2.addColorStop(0, `rgba(255,255,255,${0.7 * breath2})`);
        core2.addColorStop(0.3, `rgba(255,252,245,${0.4 * breath2})`);
        core2.addColorStop(0.6, `rgba(255,245,230,${0.12 * breath2})`);
        core2.addColorStop(1, 'rgba(255,240,220,0)');
        glareCtx.fillStyle = core2;
        glareCtx.fillRect(0, 0, w, h);
        glareCtx.restore();

        // ── 3. MASSIVE WARM BLOOM — fills bagel hole area ──
        glareCtx.save();
        glareCtx.translate(cx, cy);
        const scaleX = 1.4 + Math.sin(t * 0.7) * 0.2;
        const scaleY = 1.05 + Math.cos(t * 0.9 + 0.5) * 0.15;
        glareCtx.scale(scaleX, scaleY);
        glareCtx.translate(-cx, -cy);

        const bloomGrad = glareCtx.createRadialGradient(
            cx + Math.sin(t * 0.8) * 12, cy + Math.cos(t * 0.6) * 8, 15,
            cx, cy, 450 * breath2
        );
        bloomGrad.addColorStop(0, `rgba(255,252,245,${0.6 * breath2})`);
        bloomGrad.addColorStop(0.15, `rgba(255,245,230,${0.4 * breath2})`);
        bloomGrad.addColorStop(0.35, `rgba(255,235,210,${0.18 * breath2})`);
        bloomGrad.addColorStop(0.6, `rgba(255,220,190,${0.06 * breath2})`);
        bloomGrad.addColorStop(1, 'rgba(255,200,150,0)');
        glareCtx.fillStyle = bloomGrad;
        glareCtx.fillRect(0, 0, w, h);
        glareCtx.restore();

        // ── 4. OVEREXPOSURE WASH — giant all-encompassing light fog ──
        glareCtx.save();
        glareCtx.translate(cx, cy);
        glareCtx.scale(1.8, 1.0);
        glareCtx.translate(-cx, -cy);
        const washGrad = glareCtx.createRadialGradient(
            cx + Math.sin(t * 0.3) * 20, cy + Math.cos(t * 0.25) * 12, 40,
            cx, cy, 900
        );
        washGrad.addColorStop(0, `rgba(255,250,240,${0.2 * breath3})`);
        washGrad.addColorStop(0.2, `rgba(255,245,230,${0.12 * breath3})`);
        washGrad.addColorStop(0.45, `rgba(255,235,215,${0.05 * breath3})`);
        washGrad.addColorStop(0.7, `rgba(255,225,200,${0.015 * breath3})`);
        washGrad.addColorStop(1, 'rgba(255,220,190,0)');
        glareCtx.fillStyle = washGrad;
        glareCtx.fillRect(0, 0, w, h);
        glareCtx.restore();

        // ── 5. ATMOSPHERIC HAZE — irregular warm fog ──
        glareCtx.save();
        glareCtx.translate(cx, cy);
        glareCtx.scale(1.7, 0.85);
        glareCtx.translate(-cx, -cy);
        const hazeGrad = glareCtx.createRadialGradient(
            cx + Math.sin(t * 0.4) * 20, cy + Math.cos(t * 0.3) * 15, 50,
            cx, cy, 700
        );
        hazeGrad.addColorStop(0, `rgba(255,248,235,${0.18 * breath})`);
        hazeGrad.addColorStop(0.25, `rgba(255,240,220,${0.1 * breath})`);
        hazeGrad.addColorStop(0.5, `rgba(255,230,205,${0.04 * breath})`);
        hazeGrad.addColorStop(1, 'rgba(255,220,190,0)');
        glareCtx.fillStyle = hazeGrad;
        glareCtx.fillRect(0, 0, w, h);
        glareCtx.restore();

        // ── 6. MASSIVE ESCAPING LIGHT — volumetric rays rushing toward the viewer ──
        // Light originates from different points around the bagel hole rim
        // and WIDENS as it escapes toward the camera (perspective effect)
        glareCtx.save();
        glareCtx.globalCompositeOperation = 'lighter';

        // --- TIER 1: Long escape rays reaching far out ---
        const longRayCount = 45;
        for (let i = 0; i < longRayCount; i++) {
            // Chaotic angle distribution — not evenly spaced
            const hash = Math.sin(i * 127.1 + 311.7) * 43758.5453;
            const baseAngle = (hash - Math.floor(hash)) * Math.PI * 2;
            const wobble = Math.sin(t * (0.3 + (i % 7) * 0.08) + i * 1.3) * 0.12;
            const angle = baseAngle + wobble;

            // Ray originates from a point on the bagel hole rim, not dead center
            const rimDist = 15 + Math.abs(Math.sin(i * 3.1)) * 25;
            const originX = Math.cos(angle) * rimDist;
            const originY = Math.sin(angle) * rimDist;

            // Varying lengths — some reach screen edges
            const lenHash = Math.sin(i * 73.1 + 7.7);
            const rayLen = 250 + Math.abs(lenHash) * 550 + Math.sin(t * 0.8 + i * 0.5) * 100;

            // Base width at origin — narrow where light exits the hole
            const widthBase = 2 + Math.abs(Math.sin(i * 5.3)) * 8;
            // Tip width — MUCH wider (light fans out toward viewer)
            const widthTip = widthBase * (2.5 + Math.abs(Math.sin(i * 2.7)) * 4);

            // Opacity — chaotic variation
            const alphaHash = Math.sin(i * 41.3 + 2.9);
            const rayAlpha = (0.03 + Math.abs(alphaHash) * 0.1) * breath;

            glareCtx.save();
            glareCtx.translate(cx + originX, cy + originY);
            glareCtx.rotate(angle);
            glareCtx.globalAlpha = rayAlpha;

            // Gradient — bright near hole, fading as it escapes
            const rayGrad = glareCtx.createLinearGradient(0, 0, rayLen, 0);
            rayGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
            rayGrad.addColorStop(0.03, 'rgba(255,253,248,0.65)');
            rayGrad.addColorStop(0.1, 'rgba(255,250,240,0.4)');
            rayGrad.addColorStop(0.3, 'rgba(255,245,230,0.18)');
            rayGrad.addColorStop(0.6, 'rgba(255,240,220,0.06)');
            rayGrad.addColorStop(1, 'rgba(255,235,215,0)');
            glareCtx.fillStyle = rayGrad;

            // Tapered shape — narrow at origin, WIDE at tip (toward viewer)
            glareCtx.beginPath();
            glareCtx.moveTo(0, -widthBase / 2);
            glareCtx.lineTo(rayLen, -widthTip / 2);
            glareCtx.lineTo(rayLen, widthTip / 2);
            glareCtx.lineTo(0, widthBase / 2);
            glareCtx.closePath();
            glareCtx.fill();
            glareCtx.restore();
        }

        // --- TIER 2: Medium burst rays — wider, more chaotic ---
        for (let i = 0; i < 30; i++) {
            const hash = Math.sin(i * 89.3 + 173.1) * 21345.67;
            const angle = (hash - Math.floor(hash)) * Math.PI * 2 + Math.sin(t * 0.5 + i * 2.3) * 0.18;

            const rimDist = 10 + Math.abs(Math.sin(i * 7.7)) * 20;
            const originX = Math.cos(angle) * rimDist;
            const originY = Math.sin(angle) * rimDist;

            const rayLen = 120 + Math.abs(Math.sin(i * 11.3)) * 300 + Math.sin(t * 1.3 + i * 0.7) * 60;
            const widthBase = 5 + Math.abs(Math.sin(i * 4.1)) * 15;
            const widthTip = widthBase * (3 + Math.abs(Math.sin(i * 6.3)) * 5);
            const rayAlpha = (0.025 + Math.abs(Math.sin(i * 31.7)) * 0.07) * breath2;

            glareCtx.save();
            glareCtx.translate(cx + originX, cy + originY);
            glareCtx.rotate(angle);
            glareCtx.globalAlpha = rayAlpha;

            const bGrad = glareCtx.createLinearGradient(0, 0, rayLen, 0);
            bGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
            bGrad.addColorStop(0.08, 'rgba(255,250,240,0.45)');
            bGrad.addColorStop(0.25, 'rgba(255,245,230,0.2)');
            bGrad.addColorStop(0.55, 'rgba(255,240,220,0.06)');
            bGrad.addColorStop(1, 'rgba(255,235,215,0)');
            glareCtx.fillStyle = bGrad;

            glareCtx.beginPath();
            glareCtx.moveTo(0, -widthBase / 2);
            glareCtx.lineTo(rayLen, -widthTip / 2);
            glareCtx.lineTo(rayLen, widthTip / 2);
            glareCtx.lineTo(0, widthBase / 2);
            glareCtx.closePath();
            glareCtx.fill();
            glareCtx.restore();
        }

        // --- TIER 3: Short bright flare splashes near the core ---
        for (let i = 0; i < 25; i++) {
            const hash = Math.sin(i * 53.7 + 97.1) * 9876.54;
            const angle = (hash - Math.floor(hash)) * Math.PI * 2 + Math.sin(t * 0.7 + i * 1.9) * 0.25;

            const rimDist = 5 + Math.abs(Math.sin(i * 9.3)) * 15;
            const rayLen = 40 + Math.abs(Math.sin(i * 13.7)) * 120 + Math.sin(t * 2.1 + i * 1.1) * 25;
            const widthBase = 8 + Math.abs(Math.sin(i * 3.3)) * 30;
            const widthTip = widthBase * (2 + Math.abs(Math.sin(i * 8.1)) * 3);
            const rayAlpha = (0.03 + Math.abs(Math.sin(i * 17.3)) * 0.09) * breath3;

            glareCtx.save();
            glareCtx.translate(cx + Math.cos(angle) * rimDist, cy + Math.sin(angle) * rimDist);
            glareCtx.rotate(angle);
            glareCtx.globalAlpha = rayAlpha;

            const sGrad = glareCtx.createLinearGradient(0, 0, rayLen, 0);
            sGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
            sGrad.addColorStop(0.1, 'rgba(255,252,245,0.6)');
            sGrad.addColorStop(0.4, 'rgba(255,248,235,0.2)');
            sGrad.addColorStop(1, 'rgba(255,244,230,0)');
            glareCtx.fillStyle = sGrad;

            glareCtx.beginPath();
            glareCtx.moveTo(0, -widthBase / 2);
            glareCtx.lineTo(rayLen, -widthTip / 2);
            glareCtx.lineTo(rayLen, widthTip / 2);
            glareCtx.lineTo(0, widthBase / 2);
            glareCtx.closePath();
            glareCtx.fill();
            glareCtx.restore();
        }
        glareCtx.restore();

        // ── 9. PHOTON NOISE — irregular sensor scatter ──
        glareCtx.save();
        glareCtx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 200; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = (Math.random() + Math.random() + Math.random()) / 3 * 220;
            const nx = cx + Math.cos(angle) * dist;
            const ny = cy + Math.sin(angle) * dist * 0.65;
            const size = 0.5 + Math.random() * 3.5;
            const alpha = Math.max(0, 0.09 - dist * 0.0003) * breath;
            if (alpha > 0.001) {
                glareCtx.globalAlpha = alpha;
                glareCtx.fillStyle = Math.random() > 0.6 ? '#fff8f0' : '#ffffff';
                glareCtx.beginPath();
                glareCtx.arc(nx, ny, size, 0, Math.PI * 2);
                glareCtx.fill();
            }
        }
        glareCtx.restore();

        // ── 9. CHROMATIC ABERRATION — warm/cool edge fringing ──
        glareCtx.save();
        glareCtx.globalCompositeOperation = 'lighter';
        glareCtx.globalAlpha = 0.07 * breath;
        const warmFringe = glareCtx.createRadialGradient(cx + 5, cy + 3, 50, cx + 5, cy + 3, 160);
        warmFringe.addColorStop(0, 'transparent');
        warmFringe.addColorStop(0.4, 'rgba(255,170,60,0.35)');
        warmFringe.addColorStop(0.7, 'rgba(255,140,40,0.15)');
        warmFringe.addColorStop(1, 'transparent');
        glareCtx.fillStyle = warmFringe;
        glareCtx.fillRect(0, 0, w, h);
        const coolFringe = glareCtx.createRadialGradient(cx - 5, cy - 3, 45, cx - 5, cy - 3, 150);
        coolFringe.addColorStop(0, 'transparent');
        coolFringe.addColorStop(0.4, 'rgba(120,170,255,0.25)');
        coolFringe.addColorStop(0.7, 'rgba(100,150,255,0.1)');
        coolFringe.addColorStop(1, 'transparent');
        glareCtx.fillStyle = coolFringe;
        glareCtx.fillRect(0, 0, w, h);
        glareCtx.restore();
    }

    // ════════════════════════════════════════════
    // PROCEDURAL TEXTURES (2048px)
    // ════════════════════════════════════════════
    function bakeBreadTex() {
        const c = document.createElement('canvas');
        c.width = 2048; c.height = 2048;
        const x = c.getContext('2d');

        // Base dough color
        x.fillStyle = '#c8923a';
        x.fillRect(0, 0, 2048, 2048);

        // Darker toasted splotches
        for (let i = 0; i < 4000; i++) {
            x.globalAlpha = 0.06 + Math.random() * 0.18;
            x.fillStyle = Math.random() > 0.3 ? '#6b3a10' : '#a06820';
            x.beginPath();
            x.ellipse(
                Math.random() * 2048, Math.random() * 2048,
                6 + Math.random() * 30, 3 + Math.random() * 15,
                Math.random() * Math.PI, 0, Math.PI * 2
            );
            x.fill();
        }

        // Fine pore noise
        for (let i = 0; i < 300000; i++) {
            x.globalAlpha = Math.random() * 0.15;
            x.fillStyle = Math.random() > 0.5 ? '#5a2a08' : '#d4a555';
            x.fillRect(Math.random() * 2048, Math.random() * 2048, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }

        x.globalAlpha = 1;
        const t = new THREE.CanvasTexture(c);
        t.encoding = THREE.sRGBEncoding;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }

    function bakeNormalMap() {
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 1024;
        const x = c.getContext('2d');
        x.fillStyle = '#8080ff';
        x.fillRect(0, 0, 1024, 1024);

        for (let i = 0; i < 100000; i++) {
            x.globalAlpha = Math.random() * 0.1;
            const r = 128 + (Math.random() - 0.5) * 60;
            const g = 128 + (Math.random() - 0.5) * 60;
            x.fillStyle = `rgb(${r | 0},${g | 0},255)`;
            x.fillRect(Math.random() * 1024, Math.random() * 1024, Math.random() * 3, Math.random() * 3);
        }

        x.globalAlpha = 1;
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }

    // ════════════════════════════════════════════
    // BAGEL GEOMETRY — organic torus
    // ════════════════════════════════════════════
    function makeBagel() {
        const R = 3, tube = 1.25;
        const g = new THREE.TorusGeometry(R, tube, 200, 400);
        const p = g.attributes.position;

        for (let i = 0; i < p.count; i++) {
            let px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
            const angle = Math.atan2(py, px);
            const cx = px - Math.cos(angle) * R;
            const cy = py - Math.sin(angle) * R;

            // Natural thickness variation (fatter on one side)
            const thick = 1.0 + Math.sin(angle) * 0.08;
            const thick2 = 1.0 + Math.cos(angle * 2.3 + 0.5) * 0.03;
            px = Math.cos(angle) * R + cx * thick * thick2;
            py = Math.sin(angle) * R + cy * thick * thick2;
            pz *= thick * thick2;

            // Gentle dough bubbles (low amplitude — smooth, not crumpled)
            const n1 = Math.sin(px * 5) * Math.cos(py * 5) * Math.sin(pz * 5) * 0.035;
            const n2 = Math.sin(px * 11 + 1.1) * Math.cos(pz * 9) * 0.012;

            const len = Math.sqrt(cx * cx + cy * cy + pz * pz);
            if (len > 0.001) {
                px += (cx / len) * (n1 + n2);
                py += (cy / len) * (n1 + n2);
                pz += (pz / len) * (n1 + n2);
            }
            p.setXYZ(i, px, py, pz);
        }
        g.computeVertexNormals();
        return g;
    }

    // ════════════════════════════════════════════
    // SEEDS — r128-compatible InstancedMesh
    // ════════════════════════════════════════════
    function addSeeds(bagelGeom, count, hexColor, seedGeom) {
        const mat = new THREE.MeshStandardMaterial({
            color: hexColor,
            roughness: 0.5,
            metalness: 0.05,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.InstancedMesh(seedGeom, mat, count);
        const dummy = new THREE.Object3D();
        const posArr = bagelGeom.attributes.position;
        const normArr = bagelGeom.attributes.normal;
        const vertCount = posArr.count;

        for (let i = 0; i < count; i++) {
            let vi;
            for (let r = 0; r < 10; r++) {
                vi = Math.floor(Math.random() * vertCount);
                if (posArr.getZ(vi) > -0.3) break;
            }
            const bx = posArr.getX(vi), by = posArr.getY(vi), bz = posArr.getZ(vi);
            const nx = normArr.getX(vi), ny = normArr.getY(vi), nz = normArr.getZ(vi);

            dummy.position.set(bx + nx * 0.04, by + ny * 0.04, bz + nz * 0.04);
            dummy.lookAt(bx + nx * 2, by + ny * 2, bz + nz * 2);
            dummy.rotateZ(Math.random() * Math.PI * 2);
            dummy.scale.setScalar(0.6 + Math.random() * 0.5);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        bagelGroup.add(mesh);
    }

    // ════════════════════════════════════════════
    // ENVIRONMENT PARTICLES
    // ════════════════════════════════════════════
    function scatterParticles() {
        const count = 800;
        const g = new THREE.BufferGeometry();
        const a = [];
        for (let i = 0; i < count; i++) {
            a.push(
                (Math.random() - 0.5) * 36,
                (Math.random() - 0.5) * 36,
                (Math.random() - 0.5) * 18
            );
        }
        g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
        const m = new THREE.PointsMaterial({
            color: 0xffeedd,
            size: 0.03,
            transparent: true,
            opacity: 0.5,
            sizeAttenuation: true
        });
        scene.add(new THREE.Points(g, m));
    }

    // ════════════════════════════════════════════
    // BUILD THE SCENE
    // ════════════════════════════════════════════
    const bagelGeom = makeBagel();
    const breadTex = bakeBreadTex();
    const normalTex = bakeNormalMap();

    const bagelMat = new THREE.MeshStandardMaterial({
        map: breadTex,
        normalMap: normalTex,
        normalScale: new THREE.Vector2(0.5, 0.5),
        color: 0xd9a050,
        roughness: 0.6,
        metalness: 0.0,
    });
    bagelGroup.add(new THREE.Mesh(bagelGeom, bagelMat));

    // Sesame seeds (tapered cylinders)
    addSeeds(bagelGeom, 800, 0xf5e6c8, new THREE.CylinderGeometry(0.02, 0.03, 0.12, 8, 1));
    // Poppy seeds (small dark spheres)
    addSeeds(bagelGeom, 500, 0x0a0a0a, new THREE.SphereGeometry(0.035, 8, 8));
    // Onion/garlic flakes (thin circles)
    addSeeds(bagelGeom, 300, 0xd2b48c, new THREE.CircleGeometry(0.07, 8));

    scatterParticles();

    // ════════════════════════════════════════════
    // MOUSE PARALLAX + RESIZE
    // ════════════════════════════════════════════
    let mx = 0, my = 0;
    const hw = window.innerWidth / 2, hh = window.innerHeight / 2;
    document.addEventListener('mousemove', e => { mx = e.clientX - hw; my = e.clientY - hh; });
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ════════════════════════════════════════════
    // CLICK → INTERDIMENSIONAL LIGHT TAKEOVER → SITE
    // ════════════════════════════════════════════
    let transitioning = false;
    let transitionIntensity = 1; // multiplier for glare during zoom (1 = normal, ramps to 5+)

    function startTransition() {
        if (transitioning) return;
        transitioning = true;
        clearHints();
        sessionStorage.setItem('introSeen', '1');

        if (typeof gsap === 'undefined') {
            container.style.display = 'none';
            document.body.style.overflow = '';
            return;
        }

        const tl = gsap.timeline();

        // ── FAST TRANSITION: Camera rushes toward hole, light ESCALATES ──
        tl.to(camera.position, { z: 4, duration: 1.2, ease: 'power2.in' }, 0);

        // Ramp up glare intensity as we zoom in
        tl.to({ val: 1 }, {
            val: 5,
            duration: 1.2,
            ease: 'power2.in',
            onUpdate: function () { transitionIntensity = this.targets()[0].val; }
        }, 0);

        // Fast white takeover
        tl.to(flashDiv, { opacity: 1, duration: 1.2, ease: 'power2.in' }, 0);

        // Final smooth white takeover and reveal the site
        tl.call(() => {
            container.style.display = 'none';
            container.style.pointerEvents = 'none';
            document.body.style.overflow = '';

            // Clean up
            renderer.dispose();

            // Body-level flash that fades to reveal the website
            const bodyFlash = document.createElement('div');
            bodyFlash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:99999;opacity:1;';
            document.body.appendChild(bodyFlash);
            gsap.to(bodyFlash, {
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                onComplete: () => bodyFlash.remove()
            });
        }, null, 1.2);
    }
    container.addEventListener('click', startTransition);

    // ════════════════════════════════════════════
    // RENDER LOOP
    // ════════════════════════════════════════════
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        if (!transitioning) {
            // Gentle levitation
            bagelGroup.position.y = Math.sin(t * 1.2) * 0.3;

            // Mouse parallax
            camera.position.x += (mx * 0.004 - camera.position.x) * 0.04;
            camera.position.y += (-my * 0.004 - camera.position.y) * 0.04;
            camera.lookAt(scene.position);

            // ── ORGANIC PULSE — Three.js light breathing ──
            const pulse = 0.88 + Math.sin(t * 2.8) * 0.12;
            const pulse2 = 0.92 + Math.sin(t * 1.7 + 1.2) * 0.08;
            const pulse3 = 0.95 + Math.sin(t * 4.1 + 0.5) * 0.05;
            coreGlow.intensity = 20 * pulse;
            sunMesh.scale.setScalar(0.8 * pulse2);
            halo1.material.opacity = 0.4 * pulse;
            halo2.material.opacity = 0.2 * pulse2;
            halo3.material.opacity = 0.08 * pulse3;

            // ── CANVAS GLARE — paint organic light at bagel position ──
            const sp = getBagelScreenPos();
            paintGlare(sp.x, sp.y, t);
        } else {
            // During transition — ESCALATE the light, don't fade it
            camera.lookAt(scene.position);

            // Boost Three.js lights as we zoom
            coreGlow.intensity = 20 * transitionIntensity;
            sunMesh.scale.setScalar(0.8 * transitionIntensity);
            halo1.material.opacity = Math.min(1, 0.4 * transitionIntensity);
            halo2.material.opacity = Math.min(1, 0.2 * transitionIntensity);
            halo3.material.opacity = Math.min(1, 0.08 * transitionIntensity);

            // Keep painting glare with escalating intensity
            if (glareCanvas.style.display !== 'none') {
                const sp = getBagelScreenPos();
                // Temporarily boost breath values via transitionIntensity
                const savedPaintGlare = paintGlare;
                const origBreathMult = transitionIntensity;
                // Override canvas globalAlpha to boost everything
                glareCtx.save();
                glareCanvas.style.opacity = Math.min(1, origBreathMult * 0.3);
                glareCtx.restore();
                paintGlare(sp.x, sp.y, t);
            }
        }

        renderer.render(scene, camera);
        if (Math.random() > 0.75) tickGrain();
    }
    animate();
    setupHintTimers(startTransition);
});
