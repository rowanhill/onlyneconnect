// Proxying CRA dev server to Firebase Hosting emulator is done via the proxy property in package.json
// This file is actually used to inject CORS headers that allow SharedArrayBuffer to be used in Chrome,
// as required/preferred by Zoom. Note that these headers are also set in firebase.json, which is
// respected by the Hosting emulator, but accessing via the emulator means only using production builds
module.exports = function(app) {
    app.use((req, res, next) => {
        res.set({
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin'
        });
        next();
    }); 
};