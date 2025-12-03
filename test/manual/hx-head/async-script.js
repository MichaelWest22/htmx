// Async script - loads asynchronously
console.log('Async script loading...');

setTimeout(() => {
    window.asyncScriptLoaded = true;
    console.log('Async script loaded!');
}, 200);
