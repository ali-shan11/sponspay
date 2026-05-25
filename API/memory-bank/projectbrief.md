# SponsPay API - Project Brief

## Project Overview
SponsPay API is a NestJS-based backend service that powers the SponsPay platform, providing RESTful endpoints for creator monetization, payment processing, and user management. It serves as the backbone for enabling YouTube creators to accept local payment methods from fans worldwide.

## Core Purpose
Provide backend services to:
- Handle user authentication and authorization
- Process contact form submissions and marketing inquiries
- Manage creator accounts and profiles
- Facilitate payment transactions
- Store and retrieve platform data
- Send email notifications
- Integrate with third-party services

## Target Systems
- Frontend Angular application
- Mobile applications (future)
- Third-party payment providers
- Email service providers (SendGrid)
- Firebase for authentication
- PostgreSQL database
- Google Cloud Storage

## Key Business Goals
1. **Secure API Infrastructure**: Provide reliable, secure endpoints for all platform operations
2. **Scalable Architecture**: Support growing user base and transaction volume
3. **Payment Integration**: Connect with multiple payment providers globally
4. **Data Management**: Efficiently store and retrieve user, creator, and transaction data
5. **Communication Hub**: Handle all email notifications and user communications

## Technical Scope
- RESTful API design with OpenAPI documentation
- JWT-based authentication with Firebase
- API key authentication for service-to-service communication
- Database integration with TypeORM
- File upload capabilities
- Email service integration
- Health monitoring endpoints
- Internationalization support

## Success Criteria
- High availability (99.9% uptime)
- Fast response times (<200ms average)
- Secure authentication and authorization
- Comprehensive API documentation
- Scalable to handle growth
- Easy integration with frontend
- Reliable email delivery
- Efficient database operations
