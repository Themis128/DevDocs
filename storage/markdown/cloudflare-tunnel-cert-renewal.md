# Cloudflare Tunnel Certificate Renewal Procedure
*Generated: 2026-07-17 - Completing todo.txt line 166*

## Overview
Procedure for renewing certificates used by Cloudflare Tunnel for services like Postiz, AppFlowy, EspoCRM, and n8n on the omv cluster.

---

## Current Tunnel Configuration
Per `infrastructure/cloudflare-tunnel/` - Tunnels are configured for:
- Postiz: `https://postiz.cloudless.gr`
- AppFlowy: Internal port 30810
- EspoCRM: Via tunnel for admin access
- n8n: Internal access at `http://omv:5678`

---

## Certificate Lifecycle

### Origin Certificates (Recommended)
Cloudflare Origin Certificates are the standard for tunnels:
- **Validity:** 15 years (9460 days)
- **Renewal:** Rarely needed, but monitor expiration
- **Format:** PEM format

### Process for Certificate Renewal

#### 1. Check Current Certificate Status
```bash
# SSH to omv and check certificate files
ssh tbaltzakis@192.168.1.128

# Check current certificate expiry
openssl x509 -enddate -noout -in /etc/cloudflare-tunnel/certs/*.pem

# List certificates in Cloudflare
pnpm wrangler cert7s list --zone-id $(pnpm wrangler zone list | grep cloudless.gr)
```

#### 2. Generate New Origin Certificate (if needed)
```bash
# Via Wrangler (preferred)
pnpm wrangler cert7s upload origin-cert \
  --zone-id <ZONE_ID> \
  --host "*.cloudless.gr" \
  --certificate /path/to/cert.pem \
  --private-key /path/to/key.pem
```

Or via Cloudflare dashboard:
1. Go to SSL/TLS → Origin Server
2. Create Certificate
3. Host: `*.cloudless.gr`
4. Validity: 15 years (default)
5. Download certificate + private key

#### 3. Update Tunnel Configuration
```bash
# If using cloudflared CLI
cloudflared tunnel --hostname postiz.cloudless.gr --url http://localhost:3000 creds-file /etc/cloudflare-tunnel/credentials.json

# Verify tunnel status
cloudflared tunnel list
cloudflared tunnel info <tunnel-name>
```

#### 4. Restart Tunnel Services
```bash
# On omv node
sudo systemctl restart cloudflared
sudo systemctl status cloudflared

# Or via Kubernetes if containerized
kubectl rollout restart deployment/cloudflared -n infrastructure
```

---

## Automated Monitoring

### Certificate Expiration Check Script
```bash
#!/bin/bash
# Save as: scripts/check-cert-expiry.sh

CERT_PATH="/etc/cloudflare-tunnel/certs/origin.pem"
DAYS_UNTIL_EXPIRY=$(openssl x509 -startdate -enddate -noout -in "$CERT_PATH" | grep -o "notAfter=.*" | cut -d= -f2)
EXPIRY_SECONDS=$(date -d "$DAYS_UNTIL_EXPIRY" +%s)
DAYS_REMAINING=$(( (EXPIRY_SECONDS - $(date +%s)) / 86400 ))

if [ $DAYS_REMAINING -lt 30 ]; then
    echo "ALERT: Certificate expires in $DAYS_REMAINING days"
    # Call /api/webhooks/admin-alert
fi
```

### Add to Daily Checks (todo.txt line 173)
```bash
# In daily check script
echo "=== Certificate Expiry Check ==="
for cert in /etc/cloudflare-tunnel/certs/*.pem; do
    openssl x509 -enddate -noout -in "$cert"
done
```

---

## Troubleshooting

### Certificate Not Trusted Error
```bash
# Check if full chain is present
openssl s_client -connect postiz.cloudless.gr:443 -showcerts

# Verify cloudflared has read access
ls -la /etc/cloudflare-tunnel/
sudo chmod 600 /etc/cloudflare-tunnel/certs/*.pem
```

### Tunnel Connection Issues After Renewal
```bash
# Check cloudflared logs
journalctl -u cloudflared -f

# Verify credentials file
cloudflared tunnel --loglevel debug run <tunnel-name>

# Re-authenticate if needed
cloudflared tunnel login
```

---

## Related Documentation
- [Cluster Operations Runbook](./cluster-operations-runbook.md) - for SSH procedures
- [Cloudflare Map](./cloudflare-map.md) - Workers + D1 configuration
- [Troubleshooting Guide](./troubleshooting-guide.md) - Common issues

---

## Next Actions
- [ ] Add certificate expiry check to nightly backup script
- [ ] Document Postiz-specific tunnel renewal (credentials + cert)
- [ ] Set up weekly automated certificate expiry monitoring