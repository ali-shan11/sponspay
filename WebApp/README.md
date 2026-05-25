# SponsPay WebApp

A modern Angular-based marketing website for SponsPay - a platform that helps YouTube content creators maximize their revenue through local payment options and enhanced fan engagement features.

## 🚀 Technology Stack

- **Angular 19** - Latest Angular framework
- **Bootstrap 5** - Responsive UI framework
- **Firebase** - Authentication and hosting
- **TypeScript** - Type-safe development
- **SCSS** - Enhanced styling capabilities
- **Angular Fire** - Firebase integration
- **ngx-toastr** - Toast notifications

## 📋 Prerequisites

Before running this project locally, ensure you have:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git** for version control

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WebApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   The project uses environment-specific configurations located in `src/environments/`:
   - `environment.ts` - Default environment
   - `environment.development.ts` - Development configuration
   - `environment.production.ts` - Production configuration

## 🏃‍♂️ Development Server

### Available Start Commands

#### `npm run start`
```bash
npm run start
```
- **What it does**: Runs `ng serve` with Angular's default development configuration
- **When to use**: General development work, quick testing
- **Environment**: Uses `environment.development.ts`
- **URL**: http://localhost:4200
- **Features**: Hot reload, source maps enabled

#### `npm run start:dev`
```bash
npm run start:dev
```
- **What it does**: Runs `ng serve --configuration development` (explicitly specifies dev config)
- **When to use**: When you want to be explicit about using development configuration
- **Environment**: Uses `environment.development.ts`
- **URL**: http://localhost:4200
- **Features**: Hot reload, source maps enabled, no optimization for faster builds

### Key Differences
Both commands serve the application on `http://localhost:4200` and provide hot reload functionality. The main difference is:

- `npm run start`: Uses Angular CLI's default behavior (which defaults to development)
- `npm run start:dev`: Explicitly specifies the development configuration

**Recommendation**: Use `npm run start:dev` for clarity and consistency, especially when working in teams.

## 🔧 Development Features

### Hot Reload
The application automatically reloads when you make changes to source files.

### Environment Configuration
- **Development**: Optimized for debugging with source maps and no minification
- **Production**: Optimized builds with minification and tree-shaking

### Internationalization
The project supports multiple languages:
- English (default)
- French (configured)

Extract translation strings:
```bash
npm run locale
```

## 🏗️ Building the Project

### Development Build
```bash
npm run build
# or for watch mode
npm run watch
```

### Production Build
```bash
npm run build --configuration production
```

Build artifacts are stored in the `dist/sponspay/` directory.

### Bundle Analysis
Analyze your bundle size and dependencies:
```bash
npm run analyze
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```
Runs unit tests using Karma and Jasmine.

### End-to-End Tests
```bash
npm run e2e
```
Note: E2E testing framework needs to be configured first.

## 📁 Project Structure

```
src/
├── app/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components
│   ├── services/           # Business logic services
│   ├── auth/               # Authentication related code
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Utility functions
├── environments/           # Environment configurations
├── locale/                 # Internationalization files
└── theme/                  # SCSS theme files
```

## 🐳 Docker & Kubernetes

The project includes Docker and Kubernetes configurations:

- **Dockerfile**: Container configuration
- **k8s/**: Kubernetes deployment files
- **nginx.conf**: Production web server configuration

## 🔥 Firebase Integration

The application integrates with Firebase for:
- Authentication (Google Sign-In)
- Hosting (production deployment)

Environment-specific Firebase configurations are managed in the environment files.

## 🌍 Supported Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Google Authentication**: OAuth integration for user login
- **Contact Form**: Backend API integration
- **Revenue Estimator**: Interactive calculator for creators
- **Multi-language Support**: Ready for internationalization
- **SEO Optimized**: Meta tags and structured data

## 🚀 Deployment

### Local Development
```bash
npm run start:dev
```

### Production Build
```bash
npm run build --configuration production
```

### Docker Deployment
```bash
docker build -t sponspay-webapp .
docker run -p 80:80 sponspay-webapp
```

## 📝 Development Guidelines

### Code Style
- Follow Angular style guide
- Use TypeScript strict mode
- Component files should be co-located
- Services in dedicated directory
- Use meaningful variable names

### Git Workflow
- Create feature branches for new work
- Write descriptive commit messages
- Submit pull requests for code review
- Keep main branch stable

## 🔍 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 4200
   lsof -ti:4200 | xargs kill -9
   ```

2. **Node modules issues**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Build errors**
   ```bash
   # Clear Angular cache
   ng cache clean
   ```

## 📚 Additional Resources

- [Angular Documentation](https://angular.dev)
- [Bootstrap Documentation](https://getbootstrap.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Angular CLI Reference](https://angular.dev/tools/cli)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## 📄 License

This project is private and proprietary to SponsPay.
