# Contributing to ProtonMail MCP Server

Thank you for your interest in contributing to the ProtonMail MCP Server! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- ProtonMail account with Proton Bridge installed
- Git

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/protonmail-mcp-server.git
   cd protonmail-mcp-server
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file with your test credentials:
   ```env
   PROTONMAIL_USERNAME=your-test-email@protonmail.com
   PROTONMAIL_PASSWORD=your-bridge-password
   PROTONMAIL_SMTP_HOST=127.0.0.1
   PROTONMAIL_SMTP_PORT=1025
   PROTONMAIL_IMAP_HOST=127.0.0.1
   PROTONMAIL_IMAP_PORT=1143
   DEBUG=true
   ```

5. Build the project:
   ```bash
   npm run build
   ```

## Development Workflow

### Making Changes

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines

3. Test your changes:
   ```bash
   npm run build
   npm run lint
   ```

4. Commit your changes:
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a Pull Request on GitHub

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb in present tense (e.g., "Add", "Fix", "Update")
- Keep the first line under 72 characters
- Add detailed description if needed

Example:
```
Add email filtering by date range

- Implement dateFrom and dateTo parameters
- Update search_emails tool schema
- Add validation for date formats
```

## Project Structure

```
src/
├── index.ts                 # Main MCP server entry point
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

## Testing Guidelines

### Manual Testing

1. Start Proton Bridge
2. Build and run the MCP server
3. Test with Claude Desktop or MCP Inspector
4. Verify all affected tools work correctly

### Test Coverage

When adding new features:
- Test all success paths
- Test error conditions
- Test edge cases (empty inputs, null values, etc.)
- Test with Proton Bridge running and stopped

## Adding New Features

### Adding a New Tool

1. Define the tool schema in `src/index.ts`:
   ```typescript
   {
     name: "new_tool_name",
     description: "Clear description of what the tool does",
     inputSchema: {
       type: "object",
       properties: {
         // Define parameters
       },
       required: ["required_params"]
     }
   }
   ```

2. Implement the tool handler in the `CallToolRequestSchema` handler:
   ```typescript
   case "new_tool_name": {
     // Implementation
     return {
       content: [{
         type: "text",
         text: result
       }]
     };
   }
   ```

3. Add logging for debugging
4. Update README.md with the new tool
5. Test thoroughly

### Adding a New Service

1. Create a new file in `src/services/`
2. Define TypeScript interfaces in `src/types/index.ts`
3. Implement the service class
4. Export from the service file
5. Import and use in `src/index.ts`
6. Add tests
7. Document in README.md

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments to functions and classes
- Update CONTRIBUTING.md for contributor-facing changes
- Keep documentation clear and concise

## Pull Request Process

1. Ensure your code builds without errors
2. Update documentation as needed
3. Add a clear description of changes in the PR
4. Link any related issues
5. Be responsive to feedback and questions
6. Ensure CI checks pass (when implemented)

### PR Checklist

- [ ] Code builds successfully (`npm run build`)
- [ ] Linter passes (`npm run lint`)
- [ ] Tested manually with Claude Desktop
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No sensitive data in commits

## Security

### Reporting Security Issues

If you discover a security vulnerability:
1. **Do NOT** open a public issue
2. Email the maintainer directly
3. Provide details about the vulnerability
4. Allow time for a fix before public disclosure

### Security Best Practices

- Never commit credentials or API keys
- Use environment variables for sensitive data
- Validate all user inputs
- Handle errors securely
- Follow principle of least privilege

## Questions?

- Open a GitHub Discussion for general questions
- Open an Issue for bug reports or feature requests
- Check existing issues and discussions first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions
- Respect different viewpoints and experiences

Thank you for contributing!
