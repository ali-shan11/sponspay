import { BadRequestException, ConflictException } from '@nestjs/common';

export class VerificationExpiredException extends BadRequestException {
  constructor(
    message = 'Verification code has expired. Please request a new code.',
  ) {
    super(message);
  }
}

export class TooManyAttemptsException extends BadRequestException {
  constructor(
    message = 'Too many failed attempts. Please request a new verification code.',
  ) {
    super(message);
  }
}

export class AccountTakeoverException extends ConflictException {
  constructor(
    message = 'There is an issue creating your account, please contact support.',
  ) {
    super(message);
  }
}

export class VerificationNotFoundException extends BadRequestException {
  constructor(
    message = 'No verification code found. Please request a new verification code.',
  ) {
    super(message);
  }
}

export class InvalidVerificationCodeException extends BadRequestException {
  constructor(attemptsRemaining: number) {
    const attemptText = attemptsRemaining === 1 ? 'attempt' : 'attempts';
    const message =
      attemptsRemaining > 0
        ? `Invalid verification code. ${attemptsRemaining} ${attemptText} remaining.`
        : 'Invalid verification code. Too many failed attempts. Please request a new verification code.';
    super(message);
  }
}
