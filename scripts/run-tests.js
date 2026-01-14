#!/usr/bin/env node

/**
 * KOPA Agent - Test Runner
 * Runs all tests and provides a summary
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  yellow: '\x1b[33m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${description}`, 'blue');
  log('─'.repeat(50), 'blue');
  
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} passed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    return false;
  }
}

async function main() {
  log('\n🧪 KOPA Agent Test Suite', 'bright');
  log('═'.repeat(50), 'bright');
  
  const results = [];
  
  // Check if node_modules exists
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    log('\n📦 Installing dependencies...', 'yellow');
    runCommand('npm install', 'Dependency Installation');
  }
  
  // Test 1: Quick Demo
  results.push({
    name: 'Quick Demo',
    passed: runCommand('npx ts-node examples/demo.ts', 'Test 1: Quick Demo')
  });
  
  // Test 2: TypeScript Compilation
  results.push({
    name: 'TypeScript Compilation',
    passed: runCommand('npx tsc --noEmit', 'Test 2: TypeScript Compilation')
  });
  
  // Test 3: Unit Tests
  results.push({
    name: 'Unit Tests',
    passed: runCommand('npm test -- --passWithNoTests', 'Test 3: Unit Tests')
  });
  
  // Test 4: Build
  results.push({
    name: 'Build',
    passed: runCommand('npm run build', 'Test 4: Build Project')
  });
  
  // Summary
  log('\n' + '═'.repeat(50), 'bright');
  log('📊 Test Summary', 'bright');
  log('═'.repeat(50), 'bright');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });
  
  log('\n' + '─'.repeat(50), 'bright');
  
  if (passed === total) {
    log(`🎉 All tests passed! (${passed}/${total})`, 'green');
    log('\nNext steps:', 'bright');
    log('  • Start API server: npm run dev', 'blue');
    log('  • Run with coverage: npm run test:coverage', 'blue');
    log('  • Test API: See TESTING_GUIDE.md', 'blue');
    process.exit(0);
  } else {
    log(`⚠️  Some tests failed (${passed}/${total} passed)`, 'red');
    log('\nCheck the output above for details.', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Test runner failed: ${error.message}`, 'red');
  process.exit(1);
});
