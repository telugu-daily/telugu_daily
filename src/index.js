const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sentencesRouter = require('./routes/sentences');
const progressRouter = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/sentences', sentencesRouter);
app.use('/api/progress', progressRouter);

// ✅ Auth callback - Supabase redirects here after Google login (Site URL = Vercel)
// The mobile client passes its own deep link via ?app_redirect=... so the same
// page works for Expo Go (exp://...), dev clients, and production builds (myapp://...).
// IMPORTANT: The URL fragment (#access_token=...) is NOT sent to the server,
// so we read it on the client and forward it via the deep link.
app.get('/auth/callback', (req, res) => {
  // Fallback scheme if app_redirect query param isn't present
  const FALLBACK_SCHEME = 'myapp';

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Signing in to Telugu Daily...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; text-align: center; padding: 60px 20px; background: #4ECDC4; color: white; }
    h2 { font-size: 24px; margin-bottom: 12px; }
    p { font-size: 14px; opacity: 0.9; line-height: 1.5; }
    a { color: white; font-weight: bold; display: inline-block; margin-top: 12px; padding: 10px 18px; border: 2px solid white; border-radius: 8px; text-decoration: none; }
  </style>
</head>
<body>
  <h2>తె Telugu Daily</h2>
  <p>Signing you in... Opening the app automatically.</p>
  <p id="manual" style="display:none">
    If the app did not open, tap below:<br>
    <a id="openLink" href="#">Open Telugu Daily</a>
  </p>
  <script>
    (function () {
      var url = new URL(window.location.href);
      // Pull and remove app_redirect from the query so it doesn't end up in the deep link
      var appRedirect = url.searchParams.get('app_redirect');
      url.searchParams.delete('app_redirect');

      var search = url.search || '';        // includes leading '?' or ''
      var hash = window.location.hash || ''; // includes leading '#' or ''

      var target;
      if (appRedirect) {
        // Append Supabase's params/hash to the URL the app provided
        var sep = appRedirect.indexOf('?') === -1 ? '?' : '&';
        var qs = search.replace(/^\\?/, '');
        target = appRedirect + (qs ? sep + qs : '') + hash;
      } else {
        target = '${FALLBACK_SCHEME}://auth/callback' + search + hash;
      }

      var link = document.getElementById('openLink');
      link.href = target;
      window.location.href = target;

      setTimeout(function () {
        document.getElementById('manual').style.display = 'block';
      }, 1500);
    })();
  </script>
</body>
</html>`);
});


// On Vercel, the platform invokes the exported app directly as a request handler
// (no listening port). Only call app.listen() when running locally.
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Telugu Daily backend running on port ${PORT}`);
  });
}

module.exports = app;
