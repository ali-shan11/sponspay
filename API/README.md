# NestJS API Project

A comprehensive NestJS API with PostgreSQL database, Firebase authentication, and integrated development tools.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Get Started in 3 Steps

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd API
   cp .env.example .env.local
   ```

2. **Start the development environment**:
   ```bash
   docker-compose up -d
   ```

3. **Access your tools**:
   - **API**: http://localhost:3000
   - **Database Admin**: http://localhost:8080 (pgAdmin - no login required)
   - **API Documentation**: http://localhost:3000/api

## 🛠️ Development Tools

### pgAdmin Database Client
- **URL**: http://localhost:8080
- **Features**: Web-based PostgreSQL administration
- **Setup**: Zero configuration - automatically connects to your database
- **Usage**: Click "Local PostgreSQL" server to start browsing your database

### API Documentation
- **URL**: http://localhost:3000/api
- **Features**: Interactive API documentation with Scalar UI
- **Authentication**: Test endpoints with API keys or Firebase tokens

## 📦 What's Included

### Core Features
- **NestJS Framework**: Modern Node.js framework with TypeScript
- **PostgreSQL Database**: Robust relational database with TypeORM
- **Dual Authentication**: API keys for external access, Firebase JWT for users
- **Email Integration**: SendGrid for transactional emails
- **Comprehensive Testing**: Unit and integration tests with Jest
- **API Documentation**: Auto-generated with Swagger/Scalar

### Development Environment
- **Docker Compose**: Complete development environment
- **pgAdmin**: Web-based database administration
- **Hot Reload**: Automatic code reloading during development
- **Environment Validation**: Joi-based configuration validation
- **Health Checks**: Built-in health monitoring endpoints

## 🏗️ Project Structure

```
src/
├── app.module.ts           # Root application module
├── main.ts                 # Application entry point
├── auth/                   # Authentication (API keys, JWT)
├── user/                   # User management
├── marketing/              # Contact forms and marketing
├── mail/                   # Email services
├── health/                 # Health check endpoints
├── firebase/               # Firebase integration
├── sendgrid/               # SendGrid email service
└── zoho/                   # Zoho CRM integration

docs/                       # Comprehensive documentation
├── nestjs-features/        # NestJS concepts explained
├── configuration/          # Environment and setup guides
├── development/            # Development tools and workflow
├── integrations/           # External service integrations
└── architecture/           # Project structure and patterns

pgadmin/                    # Database administration
├── servers.json.template  # Auto-configured database connection
└── README.md              # pgAdmin usage guide
```

## 🔧 Development Commands

### Docker Development (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart specific service
docker-compose restart api
```

### Local Development
```bash
# Install dependencies
npm install

# Start in development mode
npm run start:dev

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Build for production
npm run build
```

## 🗄️ Database Management

### Using pgAdmin (Web Interface)
1. Open http://localhost:8080
2. Click "Local PostgreSQL" server
3. Browse tables, run queries, manage data

### Using Command Line
```bash
# Connect to PostgreSQL container
docker-compose exec db psql -U filip -d dev

# Run migrations
npm run migration:run

# Generate new migration
npm run migration:generate -- -n MigrationName
```

## 🔐 Authentication

### API Key Authentication
- Used for external service access
- Configure in environment variables
- Validate domains in `API_KEY_ALLOWED_DOMAINS`

### Firebase JWT Authentication
- Used for user authentication
- Requires Firebase service account
- Automatic user creation and management

## 📧 Email Integration

### SendGrid Configuration
- Transactional emails for contact forms
- Template-based email system
- Environment-based configuration

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e           # requires a running Postgres instance
npm run test:e2e:embedded  # spins up ephemeral Postgres without Docker

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Test Structure
- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end API testing
- **Mocking**: Firebase and external services
- **Coverage**: Comprehensive test coverage reporting

## 📚 Documentation

### Comprehensive Guides
- **[Full Documentation](./docs/README.md)**: Complete NestJS learning resource
- **[pgAdmin Guide](./docs/development/pgadmin.md)**: Database administration
- **[Environment Setup](./docs/configuration/environment-config.md)**: Configuration guide
- **[Development Workflow](./docs/development/workflow.md)**: Development practices

### Quick References
- **[Project Structure](./docs/architecture/project-structure.md)**: Codebase organization
- **[Database Integration](./docs/nestjs-features/database-typeorm.md)**: TypeORM usage
- **[Authentication](./docs/nestjs-features/guards-auth.md)**: Security implementation

## 🌍 Environment Configuration

### Required Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# Authentication
SERVICE_ACCOUNT=your_service_account
API_KEY_ALLOWED_DOMAINS=localhost,yourdomain.com

# Email
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# Firebase
FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account

# External APIs
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
```

### Environment Files
- `.env.example`: Template with all required variables
- `.env.local`: Local development configuration
- `.env`: Production configuration (not in repository)

## 🚀 Deployment

### Docker Production
```bash
# Build production image
docker build -t api-production .

# Run with production environment
docker run -p 3000:3000 --env-file .env api-production
```

### Kubernetes
- Deployment manifests in `k8s/` directory
- Environment-specific configurations
- Health checks and scaling configuration

## 🔍 Monitoring & Health

### Health Endpoints
- **GET /health**: Application health status
- **GET /health/database**: Database connectivity
- **GET /health/external**: External service status

### Logging
- Structured logging with NestJS Logger
- Request/response logging
- Error tracking and monitoring

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Make changes with tests
3. Update documentation if needed
4. Submit pull request

### Code Standards
- TypeScript with strict mode
- ESLint and Prettier configuration
- Comprehensive test coverage
- Documentation for new features

## 📄 License

This project is [MIT licensed](LICENSE).

## 🆘 Support & Troubleshooting

### Common Issues
- **Database connection**: Check Docker services with `docker-compose ps`
- **pgAdmin access**: Restart pgAdmin service with `docker-compose restart pgadmin`
- **Environment variables**: Verify `.env.local` configuration

### Getting Help
- Check the [comprehensive documentation](./docs/README.md)
- Review [troubleshooting guides](./docs/development/workflow.md)
- Examine logs with `docker-compose logs [service-name]`

---

**Ready to start developing?** Run `docker-compose up -d` and open http://localhost:8080 to explore your database!
