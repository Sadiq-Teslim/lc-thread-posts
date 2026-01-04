# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 2.x.x   | Yes       |
| 1.x.x   | Limited   |

## Security Features

This application implements several security measures:

### Credential Handling

- API credentials are encrypted using Fernet (symmetric encryption)
- Credentials are stored only in the browser's local session
- No credentials are stored on any server
- Sessions automatically expire after 24 hours
- Users can manually disconnect to remove all stored credentials

### Data Flow

- All API communications use HTTPS in production
- Credentials are validated directly with X/Twitter's API
- No third-party services have access to user credentials

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email the maintainer directly at [maintainer email]
3. Include detailed information about the vulnerability
4. Allow reasonable time for a fix before public disclosure

### What to Include

- Type of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix deployment: Depends on severity

## Best Practices for Users

1. **Protect Your API Keys**

   - Never share your X/Twitter API credentials
   - Use dedicated API keys for this application
   - Regularly rotate your credentials

2. **Session Security**

   - Log out when using shared computers
   - Don't store credentials in plain text files
   - Use strong, unique passwords for your X/Twitter account

3. **Application Security**
   - Keep the application updated
   - Report suspicious behavior
   - Use the official repository only

## Scope

This security policy covers:

- The web frontend application
- The Flask API backend
- The CLI tools

Out of scope:

- X/Twitter's own security
- Third-party dependencies (report to their maintainers)
- User's own credential management outside this app
