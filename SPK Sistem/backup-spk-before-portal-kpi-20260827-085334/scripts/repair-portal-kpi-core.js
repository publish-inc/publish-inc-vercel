const fs = require('fs');

const file = 'C:\\Portal-KPI\\JS_Core.html';
const logo = `data:image/png;base64,${fs.readFileSync('C:\\SPK Sistem\\publish-inc-logo-header.png').toString('base64')}`;
let s = fs.readFileSync(file, 'utf8');

function replaceBetween(source, startNeedle, endNeedle, replacement, label) {
  const start = source.indexOf(startNeedle);
  if (start < 0) throw new Error(`Start not found: ${label}`);
  const end = source.indexOf(endNeedle, start);
  if (end < 0) throw new Error(`End not found: ${label}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

const sidebarStart = '<div class=\\"publish-brand-lockup sidebar-logo-transparent\\" aria-label=\\"Logo Publish Inc.\\">';
const sidebarEnd = '\\n                            </div>\\n                            <div class=\\"app-sidebar-store shrink-0\\">';
const sidebar = '<div class=\\"publish-brand-lockup sidebar-logo-transparent\\" aria-label=\\"Logo Publish Inc.\\">\\n' +
  `                                    <img src=\\"${logo}\\" alt=\\"Publish Inc.\\">\\n` +
  '                                    <div class=\\"min-w-0\\">\\n' +
  '                                        <div class=\\"publish-brand-name\\">Publish Inc.<\\/div>\\n' +
  '                                        <div class=\\"publish-brand-tag\\">Portal KPI & Persuratan<\\/div>\\n' +
  '                                    <\\/div>\\n' +
  '                                <\\/div>';
s = replaceBetween(s, sidebarStart, sidebarEnd, sidebar, 'sidebar brand string');

const memoPattern = /<div class=\\"nasmedia-logo-transparent !w-\[13\.5rem\] !max-w-full overflow-visible\\" aria-label=\\"Logo Publish Inc\.\\">\\n\s*<div class=\\"nasmedia-logo-word !text-\[42px\] !leading-none\\"><span>nas<\/span><span>media<\/span><i><\/i><\/div>\\n\s*<div class=\\"nasmedia-logo-tag !text-\[10px\] !mt-1\\">#1 Self Publishing in Indonesia<\/div>\\n\s*<\/div>/;
s = s.replace(memoPattern, `<div class=\\"publish-memo-logo\\" aria-label=\\"Logo Publish Inc.\\"><img src=\\"${logo}\\" alt=\\"Publish Inc.\\"><\\/div>`);

fs.writeFileSync(file, s, 'utf8');
console.log('JS_Core.html repaired.');
