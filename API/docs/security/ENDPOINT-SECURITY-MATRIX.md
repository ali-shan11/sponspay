# Endpoint Security Matrix

**Last Updated:** January 21, 2025  
**Purpose:** Comprehensive reference for security requirements of all API endpoints

## Overview

This matrix provides a quick reference for the security profile of every endpoint in the API. Use this document to:
- Verify security requirements before making API calls
- Ensure consistent security patterns across the application
- Audit endpoint security configurations
- Plan security testing strategies

## Matrix Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented and documented |
| 🔶 | Partially documented |
| ⚠️ | Needs attention |
| ❌ | Not documented |

### Authentication Types
- **API Key** - Requires `api-key` header
- **Firebase JWT** - Requires `Authorization: Bearer <token>` header
- **None** - Public endpoint, no authentication

### Authorization Levels
- **None** - No role restrictions
- **Fan** - Minimum Fan role required
- **Creator** - Minimum Creator role required
- **Admin** - Admin role required only

### Data Sensitivity
- **Public** - Non-sensitive, publicly available
- **Internal** - Internal use, not public
- **Sensitive** - Personal data, requires protection
- **Critical** - Financial/highly sensitive data

## Creator Module

| Endpoint | Method | Auth | Role | Rate Limit | Sensitivity | Audit | Status |
|----------|--------|------|------|------------|-------------|-------|--------|
| `/creator/sign-in` | POST | API Key | None | 5/min | Sensitive | No | ✅ |
| `/creator/onboard/cancel` | POST | API Key | None | 5/min | Sensitive | No | ✅ |
| `/creator/onboard` | POST | Firebase JWT | None* | 3/min | Sensitive | Yes | ✅ |
| `/creator/accept-terms` | POST | Firebase JWT | Creator | 5/min | Sensitive | Yes | ✅ |

*Role assigned during onboarding

## Marketing Module

| Endpoint | Method | Auth | Role | Rate Limit | Sensitivity | Audit | Status |
|----------|--------|------|------|------------|-------------|-------|--------|
| `/marketing/contactus` | POST | API Key | None | 5/min | Public | No | ✅ |
| `/marketing/landing-page-details` | GET | None | None | 10/min | Public | No | ✅ |
| `/marketing/news` | POST | Firebase JWT | Admin | 10/min | Internal | No | ✅ |
| `/marketing/news/latest/:count` | GET | None | None | 10/min | Public | No | ✅ |
| `/marketing/news/:id` | PUT | Firebase JWT | Admin | 10/min | Internal | No | ✅ |
| `/marketing/news/:id` | DELETE | Firebase JWT | Admin | 10/min | Internal | No | ✅ |

## Accounts Module

| Endpoint | Method | Auth | Role | Rate Limit | Sensitivity | Audit | Status |
|----------|--------|------|------|------------|-------------|-------|--------|
| `/accounts` | POST | Firebase JWT | Creator | 3/min | Critical | Yes | 🔶 |
| `/accounts` | GET | Firebase JWT | Creator | 10/min | Critical | No | 🔶 |
| `/accounts/:id` | GET | Firebase JWT | Creator | 10/min | Critical | No | 🔶 |
| `/accounts/:id` | DELETE | Firebase JWT | Creator | 5/min | Critical | Yes | 🔶 |
| `/accounts/:id/verify` | POST | Firebase JWT | Creator | 5/min | Critical | Yes | 🔶 |
| `/accounts/:id/resend-verification` | POST | Firebase JWT | Creator | 3/min | Critical | Yes | 🔶 |
| `/accounts/countries` | GET | None | None | 10/min | Public | No | 🔶 |
| `/accounts/:id/audit-logs` | GET | Firebase JWT | Creator | 10/min | Sensitive | No | 🔶 |

## Creator Insights Module

| Endpoint | Method | Auth | Role | Rate Limit | Sensitivity | Audit | Status |
|----------|--------|------|------|------------|-------------|-------|--------|
| `/creator-insights/account-statistics` | GET | Firebase JWT | Creator | 10/min | Sensitive | No | 🔶 |
| `/creator-insights/channel-statistics` | GET | Firebase JWT | Creator | 10/min | Sensitive | No | 🔶 |
| `/creator-insights/revenue` | GET | Firebase JWT | Creator | 10/min | Sensitive | No | 🔶 |
| `/creator-insights/revenue-per-day` | GET | Firebase JWT | Creator | 10/min | Sensitive | No | 🔶 |
| `/creator-insights/payouts` | GET | Firebase JWT | Creator | 10/min | Sensitive | No | 🔶 |
| `/creator-insights/transactions` | GET | Firebase JWT | Creator | 10/min | Sensitive | No | 🔶 |
| `/creator-insights/top-earning-countries` | GET | Firebase JWT | Creator | 10/min | Sensitive | No | 🔶 |

## Admin Module

| Endpoint | Method | Auth | Role | Rate Limit | Sensitivity | Audit | Status |
|----------|--------|------|------|------------|-------------|-------|--------|
| `/admin-dev/*` | * | Firebase JWT | Admin | 10/min | Critical | Yes | 🔶 |

## Health Module

| Endpoint | Method | Auth | Role | Rate Limit | Sensitivity | Audit | Status |
|----------|--------|------|------|------------|-------------|-------|--------|
| `/health` | GET | None | None | 60/min | Public | No | 🔶 |

## File Upload Module

| Endpoint | Method | Auth | Role | Rate Limit | Sensitivity | Audit | Status |
|----------|--------|------|------|------------|-------------|-------|--------|
| `/file-upload` | POST | Firebase JWT | Creator | 5/min | Sensitive | No | 🔶 |

## Terms Module

