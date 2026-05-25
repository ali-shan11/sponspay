#!/usr/bin/env node

/**
 * Coverage Threshold Checker for SponsPay WebApp
 * 
 * This script validates that test coverage meets the required thresholds
 * and provides detailed reporting for CI/CD pipeline quality gates.
 * 
 * Usage: node scripts/check-coverage.js
 * 
 * Exit codes:
 * - 0: All thresholds met
 * - 1: One or more thresholds not met
 * - 2: Coverage report not found or invalid
 */

const fs = require('fs');
const path = require('path');

// Coverage thresholds (must match karma.conf.js)
const THRESHOLDS = {
  statements: 80,
  branches: 75,
  functions: 90,
  lines: 80
};

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Colorize console output
 */
function colorize(text, color) {
  if (process.env.NO_COLOR || process.env.CI) {
    return text;
  }
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Print formatted header
 */
function printHeader(title) {
  console.log('');
  console.log(colorize('='.repeat(60), 'cyan'));
  console.log(colorize(`  ${title}`, 'cyan'));
  console.log(colorize('='.repeat(60), 'cyan'));
  console.log('');
}

/**
 * Print coverage summary table
 */
function printCoverageSummary(coverage) {
  console.log(colorize('Coverage Summary:', 'bright'));
  console.log('');
  
  const headers = ['Metric', 'Coverage', 'Threshold', 'Status'];
  const rows = [
    ['Statements', `${coverage.statements.pct}%`, `${THRESHOLDS.statements}%`, coverage.statements.pct >= THRESHOLDS.statements ? '✅ PASS' : '❌ FAIL'],
    ['Branches', `${coverage.branches.pct}%`, `${THRESHOLDS.branches}%`, coverage.branches.pct >= THRESHOLDS.branches ? '✅ PASS' : '❌ FAIL'],
    ['Functions', `${coverage.functions.pct}%`, `${THRESHOLDS.functions}%`, coverage.functions.pct >= THRESHOLDS.functions ? '✅ PASS' : '❌ FAIL'],
    ['Lines', `${coverage.lines.pct}%`, `${THRESHOLDS.lines}%`, coverage.lines.pct >= THRESHOLDS.lines ? '✅ PASS' : '❌ FAIL']
  ];
  
  // Calculate column widths
  const colWidths = headers.map((header, i) => 
    Math.max(header.length, ...rows.map(row => row[i].length))
  );
  
  // Print header
  const headerRow = headers.map((header, i) => header.padEnd(colWidths[i])).join(' | ');
  console.log(colorize(headerRow, 'bright'));
  console.log(colorize('-'.repeat(headerRow.length), 'bright'));
  
  // Print rows
  rows.forEach(row => {
    const formattedRow = row.map((cell, i) => {
      const padded = cell.padEnd(colWidths[i]);
      if (i === 3) { // Status column
        return cell.includes('PASS') ? colorize(padded, 'green') : colorize(padded, 'red');
      }
      return padded;
    }).join(' | ');
    console.log(formattedRow);
  });
  
  console.log('');
}

/**
 * Print detailed coverage breakdown
 */
function printDetailedCoverage(coverage) {
  console.log(colorize('Detailed Coverage Metrics:', 'bright'));
  console.log('');
  
  Object.keys(coverage).forEach(metric => {
    const data = coverage[metric];
    const threshold = THRESHOLDS[metric];
    const status = data.pct >= threshold;
    
    console.log(`${colorize(metric.charAt(0).toUpperCase() + metric.slice(1), 'bright')}:`);
    console.log(`  Coverage: ${data.covered}/${data.total} (${data.pct}%)`);
    console.log(`  Threshold: ${threshold}%`);
    console.log(`  Status: ${status ? colorize('✅ PASS', 'green') : colorize('❌ FAIL', 'red')}`);
    
    if (!status) {
      const needed = Math.ceil((threshold * data.total) / 100) - data.covered;
      console.log(`  ${colorize(`Need ${needed} more covered to reach threshold`, 'yellow')}`);
    }
    
    console.log('');
  });
}

/**
 * Print recommendations for improving coverage
 */
function printRecommendations(coverage, failedMetrics) {
  if (failedMetrics.length === 0) return;
  
  console.log(colorize('Recommendations for Improvement:', 'yellow'));
  console.log('');
  
  failedMetrics.forEach(metric => {
    const data = coverage[metric];
    const threshold = THRESHOLDS[metric];
    const gap = threshold - data.pct;
    
    console.log(`${colorize(`${metric.charAt(0).toUpperCase() + metric.slice(1)}:`, 'yellow')}`);
    
    if (metric === 'statements') {
      console.log('  • Add more unit tests for uncovered code paths');
      console.log('  • Focus on service methods and component logic');
      console.log('  • Use coverage reports to identify untested files');
    } else if (metric === 'branches') {
      console.log('  • Test both true/false conditions in if statements');
      console.log('  • Add tests for error handling paths');
      console.log('  • Test different input scenarios for conditional logic');
    } else if (metric === 'functions') {
      console.log('  • Ensure all public methods have test coverage');
      console.log('  • Test private methods through public interfaces');
      console.log('  • Add tests for lifecycle methods and event handlers');
    } else if (metric === 'lines') {
      console.log('  • Review line-by-line coverage in HTML report');
      console.log('  • Add tests for initialization and cleanup code');
      console.log('  • Test exception handling and edge cases');
    }
    
    console.log(`  • Current gap: ${gap.toFixed(1)}% below threshold`);
    console.log('');
  });
  
  console.log(colorize('💡 Tip: Run "npm run coverage:serve" to view detailed HTML coverage report', 'cyan'));
  console.log('');
}

/**
 * Main execution function
 */
function main() {
  try {
    printHeader('SponsPay WebApp - Coverage Threshold Check');
    
    // Locate coverage summary file
    const coveragePaths = [
      path.join(__dirname, '../coverage/sponspay/coverage-summary.json'),
      path.join(__dirname, '../coverage/coverage-summary.json'),
      path.join(process.cwd(), 'coverage/sponspay/coverage-summary.json'),
      path.join(process.cwd(), 'coverage/coverage-summary.json')
    ];
    
    let coveragePath = null;
    for (const testPath of coveragePaths) {
      if (fs.existsSync(testPath)) {
        coveragePath = testPath;
        break;
      }
    }
    
    if (!coveragePath) {
      console.error(colorize('❌ Coverage report not found!', 'red'));
      console.error('');
      console.error('Expected locations:');
      coveragePaths.forEach(p => console.error(`  • ${p}`));
      console.error('');
      console.error(colorize('💡 Run "npm run test:coverage" to generate coverage report', 'yellow'));
      process.exit(2);
    }
    
    console.log(colorize(`📊 Reading coverage report: ${path.relative(process.cwd(), coveragePath)}`, 'blue'));
    console.log('');
    
    // Read and parse coverage data
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const totalCoverage = coverageData.total;
    
    if (!totalCoverage) {
      console.error(colorize('❌ Invalid coverage report format!', 'red'));
      console.error('Expected "total" property in coverage summary');
      process.exit(2);
    }
    
    // Print coverage summary
    printCoverageSummary(totalCoverage);
    
    // Check thresholds
    const failedMetrics = [];
    let allPassed = true;
    
    Object.keys(THRESHOLDS).forEach(metric => {
      const actual = totalCoverage[metric].pct;
      const required = THRESHOLDS[metric];
      
      if (actual < required) {
        failedMetrics.push(metric);
        allPassed = false;
      }
    });
    
    // Print detailed breakdown
    printDetailedCoverage(totalCoverage);
    
    // Print final result
    if (allPassed) {
      console.log(colorize('🎉 All coverage thresholds met!', 'green'));
      console.log(colorize('✅ Quality gate: PASSED', 'green'));
      console.log('');
      
      // Print achievement summary
      const avgCoverage = Object.keys(THRESHOLDS).reduce((sum, metric) => 
        sum + totalCoverage[metric].pct, 0) / Object.keys(THRESHOLDS).length;
      
      console.log(colorize(`📈 Average coverage: ${avgCoverage.toFixed(1)}%`, 'cyan'));
      console.log(colorize(`🎯 Total tests: ${totalCoverage.statements.total} statements covered`, 'cyan'));
      
    } else {
      console.log(colorize('❌ Coverage thresholds not met!', 'red'));
      console.log(colorize('❌ Quality gate: FAILED', 'red'));
      console.log('');
      
      console.log(colorize(`Failed metrics: ${failedMetrics.join(', ')}`, 'red'));
      console.log('');
      
      // Print recommendations
      printRecommendations(totalCoverage, failedMetrics);
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error(colorize('❌ Error checking coverage thresholds:', 'red'));
    console.error(error.message);
    
    if (error.code === 'ENOENT') {
      console.error('');
      console.error(colorize('💡 Make sure to run "npm run test:coverage" first', 'yellow'));
    }
    
    process.exit(2);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  THRESHOLDS,
  main
};
