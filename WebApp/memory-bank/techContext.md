# SponsPay WebApp - Technical Context

## Technology Stack

### Core Framework
- **Angular 19.2.2**: Modern web application framework
- **TypeScript 5.5.2**: Type-safe JavaScript development
- **RxJS 7.8.0**: Reactive programming for async operations

### UI/Styling
- **Bootstrap 5.3.3**: Responsive design framework
- **SCSS**: Advanced CSS preprocessing
- **Animate.css 4.1.1**: CSS animations library
- **Custom SVG assets**: Vector graphics for icons and illustrations

### Development Tools
- **Angular CLI 19.2.5**: Project scaffolding and build tools
- **Karma/Jasmine**: Unit testing framework with coverage enforcement
- **Cypress 13.x**: End-to-end testing with parallel execution
- **ESBuild**: Fast JavaScript bundler with performance monitoring
- **Docker**: Containerization for deployment
- **Nginx**: Web server for production
- **ESLint**: Code quality and style enforcement
- **TypeScript Compiler**: Strict type checking in CI/CD

### Additional Libraries
- **@ng-bootstrap/ng-bootstrap 18.0.0**: Angular Bootstrap components
- **ngx-toastr 19.0.0**: Toast notifications
- **awesome-phonenumber 7.4.0**: Phone number validation
- **date-fns 4.1.0**: Date manipulation utilities
- **svg-country-flags 1.2.10**: Country flag icons

### Firebase Integration
- **@angular/fire 18.0.1**: Angular Firebase SDK
- **Firebase Auth**: Authentication with Google OAuth
- **Environment-specific configuration**: Custom authDomain per environment
- **YouTube API integration**: Channel verification and analytics

### Backend Integration
- **NestJS API**: Backend service integration
- **HTTP Client**: Angular's built-in HTTP client

## Project Structure

```
src/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── header/
│   │   ├── footer/
│   │   ├── hero-section/
│   │   ├── logo/
│   │   ├── faq/
│   │   ├── revenue-estimator/
│   │   ├── supported-countries-map/
│   │   └── three-d-button/
│   ├── pages/              # Page components
│   │   ├── landing-page/
│   │   └── contact-us/
│   ├── services/           # Business logic and utilities
│   │   ├── auth.service.ts
│   │   ├── session-storage.service.ts
│   │   ├── contact-us.service.ts
│   │   ├── sidenav.service.ts
│   │   └── zoho-salesiq.service.ts
│   ├── auth/               # Authentication (interceptors, guards)
│   └── utils/              # Utility functions
├── environments/           # Environment configurations
├── locale/                 # i18n translations
├── theme/                  # SCSS variables and mixins
└── public/                 # Static assets
```

## Development Setup

### Prerequisites
- Node.js (LTS version)
- npm package manager
- Angular CLI globally installed

### Local Development
```bash
npm install              # Install dependencies
npm run start:local     # Start dev server on http://localhost:4200
npm run build           # Production build
npm run test            # Run unit tests
```

### Environment Configuration
- `environment.ts`: Production settings
- `environment.development.ts`: Development settings
- API endpoints configured per environment

## Build & Deployment

### Docker Configuration
- Multi-stage Dockerfile for optimized images
- Nginx configuration for serving static files
- Health check endpoint configured

### Kubernetes
- `k8s-deployment.yaml` for container orchestration
- Service and deployment configurations
- Scalability considerations

### Firebase Hosting
- `firebase.json` configuration present
- Static hosting capabilities
- CDN distribution

## API Integration

### Frontend to Backend
- HTTP interceptors for authentication headers
- Service layer for API communication
- Contact form integration with backend
- Error handling and retry logic

## Internationalization
- Angular i18n configured
- French translations available (`messages.fr.json`)
- Locale extraction command: `npm run locale`

## Performance Considerations
- Lazy loading for route modules
- Tree-shaking with production builds
- Bundle size analysis with esbuild-visualizer
- Optimized asset loading

## CI/CD Pipeline & Quality Gates

### Enhanced GitHub Actions Workflow
- **Pipeline File**: `.github/workflows/enhanced-ci-cd.yml`
- **Quality Gates**: Multi-stage pipeline with mandatory quality checks
- **Parallel Execution**: Fast tests run in parallel for efficiency
- **Deployment Protection**: Only deploys if all quality gates pass

### Pipeline Stages
1. **Setup & Dependencies**: Node.js 22, npm ci, dependency caching
2. **Fast Tests (Parallel)**:
   - Unit tests with coverage (`npm run test:coverage`)
   - Integration tests (`npm run test:integration`)
   - Linting and type checking (`npm run lint:ci`, `npx tsc --noEmit`)