| Endpoint | Method | Auth | Role | Rate Limit | Sensitivity | Audit | Status |
|----------|--------|------|------|------------|-------------|-------|--------|
| `/terms/latest` | GET | None | None | 10/min | Public | No | 🔶 |
| `/terms` | POST | Firebase JWT | Admin | 10/min | Internal | Yes | 🔶 |
| `/terms/:version` | GET | None | None | 10/min | Public | No | 🔶 |

## Security Patterns by Authentication Type

### API Key Endpoints (Public Access)
All API key endpoints use the `api-key` header for authentication.

**Endpoints:**
- `POST /creator/sign-in`
- `POST /creator/onboard/cancel`
- `POST /marketing/contactus`

**Common Security Features:**
- Input sanitization
- Rate limiting (typically 5/min)
- Email/phone validation
- CRM integration

### Firebase JWT Endpoints (Authenticated Users)

**Creator Role Required:**
- All `/accounts/*` endpoints
- All `/creator-insights/*` endpoints
- `POST /creator/accept-terms`
- `POST /file-upload`

**Admin Role Required:**
- `POST /marketing/news`
- `PUT /marketing/news/:id`
- `DELETE /marketing/news/:id`
- `POST /terms`
- All `/admin-dev/*` endpoints

**Common Security Features:**
- User identity from JWT token
- Role-based access control
- Database transactions
- Audit logging (for critical operations)

### Public Endpoints (No Authentication)

**Endpoints:**
- `GET /health`
- `GET /marketing/landing-page-details`
- `GET /marketing/news/latest/:count`
- `GET /accounts/countries`
- `GET /terms/latest`
- `GET /terms/:version`

**Common Security Features:**
- Rate limiting
- Read-only operations
- Cached responses
- No sensitive data exposure

## Security Requirements by Sensitivity Level

### Critical Data (Accounts, Financial)
- **Authentication:** Firebase JWT
- **Authorization:** Creator or Admin
- **Rate Limit:** 3-5 requests/minute
- **Audit Logging:** Required for write operations
- **Additional Security:**
  - Database transactions
  - Input validation and sanitization
  - Cryptographically secure operations
  - Phone number masking in logs

### Sensitive Data (Personal Information, Insights)
- **Authentication:** Firebase JWT or API Key
- **Authorization:** Creator minimum
- **Rate Limit:** 5-10 requests/minute
- **Audit Logging:** Optional
- **Additional Security:**
  - User identity verification
  - Data access restrictions
  - Input validation

### Internal Data (News, Configuration)
- **Authentication:** Firebase JWT
- **Authorization:** Admin
- **Rate Limit:** 10 requests/minute
- **Audit Logging:** Recommended
- **Additional Security:**
  - Content sanitization
  - Role verification

### Public Data (Marketing, Health)
- **Authentication:** None
- **Authorization:** None
- **Rate Limit:** 10-60 requests/minute
- **Audit Logging:** No
- **Additional Security:**
  - Response caching
  - Rate limiting only

## Rate Limiting Summary

| Rate Limit | Use Case | Endpoints |
|------------|----------|-----------|
| **3/min** | Critical write operations | Account creation, verification resend, creator onboarding |
| **5/min** | Sensitive operations | Account verification, sign-in, file upload |
| **10/min** | Standard operations | Most read operations, admin operations |
| **60/min** | High-frequency reads | Health checks |

## Audit Logging Summary

### Logged Operations
- Account creation and verification
- Creator onboarding
- Terms acceptance
- Admin actions
- Account deletion/anonymization

### Not Logged
- Read operations
- Public endpoint access
- Marketing operations
- Health checks

## Security Testing Checklist

Use this checklist when testing endpoint security:

### Authentication Testing
- [ ] Endpoint rejects requests without auth credentials
- [ ] Endpoint rejects invalid/expired tokens
- [ ] Endpoint accepts valid credentials
- [ ] Error messages don't leak sensitive information

### Authorization Testing
- [ ] Endpoint enforces role requirements
- [ ] Lower roles cannot access higher-privilege endpoints
- [ ] Users cannot access other users' data
- [ ] Admin endpoints properly restricted

### Rate Limiting Testing
- [ ] Rate limits properly enforced
- [ ] 429 status returned when exceeded
- [ ] Rate limits reset after time window
- [ ] Different endpoints have appropriate limits

### Data Sensitivity Testing
- [ ] Sensitive data not exposed in logs
- [ ] Phone numbers masked in audit logs
- [ ] Responses don't include unnecessary data
- [ ] Error messages sanitized

### Audit Logging Testing
- [ ] Critical operations logged
- [ ] Log entries contain required fields
- [ ] Logs accessible via audit endpoint
- [ ] Logs properly secured

## Next Actions

### Phase 2 Priorities
1. ✅ Create endpoint security matrix (this document)
2. ⏳ Update Swagger configuration with security overview
3. ⏳ Systematically update remaining controllers:
   - Accounts Controller (8 endpoints)
   - Creator Insights Controller (7 endpoints)
   - Admin Controller
   - File Upload Controller
   - Health Controller
   - Terms Controller

### Phase 3 Priorities
1. Create ESLint rules for security documentation
2. Add automated tests for security documentation completeness
3. Generate security reports from decorators
4. Set up CI checks

## Resources

- [Security Documentation Guide](./SECURITY-DOCUMENTATION-GUIDE.md)
- [Phase 1 Implementation Summary](./PHASE-1-IMPLEMENTATION-SUMMARY.md)
- [Accounts Security Review](../../accounts/SECURITY-REVIEW.md)
- [API Documentation](../integrations/swagger.md)

---

**Maintenance:** Update this matrix when adding new endpoints or changing security requirements.  
**Review Frequency:** Monthly or after significant security changes.
