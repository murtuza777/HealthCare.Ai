const { execSync } = require('child_process');
const { existsSync, rmSync } = require('fs');
const { join } = require('path');

console.log('Cleaning Next.js cache and restarting...');

// Clean directories
const dirsToClean = ['.next', 'node_modules/.cache'];

dirsToClean.forEach(dir => {
  const dirPath = join(__dirname, dir);
  if (existsSync(dirPath)) {
    console.log(`Removing ${dir}...`);
    rmSync(dirPath, { recursive: true, force: true });
  }
});

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install', { stdio: 'inherit' });

// Build the app
console.log('Building the app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully!');
  
  // Start the dev server
  console.log('Starting development server...');
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('Error during build or start:', error.message);
  process.exit(1);
} 