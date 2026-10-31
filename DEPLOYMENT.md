# DEPLOYMENT GUIDE

## Saudi Carry Charges & Customer Account Management System

### 1. Hosting Architecture
The application is structured as a modern Single Page Application (SPA) backed by Supabase PostgreSQL:
- **Frontend Hosting Options**: Vercel, Netlify, Cloudflare Pages, AWS S3 + CloudFront, or any standard web server (Nginx/Apache).
- **Backend & Database**: Managed Supabase project or self-hosted Supabase / PostgreSQL instance.

---

### 2. Environment Variables Configuration
Set the following environment variables in your deployment dashboard:

```ini
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
VITE_APP_NAME="Saudi Carry Charges System"
VITE_DEFAULT_CURRENCY="PKR"
```

---

### 3. Database Migration Deployment
To apply database migrations to a production Supabase instance:
```bash
# Using Supabase CLI
supabase db push

# Or execute SQL migration script directly via Supabase SQL Editor:
# File: supabase/migrations/20261031000000_init_schema.sql
```

---

### 4. Build and Deployment Steps

#### Step 1: Install Dependencies
```bash
npm ci
```

#### Step 2: Run Tests and Type Check Gate
```bash
npm run test
npm run typecheck
```

#### Step 3: Compile Production Assets
```bash
npm run build
```
This produces the distribution files in `/dist`.

#### Step 4: Web Server Configuration (Nginx SPA Fallback)
Ensure all client routes redirect to `index.html`:
```nginx
server {
    listen 80;
    server_name carrycharges.example.com;
    root /var/www/saudi-carry-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security Headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

---

### 5. Rollback Plan
If an unexpected issue arises post-deployment:
1. Revert to the prior Git commit or previous static build artifact.
2. In the event of schema rollback, restore the database snapshot taken immediately prior to migration as documented in `BACKUP_AND_RESTORE.md`.

