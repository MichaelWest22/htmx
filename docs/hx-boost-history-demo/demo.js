let interactionCount = 0;
let pageLoads = 1;
let requestCount = 0;

// Initialize active nav link on page load
function updateActiveNavLink() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || 'index.html';
    console.log('🔗 Updating nav for file:', currentFile);
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        const linkFile = link.getAttribute('href');
        console.log('  Checking link:', linkFile, 'vs', currentFile);
        if (linkFile === currentFile || (currentFile === 'index.html' && linkFile === 'index.html')) {
            console.log('  ✅ Setting active:', linkFile);
            link.classList.add('active');
        }
    });
}

// Update page load counter
function updatePageLoads() {
    document.getElementById('page-loads').textContent = ++pageLoads;
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
}

// Update interaction counter (preserves sidebar state)
function updateInteractionCount() {
    document.getElementById('interaction-count').textContent = ++interactionCount;
    document.getElementById('last-nav').textContent = new Date().toLocaleTimeString();
}

// Update server stats
function updateServerStats(responseType) {
    document.getElementById('server-time').textContent = new Date().toISOString();
    document.getElementById('request-count').textContent = ++requestCount;
    document.getElementById('response-type').textContent = responseType;
}

// Track htmx events
document.addEventListener('htmx:before:request', (e) => {
    console.log('🟡 htmx:before:request', e.detail);
    const headers = e.detail.ctx.request.headers;
    if (headers['HX-History-Restore-Request']) {
        console.log('📚 History restore request detected');
    } else if (headers['HX-Boosted']) {
        console.log('🚀 Boosted request detected');
    }
});

document.addEventListener('htmx:after:request', (e) => {
    console.log('🟢 htmx:after:request', e.detail);
    const headers = e.detail.ctx.request.headers;
    if (headers['HX-History-Restore-Request']) {
        updateServerStats('History Restore');
    } else if (headers['HX-Boosted']) {
        updateServerStats('Boosted Navigation');
        updateInteractionCount();
    } else {
        updateServerStats('Regular Request');
    }
});

document.addEventListener('htmx:after:swap', (e) => {
    console.log('🔄 htmx:after:swap', e.detail);
    updatePageLoads();
    updateActiveNavLink();
});

// Initialize server stats
updateServerStats('Initial Load');

// Initialize active nav link
updateActiveNavLink();

// Also listen for popstate (back/forward) to update nav
window.addEventListener('popstate', () => {
    setTimeout(updateActiveNavLink, 10); // Small delay to ensure URL is updated
});

// Simulate some initial interactions
setTimeout(() => {
    interactionCount = Math.floor(Math.random() * 20) + 10;
    document.getElementById('interaction-count').textContent = interactionCount;
}, 100);