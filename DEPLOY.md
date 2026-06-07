# Deploying KAIROS

A line-by-line runbook for taking an agent from your laptop to a live service, plus publishing the Move index and the website. Two paths for the agent: Docker (fastest) and a bare Ubuntu VPS (full control).

> The agent holds a wallet key. Use a dedicated wallet, never your personal one, and start on testnet.

---

## 0. Get your keys (once)

You need exactly two secrets: a Sui private key and an Anthropic API key. Walrus needs no key or account; KAIROS uses its public testnet endpoints, which are already filled into `.env.example`.

```bash
# 1. Install deps (also needed to generate a key)
pnpm install

# 2. Generate a fresh Sui wallet. No Sui CLI required.
pnpm wallet
#    prints an Address and a suiprivkey1... key. Copy both.

# 3. Fund the address with free testnet SUI
#    open https://faucet.sui.io, choose Testnet, paste the address.

# 4. Get an Anthropic API key at https://console.anthropic.com
#    create a key (starts sk-ant-). This one is paid; add billing.
```

> If you already use the Sui CLI, `sui keytool export --key-identity <alias>` gives the same `suiprivkey1...` string. The CLI is only required later for publishing the Move index.

---

## Path A: Docker (fastest)

```bash
# 1. Clone
git clone https://github.com/Sage-senpai/Kairos.git
cd Kairos

# 2. Create the agent's env file
cp agents/example/.env.example agents/example/.env
#    edit it: set SUI_PRIVATE_KEY and ANTHROPIC_API_KEY

# 3. Build the image
docker build -t kairos-agent .

# 4. Run it
docker run -d --name atlas \
  --env-file agents/example/.env \
  -p 3000:3000 \
  --restart unless-stopped \
  kairos-agent

# 5. Check it
docker logs -f atlas
curl -s localhost:3000/health
```

To run a different agent (Oracle, Sentinel), pass `AGENT_DIR`:

```bash
docker run -d --name oracle \
  --env-file agents/oracle/.env \
  -e AGENT_DIR=agents/oracle \
  -p 3001:3001 kairos-agent
```

---

## Path B: bare Ubuntu VPS

On a fresh Ubuntu 22.04 box, as a sudo user.

```bash
# 1. System deps
sudo apt update && sudo apt install -y git curl

# 2. Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. pnpm and pm2
sudo npm install -g pnpm@9 pm2

# 4. Clone and build
git clone https://github.com/Sage-senpai/Kairos.git
cd Kairos
pnpm install --frozen-lockfile
pnpm build

# 5. Configure the agent
cp agents/example/.env.example agents/example/.env
nano agents/example/.env          # set SUI_PRIVATE_KEY and ANTHROPIC_API_KEY

# 6. Start under pm2, from the agent directory
cd agents/example
pm2 start "pnpm start" --name atlas
pm2 logs atlas                    # confirm it booted
pm2 save                          # persist across reboots
pm2 startup                       # run the command it prints

# 7. Verify locally
curl -s localhost:3000/health
```

### Put it behind HTTPS (nginx + Let's Encrypt)

```bash
# 8. Install nginx and certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# 9. Reverse proxy: create /etc/nginx/sites-available/atlas
sudo tee /etc/nginx/sites-available/atlas >/dev/null <<'NGINX'
server {
  server_name agent.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
NGINX

# 10. Enable it and reload
sudo ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 11. Get a cert (DNS for agent.yourdomain.com must point at this box first)
sudo certbot --nginx -d agent.yourdomain.com

# 12. Lock the firewall: only SSH and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

The `/message` endpoint is now public. Put your own auth (an API key check, a gateway) in front of it before pointing real money at it; the framework does not authenticate callers.

---

## Publish the on-chain memory index (optional)

```bash
cd packages/plugin-walrus/move
sui move build && sui move test
sui client publish --gas-budget 100000000
#  from the output, copy the package id and the shared MemoryIndex object id
#  into the agent's .env as WALRUS_INDEX_PACKAGE_ID and WALRUS_INDEX_OBJECT_ID
```

---

## Deploy the website

The site is one static file: `site/index.html`. Host it anywhere static. Point the host at the `site/` directory; `index.html` is the homepage.

### Walrus Sites (on-brand)

```bash
# install the site-builder per the Walrus docs, then:
site-builder publish ./site --epochs 100
#  it prints a Base36 object id; browse it at https://<id>.walrus.site
```

### Vercel

The file to deploy is `site/index.html`. Vercel serves a directory, so point it at `site/`.

CLI:

```bash
npm i -g vercel
cd site
vercel --prod          # serves index.html at the root of the deployment
```

Dashboard: New Project, import the `Sage-senpai/Kairos` repo, set **Root Directory** to `site`, framework preset **Other**, Deploy. Vercel serves `site/index.html` as the homepage.

### Netlify

Drag the `site/` folder into the Netlify dashboard, or set the publish directory to `site`.

> Publishing the npm packages and the `npx create-kairos-agent` flow are covered separately in [PUBLISHING.md](PUBLISHING.md).

---

## Going to mainnet

1. Set `"suiNetwork": "mainnet"` in the agent's `character.json`.
2. Point `WALRUS_PUBLISHER_URL` / `WALRUS_AGGREGATOR_URL` at mainnet endpoints.
3. Re-check the DeepBook package ids in `packages/plugin-sui/src/actions/swap-tokens.ts` against the current on-chain package.
4. Fund the dedicated agent wallet with a small amount. Treat it as hot.
5. Add request auth in front of `/message`.
6. Watch `pm2 logs` (or `docker logs`) for the first live transactions.
