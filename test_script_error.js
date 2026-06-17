window.addEventListener('error', function(e) {
    const err = document.createElement('div');
    err.style.cssText = 'position:fixed;top:0;left:0;background:red;color:white;z-index:9999;padding:10px;font-size:12px;';
    err.innerText = e.message + ' at ' + e.filename + ':' + e.lineno;
    document.body.appendChild(err);
});
window.addEventListener('unhandledrejection', function(e) {
    const err = document.createElement('div');
    err.style.cssText = 'position:fixed;top:40px;left:0;background:orange;color:black;z-index:9999;padding:10px;font-size:12px;';
    err.innerText = "Promise rejection: " + e.reason;
    document.body.appendChild(err);
});
