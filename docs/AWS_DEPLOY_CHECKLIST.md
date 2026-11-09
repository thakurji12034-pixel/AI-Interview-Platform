# IntelliPrep AI – AWS Single-VM Production Deployment Checklist

This guide provides a comprehensive, step-by-step procedure for deploying **IntelliPrep AI** to a single cloud Virtual Machine (AWS EC2) using Docker Compose and Caddy with automatic TLS.

---

## 1. Cloud Infrastructure & VM Provisioning

### 1.1 Instance Specifications
- **Cloud Provider**: Amazon Web Services (AWS) EC2
- **Operating System Image**: Ubuntu Server 24.04 LTS (Noble Numbat), 64-bit (x86_64 or ARM64)
- **Instance Type Recommendation**:
  - **`t4g.small` (Recommended)**: 2 vCPUs, 2.0 GiB RAM (AWS Graviton2 ARM64). Delivers up to 20% better cost-performance and lower hourly pricing (~$0.0168/hr).
  - **`t3.small` (Alternative)**: 2 vCPUs, 2.0 GiB RAM (Intel x86_64). Suitable if third-party binaries require strict x86 architecture (~$0.0208/hr).
- **Storage**: 25 GiB General Purpose SSD (`gp3`), 3,000 IOPS, 125 MB/s baseline throughput.
- **Elastic IP (EIP)**: Allocate an AWS Elastic IP and associate it with the instance to ensure a persistent public IPv4 address across restarts.

### 1.2 Security Group Rules (Firewall)
Configure the EC2 Security Group with the principle of least privilege:

| Type | Protocol | Port Range | Source | Justification |
| :--- | :---: | :---: | :--- | :--- |
| **SSH** | TCP | `22` | `YOUR_ADMIN_IP/32` | Administrative access restricted to your specific workstation IP. |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Let's Encrypt / ZeroSSL ACME challenge resolution & HTTP->HTTPS redirect. |
| **HTTPS**| TCP | `443` | `0.0.0.0/0` | Secure web application traffic and WebSocket connections. |

*Never open ports 3306 (MySQL), 6379 (Redis), or 5000 (Node API) directly to the public internet.*

---

## 2. Domain & Dynamic DNS Setup (DuckDNS)

Caddy terminates TLS and requests free, automated SSL certificates from Let's Encrypt or ZeroSSL. This requires an FQDN pointing to your VM's Elastic IP.

