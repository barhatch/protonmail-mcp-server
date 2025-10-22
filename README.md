# ProtonMail MCP Server

[![npm version](https://img.shields.io/npm/v/protonmail-mcp-server.svg)](https://www.npmjs.com/package/protonmail-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/protonmail-mcp-server.svg)](https://www.npmjs.com/package/protonmail-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/protonmail-mcp-server.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.0.4-green.svg)](https://github.com/modelcontextprotocol/sdk)

A professional Model Context Protocol (MCP) server for ProtonMail with 20+ tools for comprehensive email management, analytics, and seamless Proton Bridge integration.

## Features

### 📧 Advanced Email Sending (SMTP)
- Rich HTML/Text email composition
- Multiple recipients (TO, CC, BCC)
- File attachments with base64 encoding
- Priority levels and custom headers
- Custom reply-to addresses
- SMTP connection verification

### 📬 Complete Email Reading (IMAP via Proton Bridge)
- Full folder synchronization
- Advanced email search with filters
- Message parsing and threading
- Attachment handling
- Read/unread status management
- Star/flag email operations
- Email moving and organization

### 📊 Analytics & Statistics
- Email volume trends and patterns
- Contact interaction tracking
- Response time analysis
- Communication insights
- Productivity metrics
- Storage usage statistics

### 🔧 System Management
- Connection status monitoring
- Cache management
- Comprehensive logging
- Error tracking and recovery
- Performance optimization

## Quick Start

### Prerequisites

1. **ProtonMail Account** - Active account with credentials
2. **Proton Bridge** (for IMAP) - Download from [proton.me/mail/bridge](https://proton.me/mail/bridge)
3. **Node.js** - Version 18.0.0 or higher

### Installation

#### Option 1: Install from npm (Recommended)

```bash
npm install -g protonmail-mcp-server
```

#### Option 2: Install from source

```bash
# Clone the repository
git clone https://github.com/barhatch/protonmail-mcp-server.git
cd protonmail-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

Add to your Claude Desktop MCP configuration:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### If installed via npm:

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

#### If installed from source:

```json
{
  "mcpServers": {
    "protonmail": {
      "command": "node",
      "args": ["/absolute/path/to/protonmail-mcp-server/dist/index.js"],
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

**Important Notes:**
- Use `127.0.0.1` instead of `localhost` for IPv4 connections
- Use your **Proton Bridge password** (get from Bridge app settings), not your ProtonMail login password
- Ensure Proton Bridge is running before starting the MCP server

### Environment Variables

Create a `.env` file for local development:

```env
# Required
PROTONMAIL_USERNAME=your-email@protonmail.com
PROTONMAIL_PASSWORD=your-bridge-password

# For Proton Bridge (localhost)
PROTONMAIL_SMTP_HOST=127.0.0.1
PROTONMAIL_SMTP_PORT=1025
PROTONMAIL_IMAP_HOST=127.0.0.1
PROTONMAIL_IMAP_PORT=1143

# Optional
DEBUG=false
```

## Available Tools

### Email Sending
- `send_email` - Send emails with advanced options (HTML, attachments, priority)
- `send_test_email` - Quick test email functionality

### Email Reading
- `get_emails` - Fetch emails with pagination and filtering
- `get_email_by_id` - Get specific email by ID
- `search_emails` - Advanced search with multiple criteria

### Folder Management
- `get_folders` - List all folders with statistics
- `sync_folders` - Synchronize folder structure

### Email Actions
- `mark_email_read` - Mark emails as read/unread
- `star_email` - Star/unstar emails
- `move_email` - Move emails between folders
- `delete_email` - Delete emails permanently

### Analytics
- `get_email_stats` - Comprehensive statistics
- `get_email_analytics` - Advanced analytics and insights
- `get_contacts` - Contact interaction statistics
- `get_volume_trends` - Email volume trends over time

### System
- `get_connection_status` - Check SMTP/IMAP connection status
- `sync_emails` - Manual email synchronization
- `clear_cache` - Clear cached data
- `get_logs` - System logs and debugging

## Architecture

```
src/
├── index.ts                 # Main MCP server
├── types/
│   ├── index.ts            # TypeScript type definitions
│   └── mailparser.d.ts     # Mailparser type declarations
├── services/
│   ├── smtp-service.ts     # SMTP email sending
│   ├── simple-imap-service.ts  # IMAP email reading
│   └── analytics-service.ts    # Email analytics
└── utils/
    ├── logger.ts           # Logging utility
    └── helpers.ts          # Helper functions
```

## Troubleshooting

### IMAP Connection Issues

If you see `ECONNREFUSED ::1:1143`:
- Use `127.0.0.1` instead of `localhost` in your config
- Ensure Proton Bridge is running
- Check that Bridge is listening on the correct ports with `lsof -i :1025 -i :1143`

### Certificate Errors

The server automatically accepts self-signed certificates from Proton Bridge running on localhost.

### Authentication Errors

- Use your **Proton Bridge password**, not your ProtonMail account password
- Find your Bridge password in: Proton Bridge app → Account Settings → Mailbox Password

## Development

```bash
# Development mode with auto-rebuild
npm run dev

# Run linter
npm run lint

# Clean build artifacts
npm run clean

# Build
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - See [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/barhatch/protonmail-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/barhatch/protonmail-mcp-server/discussions)

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Uses [ImapFlow](https://github.com/postalsys/imapflow) for IMAP
- Uses [Nodemailer](https://nodemailer.com/) for SMTP
- Inspired by [anyrxo/protonmail-pro-mcp](https://github.com/anyrxo/protonmail-pro-mcp)

---

**Note**: This is an unofficial third-party MCP server and is not affiliated with Proton AG.
