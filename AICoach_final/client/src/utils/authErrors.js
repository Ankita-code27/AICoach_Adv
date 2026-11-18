function getAuthErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'We could not create your account. Please try again or contact support.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/user-disabled': 'This account is unavailable. Contact support for help.',
  };

  return messages[error.code] || 'Something went wrong. Please try again.';
}

function getPasswordValidationMessage(password) {
  if (password.length < 12) return 'Use at least 12 characters.';
  if (!/[a-z]/.test(password)) return 'Include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Include an uppercase letter.';
  if (!/\d/.test(password)) return 'Include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include a symbol.';
  return '';
}

export { getAuthErrorMessage, getPasswordValidationMessage };
