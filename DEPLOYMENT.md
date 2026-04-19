# FocusFlow Deployment Guide

## Prerequisites

- Docker & Docker Compose installed
- Git repository configured
- Environment variables set up

## Local Development

```bash
# Start all services
cd infra
docker-compose up -d

# Access services
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- Elasticsearch: http://localhost:9200
```

## Production Deployment

### Using Docker

1. Build the Docker image:
   ```bash
   docker build -t focusflow-api:latest ./backend
   ```

2. Deploy with Docker Compose:
   ```bash
   docker-compose -f infra/docker-compose.yml up -d
   ```

### Environment Configuration

Set required environment variables:

```bash
export DATABASE_URL=postgresql://user:pass@host:5432/focusflow
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your-key
export REDIS_URL=redis://host:6379
export ELASTICSEARCH_URL=http://host:9200
export STRIPE_SECRET_KEY=sk_...
```

## Monitoring

- **Prometheus**: Scrapes metrics from the API
- **Grafana**: Visualizes metrics from Prometheus
- **Default credentials**: admin/admin

## Database Migrations

Migrations are in `infra/supabase/migrations/`. Apply them:

```bash
# Using Supabase CLI
supabase db push

# Or manually with psql
psql -h localhost -U postgres -d focusflow < infra/supabase/migrations/001_init_schema.sql
```

## Backup & Recovery

### PostgreSQL Backup

```bash
docker exec postgres pg_dump -U postgres focusflow > backup.sql
```

### PostgreSQL Restore

```bash
docker exec -i postgres psql -U postgres focusflow < backup.sql
```

## Scaling

For production scaling:

1. **Database**: Use managed PostgreSQL (RDS, Cloud SQL)
2. **Redis**: Use managed Redis (ElastiCache, Cloud Memorystore)
3. **API**: Deploy multiple instances behind a load balancer
4. **CDN**: Use CloudFront or similar for static assets

## Troubleshooting

### API not connecting to database
- Check DATABASE_URL environment variable
- Verify database is running and accessible
- Check network connectivity

### Redis connection errors
- Verify Redis is running
- Check REDIS_URL is correct
- Check firewall rules

### Elasticsearch issues
- Ensure Elasticsearch is running
- Check index mappings are loaded
- Verify network connectivity
