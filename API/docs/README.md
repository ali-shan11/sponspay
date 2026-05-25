# NestJS API Documentation

Welcome to the comprehensive documentation for this NestJS API project! This documentation is designed to help developers understand the NestJS framework and how it's implemented in this project.

## 📚 Table of Contents

### 🏗️ Core NestJS Concepts
- [**Modules & Dependency Injection**](./nestjs-features/modules-di.md) - Understanding the foundation of NestJS architecture
- [**Controllers & Routing**](./nestjs-features/controllers-routing.md) - Handling HTTP requests and responses
- [**Guards & Authentication**](./nestjs-features/guards-auth.md) - Protecting routes and implementing security
- [**Validation & DTOs**](./nestjs-features/validation-dtos.md) - Data validation and transformation
- [**Database Integration**](./nestjs-features/database-typeorm.md) - Working with TypeORM and PostgreSQL

### ⚙️ Configuration & Environment
- [**Environment Configuration**](./configuration/environment-config.md) - Managing environment variables and validation
- [**Main.ts Configuration**](./configuration/main-ts.md) - Application bootstrap and global configuration

### 🔌 External Integrations
- [**Firebase Integration**](./integrations/firebase.md) - Firebase Admin SDK and authentication
- [**API Documentation (Swagger)**](./integrations/swagger.md) - Auto-generated API documentation with Scalar

### 🏛️ Architecture & Patterns
- [**Project Structure**](./architecture/project-structure.md) - How the codebase is organized

### 🧪 Development & Testing
- [**Testing Setup**](./development/testing.md) - Jest configuration and testing patterns
- [**Development Workflow**](./development/workflow.md) - Scripts, debugging, and development practices
- [**pgAdmin Database Client**](./development/pgadmin.md) - Web-based PostgreSQL administration interface

## 🚀 Quick Start Guide

If you're new to NestJS, we recommend starting with these documents in order:

1. [**Modules & Dependency Injection**](./nestjs-features/modules-di.md) - Core concepts
2. [**Controllers & Routing**](./nestjs-features/controllers-routing.md) - Basic request handling
3. [**Project Structure**](./architecture/project-structure.md) - Understanding the codebase
4. [**Environment Configuration**](./configuration/environment-config.md) - Setting up your environment
5. [**Guards & Authentication**](./nestjs-features/guards-auth.md) - Security implementation
6. [**Database Integration**](./nestjs-features/database-typeorm.md) - Working with data

## 💡 About This Documentation

This documentation focuses on:
- **What** each NestJS feature does
- **Why** it's used in this project
- **How** it's implemented with real code examples from your codebase
- **Best practices** demonstrated in the implementation
- **Next steps** for extending functionality

### Key Features of This Documentation

#### Real Code Examples
- Every concept is illustrated with actual code from this project
- No theoretical examples - everything is based on the actual implementation
- Direct references to files and patterns used in the codebase

#### Beginner-Friendly
- Explains "What", "Why", and "How" for each concept
- Assumes familiarity with coding but not NestJS
- Progressive complexity from basic to advanced topics

#### Practical Focus
- Shows how to extend existing functionality
- Includes troubleshooting sections
- Provides next steps for learning

## 🔧 What's Covered

### NestJS Framework Features
- **Modules**: Feature-based organization with dependency injection
- **Controllers**: HTTP request handling with decorators
- **Guards**: API key and Firebase JWT authentication
- **Pipes**: Global validation with class-validator
- **Services**: Business logic and external integrations
- **Entities**: TypeORM database models

### Project-Specific Implementations
- **Dual Authentication**: API key for external access, JWT for user auth
- **Email Integration**: SendGrid service for contact forms
- **Database**: PostgreSQL with TypeORM and migrations
- **API Documentation**: Scalar API reference instead of standard Swagger UI
- **Configuration**: Comprehensive Joi validation for environment variables
- **Testing**: Jest setup with unit and integration tests

### External Integrations
- **Firebase**: Admin SDK for user authentication and management
- **SendGrid**: Email service integration
- **PostgreSQL**: Database with TypeORM ORM
- **Swagger/Scalar**: Interactive API documentation

## 🛠️ Development Setup

To get started with development:

1. **Read the documentation** starting with the Quick Start Guide above
2. **Set up your environment** following the [Environment Configuration](./configuration/environment-config.md)
3. **Understand the project structure** with [Project Structure](./architecture/project-structure.md)
4. **Learn the development workflow** with [Development Workflow](./development/workflow.md)

## 📖 Learning Path

### For NestJS Beginners
1. Start with [Modules & Dependency Injection](./nestjs-features/modules-di.md)
2. Learn [Controllers & Routing](./nestjs-features/controllers-routing.md)
3. Understand [Validation & DTOs](./nestjs-features/validation-dtos.md)
4. Explore [Guards & Authentication](./nestjs-features/guards-auth.md)
5. Study [Database Integration](./nestjs-features/database-typeorm.md)

### For Adding New Features
1. Review [Project Structure](./architecture/project-structure.md) for organization patterns
2. Check [Environment Configuration](./configuration/environment-config.md) for config needs
3. Follow patterns in [Controllers & Routing](./nestjs-features/controllers-routing.md)
4. Use [Testing Setup](./development/testing.md) for test patterns

## 🔗 Useful External Links

- [Official NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Class Validator Documentation](https://github.com/typestack/class-validator)
- [Passport.js Documentation](http://www.passportjs.org/docs/)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [SendGrid API Documentation](https://docs.sendgrid.com/)

## 📝 Contributing to Documentation

When adding new features to the project:

1. **Update relevant documentation** to reflect changes
2. **Add new documentation files** for significant new features
3. **Include code examples** from the actual implementation
4. **Update this README** if adding new major sections

---

*This documentation is maintained alongside the codebase. It serves as both a learning resource for NestJS and a guide to this specific project's implementation patterns.*
