const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const source = path.join(projectRoot, 'public', 'pose.html');
const nativeCopy = path.join(projectRoot, 'assets', 'pose.html');
const sourceContent = fs.readFileSync(source);

if (process.argv.includes('--check')) {
  const matches = fs.existsSync(nativeCopy) && sourceContent.equals(fs.readFileSync(nativeCopy));
  if (!matches) {
    console.error('assets/pose.html is stale. Run npm run sync:pose.');
    process.exit(1);
  }
  console.log('Pose capture HTML copies match.');
} else {
  fs.writeFileSync(nativeCopy, sourceContent);
  console.log('Synced public/pose.html to assets/pose.html.');
}
