# Semantic Versioning with Conventional Commits

This project uses automated semantic versioning with conventional commits to manage releases and deployments.

## Overview

- **Automated Versioning**: Versions are automatically generated based on commit messages
- **Branch Strategy**: 
  - `main` branch → Production releases (1.0.0, 1.1.0, 2.0.0)
  - `dev` branch → Beta releases (1.1.0-beta.1, 1.1.0-beta.2)
- **Changelog**: Automatically generated with each release
- **GitHub Releases**: Created automatically with release notes
- **Google Chat Notifications**: Team notifications for new releases

## Commit Message Format

Use conventional commit format for all commits:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Version Impact |
|------|-------------|----------------|
| `feat` | New feature | Minor version bump (1.0.0 → 1.1.0) |
| `fix` | Bug fix | Patch version bump (1.0.0 → 1.0.1) |
| `perf` | Performance improvement | Patch version bump |
| `BREAKING CHANGE` | Breaking change | Major version bump (1.0.0 → 2.0.0) |
| `docs` | Documentation changes | No version bump |
| `style` | Code style changes | No version bump |
| `refactor` | Code refactoring | No version bump |
| `test` | Adding/updating tests | No version bump |
| `chore` | Maintenance tasks | No version bump |
| `ci` | CI/CD changes | No version bump |

### Examples

#### Feature Addition (Minor Version)
```bash
feat: add multi-currency support to revenue calculator
feat(auth): implement SSO integration
```

#### Bug Fix (Patch Version)
```bash
fix: resolve authentication timeout on mobile devices
fix(ui): correct responsive layout on tablet screens
```

#### Breaking Change (Major Version)
```bash
feat!: redesign API authentication flow

BREAKING CHANGE: The authentication API has been completely redesigned. 
Existing API keys will need to be regenerated.
```

#### Non-versioned Changes
```bash
docs: update API documentation
test: add integration tests for payment flow
chore: update dependencies
ci: improve build performance
```

## Release Process

### Automatic Releases

1. **Push to `dev`**: Creates beta release (e.g., `1.1.0-beta.1`)
2. **Push to `main`**: Creates production release (e.g., `1.1.0`)

### Manual Release Trigger

You can also trigger releases manually:

1. Go to GitHub Actions
2. Select "Enhanced CI/CD Pipeline with Quality Gates"
3. Click "Run workflow"
4. Choose the branch (dev/main)

## Version Examples

### Starting from 0.0.1

**Dev Branch Progression:**
```
feat: add new payment method → 0.1.0-beta.1
fix: resolve UI bug → 0.1.0-beta.2
feat: enhance dashboard → 0.1.0-beta.3
```

**Main Branch Release:**
```
Merge dev to main → 0.1.0 (production)
```

**Future Releases:**
```
fix: critical security patch → 0.1.1
feat: new revenue calculator → 0.2.0
feat!: API restructure → 1.0.0
```

## Google Chat Notifications

When a new release is created, the team receives a Google Chat notification with:

- Release version and type (Production/Beta)
- Link to GitHub release page
- Direct link to the deployed application
- Changelog highlights
- Environment information

### Sample Notification

```
🚀 Production Release: SponsPay WebApp v1.2.0

📦 Release: https://github.com/SponsPay/WebApp/releases/tag/v1.2.0
🌐 Live App: https://sponspay.com
📋 Changes:
  • feat: Enhanced revenue calculator with new metrics
  • fix: Resolved authentication timeout issues

Environment: Production
Branch: main
```

## Setup Requirements

### For Repository Administrators

1. **Google Chat Webhook**: 
   - Create incoming webhook in Google Chat space
   - Add `GOOGLE_CHAT_WEBHOOK_URL` to GitHub repository secrets

2. **GitHub Permissions**: 
   - The workflow includes `permissions` section with required access:
     - `contents: write` - To push tags and commits
     - `issues: write` - To create GitHub releases
     - `pull-requests: write` - For PR integration
     - `packages: write` - For Docker registry access
   - No additional setup required - permissions are configured in the workflow

### For Developers

1. **Install commitlint** (optional, for local validation):
   ```bash
   npm install -g @commitlint/cli @commitlint/config-conventional
   ```

2. **Use conventional commit format** in all commits

## Quality Gates

Before any release is created, the following quality gates must pass:

- ✅ Unit Tests (80%+ coverage)
- ✅ Integration Tests
- ✅ E2E Tests (Cypress)
- ✅ Security Scan (no high/critical vulnerabilities)
- ✅ Linting and Type Checks
- ✅ Build Success

## Deployment Strategy

### Docker Image Tagging

- **Semantic Version**: `v1.2.0`, `v1.2.0-beta.1`
- **Environment Latest**: `prod-latest`, `dev-latest`
- **Fallback**: `prod-{sha}`, `dev-{sha}` (when no release)

### Kubernetes Deployment

- Production releases deploy to `sponspay-prod` namespace
- Beta releases deploy to `sponspay-dev` namespace
- Images are tagged with semantic versions for easy rollback

## Troubleshooting

### No Release Created

If semantic-release doesn't create a release:

1. **Check commit format**: Ensure commits follow conventional format
2. **Verify commit types**: Only `feat`, `fix`, `perf`, and `BREAKING CHANGE` trigger releases
3. **Check previous releases**: Semantic-release only creates releases for new changes

### Failed Release

If the release process fails:

1. **Check quality gates**: All tests and scans must pass
2. **Verify secrets**: Ensure `GOOGLE_CHAT_WEBHOOK_URL` is set
3. **Check permissions**: GitHub token needs write access to repository

### Google Chat Not Working

If notifications aren't sent:

1. **Verify webhook URL**: Check `GOOGLE_CHAT_WEBHOOK_URL` secret
2. **Check release creation**: Notifications only sent for successful releases
3. **Validate webhook**: Test webhook URL manually

## Best Practices

1. **Write clear commit messages**: Be descriptive about what changed
2. **Use appropriate types**: Choose the correct commit type for version impact
3. **Group related changes**: Make logical commits that represent complete features/fixes
4. **Test before merging**: Ensure all quality gates pass in dev before merging to main
5. **Review changelogs**: Check generated changelogs for accuracy

## Migration from Manual Versioning

If migrating from manual versioning:

1. **Current version**: Set in `package.json` (currently `0.0.1`)
2. **First release**: Will be based on commit types since last tag
3. **Clean history**: Consider squashing commits for cleaner initial changelog

## Support

For questions about semantic versioning or release process:

1. Check this documentation
2. Review GitHub Actions logs for failed releases
3. Contact the development team for webhook or configuration issues
