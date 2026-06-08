# Deploy on Hostinger - Complete Guide

## What You Need

Hostinger has two options:

| Plan | Use For | Price |
|------|---------|-------|
| **Shared Hosting** | Frontend only (static site) | ~$2-3/month |
| **VPS (KVM)** | Frontend + Backend + Database | ~$5-10/month |

**Recommendation:** Get a **VPS** so you can run the full app (Node.js API + PostgreSQL + Redis).

---

## Option A: VPS (Full App - Recommended)

### 1. Buy Hostinger VPS
1. Go to https://www.hostinger.com/vps-hosting
2. Choose **KVM 1** plan (2GB RAM is enough to start)
3. Select **Ubuntu 22.04** as the OS
4. Complete purchase
5. You will get:
   - Server IP address (e.g., `123.45.67.89`)
   - Root password
   - SSH access

### 2. Connect to Your Server

Use PuTTY (Windows) or Terminal (Mac/Linux):

```bash
ssh root@YOUR_SERVER_IP
```

### 3. Install Required Software

Run these commands on your VPS:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2 pnpm

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Redis
apt install -y redis-server

# Install Nginx (web server + reverse proxy)
apt install -y nginx

# Install Git
apt install -y git
```

### 4. Setup PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside psql prompt:
CREATE DATABASE rms;
CREATE USER rms WITH ENCRYPTED PASSWORD 'rms_password';
GRANT ALL PRIVILEGES ON DATABASE rms TO rms;
\q

# Allow remote connections (if needed)
nano /etc/postgresql/14/main/pg_hba.conf
# Add this line at the bottom:
# host all all 0.0.0.0/0 md5

# Restart PostgreSQL
systemctl restart postgresql
```

### 5. Upload Your Project

Option 1: Use Git
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git rms
cd rms
```

Option 2: Use FileZilla / WinSCP
- Connect via SFTP to your server IP
- Upload the entire project to `/var/www/rms`

### 6. Setup Backend

```bash
cd /var/www/rms/apps/api

# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database
node prisma/seed-comprehensive.js

# Build the API
npm run build

# Create environment file
nano .env
```

Paste this into `.env`:
```
NODE_ENV=production
API_PORT=4000
API_GLOBAL_PREFIX=api
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

DATABASE_URL=postgresql://rms:rms_password@localhost:5432/rms
DIRECT_URL=postgresql://rms:rms_password@localhost:5432/rms

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_ACCESS_SECRET=replace-with-64-char-random-string-here-now
JWT_REFRESH_SECRET=replace-with-another-64-char-random-string
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

AES_256_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
BCRYPT_SALT_ROUNDS=12
TOTP_ISSUER=RMS-Platform

RATE_LIMIT_PUBLIC_PER_MIN=100
RATE_LIMIT_AUTH_PER_MIN=500
```

**Generate strong secrets:**
```bash
openssl rand -base64 48
# Use the output for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
```

### 7. Start the API with PM2

```bash
cd /var/www/rms/apps/api

# Start with PM2
pm2 start dist/apps/api/src/main.js --name "rms-api"

# Save PM2 config
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs rms-api
```

### 8. Setup Frontend (Build Static Files)

```bash
cd /var/www/rms/apps/unified

# Install dependencies
pnpm install

# Create production env
nano .env.production
```

Paste:
```
VITE_API_URL=https://your-domain.com/api
```

```bash
# Build static files
pnpm build

# Copy to Nginx web root
cp -r dist/* /var/www/html/
```

### 9. Configure Nginx

```bash
nano /etc/nginx/sites-available/rms
```

Paste this config:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend static files
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/rms /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and restart
nginx -t
systemctl restart nginx
```

### 10. Setup SSL (HTTPS) with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renew test
certbot renew --dry-run
```

### 11. Point Your Domain to VPS

1. In Hostinger panel → Domains → DNS Zone Editor
2. Add **A record**:
   - Name: `@`
   - Points to: `YOUR_VPS_IP`
3. Add **A record**:
   - Name: `www`
   - Points to: `YOUR_VPS_IP`

Wait 5-15 minutes for DNS to propagate.

---

## Option B: Shared Hosting (Frontend Only)

If you only want the frontend on Hostinger Shared Hosting:

### 1. Buy Shared Hosting
- Go to Hostinger → Web Hosting
- Buy any plan

### 2. Upload Frontend

```bash
cd apps/unified

# Build with your backend URL
echo "VITE_API_URL=https://your-backend-api.com/api" > .env.production
pnpm build

# Upload dist/ folder contents to public_html via File Manager or FTP
```

In Hostinger File Manager:
1. Go to `public_html`
2. Delete default `index.html`
3. Upload all files from `apps/unified/dist/`

### 3. Add .htaccess for React Router

Create `public_html/.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Note:** Your backend must be hosted elsewhere (Railway, Render, VPS, etc.)

---

## Useful Commands

```bash
# Check API logs
pm2 logs rms-api

# Restart API
pm2 restart rms-api

# Check Nginx logs
 tail -f /var/log/nginx/access.log
 tail -f /var/log/nginx/error.log

# Check database
sudo -u postgres psql -d rms -c "SELECT COUNT(*) FROM users;"

# Restart everything
systemctl restart postgresql redis nginx
pm2 restart rms-api

# Update code and redeploy
cd /var/www/rms
git pull
npm run build
pm2 restart rms-api
cd apps/unified && pnpm build && cp -r dist/* /var/www/html/
```

---

## Security Checklist

- [ ] Change all default passwords (root, postgres, rms user)
- [ ] Use strong JWT secrets (64+ chars)
- [ ] Enable UFW firewall: `ufw allow 22,80,443`
- [ ] Disable root SSH login: `nano /etc/ssh/sshd_config` → `PermitRootLogin no`
- [ ] Keep system updated: `apt update && apt upgrade -y`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API not starting | Check `pm2 logs rms-api` |
| 502 Bad Gateway | API not running on port 4000 |
| Frontend blank | Check `.env.production` has correct API URL |
| Database connection error | Check PostgreSQL is running: `systemctl status postgresql` |
| Redis connection error | Check Redis: `systemctl status redis` |
| SSL not working | Re-run `certbot --nginx -d your-domain.com` |
