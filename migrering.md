# Migrering: Från upstream OpenClaw till fork

Steg-for-steg-guide for att stanga ned nuvarande OpenClaw (upstream), avinstallera den, och installera var fork fran `github.com/pajohmail/openclaw`.

## Systeminformation

| Egenskap | Varde |
|---|---|
| OS | MX Linux (Debian-baserat, SysVinit) |
| Nuvarande version | openclaw 2026.1.30 |
| Installerad via | `npm install -g` (nvm, Node 24.13.0) |
| Gateway | Kors manuellt (PID-baserad, ej service) |
| Kanal | Telegram |
| State-katalog | `~/.openclaw/` |
| Config | `~/.openclaw/openclaw.json` |

---

## Fas 1: Sakerhetskopiera

Innan nagot andras, ta en fullstandig backup av all OpenClaw-data.

```bash
# Skapa backup-katalog med datum
BACKUP_DIR=~/openclaw-backup-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# Kopiera hela state-katalogen
cp -a ~/.openclaw/ "$BACKUP_DIR/dot-openclaw"

# Verifiera att backupen ar komplett
echo "--- Backup-innehall ---"
ls -la "$BACKUP_DIR/dot-openclaw/"
echo ""
echo "--- Viktiga filer ---"
ls -la "$BACKUP_DIR/dot-openclaw/openclaw.json" 2>/dev/null && echo "Config: OK" || echo "Config: SAKNAS"
ls -d "$BACKUP_DIR/dot-openclaw/credentials/" 2>/dev/null && echo "Credentials: OK" || echo "Credentials: SAKNAS"
ls -d "$BACKUP_DIR/dot-openclaw/agents/" 2>/dev/null && echo "Agents: OK" || echo "Agents: SAKNAS"
ls -d "$BACKUP_DIR/dot-openclaw/memory/" 2>/dev/null && echo "Memory: OK" || echo "Memory: SAKNAS"
```

Kontrollera att utskriften visar att config, credentials, agents och memory finns i backupen.

---

## Fas 2: Stoppa nuvarande gateway

```bash
# Hitta OpenClaw gateway-processer
pgrep -af openclaw

# Stoppa gateway
pkill -f "openclaw gateway" || pkill -f "openclaw-gateway"

# Vanta 3 sekunder och verifiera att den ar stoppad
sleep 3
pgrep -af openclaw
```

Om processer fortfarande kors, anvand `kill -9`:

```bash
pkill -9 -f "openclaw gateway"
```

---

## Fas 3: Avinstallera upstream

```bash
# Avinstallera den globala installationen
npm uninstall -g openclaw

# Verifiera att kommandot ar borta
which openclaw
# Forvantat resultat: "openclaw not found" eller ingen utskrift

# Dubbelkolla
openclaw --version 2>/dev/null && echo "VARNING: openclaw finns fortfarande" || echo "OK: openclaw avinstallerad"
```

**Viktigt:** State-katalogen `~/.openclaw/` rors INTE vid avinstallation. All config, credentials och data finns kvar.

---

## Fas 4: Installera fork

### 4.1 Klona forken

```bash
# Ga till din utvecklingskatalog
cd ~/dev

# Klona forken (om den inte redan ar klonad)
git clone https://github.com/pajohmail/openclaw.git openclaw_clone

# Eller om den redan finns, uppdatera
cd ~/dev/openclaw_clone
git pull origin main
```

### 4.2 Installera beroenden

```bash
cd ~/dev/openclaw_clone

# Installera dependencies
npm install
```

### 4.3 Bygg projektet

```bash
# Kompilera TypeScript
npx --package typescript tsc --build

# Eller om build-script finns:
# npm run build
```

### 4.4 Lanka globalt

```bash
cd ~/dev/openclaw_clone

# Lanka paketet globalt sa att "openclaw"-kommandot pekar pa var fork
npm link

# Verifiera att kommandot fungerar
which openclaw
openclaw --version
```

