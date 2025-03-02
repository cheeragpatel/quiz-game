const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Validate environment
function checkEnvironment() {
  console.log('🔍 Checking environment...');
  
  // Check Node.js version
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0]);
  if (major < 16) {
    console.error('❌ Node.js 16+ is required. Please upgrade your Node.js installation.');
    process.exit(1);
  }
  console.log('✅ Node.js version:', nodeVersion);

  // Check if Redis is installed
  try {
    execSync('redis-cli ping', { stdio: 'ignore' });
    console.log('✅ Redis is installed and running');
  } catch (error) {
    console.error('❌ Redis is not installed or not running. Please install Redis and start the server.');
    process.exit(1);
  }

  // Check for .env file
  if (!fs.existsSync(path.join(__dirname, '.env'))) {
    console.log('📝 Creating .env file from template...');
    fs.copyFileSync(
      path.join(__dirname, '.env.example'),
      path.join(__dirname, '.env')
    );
    console.log('⚠️ Please update the .env file with your configuration');
  }
}

// Install dependencies
function installDependencies() {
  console.log('📦 Installing backend dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('📦 Installing frontend dependencies...');
  process.chdir(path.join(__dirname, 'frontend'));
  execSync('npm install', { stdio: 'inherit' });
}

// Build frontend
function buildFrontend() {
  console.log('🏗️ Building frontend...');
  process.chdir(path.join(__dirname, 'frontend'));
  execSync('npm run build', { stdio: 'inherit' });
}

// Main setup function
async function setup() {
  console.log('🎮 Setting up Quiz Game...\n');
  
  try {
    checkEnvironment();
    installDependencies();
    buildFrontend();
    
    console.log('\n✨ Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update the .env file with your configuration');
    console.log('2. Start Redis server if not already running');
    console.log('3. Run npm start to launch the application');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();