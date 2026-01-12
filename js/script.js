// js/script.js

let canvas, ctx, bgImage;
let scale = 0.2, offsetX = 0, offsetY = 0; 
let isDragging = false, startX, startY;
let clickCallback = null;
let activeFilter = 'All'; 

// Colors matching the Icons
const COLORS = {
    Available: { r: 46, g: 213, b: 115 },   // Green
    Booked:    { r: 255, g: 165, b: 2 },    // Orange
    Sold:      { r: 255, g: 71, b: 87 },    // Red
    Mortgage:  { r: 255, g: 215, b: 0 }     // Gold
};

export function setCanvasFilter(status) {
    activeFilter = status;
}

export function setupCanvas(canvasId, onPlotClick) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    clickCallback = onPlotClick;

    resizeCanvas();

    bgImage = new Image();
    // This is the PLOT LAYOUT image (The Map)
    bgImage.src = 'images/layout1.jpg'; 
    
    bgImage.onload = () => {
        const fitScale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
        scale = fitScale; 
        offsetX = (canvas.width - bgImage.width * scale) / 2;
        offsetY = (canvas.height - bgImage.height * scale) / 2;
    };

    addEventListeners();
    renderLoop(); 
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// --- CLEANER RENDER LOOP ---
export function renderLoop() {
    // Clear the canvas. This makes it TRANSPARENT so your CSS bg1.jpg shows through.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // REMOVED: The solid black fill lines were deleted here.

    // 2. Draw Map Image (The Layout)
    if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        ctx.drawImage(bgImage, offsetX, offsetY, bgImage.width * scale, bgImage.height * scale);
    }

    // 3. Draw Plot Overlays
    if (window.allPlots && window.allPlots.length > 0) {
        
        // Pulse for blinking effects
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2; 

        window.allPlots.forEach(p => {
            const x = offsetX + (p.x * scale);
            const y = offsetY + (p.y * scale);
            const w = p.w * scale;
            const h = p.h * scale;

            const rgb = COLORS[p.status] || {r: 255, g: 255, b: 255}; 

            let fillAlpha = 0;
            let strokeAlpha = 0;
            let shadowBlur = 0;

            // --- "HIDE CANVAS LAYING" LOGIC ---
            if (activeFilter === 'All') {
                // NORMAL VIEW: 
                // Fill is 0 (Transparent) so the Map is clearly visible.
                // Stroke is low so it's not disturbing.
                fillAlpha = 0.0; 
                strokeAlpha = 0.3; 
            } 
            else if (p.status === activeFilter) {
                // FILTER MATCH: Blink Color
                fillAlpha = 0.3 + (pulse * 0.4); 
                strokeAlpha = 1.0; 
                shadowBlur = 20 * pulse;
            } 
            else {
                // NON-MATCH: Fade out almost completely
                fillAlpha = 0.0; 
                strokeAlpha = 0.05; 
            }

            // Apply Glow
            if (shadowBlur > 0) {
                ctx.shadowColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                ctx.shadowBlur = shadowBlur;
            } else {
                ctx.shadowBlur = 0;
            }

            // Draw Box
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fillAlpha})`;
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${strokeAlpha})`;
            
            ctx.fillRect(x, y, w, h);
            ctx.lineWidth = 1; // Thin lines for cleaner look
            ctx.strokeRect(x, y, w, h);

            // Draw Text (Only if zoomed in enough, to reduce clutter)
            if(scale > 0.4 && activeFilter !== 'All') { 
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${Math.max(12, 14 * scale)}px Inter`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(p.plotNumber, x + w/2, y + h/2);
            }
        });
    }

    requestAnimationFrame(renderLoop);
}

function addEventListeners() {
    window.addEventListener('resize', resizeCanvas);

    // Mouse Pan
    canvas.addEventListener('mousedown', e => { isDragging = true; startX = e.clientX - offsetX; startY = e.clientY - offsetY; });
    canvas.addEventListener('mousemove', e => { if (isDragging) { offsetX = e.clientX - startX; offsetY = e.clientY - startY; } });
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    
    // Touch Pan
    canvas.addEventListener('touchstart', e => { isDragging = true; startX = e.touches[0].clientX - offsetX; startY = e.touches[0].clientY - offsetY; }, {passive: false});
    canvas.addEventListener('touchmove', e => { if (isDragging) { e.preventDefault(); offsetX = e.touches[0].clientX - startX; offsetY = e.touches[0].clientY - startY; } }, {passive: false});
    canvas.addEventListener('touchend', () => { isDragging = false; });

    // Zoom
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.min(Math.max(0.1, scale + delta), 4.0);
        const mx = e.clientX - offsetX;
        const my = e.clientY - offsetY;
        offsetX -= mx * (newScale / scale - 1);
        offsetY -= my * (newScale / scale - 1);
        scale = newScale;
    }, {passive: false});

    // Click
    canvas.addEventListener('click', e => {
        if (isDragging || !clickCallback || !window.allPlots) return;
        const mx = (e.clientX - offsetX) / scale;
        const my = (e.clientY - offsetY) / scale;
        const plot = window.allPlots.find(p => mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h);
        if (plot) clickCallback(plot);
    });
}