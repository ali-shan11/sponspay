export function convertAuthErrorMessage(code: string): string {
    switch (code) {
        case 'auth/user-disabled': {
            return 'Sorry your user is disabled.';
        }
        case 'auth/user-not-found': {
            return 'Sorry user not found.';
        }

        case 'auth/password-does-not-meet-requirements': {
            return 'Try a stronger password.'
        }
        default: {
            return 'An error occurred. Please try again later.';
        }
    }
}