3. **Build**: Production build with artifact upload
4. **E2E Tests (Parallel)**: 5 Cypress specs running simultaneously
5. **Security Scan**: npm audit for high/critical vulnerabilities
6. **Deployment**: Docker build and Kubernetes deployment

### Testing Infrastructure
```bash
# Available test commands
npm run test                # Unit tests
npm run test:coverage      # Unit tests with coverage
npm run test:integration   # Integration tests
npm run lint:ci           # Linting for CI
npm run e2e               # End-to-end tests
```

### Performance Monitoring Tools
- **Bundle Analysis**: `scripts/test-performance.js`
- **Coverage Validation**: `scripts/check-coverage.js`
- **Parallel Testing**: `scripts/parallel-test.js`
- **Angular Budgets**: Enforced in `angular.json`
  - Initial Bundle: 1.2MB max (800kB warning)
  - Component Styles: 5kB max (3kB warning)

### Quality Thresholds
- **Coverage Requirements**:
  - Statements: 80%+
  - Branches: 75%+
  - Functions: 90%+
  - Lines: 80%+
- **Security**: Zero high/critical vulnerabilities
- **Performance**: Bundle size within Angular budgets
- **Code Quality**: All ESLint rules and TypeScript checks pass

### Cypress E2E Testing
- **Parallel Execution**: 5 specs run simultaneously
- **Test Coverage**:
  - `landing-page.cy.ts` - Core functionality
  - `auth-flow.cy.ts` - Authentication workflows
  - `responsive.cy.ts` - Mobile/desktop layouts
  - `performance-accessibility.cy.ts` - Performance and a11y
  - `revenue-estimator-flow.cy.ts` - Revenue estimator feature
- **CI Environment**: Headless Chrome with artifact collection on failure

### Security Scanning
- **npm audit**: Automated vulnerability scanning
- **Threshold**: High/critical vulnerabilities block deployment
- **Dependency Management**: Regular security updates required

### Performance Budget Enforcement
```json
// Angular budgets (from angular.json)
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "800kB",
    "maximumError": "1.2MB"
  },
  {
    "type": "anyComponentStyle", 
    "maximumWarning": "3kB",
    "maximumError": "5kB"
  }
]
```

### Deployment Automation
- **Environment Detection**: Branch-based deployment (dev/main)
- **Docker Registry**: Google Artifact Registry
- **Kubernetes**: Automated deployment with health checks
- **Rollback Protection**: Failed deployments don't affect running services

## Security

### Frontend Security
- Content Security Policy headers
- API key authentication
- HTTPS enforcement in production
- Input validation on forms

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- Progressive enhancement approach

## Development Workflow

### Local Development
```bash
npm run start:local     # Start development server
npm run build          # Production build
npm run test           # Run unit tests
npm run lint           # Code linting
```

## Monitoring and Debugging

### Development Tools
- **Hot reload**: Automatic refresh during development
- **Source maps**: For debugging in development
- **Environment switching**: Easy configuration management

## Architecture Decisions

### Why Angular 19?
1. **Modern Framework**: Latest features and performance improvements
2. **TypeScript First**: Built-in type safety and developer experience
3. **Ecosystem**: Rich ecosystem of libraries and tools
4. **Enterprise Ready**: Proven framework for large-scale applications
5. **Performance**: Optimized bundle sizes and runtime performance

### Why Bootstrap 5?
1. **Rapid Development**: Pre-built responsive components
2. **Customization**: Easy theming with SCSS variables
3. **Mobile First**: Built-in responsive design patterns
4. **Community**: Large community and extensive documentation
5. **Integration**: Excellent Angular integration with ng-bootstrap

### Why Component Architecture?
1. **Reusability**: Components can be reused across pages
2. **Maintainability**: Clear separation of concerns
3. **Testing**: Easier to test individual components
4. **Scalability**: Easy to add new features and pages
5. **Team Development**: Multiple developers can work on different components

## Future Considerations

### Scalability
- Current architecture supports horizontal scaling
- Component-based design allows for easy feature additions
- Service layer provides clean API abstraction
- Environment-based configuration supports multiple deployments

### Maintainability
- Clean separation of concerns
- Comprehensive documentation
- Type-safe interfaces
- Standardized coding patterns
- Automated build and deployment processes

### Performance
- Bundle optimization opportunities identified
- Lazy loading strategy prepared
- Code splitting capabilities available
- Asset optimization implemented
- CDN integration ready
