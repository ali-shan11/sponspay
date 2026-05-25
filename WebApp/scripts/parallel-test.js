#!/usr/bin/env node

/**
 * Parallel Test Execution
 * Phase 4 Task 4: Performance Optimization
 * 
 * Runs tests in parallel to achieve sub-5-second execution times
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ParallelTestRunner {
  constructor() {
    this.testSuites = [
      'src/app/services/**/*.spec.ts',
      'src/app/components/**/*.spec.ts', 
      'src/app/pages/**/*.spec.ts',
      'src/app/auth/**/*.spec.ts',
      'src/testing/**/*.spec.ts',
      'src/app/integration-tests/**/*.spec.ts'
    ];
    this.maxConcurrency = 3;
    this.results = [];
  }

  /**
   * Run a single test suite
   */
  async runTestSuite(pattern, index) {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting test suite ${index + 1}: ${pattern}`);
      
      const startTime = Date.now();
      const child = spawn('npx', [
        'ng', 'test',
        '--watch=false',
        '--browsers=ChromeHeadlessOptimized',
        '--include', pattern
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          PERFORMANCE_MODE: 'true',
          CI: 'true' // Use CI optimizations
        }
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Parse test results from output
        const testResults = this.parseTestOutput(output);
        
        const result = {
          suite: pattern,
          index: index + 1,
          duration,
          exitCode: code,
          tests: testResults.tests || 0,
          passed: testResults.passed || 0,
          failed: testResults.failed || 0,
          skipped: testResults.skipped || 0,
          success: code === 0
        };

        console.log(`✅ Suite ${index + 1} completed in ${duration}ms (${result.tests} tests)`);
        
        if (code === 0) {
          resolve(result);
        } else {
          console.error(`❌ Suite ${index + 1} failed with code ${code}`);
          console.error(errorOutput);
          resolve(result); // Don't reject, just mark as failed
        }
      });

      child.on('error', (error) => {
        console.error(`❌ Suite ${index + 1} error:`, error);
        reject(error);
      });
    });
  }

  /**
   * Parse test output to extract metrics
   */
  parseTestOutput(output) {
    const results = { tests: 0, passed: 0, failed: 0, skipped: 0 };
    
    // Look for Karma output pattern: "Executed X of Y (skipped Z)"
    const executedMatch = output.match(/Executed (\d+) of (\d+)(?: \(skipped (\d+)\))?/);
    if (executedMatch) {
      results.tests = parseInt(executedMatch[2]);
      results.passed = parseInt(executedMatch[1]);
      results.skipped = executedMatch[3] ? parseInt(executedMatch[3]) : 0;
      results.failed = results.tests - results.passed - results.skipped;
    }

    return results;
  }

  /**
   * Run tests in parallel batches
   */
  async runInParallel() {
    console.log('🔥 Starting parallel test execution...\n');
    const startTime = Date.now();

    try {
      // Run test suites in parallel batches
      const results = [];
      for (let i = 0; i < this.testSuites.length; i += this.maxConcurrency) {
        const batch = this.testSuites.slice(i, i + this.maxConcurrency);
        const batchPromises = batch.map((suite, batchIndex) => 
          this.runTestSuite(suite, i + batchIndex)
        );
        
        console.log(`\n📦 Running batch ${Math.floor(i / this.maxConcurrency) + 1} with ${batch.length} suites...`);
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Generate summary report
      this.generateSummaryReport(results, totalDuration);

      // Check if all tests passed
      const allPassed = results.every(r => r.success);
      process.exit(allPassed ? 0 : 1);

    } catch (error) {
      console.error('❌ Parallel test execution failed:', error);
      process.exit(1);
    }
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(results, totalDuration) {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Parallel Test Execution Summary');
    console.log('='.repeat(60));

    const totals = results.reduce((acc, result) => ({
      tests: acc.tests + result.tests,
      passed: acc.passed + result.passed,
      failed: acc.failed + result.failed,
      skipped: acc.skipped + result.skipped,
      duration: Math.max(acc.duration, result.duration) // Max duration (parallel)
    }), { tests: 0, passed: 0, failed: 0, skipped: 0, duration: 0 });

    console.log(`📊 Total Tests: ${totals.tests}`);
    console.log(`✅ Passed: ${totals.passed}`);
    console.log(`❌ Failed: ${totals.failed}`);
    console.log(`⏭️  Skipped: ${totals.skipped}`);
    console.log(`⏱️  Total Time: ${totalDuration}ms`);
    console.log(`⚡ Max Suite Time: ${totals.duration}ms`);
    console.log(`🚀 Tests/Second: ${Math.round((totals.tests / totalDuration) * 1000)}`);

    // Performance status
    const targetTime = 5000;
    const timeStatus = totalDuration <= targetTime ? '✅' : '❌';
    console.log(`\n${timeStatus} Performance Target: ${totalDuration}ms (target: <${targetTime}ms)`);

    if (totalDuration <= targetTime) {
      console.log('🎉 Performance target achieved with parallel execution!');
    } else {
      console.log('⚠️  Consider further optimizations or increasing parallelism');
    }

    // Individual suite breakdown
    console.log('\n📋 Suite Breakdown:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} Suite ${result.index}: ${result.duration}ms (${result.tests} tests)`);
    });

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Fallback to sequential execution if parallel fails
   */
  async runSequential() {
    console.log('🔄 Falling back to sequential execution...\n');
    
    const startTime = Date.now();
    const child = spawn('npm', ['run', 'test:ultra'], {
      stdio: 'inherit',
      env: process.env
    });

    return new Promise((resolve, reject) => {
      child.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`\n⏱️  Sequential execution completed in ${duration}ms`);
        resolve(code === 0);
      });

      child.on('error', reject);
    });
  }
}

// Main execution
if (require.main === module) {
  const runner = new ParallelTestRunner();
  
  // Check if parallel execution is requested
  if (process.argv.includes('--parallel')) {
    runner.runInParallel();
  } else {
    // Default to ultra-fast sequential execution
    runner.runSequential();
  }
}

module.exports = ParallelTestRunner;
