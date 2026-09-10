const fs = require('fs');
const path = require('path');

const portalDir = 'C:\\Portal-KPI';
const spkLogoPath = 'C:\\SPK Sistem\\publish-inc-logo-header.png';
const spkUrl = 'https://script.google.com/macros/s/AKfycbzeqPxAuJxhpgj6M7Tf40YzXH80gBKDZ1inhoZLno9SJWhlDqrXQEmboEDbNFoDF6Ue1A/exec';

function read(file) {
  return fs.readFileSync(path.join(portalDir, file), 'utf8');
}

function write(file, value) {
  fs.writeFileSync(path.join(portalDir, file), value, 'utf8');
}

function mustReplace(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Pattern not found: ${label}`);
  }
  return source.replace(search, replacement);
}

const logoDataUri = `data:image/png;base64,${fs.readFileSync(spkLogoPath).toString('base64')}`;

let index = read('Index.html');
index = index.replace('<title>PortaDok - Modern Document Portal</title>', '<title>Publish Inc. Portal KPI</title>');
index = index.replace(
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
);
index = index.replace(
  "'<div style=\"margin-bottom:24px;\"><div style=\"font-size:26px;font-weight:900;color:#4763FD;line-height:1;\">nasmedia</div><div style=\"font-size:11px;font-weight:800;color:#64748b;margin-top:4px;\">KPI Portal</div></div>' +",
  `'<div style="margin-bottom:24px;display:flex;align-items:center;gap:14px;"><img src="${logoDataUri}" alt="Publish Inc." style="width:58px;height:58px;border-radius:999px;object-fit:contain;background:#f8fafc;border:1px solid #e2e8f0;"><div><div style="font-size:25px;font-weight:900;color:#0A2540;line-height:1;">Publish Inc.</div><div style="font-size:11px;font-weight:800;color:#FF6B35;margin-top:4px;">Portal KPI</div></div></div>' +`
);
index = index.replace(
  "'<button type=\"submit\" style=\"height:46px;border:0;border-radius:999px;background:#4763FD;color:white;font-weight:900;cursor:pointer;\">Login</button>' +",
  "'<button type=\"submit\" style=\"height:46px;border:0;border-radius:999px;background:#FF6B35;color:white;font-weight:900;cursor:pointer;\">Login</button>' +"
);
write('Index.html', index);

let css = read('CSS.html');
css = css.replace(
  /:root \{\s*--accent-50: #[0-9a-fA-F]+;\s*--accent-100: #[0-9a-fA-F]+;\s*--accent-500: #[0-9a-fA-F]+;\s*--accent-600: #[0-9a-fA-F]+;\s*--accent-700: #[0-9a-fA-F]+;\s*--accent-800: #[0-9a-fA-F]+;\s*\}/,
  `:root {
            --accent-50: #fff3ed;
            --accent-100: #ffe1d2;
            --accent-500: #ff8a5c;
            --accent-600: #FF6B35;
            --accent-700: #e85a28;
            --accent-800: #c9461c;
        }`
);
css = css.replace(".font-display { font-family: 'Bricolage Grotesque', sans-serif; }", ".font-display { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }");
css = css.replace(/background: linear-gradient\(180deg, #071f3f 0%, #04172f 100%\) !important;/g, 'background: linear-gradient(180deg, #0A2540 0%, #061a2d 100%) !important;');
css = css.replace(/background: linear-gradient\(135deg, #4763FD, #6b83fd\);/g, 'background: linear-gradient(135deg, #FF6B35, #ff8a5c);');
css = css.replace(/#4763FD/g, '#FF6B35').replace(/#6b83fd/g, '#ff8a5c').replace(/#3a51db/g, '#e85a28');
css = css.replace(/https:\/\/nasmedia\.id\/wp-content\/uploads\/2021\/01\/LOGO-INVOICE\.png/g, logoDataUri);
css = css.replace(/https:\/\/nasmedia\.id\/wp-content\/uploads\/2022\/03\/logo-baru-nasmedia-kecil\.png/g, logoDataUri);
if (!css.includes('.publish-brand-lockup')) {
  css = mustReplace(css, '        .nasmedia-logo-transparent {', `        .publish-brand-lockup {
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            min-width: 0;
            color: #ffffff;
        }

        .publish-brand-lockup img {
            width: 3.45rem;
            height: 3.45rem;
            border-radius: 999px;
            object-fit: contain;
            background: #f8fafc;
            border: 1px solid rgba(255, 255, 255, 0.65);
            box-shadow: 0 8px 18px rgba(2, 8, 23, 0.18);
            flex: 0 0 auto;
        }

        .publish-brand-name {
            font-size: 1.15rem;
            font-weight: 900;
            line-height: 1.05;
            letter-spacing: 0;
            white-space: nowrap;
        }

        .publish-brand-tag {
            color: rgba(255, 255, 255, 0.68);
            font-size: 0.52rem;
            font-weight: 800;
            line-height: 1;
            margin-top: 0.22rem;
            white-space: nowrap;
        }

        .publish-memo-logo img {
            width: 13.5rem;
            max-width: 100%;
            height: auto;
            object-fit: contain;
        }

        .spk-embed-frame {
            width: 100%;
            min-height: calc(100vh - 15rem);
            border: 0;
            background: #ffffff;
            border-radius: 1rem;
        }

        .publish-login-hero {
            background: linear-gradient(135deg, #0A2540 0%, #12365a 58%, #FF6B35 100%);
        }

        .nasmedia-logo-transparent {`, 'logo css insertion');
}
write('CSS.html', css);

let dashboard = read('JS_Dashboard.html');
dashboard = dashboard.replace(/PORTADOK/g, 'PUBLISH INC');
dashboard = dashboard.replace(/#4763FD/g, '#FF6B35');
write('JS_Dashboard.html', dashboard);

let core = read('JS_Core.html');
core = core.replace(/const PORTAL_SESSION_KEY = 'nasmediaPortalSession_v2';/, "const PORTAL_SESSION_KEY = 'publishIncPortalSession_v1';");
core = core.replace(/confirmButtonColor: '#4763FD'/g, "confirmButtonColor: '#FF6B35'");
core = core.replace(/confirmButtonColor: '#4763FD',/g, "confirmButtonColor: '#FF6B35',");
core = core.replace(/#4763FD/g, '#FF6B35');
core = core.replace(/https:\/\/nasmedia\.id\/wp-content\/uploads\/2022\/03\/logo-baru-nasmedia-kecil\.png/g, logoDataUri);
core = core.replace(/https:\/\/nasmedia\.id\/wp-content\/uploads\/2021\/01\/LOGO-INVOICE\.png/g, logoDataUri);
core = core.replace(/Logo Nasmedia/g, 'Logo Publish Inc.');
core = core.replace(/Nasmedia KPI Portal/g, 'Publish Inc. Portal KPI');
core = core.replace(/<div class=\\"text-3xl font-black leading-none\\">nasmedia<\/div>/g, '<div class=\\"text-3xl font-black leading-none\\">Publish Inc.<\\/div>');
core = mustReplace(
  core,
  "{ id: 'administrasi_naskah', label: 'Administrasi Naskah', icon: 'fa-file-signature' }]",
  "{ id: 'administrasi_naskah', label: 'Administrasi Naskah', icon: 'fa-file-signature' },\n      { id: 'spk_penulis', label: 'SPK Penulis', icon: 'fa-file-contract' }]",
  'admin nav spk'
);
core = mustReplace(
  core,
  "if (state.activeTab === 'surat') loadSurat();else",
  "if (state.activeTab === 'surat') loadSurat();else\n  if (state.activeTab === 'spk_penulis') loadSPKPenulis();else",
  'spk content route'
);
core = core.replace(
  /<div class=\\"nasmedia-logo-transparent sidebar-logo-transparent\\" aria-label=\\"Logo (?:Nasmedia|Publish Inc\.)\\">\\n\s*<div class=\\"nasmedia-logo-word\\"><span>nas<\/span><span>media<\/span><i><\/i><\/div>\\n\s*<div class=\\"nasmedia-logo-tag\\">#1 Self Publishing in Indonesia<\/div>\\n\s*<\/div>/,
  `<div class=\\"publish-brand-lockup sidebar-logo-transparent\\" aria-label=\\"Logo Publish Inc.\\">
                                    <img src=\\"${logoDataUri}\\" alt=\\"Publish Inc.\\">
                                    <div class=\\"min-w-0\\">
                                        <div class=\\"publish-brand-name\\">Publish Inc.<\\/div>
                                        <div class=\\"publish-brand-tag\\">Portal KPI & Persuratan<\\/div>
                                    <\\/div>
                                <\\/div>`
);
core = core.replace(
  '<div class=\\"mb-7 login-logo-panel-wrap\\" aria-label=\\"Logo Publish Inc.\\"><\\/div>',
  `<div class=\\"mb-7 login-logo-panel-wrap\\" aria-label=\\"Logo Publish Inc.\\"><\\/div>`
);
core = core.replace(
  '<div class=\\"relative min-h-[340px] lg:min-h-[520px] bg-gradient-to-br from-accent-600 via-accent-500 to-indigo-500 p-8 lg:p-10 text-white flex flex-col justify-between\\">',
  '<div class=\\"relative min-h-[340px] lg:min-h-[520px] publish-login-hero p-8 lg:p-10 text-white flex flex-col justify-between\\">'
);
core = core.replace(
  new RegExp('<div class=\\\\"nasmedia-logo-transparent !w-\\[13\\.5rem\\] !max-w-full overflow-visible\\\\" aria-label=\\\\"Logo Publish Inc\\.\\\\">\\\\n\\s*<div class=\\\\"nasmedia-logo-word !text-\\[42px\\] !leading-none\\\\"><span>nas<\\\\/span><span>media<\\\\/span><i><\\\\/i><\\\\/div>\\\\n\\s*<div class=\\\\"nasmedia-logo-tag !text-\\[10px\\] !mt-1\\\\">#1 Self Publishing in Indonesia<\\\\/div>\\\\n\\s*<\\\\/div>'),
  `<div class=\\"publish-memo-logo\\" aria-label=\\"Logo Publish Inc.\\"><img src=\\"${logoDataUri}\\" alt=\\"Publish Inc.\\"><\\/div>`
);

const spkFunction = `
function loadSPKPenulis() {
  const content = document.getElementById('contentArea');
  if (!content) return;
  const spkUrl = '${spkUrl}';
  content.innerHTML = "\\n                <div class=\\"space-y-5\\">\\n                    <div class=\\"bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4\\">\\n                        <div>\\n                            <div class=\\"inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-50 text-accent-700 text-[10px] font-black uppercase tracking-widest mb-3\\"><i class=\\"fa-solid fa-file-contract\\"></i> Admin Persuratan</div>\\n                            <h3 class=\\"text-xl font-black text-slate-900\\">SPK Penulis Publish Inc.</h3>\\n                            <p class=\\"text-sm text-slate-500 mt-1\\">Modul SPK dibuka langsung dari portal ini. Gunakan akun SPK admin yang sudah disiapkan.</p>\\n                        </div>\\n                        <a href=\\"" + spkUrl + "\\" target=\\"_blank\\" rel=\\"noopener\\" class=\\"inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-black shadow-lg text-sm\\"><i class=\\"fa-solid fa-arrow-up-right-from-square\\"></i> Buka Tab Baru</a>\\n                    </div>\\n                    <div class=\\"bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden\\">\\n                        <iframe title=\\"SPK Penulis Publish Inc.\\" class=\\"spk-embed-frame\\" src=\\"" + spkUrl + "\\"></iframe>\\n                    </div>\\n                </div>";
}
window.loadSPKPenulis = loadSPKPenulis;
`;
core = mustReplace(core, '\nfunction renderMissingModule(moduleName) {', `${spkFunction}\nfunction renderMissingModule(moduleName) {`, 'spk loader insertion');
write('JS_Core.html', core);

console.log('Portal-KPI updated for Publish Inc. branding and SPK admin menu.');
