'use strict';
const { app, BrowserWindow, protocol, net, shell, nativeImage } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { existsSync } = require('node:fs');

const SCHEME = 'iptv';
const APP_ORIGIN = SCHEME + '://app';
const root = path.join(__dirname, 'dist');
const smokeMode = process.argv.includes('--smoke-test');

// App assets must be served with an origin that supports fetch(), including the
// local catalog, while keeping normal Chromium CORS and web security enabled.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }
]);

function localFile(requestUrl) {
  const url = new URL(requestUrl);
  if (url.protocol !== SCHEME + ':' || url.hostname !== 'app') {
    throw new Error('Unexpected application asset origin.');
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { throw new Error('Malformed application path.'); }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Blocked path traversal.');
  }
  return file;
}

function openSafeLink(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol === 'https:' && !url.username && !url.password) {
      void shell.openExternal(url.href);
    }
  } catch { /* Ignore untrusted links. */ }
}

async function start() {
  protocol.handle(SCHEME, request => {
    try { return net.fetch(pathToFileURL(localFile(request.url)).toString()); }
    catch { return new Response('Not found', { status: 404 }); }
  });

  const iconFile = path.join(__dirname, 'assets', 'icon.png');
  const window = new BrowserWindow({
    width: 1280, height: 800, minWidth: 810, minHeight: 560,
    show: !smokeMode, autoHideMenuBar: true,
    backgroundColor: '#070d1a',
    icon: existsSync(iconFile) ? nativeImage.createFromPath(iconFile) : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    openSafeLink(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', event => {
    event.preventDefault();
  });
  window.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      event.preventDefault(); window.webContents.reload();
    }
  });

  if (smokeMode) {
    const timer = setTimeout(() => {
      console.error('Windows launch smoke timed out.');
      app.exit(1);
    }, 30000);
    window.webContents.once('did-fail-load', (_e, code, description) => {
      clearTimeout(timer);
      console.error('Windows launch failed', code, description);
      app.exit(1);
    });
    window.webContents.once('did-finish-load', async () => {
      try {
        const visible = await window.webContents.executeJavaScript(
          "document.title.includes('IPTV') && !!document.querySelector('#root') && !!document.querySelector('main')",
          true
        );
        clearTimeout(timer);
        if (!visible) { console.error('Windows interface did not mount.'); app.exit(1); }
        else { console.log('Windows desktop smoke test passed.'); app.exit(0); }
      } catch (err) {
        clearTimeout(timer); console.error(err); app.exit(1);
      }
    });
  }
  await window.loadURL(APP_ORIGIN + '/index.html');
}

app.whenReady().then(start).catch(err => {
  console.error('Windows startup failed:', err);
  app.exit(1);
});
app.on('window-all-closed', () => app.quit());
