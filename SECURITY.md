# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to **tom.miller.94@pm.me** with:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** of the vulnerability
4. **Suggested fix** (if you have one)

### What to Expect

- **Acknowledgment**: You will receive a response within 48 hours
- **Updates**: Regular updates on the progress of fixing the vulnerability
- **Credit**: You will be credited for the discovery (unless you prefer to remain anonymous)
- **Timeline**: We aim to patch critical vulnerabilities within 7 days

## Security Best Practices

When using this MCP server:

### Credential Management
- **Never commit** credentials to version control
- Use **environment variables** for sensitive data
- Use **Proton Bridge passwords**, not your main ProtonMail password
- Rotate credentials regularly

### Network Security
- Use **localhost (127.0.0.1)** for Proton Bridge connections
- Ensure Proton Bridge uses **TLS/SSL** connections
- The server automatically accepts **self-signed certificates** for localhost only

### Access Control
- Restrict access to the MCP server configuration file
- Use appropriate file permissions (600) for `.env` files
- Limit who can modify the MCP server code

### Data Protection
- Email data is **cached in memory** only (cleared on restart)
- No persistent storage of email content
- Logs may contain email metadata (not full content)

## Known Security Considerations

1. **Self-Signed Certificates**: The server accepts self-signed certificates from localhost for Proton Bridge. This is by design but could be a concern if used with remote hosts.

2. **Memory Storage**: Email data is stored in memory during operation. Ensure proper server shutdown to clear sensitive data.

3. **Logging**: Debug mode may log email metadata. Avoid debug mode in production.

4. **Dependencies**: We regularly update dependencies to patch security vulnerabilities. Check for updates regularly.

## Disclosure Policy

- **Private Disclosure**: Security issues are handled privately until fixed
- **Public Disclosure**: After a fix is released, we will publish details with appropriate credit
- **CVE Assignment**: For critical vulnerabilities, we will work to get a CVE assigned

## Security Updates

Security patches will be released as:
- **Patch version** for minor security fixes (1.0.x)
- **Minor version** for moderate security fixes (1.x.0)
- **Major version** if breaking changes are required for security

## Audit Trail

| Date | Version | Issue | Severity | Status |
|------|---------|-------|----------|--------|
| TBD  | -       | -     | -        | -      |

---

Thank you for helping keep ProtonMail MCP Server secure!
