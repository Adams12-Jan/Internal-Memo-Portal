import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRegistrationRole } from '../src/services/authService';

test('first user registration becomes a system administrator', () => {
  assert.equal(resolveRegistrationRole({ isFirstUser: true, department: 'Administration' }), 'System Administrator');
});

test('IT Support registration is allowed as a system administrator even when users already exist', () => {
  assert.equal(resolveRegistrationRole({ isFirstUser: false, department: 'IT Support' }), 'System Administrator');
});

test('regular users are registered as initiators after the first account exists', () => {
  assert.equal(resolveRegistrationRole({ isFirstUser: false, department: 'Finance' }), 'Initiator');
});
