/**
 * regressionproof.ai - Minimal animations
 */

// Typing effect for terminal commands
function initTerminalTyping() {
    const commands = document.querySelectorAll('.terminal-command');
    const output = document.querySelector('.terminal-output');

    // Hide output initially
    if (output) {
        output.style.opacity = '0';
    }

    commands.forEach((cmd, index) => {
        const text = cmd.textContent;
        cmd.textContent = '';
        cmd.style.borderRight = '2px solid var(--neon-cyan)';

        // Delay each command
        setTimeout(() => {
            let charIndex = 0;
            const typeInterval = setInterval(() => {
                if (charIndex < text.length) {
                    cmd.textContent += text[charIndex];
                    charIndex++;
                } else {
                    clearInterval(typeInterval);
                    cmd.style.borderRight = 'none';

                    // Show output after last command
                    if (index === commands.length - 1 && output) {
                        setTimeout(() => {
                            output.style.transition = 'opacity 0.5s ease';
                            output.style.opacity = '1';
                        }, 300);
                    }
                }
            }, 30);
        }, index * 1500);
    });
}

// Intersection Observer for scroll animations
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');

                // Trigger terminal typing when get-started section is visible
                if (entry.target.classList.contains('get-started')) {
                    initTerminalTyping();
                }
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Smooth parallax for grid floor
function initParallax() {
    const gridFloor = document.querySelector('.grid-floor');
    if (!gridFloor) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * 0.3;
        gridFloor.style.transform = `perspective(500px) rotateX(60deg) translateY(${rate}px)`;
    });
}

// Glowing cursor effect on hero
function initGlowCursor() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        hero.style.setProperty('--mouse-x', `${x}px`);
        hero.style.setProperty('--mouse-y', `${y}px`);
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initParallax();
    initGlowCursor();
});

// Add animate-in styles dynamically
const style = document.createElement('style');
style.textContent = `
    .step, .card {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }

    .animate-in .step,
    .animate-in .card {
        opacity: 1;
        transform: translateY(0);
    }

    .animate-in .step:nth-child(1) { transition-delay: 0.1s; }
    .animate-in .step:nth-child(3) { transition-delay: 0.2s; }
    .animate-in .step:nth-child(5) { transition-delay: 0.3s; }

    .animate-in .card:nth-child(1) { transition-delay: 0.1s; }
    .animate-in .card:nth-child(2) { transition-delay: 0.2s; }
    .animate-in .card:nth-child(3) { transition-delay: 0.3s; }

    .terminal {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }

    .animate-in .terminal {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(style);
