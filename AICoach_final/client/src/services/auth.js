import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase.js';

function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

function sendVerificationEmail(user) {
  return sendEmailVerification(user);
}

function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

function logout() {
  return signOut(auth);
}

export { loginWithEmail, logout, registerWithEmail, sendPasswordReset, sendVerificationEmail };
