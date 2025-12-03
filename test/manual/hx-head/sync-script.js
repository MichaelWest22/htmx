// Sync script - simulates a script that takes time to load
console.log('Sync script loading...');

// Simulate some processing time
const start = Date.now();
while (Date.now() - start < 100) {
    // Busy wait for 100ms
}

window.syncScriptLoaded = true;
console.log('Sync script loaded!');
