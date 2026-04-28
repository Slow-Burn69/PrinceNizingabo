document.addEventListener('DOMContentLoaded', () => {
    // ── 0. Registration & Setup ──
    gsap.registerPlugin(Physics2DPlugin, InertiaPlugin, Observer, CustomEase);

    const card = document.getElementById('cv-card');
    const scene = document.getElementById('scene');
    const glare = document.getElementById('card-glare');
    const langSwitch = document.querySelector('.lang-switch');
    const chars = document.querySelectorAll('.char');
    
    // UI elements
    const btnFr = document.getElementById('btn-fr');
    const btnNl = document.getElementById('btn-nl');
    const pdfFr = document.getElementById('pdf-fr');
    const pdfNl = document.getElementById('pdf-nl');
    
    const ambientLight1 = document.querySelector('.ambient-light');
    const ambientLight2 = document.querySelector('.ambient-light.light-2');

    // State
    let isFullscreen = false;
    let isTransitioning = false;
    
    // Custom Ease for organic bubble floating
    CustomEase.create("bubble", "M0,0 C0.1,0.4 0.3,0.6 0.5,0.5 0.7,0.4 0.9,0.6 1,1");

    // ── 1. PDF.js Rendering ──
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    async function renderPDF(url, canvasId) {
        try {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdfDocument = await loadingTask.promise;
            const page = await pdfDocument.getPage(1);
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            // Lower scale on mobile for better performance
            const isMobile = window.innerWidth <= 480;
            const scale = isMobile ? 1.5 : 2.5; 
            const viewport = page.getViewport({ scale: scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const renderContext = { canvasContext: ctx, viewport: viewport };
            await page.render(renderContext).promise;
        } catch (error) {
            console.error('Error rendering PDF:', error);
        }
    }

    renderPDF('cv-fr.pdf', 'pdf-canvas-fr');
    renderPDF('cv-nl.pdf', 'pdf-canvas-nl');

    // ── 2. Dynamic Title (Physics2D) ──
    chars.forEach((char, i) => {
        // Continuous subtle float
        gsap.to(char, {
            y: "random(-4, 4)",
            x: "random(-2, 2)",
            rotation: "random(-8, 8)",
            duration: "random(2, 4)",
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: i * 0.05
        });
    });

    const nameTitle = document.getElementById('name-title');
    nameTitle.addEventListener('mouseenter', () => {
        chars.forEach(char => {
            gsap.to(char, {
                physics2D: {
                    velocity: gsap.utils.random(150, 300),
                    angle: gsap.utils.random(0, 360),
                    gravity: 0
                },
                duration: 0.8,
                onComplete: () => {
                    gsap.to(char, { 
                        x: 0, y: 0, rotation: 0, 
                        duration: 1.5, 
                        ease: "elastic.out(1, 0.3)" 
                    });
                }
            });
        });
    });

    // ── 3. Constant Bubble Movement for Lang Switch ──
    gsap.to(langSwitch, {
        y: "-=8",
        x: "+=4",
        rotation: "random(-2, 2)",
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "bubble"
    });

    // ── 4. Card Interaction (Smoother & Mobile Friendly) ──
    let idleTween;
    function initIdleFloating() {
        if (idleTween) idleTween.kill();
        idleTween = gsap.to(card, {
            y: "+=20",
            x: "+=10",
            rotationZ: "random(-2, 2)",
            rotationX: "random(-3, 3)",
            rotationY: "random(-4, 4)",
            duration: 4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }
    initIdleFloating();

    const handleInteraction = (x, y) => {
        if (isFullscreen) return;
        if (idleTween && idleTween.isActive()) idleTween.pause();

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const targetRotX = ((y - centerY) / centerY) * -12; 
        const targetRotY = ((x - centerX) / centerX) * 12;
        const targetX = (x - centerX) * 0.02;
        const targetY = (y - centerY) * 0.02;

        gsap.to(card, {
            rotationX: targetRotX,
            rotationY: targetRotY,
            x: targetX,
            y: targetY,
            duration: 0.8,
            ease: "power2.out",
            overwrite: "auto",
            transformPerspective: 1200
        });

        // Glare follow
        const glareX = (x / window.innerWidth) * 100;
        const glareY = (y / window.innerHeight) * 100;
        gsap.to(glare, {
            background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, transparent 65%)`,
            duration: 0.5
        });

        // Ambient lights react
        gsap.to(ambientLight1, { x: (x - centerX) * 0.2, y: (y - centerY) * 0.2, duration: 1.5 });
        gsap.to(ambientLight2, { x: (x - centerX) * -0.15, y: (y - centerY) * -0.15, duration: 2 });
    };

    window.addEventListener('mousemove', (e) => handleInteraction(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
        if (isFullscreen) return;
        if (idleTween) idleTween.play();
        gsap.to(card, { 
            rotationX: 0, rotationY: 0, rotationZ: 0, x: 0, y: 0, 
            duration: 2, ease: "elastic.out(1, 0.6)" 
        });
    });
    
    // Resume idle on touch end
    window.addEventListener('touchend', () => {
        if (isFullscreen) return;
        if (idleTween) idleTween.play();
        gsap.to(card, { rotationX: 0, rotationY: 0, x: 0, y: 0, duration: 2, ease: "power2.out" });
    });

    // ── 5. Fullscreen Toggle ──
    card.addEventListener('click', () => {
        isFullscreen = !card.classList.contains('fullscreen');
        if (isFullscreen) {
            card.classList.add('fullscreen');
            gsap.to(card, { rotationX: 0, rotationY: 0, x: 0, y: 0, z: 0, duration: 0.8, ease: "expo.inOut" });
            gsap.to('.ui-layer', { opacity: 0, pointerEvents: 'none', duration: 0.4 });
            if (idleTween) idleTween.pause();
        } else {
            card.classList.remove('fullscreen');
            gsap.to('.ui-layer', { opacity: 1, pointerEvents: 'auto', duration: 0.5, delay: 0.3 });
            if (idleTween) idleTween.play();
        }
    });

    // ── 6. Extreme 3D Flip Language Transition ──
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

        // Simplier 3D for mobile
        const isMobile = window.innerWidth <= 480;
        
        // The Flip & Zoom
        tl.to(card, {
            z: isMobile ? -200 : -400,
            rotationY: isFr ? "+=360" : "-=360",
            scale: isMobile ? 0.8 : 0.6,
            duration: isMobile ? 0.8 : 1.2,
            ease: "back.inOut(1.2)"
        })
        .to(outPdf, {
            opacity: 0,
            duration: 0.4
        }, "-=0.8")
        .add(() => {
            outPdf.classList.remove('active');
            inPdf.classList.add('active');
        }, "-=0.4")
        .to(inPdf, {
            opacity: 1,
            duration: 0.4
        }, "-=0.4")
        .to(card, {
            z: 0,
            scale: 1,
            duration: 0.8,
            ease: "expo.out"
        }, "-=0.2");
    }

    btnFr.addEventListener('click', () => switchLanguage('fr'));
    btnNl.addEventListener('click', () => switchLanguage('nl'));

    // Observer for gestures
    Observer.create({
        target: window,
        type: "wheel,touch",
        onUp: () => !isFullscreen && switchLanguage('nl'),
        onDown: () => !isFullscreen && switchLanguage('fr'),
        tolerance: 60
    });

});
