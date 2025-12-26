#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 StreamWeave Health Check\n');

// Check .env file
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('📋 Environment Configuration:');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
        'TWITCH_CLIENT_ID',
        'TWITCH_CLIENT_SECRET', 
        'NEXT_PUBLIC_HARDCODED_ADMIN_TWITCH_ID',
        'NEXT_PUBLIC_TWITCH_CLIENT_ID'
    ];
    
    requiredVars.forEach(varName => {
        if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`)) {
            console.log(`✅ ${varName} is configured`);
        } else {
            console.log(`❌ ${varName} is missing or not configured`);
        }
    });
} else {
    console.log('❌ .env file not found');
    if (fs.existsSync(envExamplePath)) {
        console.log('💡 Copy .env.example to .env and configure it');
    }
}

// Check tokens directory
const tokensPath = path.join(__dirname, 'tokens');
const tokensFile = path.join(tokensPath, 'twitch-tokens.json');

console.log('\n🔑 Token Configuration:');
if (fs.existsSync(tokensFile)) {
    console.log('✅ Token file exists');
    try {
        const tokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
        if (tokens.broadcasterToken) console.log('✅ Broadcaster token found');
        if (tokens.botToken) console.log('✅ Bot token found');
        if (tokens.broadcasterUsername) console.log(`✅ Broadcaster: ${tokens.broadcasterUsername}`);
        if (tokens.botUsername) console.log(`✅ Bot: ${tokens.botUsername}`);
    } catch (error) {
        console.log('❌ Token file is corrupted');
    }
} else {
    console.log('❌ No tokens found');
    console.log('💡 Visit http://localhost:3100/auth/signin to authenticate');
}

// Check package.json and dependencies
console.log('\n📦 Dependencies:');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
    console.log('✅ package.json exists');
    
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
        console.log('✅ node_modules exists');
    } else {
        console.log('❌ node_modules missing - run npm install');
    }
} else {
    console.log('❌ package.json not found');
}

// Check data files
console.log('\n📊 Data Files:');
const dataPath = path.join(__dirname, 'src', 'data');
const metricsFile = path.join(dataPath, 'stream-metrics.json');
const actionsFile = path.join(dataPath, 'actions.json');

if (fs.existsSync(metricsFile)) {
    console.log('✅ Stream metrics file exists');
} else {
    console.log('⚠️  Stream metrics file missing (will be created on first run)');
}

if (fs.existsSync(actionsFile)) {
    console.log('✅ Actions file exists');
} else {
    console.log('⚠️  Actions file missing (will be created on first run)');
}

console.log('\n🚀 Next Steps:');
console.log('1. Fix any ❌ issues above');
console.log('2. Run: npm run dev');
console.log('3. Visit: http://localhost:3100');
console.log('4. Check logs for any errors');

console.log('\n📚 Need help? Check SETUP-GUIDE.md');