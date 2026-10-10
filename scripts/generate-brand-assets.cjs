// Render the vector mark specified in design.md. No downloaded bitmap assets.
const fs = require('node:fs');
const path = require('node:path');

async function generate(sharp) {
  const directory = path.join(__dirname, '..', 'assets', 'brand');
  fs.mkdirSync(directory, { recursive: true });
  const mark = `<path d="M30 66V48a18 18 0 0 1 36 0v18" fill="none" stroke="#0B6E79" stroke-width="7" stroke-linecap="round"/><path d="M44 58c0 14 10 22 22 22s20-8 20-22" fill="none" stroke="#1E8C88" stroke-width="7" stroke-linecap="round"/><circle cx="54" cy="66" r="5.5" fill="#3A5A8C"/><path d="M24 70h18" stroke="#0B6E79" stroke-width="7" stroke-linecap="round"/>`;
  const svg = (content) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 108 108">${content}</svg>`;
  const foreground = svg(mark);
  fs.writeFileSync(path.join(directory, 'mark.svg'), foreground);
  await sharp(Buffer.from(foreground)).png().toFile(path.join(directory, 'foreground.png'));
  await sharp(Buffer.from(svg(`<rect width="108" height="108" fill="#E3EFF1"/>${mark}`))).png().toFile(path.join(directory, 'icon.png'));
  const monochrome = svg(mark.replace(/#[0-9A-F]{6}/g, '#FFFFFF'));
  await sharp(Buffer.from(monochrome)).png().toFile(path.join(directory, 'monochrome.png'));
  await sharp(Buffer.from(monochrome)).resize(96, 96).png().toFile(path.join(directory, 'notification.png'));
  await sharp(Buffer.from(svg(`<rect width="108" height="108" rx="20" fill="#E3EFF1"/>${mark}`))).resize(48, 48).png().toFile(path.join(directory, 'favicon.png'));
}

// Optional renderer path allows the bundled workspace runtime without a new app dependency.
generate(require(process.argv[2] || 'sharp')).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
