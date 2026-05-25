import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AxiosError, isAxiosError } from 'axios';

export class PawapayRequestException extends HttpException {
  readonly responsePayload: unknown;

  constructor(
    action: string,
    status: number,
    details: unknown,
    cause?: unknown,
  ) {
    super(
      {
        message: `PawaPay ${action} request failed`,
        details,
      },
      status,
      { cause: cause instanceof Error ? cause : undefined },
    );
    this.responsePayload = details;
  }
}

export class PawapaySignatureException extends BadRequestException {
  constructor(message = 'Invalid PawaPay callback signature') {
    super(message);
  }
}

export const mapAxiosErrorToPawapayException = (
  action: string,
  error: unknown,
): PawapayRequestException => {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status ?? HttpStatus.BAD_GATEWAY;
    const details = axiosError.response?.data ?? axiosError.message;
    return new PawapayRequestException(action, status, details, error);
  }

  const generic =
    error instanceof Error ? `${error.name}: ${error.message}` : error;
  return new PawapayRequestException(
    action,
    HttpStatus.INTERNAL_SERVER_ERROR,
    generic,
    error,
  );
};

/**
 * Exception for validation failures before API call
 */
export class PawapayValidationException extends BadRequestException {
  constructor(message: string, validationErrors?: unknown) {
    super({
      message: `PawaPay request validation failed: ${message}`,
      validationErrors,
    });
  }
}

/**
 * Exception for REJECTED responses from PawaPay API
 * PawaPay returns HTTP 200 with status: "REJECTED" in the body
 */
export class PawapayRejectionException extends BadRequestException {
  readonly rejectionReason: unknown;
  readonly reference?: string;

  constructor(
    operation: string, // 'deposit', 'payout', 'refund'
    rejectionReason: unknown,
    reference?: string,
  ) {
    super({
      message: `PawaPay ${operation} was rejected`,
      rejectionReason,
      reference,
    });
    this.rejectionReason = rejectionReason;
    this.reference = reference;
  }
}

/**
 * Exception for DUPLICATE_IGNORED responses
 */
export class PawapayDuplicateException extends ConflictException {
  constructor(operation: string, reference: string) {
    super({
      message: `PawaPay ${operation} was ignored as duplicate`,
      reference,
    });
  }
}

/**
 * Exception for network/transient failures that should be retried
 */
export class PawapayTransientException extends HttpException {
  constructor(message: string, cause?: Error) {
    super(
      {
        message: `PawaPay transient error: ${message}`,
        retryable: true,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
      { cause },
    );
  }
}
