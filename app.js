document.addEventListener('DOMContentLoaded', () => {

    const card = document.getElementById('cv-card');
    const scene = document.getElementById('scene');
    const glare = document.getElementById('card-glare');
    
    // UI elements
    const btnFr = document.getElementById('btn-fr');
    const btnNl = document.getElementById('btn-nl');
    const pdfFr = document.getElementById('pdf-fr');
    const pdfNl = document.getElementById('pdf-nl');
    
    const ambientLight1 = document.querySelector('.ambient-light');
    const ambientLight2 = document.querySelector('.ambient-light.light-2');

    // ── 0. PDF.js Setup (No iframe!) ──
    // Load local PDFs and render onto the canvas
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    async function renderPDF(url, canvasId) {
        try {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdfDocument = await loadingTask.promise;
            const page = await pdfDocument.getPage(1); // Resume usually 1 page
            
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            
            // High DPI scaling so the CV looks ultra crisp
            const scale = 2.5; 
            const viewport = page.getViewport({ scale: scale });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
        } catch (error) {
            console.error('Error rendering PDF:', error);
        }
    }

    // Render both local PDFs (these paths must match the file names in your folder EXACTLY)
    renderPDF('cv-fr.pdf', 'pdf-canvas-fr');
    renderPDF('cv-nl.pdf', 'pdf-canvas-nl');


    // ── 1. Entry Animations ──
    gsap.set(card, { scale: 0.8, opacity: 0, rotationX: 20, y: 50 });
    gsap.set('.header', { y: -40, opacity: 0 });

    const initTl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    initTl.to('.header', {
        y: 0,
        opacity: 1,
        duration: 1.5,
        delay: 0.2
    })
    .to(card, {
        scale: 1,
        opacity: 1,
        rotationX: 0,
        y: 0,
        duration: 1.8,
        clearProps: 'scale,y' 
    }, "-=1.2");


    // ── 2. Highly Reactive Mouse Parallax (WOW Effect) ──
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (!isTouchDevice) {
        scene.addEventListener('mousemove', (e) => {
            if (card.classList.contains('fullscreen')) return;
            
            const x = e.clientX;
            const y = e.clientY;
            
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Much stronger tilt limits (up to 18 degrees)
            const rotX = ((y - centerY) / centerY) * -18; 
            const rotY = ((x - centerX) / centerX) * 18;
            
            // Dynamic Glare effect (moves relative to mouse)
            const glareX = ((x / window.innerWidth) * 100);
            const glareY = ((y / window.innerHeight) * 100);
            glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`;

            // Super fluid rotation
            gsap.to(card, {
                rotationX: rotX,
                rotationY: rotY,
                duration: 0.5, // Faster response time = more reactive!
                ease: "power2.out",
                transformPerspective: 1200
            });

            // Ambient lights react sharply to mouse movement
            gsap.to(ambientLight1, {
                x: (x - centerX) * 0.15,
                y: (y - centerY) * 0.15,
                duration: 1, ease: "power2.out"
            });
            gsap.to(ambientLight2, {
                x: (x - centerX) * -0.1,
                y: (y - centerY) * -0.1,
                duration: 1.2, ease: "power2.out"
            });
        });

        scene.addEventListener('mouseleave', () => {
            if (card.classList.contains('fullscreen')) return;
            gsap.to(card, { rotationX: 0, rotationY: 0, duration: 1.5, ease: "elastic.out(1, 0.5)" });
            gsap.to([ambientLight1, ambientLight2], { x: 0, y: 0, duration: 2, ease: "power3.out" });
        });
    }

    // ── 2.5. Fullscreen Toggle ──
    card.addEventListener('click', () => {
        const isFullscreen = card.classList.contains('fullscreen');
        
        if (!isFullscreen) {
            // Flatten immediately so CSS takes over
            gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.3, ease: "power2.out" });
            card.classList.add('fullscreen');
            gsap.to('.ui-layer', { opacity: 0, pointerEvents: 'none', duration: 0.3 });
        } else {
            card.classList.remove('fullscreen');
            gsap.to('.ui-layer', { opacity: 1, pointerEvents: 'auto', duration: 0.3, delay: 0.2 });
        }
    });

    // ── 3. Smooth Language Switching ──
    let isTransitioning = false;

    function switchLanguage(lang) {
        if (isTransitioning) return;
        
        const isFr = lang === 'fr';
        if (isFr && btnFr.classList.contains('active')) return;
        if (!isFr && btnNl.classList.contains('active')) return;

        isTransitioning = true;

        btnFr.classList.toggle('active', isFr);
        btnNl.classList.toggle('active', !isFr);

        const outPdf = isFr ? pdfNl : pdfFr;
        const inPdf = isFr ? pdfFr : pdfNl;

        const tl = gsap.timeline({
            onComplete: () => { isTransitioning = false; }
        });

        // The outgoing CV falls backwards into the card glass
        tl.to(outPdf, {
            opacity: 0,
            z: -60,   // push deeply back
            y: 30,    // drop down
            rotationX: -10, // slight flip
            duration: 0.5,
            ease: "back.in(1.2)",
            onComplete: () => {
                outPdf.classList.remove('active');
                gsap.set(outPdf, { z: 60, y: -30, rotationX: 10 }); 
            }
        })
        // The incoming CV pops out from the front
        .set(inPdf, { z: 60, y: -30, rotationX: 10 })
        .add(() => { inPdf.classList.add('active'); })
        .to(inPdf, {
            opacity: 1,
            z: 30, // Default CSS state is popped out
            y: 0,
            rotationX: 0,
            duration: 0.7,
            ease: "back.out(1.2)"
        });
    }

    btnFr.addEventListener('click', () => switchLanguage('fr'));
    btnNl.addEventListener('click', () => switchLanguage('nl'));

});
