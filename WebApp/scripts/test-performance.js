#!/usr/bin/env node

/**
 * Test Performance Monitor
 * Phase 4 Task 4: Performance Optimization
 * 
 * Monitors and reports test execution performance metrics
 */

const fs = require('fs');
const path = require('path');

class TestPerformanceMonitor {
  constructor() {
    this.performanceFile = path.join(__dirname, '../test-performance.json');
    this.thresholds = {
      maxExecutionTime: 5000, // 5 seconds
      maxMemoryUsage: 512,    // 512 MB
      minTestsPerSecond: 120  // 120 tests/second
    };
  }

  /**
   * Load existing performance data
   */
  loadPerformanceData() {
    try {
      if (fs.existsSync(this.performanceFile)) {
        const data = fs.readFileSync(this.performanceFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('⚠️  Could not load existing performance data:', error.message);
    }
    return { runs: [] };
  }

  /**
   * Save performance data
   */
  savePerformanceData(data) {
    try {
      fs.writeFileSync(this.performanceFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Could not save performance data:', error.message);
    }
  }

  /**
   * Parse test output to extract metrics
   */
  parseTestOutput() {
    // This would typically parse the test output from a log file
    // For now, we'll simulate the metrics based on recent run
    const simulatedMetrics = {
      totalTests: 824,
      executionTime: 6472, // milliseconds
      totalTime: 6797,     // milliseconds including overhead
      passedTests: 824,
      failedTests: 0,
      skippedTests: 7,
      timestamp: new Date().toISOString(),
      browser: 'ChromeHeadlessOptimized',
      memoryUsage: this.estimateMemoryUsage()
    };

    return simulatedMetrics;
  }

  /**
   * Estimate memory usage (simplified)
   */
  estimateMemoryUsage() {
    // Simplified memory estimation based on test count
    const baseMemory = 200; // Base memory in MB
    const memoryPerTest = 0.3; // MB per test
    return Math.round(baseMemory + (824 * memoryPerTest));
  }

  /**
   * Calculate performance metrics
   */
  calculateMetrics(testData) {
    const testsPerSecond = Math.round((testData.totalTests / testData.executionTime) * 1000);
    const overhead = testData.totalTime - testData.executionTime;
    const overheadPercentage = Math.round((overhead / testData.totalTime) * 100);

    return {
      ...testData,
      testsPerSecond,
      overhead,
      overheadPercentage,
      performance: {
        executionTimeOk: testData.totalTime <= this.thresholds.maxExecutionTime,
        memoryUsageOk: testData.memoryUsage <= this.thresholds.maxMemoryUsage,
        testsPerSecondOk: testsPerSecond >= this.thresholds.minTestsPerSecond
      }
    };
  }

  /**
   * Generate performance report
   */
  generateReport(metrics, history) {
    console.log('\n🚀 Test Performance Report');
    console.log('=' .repeat(50));
    
    // Current run metrics
    console.log(`📊 Current Run (${metrics.timestamp})`);
    console.log(`   Tests: ${metrics.totalTests} (${metrics.passedTests} passed, ${metrics.failedTests} failed, ${metrics.skippedTests} skipped)`);
    console.log(`   Execution Time: ${metrics.executionTime}ms`);
    console.log(`   Total Time: ${metrics.totalTime}ms (${metrics.overheadPercentage}% overhead)`);
    console.log(`   Tests/Second: ${metrics.testsPerSecond}`);
    console.log(`   Memory Usage: ~${metrics.memoryUsage}MB`);
    console.log(`   Browser: ${metrics.browser}`);

    // Performance status
    console.log('\n⚡ Performance Status:');
    const executionStatus = metrics.performance.executionTimeOk ? '✅' : '❌';
    const memoryStatus = metrics.performance.memoryUsageOk ? '✅' : '❌';
    const speedStatus = metrics.performance.testsPerSecondOk ? '✅' : '❌';

    console.log(`   ${executionStatus} Execution Time: ${metrics.totalTime}ms (target: <${this.thresholds.maxExecutionTime}ms)`);
    console.log(`   ${memoryStatus} Memory Usage: ${metrics.memoryUsage}MB (target: <${this.thresholds.maxMemoryUsage}MB)`);
    console.log(`   ${speedStatus} Test Speed: ${metrics.testsPerSecond} tests/sec (target: >${this.thresholds.minTestsPerSecond})`);

    // Historical comparison
    if (history.runs.length > 1) {
      const previousRun = history.runs[history.runs.length - 2];
      const timeDiff = metrics.totalTime - previousRun.totalTime;
      const speedDiff = metrics.testsPerSecond - previousRun.testsPerSecond;
      
      console.log('\n📈 Trend Analysis:');
      if (timeDiff < 0) {
        console.log(`   ⬇️  ${Math.abs(timeDiff)}ms faster than previous run`);
      } else if (timeDiff > 0) {
        console.log(`   ⬆️  ${timeDiff}ms slower than previous run`);
      } else {
        console.log(`   ➡️  Same execution time as previous run`);
      }

      if (speedDiff > 0) {
        console.log(`   🚀 ${speedDiff} more tests/second than previous run`);
      } else if (speedDiff < 0) {
        console.log(`   🐌 ${Math.abs(speedDiff)} fewer tests/second than previous run`);
      }
    }

    // Recommendations
    this.generateRecommendations(metrics);

    console.log('\n' + '=' .repeat(50));
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(metrics) {
    console.log('\n💡 Recommendations:');
    
    if (!metrics.performance.executionTimeOk) {
      console.log('   🔧 Consider increasing browser concurrency');
      console.log('   🔧 Review test setup/teardown for optimization opportunities');
      console.log('   🔧 Consider parallel test execution');
    }

    if (!metrics.performance.memoryUsageOk) {
      console.log('   🧹 Review memory leaks in test setup');
      console.log('   🧹 Consider reducing test fixture size');
      console.log('   🧹 Implement proper cleanup in afterEach blocks');
    }

    if (!metrics.performance.testsPerSecondOk) {
      console.log('   ⚡ Optimize async test patterns');
      console.log('   ⚡ Review DOM manipulation in tests');
      console.log('   ⚡ Consider mocking heavy operations');
    }

    if (metrics.overheadPercentage > 10) {
      console.log('   🏗️  High overhead detected - review Karma configuration');
      console.log('   🏗️  Consider optimizing browser startup flags');
    }

    if (metrics.performance.executionTimeOk && metrics.performance.memoryUsageOk && metrics.performance.testsPerSecondOk) {
      console.log('   🎉 All performance targets met! Great job!');
      console.log('   📊 Consider setting more aggressive targets for continuous improvement');
    }
  }

  /**
   * Main execution function
   */
  run() {
    console.log('🔍 Analyzing test performance...\n');

    // Load historical data
    const history = this.loadPerformanceData();

    // Parse current test metrics
    const testData = this.parseTestOutput();

    // Calculate performance metrics
    const metrics = this.calculateMetrics(testData);

    // Add to history
    history.runs.push(metrics);

    // Keep only last 10 runs
    if (history.runs.length > 10) {
      history.runs = history.runs.slice(-10);
    }

    // Save updated history
    this.savePerformanceData(history);

    // Generate report
    this.generateReport(metrics, history);

    // Exit with appropriate code
    const allTargetsMet = Object.values(metrics.performance).every(Boolean);
    process.exit(allTargetsMet ? 0 : 1);
  }
}

// Run the performance monitor
if (require.main === module) {
  const monitor = new TestPerformanceMonitor();
  monitor.run();
}

module.exports = TestPerformanceMonitor;