Kommandot `openclaw` ska nu peka pa din fork under `~/dev/openclaw_clone`.

---

## Fas 5: Verifiera konfiguration

```bash
# Kor inbyggd diagnostik
openclaw doctor

# Kontrollera att config-filen ar kompatibel
cat ~/.openclaw/openclaw.json
```

Saker att kontrollera:
- Telegram-token finns och ar korrekt
- Agent-konfiguration pekar pa ratt modell/provider
- Inga felmeddelanden fran `openclaw doctor`

Om `openclaw doctor` rapporterar problem, kor:

```bash
# Visa aktuell konfiguration
openclaw config list
```

---

## Fas 6: Starta gateway

```bash
# Starta gateway (manuellt, som tidigare)
nohup openclaw gateway run > /tmp/openclaw-gateway.log 2>&1 &

# Notera PID for framtida referens
echo "Gateway PID: $!"

# Vanta nagra sekunder och kontrollera att den kors
sleep 5
pgrep -af openclaw
```

Kontrollera loggen for eventuella fel:

```bash
tail -n 50 /tmp/openclaw-gateway.log
```

### Kontrollera kanaler

```bash
openclaw channels status
```

Telegram-kanalen ska visas som aktiv.

---

## Fas 7: Verifiering

### 7.1 Skicka testmeddelande

1. Oppna Telegram
2. Skicka ett meddelande till din bot
3. Verifiera att boten svarar korrekt

### 7.2 Kontrollera loggar

```bash
# Kontrollera att inga fel syns i loggen
tail -n 100 /tmp/openclaw-gateway.log

# Sok specifikt efter felmeddelanden
grep -i "error\|fail\|exception" /tmp/openclaw-gateway.log
```

### 7.3 Verifiera nya funktioner

Kontrollera att vara fork-specifika andringar fungerar:

- **Approval gate:** Forsoker boten installera en ny skill? Den ska nu fraga om godkannande forst.
- **Sakerhetsforstarkningar:** SQL-identifieringsvalidering och webhook-validering ar aktiva.
- **RAG-forbattringar:** Document loaders, chunking och reranker ar integrerade i memory manager.

---

## Felsokningsguide

### Gateway startar inte

```bash
# Kontrollera Node-version
node --version
# Kravet ar Node 22+

# Kontrollera att nvm anvander ratt version
nvm use 24
```

### Telegram svarar inte

```bash
# Kontrollera att webhook/polling ar korrekt konfigurerat
openclaw config list | grep -i telegram

# Kontrollera natverksanslutning
curl -s "https://api.telegram.org/bot<DIN_TOKEN>/getMe"
```

### Aterstall fran backup

Om nagot gar fel, aterstall fran backupen:

```bash
# Stoppa forken
pkill -f "openclaw gateway"

# Ta bort fork-lankningen
cd ~/dev/openclaw_clone && npm unlink

# Aterstall state-katalogen
cp -a ~/openclaw-backup-*/dot-openclaw/ ~/.openclaw/

# Installera upstream igen
npm install -g openclaw

# Starta upstream
nohup openclaw gateway run > /tmp/openclaw-gateway.log 2>&1 &
```

---

## Sammanfattning

| Steg | Kommando | Verifiering |
|---|---|---|
| 1. Backup | `cp -a ~/.openclaw/ ...` | `ls -la` pa backup-katalogen |
| 2. Stoppa | `pkill -f "openclaw gateway"` | `pgrep -af openclaw` (tomt) |
| 3. Avinstallera | `npm uninstall -g openclaw` | `which openclaw` (tomt) |
| 4. Installera fork | `npm install && npm link` | `openclaw --version` |
| 5. Config | `openclaw doctor` | Inga fel |
| 6. Starta | `nohup openclaw gateway run ...` | `pgrep -af openclaw` |
| 7. Verifiera | Telegram-meddelande | Bot svarar |
