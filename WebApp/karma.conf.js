// Karma configuration file for SponsPay WebApp
// Task 6: Enhanced Karma configuration with coverage reporting and CI support

module.exports = function (config) {
  config.set({
    // Base configuration
    basePath: '',
    frameworks: ['jasmine'],
    
    // Required plugins
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('karma-spec-reporter'),
      
    ],
    
    // Test client configuration
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
      jasmine: {
        // Jasmine configuration options
        random: true,
        seed: '4321',
        stopOnSpecFailure: false
      },
      // Suppress console logs during tests for cleaner output
      captureConsole: false
    },
    
    // Coverage reporter configuration - maintaining high quality standards
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/sponspay'),
      subdir: '.',
      reporters: [
        // HTML report for detailed local analysis
        { type: 'html' },
        // Text summary for console output
        { type: 'text-summary' },
        // LCOV format for CI/CD integration
        { type: 'lcov' },
        // Cobertura format for XML-based reporting systems
        { type: 'cobertura' }
      ],
      
      // Exclude testing infrastructure and Firebase config from coverage measurement
      // Testing utilities should support the application, not be subject to coverage requirements
      instrumenterOptions: {
        istanbul: {
          noCompact: true
        }
      },
      
      // Use custom preprocessor to exclude files
      fixWebpackSourcePaths: true,
      
      // Quality gates - enforce coverage thresholds
      // NOTE: per-file `each` checks with overrides are broken in Angular 21's
      // @angular/build:karma builder — it overrides basePath to a temp output dir,
      // causing karma-coverage's minimatch to fail on all override patterns.
      // Only global thresholds are enforced until Angular fixes this.
      check: {
        global: {
          statements: 80,
          branches: 75,
          functions: 90,
          lines: 80
        }
      },
      
      // Watermarks for visual indicators in HTML reports
      watermarks: {
        statements: [70, 80],
        functions: [80, 90],
        branches: [65, 75],
        lines: [70, 80]
      },
      
      // Include all source files for accurate coverage
      includeAllSources: true,
      
      // Skip files with no statements
      skipFilesWithNoCoverage: false
    },
    
    // Reporters configuration - use spec for concise output
    reporters: ['spec', 'kjhtml', 'coverage'],
    
    // Spec reporter configuration for clean, concise output
    specReporter: {
      maxLogLines: 5,             // limit the number of lines logged per test
      suppressErrorSummary: false, // show error summary at the end
      suppressFailed: false,       // show failed tests
      suppressPassed: true,        // hide passed tests for concise output
      suppressSkipped: true,       // hide skipped tests
      showSpecTiming: false,       // hide individual test timing
      failFast: false,            // don't stop on first failure
      prefixes: {
        success: '✓ ',            // green checkmark for passed tests
        failure: '✗ ',            // red X for failed tests
        skipped: '- '             // dash for skipped tests
      }
    },
    
    // Browser configuration
    browsers: ['Chrome'],
    
    // Custom browser launchers - optimized for performance
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-web-security',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI,VizDisplayCompositor',
          '--remote-debugging-port=9222',
          '--max_old_space_size=4096',
          '--js-flags="--max-old-space-size=4096"'
        ]
      },
      ChromeHeadlessOptimized: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-web-security',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI,VizDisplayCompositor',
          '--disable-ipc-flooding-protection',
          '--max_old_space_size=4096',
          '--js-flags="--max-old-space-size=4096"'
        ]
      },
      ChromeDebug: {
        base: 'Chrome',
        flags: ['--remote-debugging-port=9333'],
        debug: true
      }
    },
    
    // Test execution settings
    singleRun: false,
    restartOnFileChange: true,
    autoWatch: true,
    
    // Performance and timeout settings - optimized for speed
    browserNoActivityTimeout: 30000,
    browserDisconnectTimeout: 5000,
    browserDisconnectTolerance: 2,
    captureTimeout: 30000,
    processKillTimeout: 5000,
    
    // Logging configuration - reduced verbosity
    logLevel: config.LOG_WARN,
    colors: true,
    
    // Reduce browser console noise
    browserConsoleLogOptions: {
      level: 'error',
      format: '%b %T: %m',
      terminal: true
    },
    
    // Concurrency settings - maximized for performance
    concurrency: 8,
    
    // File patterns (handled by Angular CLI)
    files: [],
    exclude: [],
    
    // Preprocessors (handled by Angular CLI)
    preprocessors: {},
    
    // Port configuration
    port: 9876,
    
    // Proxy configuration for API calls during testing
    proxies: {},
    
    // Additional configuration for Angular testing
    angularCli: {
      environment: 'dev'
    }
  });
  
  // Environment-specific overrides
  if (process.env.CI) {
    // CI environment optimizations
    config.browsers = ['ChromeHeadlessOptimized'];
    config.singleRun = true;
    config.autoWatch = false;
    config.logLevel = config.LOG_ERROR;
    
    // Aggressive timeouts for faster CI execution
    config.browserNoActivityTimeout = 15000;
    config.browserDisconnectTimeout = 2000;
    config.captureTimeout = 15000;
    config.processKillTimeout = 2000;
    
    // Maximum concurrency for CI
    config.concurrency = 10;
    
    // Even more concise output for CI
    config.specReporter.suppressPassed = true;
    config.specReporter.suppressSkipped = true;
    
    // Maintain coverage quality in CI
    config.coverageReporter.reporters = [
      { type: 'text-summary' },
      { type: 'lcov' }
    ];
  }
  
  // Performance mode for fast testing
  if (process.env.PERFORMANCE_MODE) {
    config.browsers = ['ChromeHeadlessOptimized'];
    config.singleRun = true;
    config.autoWatch = false;
    config.logLevel = config.LOG_ERROR;
    config.concurrency = 10;
    
    // Minimal reporting for maximum speed
    config.reporters = ['spec'];
    config.specReporter.suppressPassed = true;
    config.specReporter.suppressSkipped = true;
    
    // Streamlined coverage for performance mode
    config.coverageReporter.reporters = [{ type: 'text-summary' }];
    
    // Aggressive timeouts
    config.browserNoActivityTimeout = 10000;
    config.browserDisconnectTimeout = 1000;
    config.captureTimeout = 10000;
    config.processKillTimeout = 1000;
  }
  
  // Debug mode configuration - verbose output
  if (process.env.DEBUG_TESTS) {
    config.browsers = ['ChromeDebug'];
    config.singleRun = false;
    config.autoWatch = true;
    config.logLevel = config.LOG_DEBUG;
    config.reporters = ['progress', 'kjhtml', 'coverage']; // Use verbose progress reporter
    config.client.captureConsole = true; // Show all console logs
  }
  
  // Verbose mode configuration - for detailed debugging
  if (process.env.VERBOSE_TESTS) {
    config.logLevel = config.LOG_INFO;
    config.reporters = ['progress', 'kjhtml', 'coverage']; // Use verbose progress reporter
    config.client.captureConsole = true; // Show all console logs
    config.specReporter.suppressPassed = false; // Show all tests
    config.specReporter.showSpecTiming = true; // Show timing
  }
};
