# Sponspay

Sponspay is a comprehensive platform designed for content creators and fans, featuring a robust backend API and a modern web application.

## Project Structure

The repository is organized into two main components:

- **`API/`**: The backend service built with [NestJS](https://nestjs.com/). It handles authentication, data management, integrations (YouTube, Zoho, etc.), and payment processing.
- **`WebApp/`**: The frontend application built with [Angular](https://angular.io/). It provides the user interface for both creators (dashboards, onboarding) and fans.

## Key Features

- **Creator Dashboard:** Insights into earnings, transaction activity, and channel statistics.
- **Onboarding Flow:** Streamlined process for creators to integrate their YouTube channels.
- **Payment Integration:** Support for payment flows and validation (PawaPay).
- **Integrations:** Third-party connections with YouTube OAuth, Zoho, and more.
- **Multi-channel Support:** Designed to handle various content platforms.

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn
- Docker (for running services like database/redis via `docker-compose`)

### Backend (API)

1. Navigate to the `API` directory:
   ```bash
   cd API
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in the required values.
4. Start the development server:
   ```bash
   npm run start:dev
   ```

### Frontend (WebApp)

1. Navigate to the `WebApp` directory:
   ```bash
   cd WebApp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Angular development server:
   ```bash
   npm start
   ```
4. Access the application at `http://localhost:4200`.

## Documentation

Detailed documentation for each component can be found in their respective `docs/` or `memory-bank/` directories:
- [API Documentation](./API/docs/README.md)
- [WebApp Documentation](./WebApp/README.md)
