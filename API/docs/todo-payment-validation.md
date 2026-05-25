# TODO: Payment Validation Enhancement

## Context

The `POST /fan/:channelHandle/payment` endpoint currently validates:
- Channel exists and is verified (`coAdminAdded=true`)
- Currency exists and has a price configured
- Payment provider supports the requested currency
- Basic DTO validation (phone format, message content, etc.)

However, it does **NOT** yet validate that the payment amount falls within the provider's min/max transaction limits.

## Required Changes

### 1. Add Amount Validation in `fan.service.ts`

In the `initiatePayment()` method, after calculating the amount, validate against provider limits:

```typescript
// 6. Calculate actual amount
const calculatedAmount = parseFloat((currency.price * dto.priceMultiple).toFixed(2));

// 7. Validate amount against provider limits
if (calculatedAmount < paymentProvider.minDepositLimit) {
  throw new BadRequestException(
    `Payment amount ${calculatedAmount} ${currency.shortCode} is below the minimum limit ` +
    `of ${paymentProvider.minDepositLimit} ${currency.shortCode} for provider ${dto.correspondent}. ` +
    `Please use a higher price multiple.`
  );
}

if (calculatedAmount > paymentProvider.maxDepositLimit) {
  throw new BadRequestException(
    `Payment amount ${calculatedAmount} ${currency.shortCode} exceeds the maximum limit ` +
    `of ${paymentProvider.maxDepositLimit} ${currency.shortCode} for provider ${dto.correspondent}. ` +
    `Maximum allowed price multiple is ${Math.floor(paymentProvider.maxDepositLimit / currency.price)}.`
  );
}
```

### 2. Consider Price Multiple Validation

Optionally, validate the `priceMultiple` parameter directly:

```typescript
// Calculate max allowed multiple for this provider
const effectiveMin = Math.ceil(Math.max(currency.price, paymentProvider.minDepositLimit));
const maxAllowedMultiple = Math.min(
  Math.floor(paymentProvider.maxDepositLimit / effectiveMin),
  100
);

if (dto.priceMultiple > maxAllowedMultiple) {
  throw new BadRequestException(
    `Price multiple ${dto.priceMultiple} exceeds the maximum allowed value of ${maxAllowedMultiple} ` +
    `for provider ${dto.correspondent} in ${currency.shortCode}.`
  );
}
```

### 3. Update Error Documentation

Update the Swagger documentation for the endpoint to include the new error cases:

```typescript
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: 'Invalid request (validation failed, amount outside provider limits, etc.)',
})
```

### 4. Add Unit Tests

Add test cases to `fan.service.spec.ts`:

```typescript
describe('initiatePayment - amount validation', () => {
  it('should reject payment below provider minimum', async () => {
    // Setup: provider with min 100, currency.price = 50, priceMultiple = 1
    // Expected: BadRequestException mentioning amount below minimum
  });

  it('should reject payment above provider maximum', async () => {
    // Setup: provider with max 5000, currency.price = 100, priceMultiple = 60
    // Expected: BadRequestException mentioning amount exceeds maximum
  });

  it('should accept payment within provider limits', async () => {
    // Setup: provider with min 50, max 5000, currency.price = 50, priceMultiple = 10
    // Expected: Payment initiated successfully
  });

  it('should accept payment at exactly minimum limit', async () => {
    // Edge case: amount === minDepositLimit
  });

  it('should accept payment at exactly maximum limit', async () => {
    // Edge case: amount === maxDepositLimit
  });
});
```

## Implementation Priority

- **Priority**: Medium
- **Estimated Effort**: 1-2 hours
- **Dependencies**: Requires the Provider interface updates (already completed)
- **Testing**: Unit tests + manual testing with actual PawaPay sandbox

## Notes

- The frontend already receives `minPrice`, `maxPrice`, and `maxMultiple` from `GET /fan/:channelHandle`
- Client-side validation should prevent most invalid requests
- Server-side validation is still essential for security and robustness
- Consider logging validation failures for monitoring/analytics
