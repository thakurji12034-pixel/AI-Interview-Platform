# Deployment Guide: Single VM with Docker Compose & Caddy

This guide walks through deploying the AI Interview Platform onto a fresh **Ubuntu 24.04 LTS** virtual machine (such as an **AWS EC2 t3.micro/t3.small** or **GCP Compute Engine e2-micro/e2-small** instance).

---

## 1. Network & Firewall Configuration

Ensure your Cloud Provider's Security Group (AWS) or Firewall Rules (GCP) permit incoming traffic on the following ports:

| Port | Protocol | Purpose | Source |
|---|---|---|---|
| **22** | TCP | SSH access | Your IP (or `0.0.0.0/0` with SSH keys) |
| **80** | TCP | HTTP (ACME challenge & HTTP to HTTPS redirect) | `0.0.0.0/0` |
| **443** | TCP | HTTPS (Secure web & WebSocket traffic) | `0.0.0.0/0` |

If Ubuntu's internal firewall (`ufw`) is active, allow these ports:
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 2. DNS Setup

Point an **A Record** from your domain registrar (Cloudflare, Namecheap, Route53, Google Domains) to the Public IP address of your VM:
- Type: `A`
- Name: `interview.yourdomain.com` (or `@` for root)
- Value: `<VM_PUBLIC_IP>`
- TTL: `Auto` or `300`

---

## 3. (Optional but Recommended) Add Swap Space for Small VMs

If using a 1 GB or 2 GB RAM VM instance, creating a 2 GB swap file prevents out-of-memory (OOM) errors during Docker builds or MySQL startup:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Persist swap across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 4. Install Docker and Docker Compose

Install Docker using the official convenience script:

```bash
# Download and execute the official Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to the docker group so sudo is not required
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## 5. Clone the Repository & Configure Environment

Clone the repository to `/opt` or your user home directory:

```bash
cd ~
git clone https://github.com/your-username/ai-interview-platform.git
cd ai-interview-platform
```

Create the production `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Generate secure random secrets for database and JWT:
```bash
openssl rand -hex 32
```

Edit `.env` using `nano` or `vim`:
```bash
nano .env
```

Set the values appropriately:
```ini
DOMAIN=interview.yourdomain.com
DB_NAME=interview_platform
DB_ROOT_PASSWORD=replace_with_strong_random_root_password
DB_PASSWORD=replace_with_strong_random_user_password
JWT_SECRET=paste_first_generated_32_byte_hex_string
JWT_REFRESH_SECRET=paste_second_generated_32_byte_hex_string
```

> **Security Note**: Never commit your `.env` file to version control. The repository `.gitignore` automatically ignores `.env`.

---

## 6. Build and Launch the Stack

Start all services in detached mode with Docker Compose:

```bash
docker compose up -d --build
```

Docker Compose will:
1. Initialize the `db` service (MySQL 8.0) and wait for the `mysqladmin` healthcheck to pass.
2. Build the `server` image and start Node.js.
3. Multi-stage build the `web` image (Vite build -> Caddy image) and bind ports 80 and 443.
4. Caddy will automatically provision a free Let's Encrypt / ZeroSSL TLS certificate for your `$DOMAIN`.

---

## 7. Monitor Logs & Verify Status

Check container statuses:
```bash
docker compose ps
```

Monitor logs across all services:
```bash
docker compose logs -f
```

Inspect individual service logs:
```bash
docker compose logs -f web
docker compose logs -f server
docker compose logs -f db
```

Verify backend health:
```bash
curl -i http://localhost:5000/health/live
curl -i http://localhost:5000/health/ready
```

---

## 8. Creating Initial Interviewer Accounts

In production, public signup strictly provisions the `candidate` role. To create interviewer accounts securely without enabling public dev flags, execute the interactive user provisioning CLI inside the running server container:

```bash
docker compose exec server npm run user:create -- --email interviewer@example.com --name "Jane Lead" --role interviewer
```

You will be prompted to enter a password securely (hidden input, minimum 10 characters). The command is idempotent: if the user already exists, it safely updates their role and password without duplicating records.

---

## 9. Application Update Flow

To deploy code updates with zero friction:

```bash
cd ~/ai-interview-platform

# Pull latest changes
git pull origin feature/deploy

# Rebuild containers and restart with minimal downtime
docker compose up -d --build
```

