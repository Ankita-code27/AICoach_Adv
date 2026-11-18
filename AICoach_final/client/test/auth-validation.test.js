import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthErrorMessage, getPasswordValidationMessage } from '../src/utils/authErrors.js';

test('password validation requires a strong password', () => {
  assert.equal(getPasswordValidationMessage('short'), 'Use at least 12 characters.');
  assert.equal(getPasswordValidationMessage('alllowercase1!'), 'Include an uppercase letter.');
  assert.equal(getPasswordValidationMessage('ALLUPPERCASE1!'), 'Include a lowercase letter.');
  assert.equal(getPasswordValidationMessage('MixedCaseOnly!'), 'Include a number.');
  assert.equal(getPasswordValidationMessage('MixedCase1234'), 'Include a symbol.');
  assert.equal(getPasswordValidationMessage('StrongPass123!'), '');
});

test('account-creation errors do not reveal whether an email is registered', () => {
  assert.equal(
    getAuthErrorMessage({ code: 'auth/email-already-in-use' }),
    'We could not create your account. Please try again or contact support.',
  );
});
