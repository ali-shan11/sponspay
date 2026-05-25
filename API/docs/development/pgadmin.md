# pgAdmin Database Client

pgAdmin is integrated into the Docker Compose setup to provide a web-based PostgreSQL administration interface for local development.

## Quick Start

1. **Start the development environment**:
   ```bash
   docker-compose up -d
   ```

2. **Access pgAdmin**:
   - Open your browser to: `http://localhost:8080`
   - No login required – you'll be automatically authenticated
   - The PostgreSQL database connection is pre-configured

3. **Connect to Database**:
   - Click on "Local PostgreSQL" server in the left sidebar
   - The connection will establish automatically
   - Start browsing tables, running queries, and managing your database

## Features Available

- **Query Tool**: Write and execute SQL queries with syntax highlighting
- **Database Browser**: Explore schemas, tables, views, and functions
- **Data Viewer**: Browse table data with filtering and sorting
- **Import/Export**: Backup and restore database data
- **User Management**: Manage database users and permissions
- **Performance Monitoring**: View database statistics and query performance

## Configuration

### Service Configuration
The pgAdmin service is configured in `docker-compose.yaml`:

```yaml
pgadmin:
  image: dpage/pgadmin4:latest
  environment:
    PGADMIN_DEFAULT_EMAIL: admin@admin.com
    PGADMIN_DEFAULT_PASSWORD: admin
    PGADMIN_CONFIG_SERVER_MODE: 'False'
    PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED: 'False'
    PGADMIN_CONFIG_WTF_CSRF_ENABLED: 'False'
    PGADMIN_CONFIG_SESSION_COOKIE_SECURE: 'False'
    PGADMIN_CONFIG_ENHANCED_COOKIE_PROTECTION: 'False'
    PGHOST: db
    PGPORT: 5432
    PGDATABASE: dev
    PGUSER: filip
    PGPASSWORD: startervesna
  ports:
    - "8080:80"
  volumes:
    - pgadmin-data:/var/lib/pgadmin
    - ./pgadmin/servers.json.template:/pgadmin4/servers.json.template:ro
  command: >
    sh -c "envsubst < /pgadmin4/servers.json.template > /pgadmin4/servers.json && /entrypoint.sh"
  depends_on:
    - db
```

### Auto-Configuration
The database connection is generated from `servers.json.template` using the `PG*` environment variables. At container start, the template is rendered into `servers.json`, providing an auto-configured connection named **Local PostgreSQL**.

## Development Workflow

### Common Tasks

1. **View Database Schema**:
   - Expand "Local PostgreSQL" → "Databases" → "dev" → "Schemas" → "public"
   - Browse tables, views, and functions

2. **Run SQL Queries**:
   - Right-click on "dev" database → "Query Tool"
   - Write your SQL and click "Execute" (F5)

3. **Browse Table Data**:
   - Right-click on any table → "View/Edit Data" → "All Rows"

4. **Export Data**:
   - Right-click on database/table → "Backup..."
   - Choose format (SQL, CSV, etc.)

5. **Import Data**:
   - Right-click on database → "Restore..."
   - Select your backup file

### Performance Monitoring

- **Dashboard**: View real-time database statistics
- **Server Activity**: Monitor active connections and queries
- **Query History**: Review executed queries and their performance

## Troubleshooting

### pgAdmin Not Loading
1. Check if the service is running: `docker-compose ps`
2. View logs: `docker-compose logs pgadmin`
3. Restart the service: `docker-compose restart pgadmin`

### Database Connection Issues
1. Ensure PostgreSQL service is running: `docker-compose ps`
2. Check database logs: `docker-compose logs db`
3. Verify connection settings in pgAdmin match the database configuration

### Reset pgAdmin Configuration
1. Stop services: `docker-compose down`
2. Remove pgAdmin volume: `docker volume rm api_pgadmin-data`
3. Start services: `docker-compose up -d`

## Security Notes

- This configuration is optimized for local development
- Authentication is simplified for ease of use
- Do not use these settings in production environments
- Database credentials are injected via environment variables and written to the container at runtime

## Related Documentation

- [Database TypeORM](../nestjs-features/database-typeorm.md) - Application database integration
- [Environment Configuration](../configuration/environment-config.md) - Database connection setup
- [Development Workflow](workflow.md) - General development practices