---

## 10. Database Backup & Restore

### Backup Database Volume
Create a timestamped compressed SQL dump using `mysqldump`:

```bash
docker compose exec db mysqldump -u interview_app -p"${DB_PASSWORD}" interview_platform | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore Database
Restore from a compressed SQL dump:

```bash
gunzip < backup_20261107_000000.sql.gz | docker compose exec -T db mysql -u interview_app -p"${DB_PASSWORD}" interview_platform
```

---

## 11. Troubleshooting Reference

| Symptom | Probable Cause | Diagnostic & Resolution Steps |
|---|---|---|
| **Certificate not issued / SSL handshake failure** | DNS A record not propagating or port 80 blocked | 1. Ensure `DOMAIN` in `.env` matches your DNS A record exactly.<br>2. Check that port 80 is open to the internet (`0.0.0.0/0`) in firewall/security group rules (Caddy needs port 80 for the ACME challenge).<br>3. Inspect Caddy logs: `docker compose logs web`. |
| **502 Bad Gateway from Caddy** | Node server is still starting, crashed, or unhealthy | 1. Check server container status: `docker compose ps`.<br>2. View server error logs: `docker compose logs server`.<br>3. Verify DB healthcheck passed: `docker compose logs db`. |
| **DB connection error (`ECONNREFUSED` / `Access denied`)** | MySQL not ready or credentials mismatched | 1. Verify `DB_NAME`, `DB_PASSWORD`, and `DB_ROOT_PASSWORD` in `.env`.<br>2. If passwords were changed after MySQL volume initialization, remove old volume with `docker compose down -v` (CAUTION: clears DB data) and restart.<br>3. Check MySQL container memory consumption (`docker stats`). |
| **WebSocket (`socket.io`) fails to connect** | Reverse proxy headers missing or mismatched URL | 1. Ensure Caddyfile contains `handle /socket.io/* { reverse_proxy server:5000 }`.<br>2. Check browser console network tab for `/socket.io/?EIO=4&transport=websocket`.<br>3. Verify valid JWT token is sent in socket handshake. |
| **Out-of-memory during `npm run build`** | VM RAM exhausted (< 1.5 GB available) | 1. Add a 2 GB swapfile following Section 3.<br>2. Build images sequentially: `docker compose build web` followed by `docker compose build server`. |

---

## 12. Production Safeguards & Honest Demo-Mode Signalling

To prevent silent degradations or accidental deployment of mock simulation engines to production environments, IntelliPrep AI enforces strict production startup guards and health checks:

### 1. Mock Provider Production Startup Guard
In production mode (`NODE_ENV === 'production'`), the server process strictly **refuses to boot** and throws an error if `AI_MOCK_MODE=true` or `EXECUTION_PROVIDER=mock`.
- **Reason**: Guarantees that production environments never evaluate candidates or run code with simulated engines by accident.
- **Demo Mode Override**: If you deliberately deploy a public live demonstration instance on a VM without live paid API keys, you must set an explicit bypass variable in `.env`:
  ```bash
  ALLOW_MOCK_PROVIDERS=true
  ```

### 2. Redis Cluster Readiness Guard (`/health/ready`)
The container readiness probe at `GET /health/ready` inspects both MySQL and Redis health.
- If an external Redis instance is unavailable, the system safely falls back to in-memory queues and cache.
- In production (`NODE_ENV === 'production'`), `/health/ready` identifies this fallback as `"checks": { "redis": "in-memory-fallback" }` and returns **HTTP 503 Service Unavailable** so cloud orchestrators do not route live candidate traffic to a degraded single-instance cache.
- To allow in-memory Redis in a production demo VM, set:
  ```bash
  ALLOW_INMEMORY_REDIS=true
  ```

### 3. Authenticated System Capabilities Transparency
- Endpoint: `GET /api/v1/system/capabilities` (authenticated)
- Response: Returns `{ aiProvider: "gemini"|"mock", executionProvider: "judge0"|"mock", redis: "redis"|"in-memory" }` without exposing internal keys or secrets.
- Whenever mock modes are active, the frontend automatically surfaces a persistent **Demonstration Mode Active** banner and labels reports and code runs as **"Simulated result"**.

