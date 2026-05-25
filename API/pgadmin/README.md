# pgAdmin PostgreSQL Client

This directory contains the configuration for pgAdmin, a web-based PostgreSQL administration tool that's integrated into the Docker Compose setup.

## Quick Start

1. Start the services:
   ```bash
   docker-compose up -d
   ```

2. Access pgAdmin:
   - Open your browser and go to: `http://localhost:8080`
   - No login required – you'll be automatically authenticated
   - The PostgreSQL database connection is pre-configured

## Configuration Details

### Auto-configured Database Connection
Connection details are injected via environment variables:

- **Host**: `db`
- **Port**: `5432`
- **Database**: `dev`
- **Username**: `filip`
- **Password**: `startervesna`

These values are substituted into `servers.json` at container start from the template `servers.json.template`.

### pgAdmin Access
- **URL**: http://localhost:8080
- **Default Email**: `admin@admin.com`
- **Default Password**: `admin`

## Features

- **Auto-connection**: Database connection is generated from environment variables
- **Persistent data**: pgAdmin settings are stored in a Docker volume
- **No master password**: Simplified setup for development
- **Server mode disabled**: Single-user mode for local development

## Security Notes

- The default credentials are set for development convenience
- Change the default pgAdmin password in production environments
- Database credentials are stored in environment variables and only written into the container at runtime

## Troubleshooting

If the database connection fails:
1. Ensure the PostgreSQL service is running: `docker-compose ps`
2. Check the database logs: `docker-compose logs db`
3. Verify the connection settings in pgAdmin match the database configuration

## Customization

To modify the database connection:
1. Update environment variables in `docker-compose.yaml`
2. Restart the pgAdmin service: `docker-compose restart pgadmin`

To change pgAdmin credentials:
1. Update the environment variables in `docker-compose.yaml`
2. Remove the pgAdmin volume to reset: `docker volume rm api_pgadmin-data`
3. Restart the services: `docker-compose up -d`
