/* ══════════════════════════════════════
   ASCII 3D DONUT — Reacts to Cursor
   ══════════════════════════════════════ */
(function () {
    const preTag = document.getElementById('ascii-donut');
    if (!preTag) return;

    let A = 0;
    let B = 0;

    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    // React to cursor movement
    window.addEventListener('mousemove', (e) => {
        // Normalize coordinates (-1 to 1)
        targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
        targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    function renderFrame() {
        const w = 150;
        const h = 60;

        const b = new Array(w * h);
        const z = new Array(w * h);

        // Smoothly interpolate current mouse position towards target
        currentMouseX += (targetMouseX - currentMouseX) * 0.05;
        currentMouseY += (targetMouseY - currentMouseY) * 0.05;

        // Spin automatically, speed influenced by mouse
        A += 0.04 + (currentMouseY * 0.03);
        B += 0.02 + (currentMouseX * 0.03);

        const cA = Math.cos(A), sA = Math.sin(A);
        const cB = Math.cos(B), sB = Math.sin(B);

        for (let k = 0; k < w * h; k++) {
            b[k] = k % w === w - 1 ? '\n' : ' ';
            z[k] = 0;
        }

        // Offset the donut position based on mouse
        // Multiplier controls how far it moves
        const offsetX = currentMouseX * 35;
        const offsetY = currentMouseY * 15;

        // Generate torus
        for (let j = 0; j < 6.28; j += 0.07) {
            const ct = Math.cos(j), st = Math.sin(j);
            for (let i = 0; i < 6.28; i += 0.02) {
                const sp = Math.sin(i), cp = Math.cos(i);
                const h2 = ct + 2;
                const D = 1 / (sp * h2 * sA + st * cA + 5);
                const t = sp * h2 * cA - st * sA;

                const x = Math.floor(w / 2 + offsetX + 40 * D * (cp * h2 * cB - t * sB));
                const y = Math.floor(h / 2 + offsetY + 20 * D * (cp * h2 * sB + t * cB));

                const o = x + w * y;
                const N = Math.floor(8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB));

                if (y >= 0 && y < h && x >= 0 && x < w && D > z[o]) {
                    z[o] = D;
                    const charIndex = N > 0 ? N : 0;
                    // Technical-looking shading
                    const chars = ".,-~:;=!*#$@";
                    b[o] = chars[charIndex] || '.';
                }
            }
        }

        preTag.textContent = b.join('');
        requestAnimationFrame(renderFrame);
    }

    renderFrame();
})();