If you do not have a custom domain name:
1. Visit [DuckDNS](https://www.duckdns.org) and sign in.
2. Create a subdomain (e.g., `intelliprep-assessment.duckdns.org`).
3. Set the IP address to your AWS EC2 Elastic IP.
4. Verify DNS propagation from your local terminal:
   ```bash
   dig +short intelliprep-assessment.duckdns.org
   # Should return your AWS Elastic IP
   ```

---

## 3. Host System Setup & Hardening

Connect to your EC2 instance via SSH:
```bash
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

### 3.1 Update Base Packages
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release ufw git
```

### 3.2 Configure 2GB Swap File (Essential for 2GB VMs)
To guarantee memory stability during Docker builds and background job processing:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Persist swap across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap activation
free -h
```

### 3.3 Install Official Docker Engine & Compose Plugin
```bash
# Add Docker's official GPG key:
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow ubuntu user to execute docker without sudo
sudo usermod -aG docker ubuntu
newgrp docker
```

---

## 4. Repository Deployment & Configuration

### 4.1 Clone Application Repository
```bash
git clone https://github.com/your-org/ai-interview-platform.git /home/ubuntu/app
cd /home/ubuntu/app
```

### 4.2 Initialize Production Configuration
```bash
cp .env.production.example .env
chmod 600 .env
```

Generate secure 32-byte cryptographic hex tokens for database credentials and JWT tokens:
```bash
# Generate keys:
openssl rand -hex 16  # For DB_PASSWORD
openssl rand -hex 16  # For DB_ROOT_PASSWORD
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For JWT_REFRESH_SECRET
```

Edit `.env` (`nano .env`) and populate the generated values:
```env
DOMAIN=intelliprep-assessment.duckdns.org
DB_NAME=interview_platform
DB_USER=interview_app
DB_PASSWORD=<generated_db_password>
DB_ROOT_PASSWORD=<generated_root_password>
JWT_SECRET=<generated_jwt_secret>
JWT_REFRESH_SECRET=<generated_jwt_refresh_secret>
```

---

## 5. Starting the Application Stack

### 5.1 Build and Launch Containers
```bash
docker compose up -d --build
```

### 5.2 Verify Service Health & Memory Allocation
```bash
# Check container status and healthchecks
docker compose ps

# Monitor live resource utilization against memory limits
docker stats --no-stream
```
*Expected limits: `db` <= 512MB, `server` <= 512MB, `worker` <= 384MB, `redis` <= 256MB, `web` <= 128MB.*

---

## 6. Initial Administrator Account Provisioning

Seed the initial platform administrator in the running `server` container:
```bash
docker compose exec server node -e '
  process.env.ADMIN_EMAIL = "admin@yourcompany.com";
  process.env.ADMIN_PASSWORD = "YourStrongAdminPassword123!";
  process.env.ADMIN_NAME = "Super Admin";
  process.env.FORCE_PRODUCTION_ADMIN_SEED = "true";
  require("./src/scripts/seedAdmin.js");
'
```
*Output: `Successfully created new Administrator account: admin@yourcompany.com`*

---

## 7. Verification Smoke Tests

Execute these verification commands from both the host and an external browser:

1. **Local Health Probe (via Caddy reverse proxy)**:
   ```bash
   curl -i http://localhost/health/live
   curl -i http://localhost/health/ready
   ```
2. **External HTTPS Verification**:
   ```bash
   curl -i https://intelliprep-assessment.duckdns.org/health/ready
   # Expected: HTTP/2 200 OK, {"status":"ready","checks":{"database":"connected","redis":"connected"}}
   ```
3. **Security Headers Verification**:
   ```bash
   curl -I https://intelliprep-assessment.duckdns.org/
   # Verify presence of Strict-Transport-Security, X-Content-Type-Options: nosniff
   ```
4. **Interactive Browser Smoke Test**:
   - Navigate to `https://intelliprep-assessment.duckdns.org/login`.
   - Log in with the seeded administrator credentials.
   - Confirm dark/light theme switch, audit logs view, and invitation creation.

---

## 8. Application Updates & Zero-Downtime Redeployment

To deploy updates from the Git repository:
```bash
cd /home/ubuntu/app
git pull origin main

# Rebuild changed images and recreate containers gracefully
docker compose up -d --build --remove-orphans

# Check logs to ensure clean database migration and startup
docker compose logs --tail=50 server
```

---

## 9. Nightly Backup & Disaster Recovery

### 9.1 Automated Nightly Backup Script
Create `/home/ubuntu/backup.sh`:
```bash
#!/usr/bin/env bash
set -eo pipefail

BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting IntelliPrep AI backup..."

# 1. Backup MySQL Database
docker compose -f /home/ubuntu/app/docker-compose.yml exec -T db \
  mysqldump -u root -p"$(grep DB_ROOT_PASSWORD /home/ubuntu/app/.env | cut -d '=' -f2)" \
  interview_platform | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

# 2. Backup Uploaded Resume Files
docker run --rm \
  --volumes-from $(docker compose -f /home/ubuntu/app/docker-compose.yml ps -q server) \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/resumes_${TIMESTAMP}.tar.gz" -C /app/storage/resumes .

# 3. Retention: Delete backups older than 14 days
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +14 -delete

echo "[$(date)] Backup completed successfully."
```

Make executable and register with `cron`:
```bash
chmod +x /home/ubuntu/backup.sh

# Run nightly at 02:00 AM UTC
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup.sh >> /home/ubuntu/backup.log 2>&1") | crontab -
```

### 9.2 Restore Verification Command
To verify or restore from a backup:
```bash
# Restore Database:
gunzip < /home/ubuntu/backups/db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T db mysql -u root -p"<ROOT_PASSWORD>" interview_platform

# Restore Resume Files:
docker run --rm \
  --volumes-from $(docker compose ps -q server) \
  -v /home/ubuntu/backups:/backup \
  alpine tar xzf /backup/resumes_YYYYMMDD_HHMMSS.tar.gz -C /app/storage/resumes
```

---

## 10. Estimated Monthly AWS Cost Breakdown

| Component | AWS Resource | Monthly Estimate (USD) |
| :--- | :--- | :---: |
| **Compute VM** | EC2 `t4g.small` (On-Demand, 730 hrs) | ~$12.26 |
| **Storage** | 25 GiB EBS `gp3` ($0.08 / GB-mo) | ~$2.00 |
| **Elastic IP** | 1 EIP attached to running instance | $0.00 |
| **Network Egress**| First 100 GB/month internet data transfer | $0.00 (AWS Free Tier) |
| **Domain** | DuckDNS (free) / Custom Route 53 zone | $0.00 – $0.50 |
| **Total Monthly** | | **~$14.26 – $15.00 / month** |

---

## 11. Verification Disclosure & Audit Statement

To maintain complete engineering integrity:
- **Statically & Locally Verified**: Dockerfile syntax, multi-stage builds, non-root user permissions, memory limits, healthcheck probes, Caddyfile routing, WebSocket reverse proxying, migration commands, and `docker compose config` were verified directly in this repository.
- **Not Live-Verified Against AWS**: The physical AWS EC2 instance launch, DuckDNS DNS delegation, and cloud security group creation are provided as tested architectural templates but were not provisioned against a live commercial AWS billing account during local test suite execution.

