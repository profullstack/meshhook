# 🚀 MeshHook Deployment Guide

> Webhook-first, deterministic, Postgres-native workflow engine

## 📑 Quick Links

- [📋 Prerequisites](#-prerequisites)
- [⚡ Setup](#-setup)
- [🔧 Configuration](#-configuration)
- [🌍 Deploy](#-deploy)
- [🔐 Security](#-security)
- [📊 Monitor](#-monitor)
- [📈 Scale](#-scale)
- [🔄 Updates](#-updates)
- [🐛 Troubleshoot](#-troubleshoot)

---

## 📋 Prerequisites

| Component | Version |
|-----------|---------|
| 🟢 Node.js | 18.x+ |
| 💾 RAM | 2 GB+ |
| 💿 Storage | 10 GB SSD |

**Required:**
- ✅ Supabase account ([sign up](https://supabase.com))
- ✅ Git access
- ✅ Domain (production)

---

## ⚡ Setup

### 1️⃣ Clone & Install

```bash
git clone https://github.com/your-org/meshhook.git
cd meshhook && npm install && npm run build
```

### 2️⃣ Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Wait 2-3 minutes for initialization
3. Copy from **Settings → API**:
   - `PROJECT_URL`
   - `ANON_KEY`
   - `SERVICE_ROLE_KEY`
   - `DATABASE_URL`

### 3️⃣ Apply Migrations

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

✅ **Database ready!**

---

## 🔧 Configuration

### Create `.env`

```bash
cp .env.example .env
```

### Required Variables

```env
# 🔗 Application
NODE_ENV=production
PUBLIC_APP_URL=https://your-domain.com
PORT=3000

# 🗄️ Supabase
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# 🔐 Security
WEBHOOK_SECRET=generate-random-secret
JWT_SECRET=generate-random-secret
```

### Generate Secrets

```bash
openssl rand -base64 32  # Run twice
```

### Optional Variables

```env
WEBHOOK_TIMEOUT_MS=30000
WORKER_CONCURRENCY=10
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
```

---

## 🌍 Deploy

### ⚡ Option 1: Vercel (Fastest)

```bash
npm install -g vercel
vercel --prod
```

Add env vars in Vercel dashboard → Environment Variables

✅ Live at `https://your-project.vercel.app`

---

### 🐳 Option 2: Docker

**`Dockerfile`:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build"]
```

**`docker-compose.yml`:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [worker]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    build: .
    command: node worker.js
    env_file: .env
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on: [app]
```

**Deploy:**
```bash
docker-compose up -d
docker-compose logs -f
```

✅ Live at `http://localhost`

---

### 🖥️ Option 3: Linux VPS

```bash
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git

# Clone & setup
git clone https://github.com/your-org/meshhook.git /var/www/meshhook
cd /var/www/meshhook
npm install && npm run build

# Install PM2
sudo npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'meshhook',
    script: './build/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '1G'
  }, {
    name: 'meshhook-worker',
    script: './worker.js',
    instances: 1,
    env: { NODE_ENV: 'production' }
  }]
};
EOF

# Start
pm2 start ecosystem.config.js
pm2 startup && pm2 save

# Setup Nginx
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/meshhook << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/meshhook /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

✅ Live at `http://your-domain.com`

---

### ☸️ Option 4: Kubernetes

**`k8s/namespace.yaml`:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: meshhook
```

**`k8s/secrets.yaml`:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: meshhook-secrets
  namespace: meshhook
type: Opaque
stringData:
  DATABASE_URL: postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
  SUPABASE_SERVICE_ROLE_KEY: your-key
  WEBHOOK_SECRET: your-secret
  JWT_SECRET: your-jwt-secret
```

**`k8s/deployment.yaml`:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meshhook-app
  namespace: meshhook
spec:
  replicas: 3
  selector:
    matchLabels:
      app: meshhook
  template:
    metadata:
      labels:
        app: meshhook
    spec:
      containers:
      - name: meshhook
        image: your-registry/meshhook:latest
        ports: [{containerPort: 3000}]
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: meshhook-secrets
        resources:
          requests: {memory: "512Mi", cpu: "250m"}
          limits: {memory: "1Gi", cpu: "500m"}
        livenessProbe:
          httpGet: {path: /health, port: 3000}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet: {path: /ready, port: 3000}
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meshhook-worker
  namespace: meshhook
spec:
  replicas: 5
  selector:
    matchLabels:
      app: meshhook-worker
  template:
    metadata:
      labels:
        app: meshhook-worker
    spec:
      containers:
      - name: worker
        image: your-registry/meshhook:latest
        command: ["node", "worker.js"]
        envFrom:
        - secretRef:
            name: meshhook-secrets
        resources:
          requests: {memory: "256Mi", cpu: "250m"}
          limits: {memory: "512Mi", cpu: "500m"}

---
apiVersion: v1
kind: Service
metadata:
  name: meshhook-service
  namespace: meshhook
spec:
  selector:
    app: meshhook
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

**Deploy:**
```bash
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic meshhook-secrets --from-env-file=.env -n meshhook
kubectl apply -f k8s/
kubectl get pods -n meshhook
```

✅ Live via LoadBalancer IP

---

## 🔐 Security

### 🔒 Enable RLS

```sql
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON workflows
  FOR ALL USING (tenant_id = auth.uid());

CREATE POLICY tenant_isolation_runs ON workflow_runs
  FOR ALL USING (workflow_id IN (
    SELECT id FROM workflows WHERE tenant_id = auth.uid()
  ));
```

### ✍️ Webhook Verification

```javascript
// src/lib/webhook-security.js
import crypto from 'crypto';

export function verifyWebhookSignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage
export async function POST({ request }) {
  const signature = request.headers.get('X-Webhook-Signature');
  const body = await request.text();
  
  if (!verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET)) {
    return new Response('Invalid', { status: 401 });
  }
  // Process...
}
```

### 🔑 Secrets Management

**AWS:**
```bash
aws secretsmanager create-secret --name meshhook/secret --secret-string "value"
```

**GCP:**
```bash
echo -n "value" | gcloud secrets create meshhook-secret --data-file=-
```

**Azure:**
```bash
az keyvault secret set --vault-name meshhook-vault --name secret --value "value"
```

### 🔐 HTTPS/SSL

**Self-Hosted with Let's Encrypt:**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
```

**Update Nginx:**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    location / {
        proxy_pass http://localhost:3000;
    }
}
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### ☑️ Security Checklist

- [ ] Env vars configured
- [ ] WEBHOOK_SECRET strong (32+ chars)
- [ ] JWT_SECRET unique
- [ ] HTTPS enabled
- [ ] RLS enabled
- [ ] Service role key protected
- [ ] Rate limiting on

---

## 📊 Monitor

### 🏥 Health Checks

```javascript
// src/routes/health/+server.js
export async function GET() {
  return new Response(JSON.stringify({ status: 'healthy' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// src/routes/ready/+server.js
import { supabase } from '$lib/supabase';

export async function GET() {
  try {
    await supabase.from('workflows').select('count').limit(1);
    return new Response(JSON.stringify({ status: 'ready' }));
  } catch (error) {
    return new Response(JSON.stringify({ status: 'not ready' }), { status: 503 });
  }
}
```

### 📡 Real-Time Logs

```javascript
// src/lib/logging.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export function subscribeToLogs(workflowId, callback) {
  return supabase.channel(`logs:${workflowId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'workflow_logs',
      filter: `workflow_id=eq.${workflowId}`
    }, (payload) => callback(payload.new))
    .subscribe();
}

export async function logEvent(workflowId, runId, message, level = 'info') {
  await supabase.from('workflow_logs').insert({
    workflow_id: workflowId,
    run_id: runId,
    message,
    level,
    created_at: new Date().toISOString()
  });
}
```

### 🚨 Error Tracking (Sentry)

```bash
npm install @sentry/sveltekit
```

```javascript
// src/hooks.server.js
import * as Sentry from "@sentry/sveltekit";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV
});
```

---

## 📈 Scale

### ⬆️ Horizontal Scaling

```bash
# Docker
docker-compose up -d --scale worker=5

# Kubernetes
kubectl scale deployment meshhook-app --replicas=10 -n meshhook
kubectl autoscale deployment meshhook-app --min=3 --max=20 --cpu-percent=70 -n meshhook

# PM2
pm2 start npm --name "meshhook" -- start -i max
```

### 🗄️ Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_logs_run_id ON workflow_logs(run_id);
CREATE INDEX idx_workflow_logs_created_at ON workflow_logs(created_at DESC);

-- Composite index
CREATE INDEX idx_runs_tenant_status 
  ON workflow_runs(tenant_id, status, created_at DESC);

-- Analyze
EXPLAIN ANALYZE SELECT * FROM workflow_runs WHERE tenant_id = 'xxx';
```

### 🔌 Connection Pooling

```env
DATABASE_POOL_SIZE=20
DATABASE_POOL_TIMEOUT=10000
DATABASE_IDLE_TIMEOUT=30000
```

---

## 🔄 Updates

### 📦 Update Process

```bash
# 1. Backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# 2. Update code
git pull origin main
npm install

# 3. Migrations
npx supabase db push

# 4. Build & test
npm run build && npm run test

# 5. Deploy
# Vercel
vercel --prod

# Docker
docker-compose down && docker-compose build && docker-compose up -d

# PM2
pm2 restart meshhook

# Kubernetes
kubectl set image deployment/meshhook-app meshhook=your-registry/meshhook:v1.1.0 -n meshhook
```

### 🔙 Rollback

```bash
# Git
git checkout HEAD~1 && npm run build

# PM2
pm2 restart meshhook

# Docker
docker-compose down && docker-compose up -d

# Kubernetes
kubectl rollout undo deployment/meshhook-app -n meshhook

# Database
pg_restore -h your-db.supabase.co -U postgres -d postgres backup.sql
```

---

## 🐛 Troubleshoot

### ❌ Database Connection Failed

```bash
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1"
telnet db.xxxxx.supabase.co 5432
```

**Check:** Supabase dashboard → Settings → Project Status

---

### ❌ Webhook Signature Fails

```bash
echo $WEBHOOK_SECRET
curl -X POST http://localhost:3000/api/webhooks/test \
  -H "X-Webhook-Signature: $(echo -n 'test' | openssl dgst -sha256 -hmac $WEBHOOK_SECRET)" \
  -d '{"test":"data"}'
```

**Check:** Middleware order (raw body before parsing)

---

### ❌ Workers Not Processing

```bash
ps aux | grep worker
docker ps | grep worker
kubectl get pods -n meshhook -l app=meshhook-worker

# Logs
pm2 logs meshhook-worker
docker-compose logs meshhook-worker
kubectl logs -f deployment/meshhook-worker -n meshhook

# Queue depth
psql $DATABASE_URL -c "SELECT COUNT(*) FROM workflow_runs WHERE status='pending'"

# Restart
pm2 restart meshhook-worker
docker-compose restart worker
kubectl rollout restart deployment/meshhook-worker -n meshhook

# Increase in .env
WORKER_CONCURRENCY=20
```

---

### ❌ High Memory

```bash
docker stats
kubectl top pod

# Increase limits
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

**Docker:** `memory: 2G`  
**K8s:** `memory: "2Gi"`

---

### ❌ Slow Queries

```sql
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

EXPLAIN ANALYZE SELECT * FROM workflow_runs WHERE tenant_id = 'xxx';

CREATE INDEX idx_runs_tenant_status ON workflow_runs(tenant_id, status);

VACUUM ANALYZE;
```

---

### ❌ SSL Certificate Error

```bash
openssl s_client -connect your-domain.com:443 -showcerts | grep dates
sudo certbot renew --force-renewal
kubectl create secret tls meshhook-tls --cert=cert.pem --key=key.pem -n meshhook
```

---

### ❌ No Real-Time Logs

```javascript
const channel = supabase.channel('test');
channel.subscribe((status) => console.log(status)); // Should be: SUBSCRIBED
```

```sql
ALTER TABLE workflow_logs REPLICA IDENTITY FULL;
CREATE POLICY "Enable realtime" ON workflow_logs FOR SELECT USING (true);
```

**Check:** Dashboard → Settings → API → Realtime → ON

---

### ❌ Build Fails

```bash
rm -rf node_modules .svelte-kit dist build
npm cache clean --force
npm ci
npm run build
npm run typecheck
```

---

## ✅ Deployment Checklist

### Before Deploy

- [ ] Tests passing
- [ ] Env vars documented
- [ ] Migrations tested
- [ ] RLS policies created
- [ ] Indexes added
- [ ] Secrets generated (32+ chars)
- [ ] HTTPS configured
- [ ] CORS defined

### During Deploy

- [ ] Database backup created
- [ ] Team notified
- [ ] Health checks pass

### After Deploy

- [ ] App running
- [ ] Users accessing
- [ ] Webhooks working
- [ ] Real-time logs ok
- [ ] Performance good
- [ ] Monitoring alerts on

---

## 📚 Quick Ref

### Commands

```bash
npm run dev              # Dev server
npm run build            # Build
npm run preview          # Preview build
npx supabase db push     # Migrate
npx supabase status      # Status

vercel --prod            # Deploy to Vercel
docker-compose up -d     # Deploy Docker
pm2 restart meshhook     # Restart PM2
kubectl apply -f k8s/    # Deploy K8s
```

### Endpoints

| Path | Purpose |
|------|---------|
| `GET /health` | Health check |
| `GET /ready` | Ready check |
| `GET /api/workflows` | List workflows |
| `POST /api/workflows` | Create workflow |
| `POST /api/webhooks/:id` | Receive webhook |
| `GET /api/workflows/:id/runs` | Get runs |

---

📖 **Docs:** [docs.meshhook.io](https://docs.meshhook.io)  
🐛 **Issues:** [GitHub](https://github.com/your-org/meshhook/issues)  
💬 **Support:** [Community](https://meshhook.io/community)

---

**🎉 You're ready to deploy MeshHook!**