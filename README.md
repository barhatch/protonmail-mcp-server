# ProtonMail MCP Server

[![CI](https://github.com/barhatch/protonmail-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/barhatch/protonmail-mcp-server/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/protonmail-mcp-server.svg)](https://www.npmjs.com/package/protonmail-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/protonmail-mcp-server.svg)](https://www.npmjs.com/package/protonmail-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/protonmail-mcp-server.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.0.4-green.svg)](https://github.com/modelcontextprotocol/sdk)

Model Context Protocol server for ProtonMail with 20+ tools for email management through Proton Bridge.

## Features

- **Email sending** - Send emails with HTML/text, attachments, CC/BCC, custom headers
- **Email reading** - Fetch, search, and filter emails via IMAP
- **Folder management** - List, sync, and organize email folders
- **Email operations** - Mark read/unread, star, move, delete
- **Analytics** - Email volume trends, contact statistics, response time analysis
- **System tools** - Connection status, cache management, logging

## Quick Start

### Prerequisites

- ProtonMail account
- [Proton Bridge](https://proton.me/mail/bridge) installed and running
- Node.js 18.0.0+

### Installation

**From npm:**
```bash
npm install -g protonmail-mcp-server
```

**From source:**
```bash
git clone https://github.com/barhatch/protonmail-mcp-server.git
cd protonmail-mcp-server
npm install && npm run build
```

### Configuration

Edit Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "protonmail": {
      "command": "npx",
      "args": ["-y", "protonmail-mcp-server"],
      "env": {
        "PROTONMAIL_USERNAME": "your-email@protonmail.com",
        "PROTONMAIL_PASSWORD": "your-bridge-password",
        "PROTONMAIL_SMTP_HOST": "127.0.0.1",
        "PROTONMAIL_SMTP_PORT": "1025",
        "PROTONMAIL_IMAP_HOST": "127.0.0.1",
        "PROTONMAIL_IMAP_PORT": "1143"
      }
    }
  }
}
```

**Notes:**
- Use `127.0.0.1` not `localhost` to avoid IPv6 issues
- Password is your Proton Bridge password, not your ProtonMail login
- Get Bridge password from Proton Bridge → Settings → Mailbox Password

## Available Tools

**Email Sending**
- `send_email` - Send email with HTML/text, attachments, CC/BCC
- `send_test_email` - Send test email

**Email Reading**
- `get_emails` - Fetch emails with pagination/filtering
- `get_email_by_id` - Get specific email
- `search_emails` - Search with multiple criteria

**Folders**
- `get_folders` - List folders with stats
- `sync_folders` - Sync folder structure

**Email Actions**
- `mark_email_read` - Mark read/unread
- `star_email` - Star/unstar
- `move_email` - Move between folders
- `delete_email` - Delete permanently

**Analytics**
- `get_email_stats` - Email statistics
- `get_email_analytics` - Analytics and insights
- `get_contacts` - Contact interaction stats
- `get_volume_trends` - Email volume over time

**System**
- `get_connection_status` - Check SMTP/IMAP status
- `sync_emails` - Manual sync
- `clear_cache` - Clear cache
- `get_logs` - Get logs

## Troubleshooting

**Connection refused `::1:1143`**
- Use `127.0.0.1` instead of `localhost`
- Verify Proton Bridge is running: `lsof -i :1025 -i :1143`

**Authentication failed**
- Use Proton Bridge password (not ProtonMail login)
- Get from Proton Bridge → Settings → Mailbox Password

**Certificate errors**
- Self-signed certs are automatically accepted for localhost

## Development

```bash
npm run dev      # Watch mode
npm run build    # Build
npm run lint     # Type check
```

## License

MIT - See [LICENSE](LICENSE)

## Links

- [GitHub](https://github.com/barhatch/protonmail-mcp-server)
- [npm](https://www.npmjs.com/package/protonmail-mcp-server)
- [Model Context Protocol](https://github.com/modelcontextprotocol/sdk)

Unofficial third-party server, not affiliated with Proton AG.
