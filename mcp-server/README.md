# naya MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server for the **naya** resale price intelligence API.

Drop it into Claude Desktop, Cursor, Claude Code, or any MCP-compatible host and your AI agent gets two new tools: live secondhand price-check and cross-platform listing comparison across Grailed, Poshmark, and Depop.

```
User:  "I'm looking at this Air Jordan 1 on Grailed for $340 — is that a good price?"

Claude (via naya MCP):
  Calls check_resale_price(query="air jordan 1", price=340)
  → median $285, p25 $240, p75 $340
  → dealScore: "fair" (right at the upper edge)

  "$340 is right at the top of the typical range. The median is $285,
   and there are 4 cheaper pairs on Depop right now starting at $240."
```

## What you get

Two MCP tools:

| Tool | What it does |
|---|---|
| `check_resale_price` | Real-time market median, p25/p75, full range, and a deal score (good / fair / high) when a listing price is supplied. Per-platform breakdown across Grailed, Poshmark, Depop. |
| `find_cross_listings` | Up to 6 cheaper alternatives for the same item on a different platform than the one the user is currently looking at. |

Both tools return both a human-readable summary and the raw JSON, so the agent can either narrate the result or do follow-up math (e.g., "what's the savings if I buy from Depop instead?").

## Get an API key

1. Visit [nayaeditorial.shop/ai](https://nayaeditorial.shop/ai)
2. Email [ashwikasrun@gmail.com](mailto:ashwikasrun@gmail.com?subject=naya%20api%20%E2%80%94%20mcp) for a sandbox key (free, 1k calls/month, same-day turnaround)
3. Production tiers (`growth`, `scale`) are listed on the same page

## Install

### Claude Desktop

Add this to your `claude_desktop_config.json`:

**macOS** — `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows** — `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "naya": {
      "command": "npx",
      "args": ["-y", "@nayalabs/mcp-server"],
      "env": {
        "NAYA_API_KEY": "naya_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. You should see "naya" in the tools menu (the hammer icon).

### Cursor

Add to your global MCP config — `~/.cursor/mcp.json` (or **Settings → MCP → Edit Config**):

```json
{
  "mcpServers": {
    "naya": {
      "command": "npx",
      "args": ["-y", "@nayalabs/mcp-server"],
      "env": {
        "NAYA_API_KEY": "naya_your_key_here"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add naya npx -y @nayalabs/mcp-server -e NAYA_API_KEY=naya_your_key_here
```

### Anthropic SDK (custom host)

```ts
import { experimental_createMCPClient } from 'ai';

const naya = await experimental_createMCPClient({
  transport: {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@nayalabs/mcp-server'],
    env: { NAYA_API_KEY: process.env.NAYA_API_KEY! },
  },
});

const tools = await naya.tools();
// pass `tools` to your model.generateText / streamText call
```

## Try it

Once connected, ask your agent things like:

- *"Is $180 a good price for a Carhartt Detroit jacket?"*
- *"What's the resale market for vintage Levi 501s?"*
- *"I'm on Grailed looking at this Patagonia retro pile fleece for $120, are there cheaper ones on Depop or Poshmark?"*
- *"Compare prices for Nike Dunk panda across resale platforms."*

The agent should automatically pick up that it has the naya tools and call them. If it doesn't, prompt it explicitly: *"Use the naya tools to check the resale price."*

## Local development

If you've cloned the repo:

```bash
cd mcp-server
npm install
NAYA_API_KEY=naya_... npm run inspect
```

`npm run inspect` opens the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) — a web UI you can use to enumerate the tools, fire test calls, and see the raw stdio traffic.

## Configuration

Both knobs are environment variables — set them in the `env` block of your MCP client config.

| Var | Required | Default | Notes |
|---|---|---|---|
| `NAYA_API_KEY` | yes | — | Your bearer key. Begins with `naya_`. |
| `NAYA_API_BASE` | no | `https://scraper-api-production-d197.up.railway.app` | Override only if you're hitting a self-hosted naya backend. |

## Errors & rate limits

| Surface | What it means |
|---|---|
| `Invalid NAYA_API_KEY` | Key is missing, malformed, or revoked. Get a fresh one at [/ai](https://nayaeditorial.shop/ai). |
| `monthly rate limit exceeded (X/Y calls used)` | You hit your tier's monthly cap. Pilot tier is 1,000/mo. Upgrade to growth (50k/mo) at [/ai#pricing](https://nayaeditorial.shop/ai). |
| `naya API returned 5xx` | Upstream scraper hiccup. Retry the call — the cache layer usually recovers within seconds. |

## License

MIT — use, fork, deploy, ship as part of your own agent product. The underlying API has its own commercial terms; see the pricing page.
