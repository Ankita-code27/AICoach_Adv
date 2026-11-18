import { getAdminAuth } from '../config/firebaseAdmin.js';

function createRequireAuth(verifyIdToken) {
  return async function requireAuth(request, response, next) {
    const authorization = request.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return response.status(401).json({
        message: 'Authentication is required.',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      return response.status(401).json({
        message: 'Authentication is required.',
        code: 'AUTH_REQUIRED',
      });
    }

    let verifyToken = verifyIdToken;

    if (!verifyToken) {
      try {
        const adminAuth = getAdminAuth();
        verifyToken = (idToken) => adminAuth.verifyIdToken(idToken);
      } catch (error) {
        console.error('Firebase Admin authentication is unavailable:', error.message);
        return response.status(503).json({
          message: 'Authentication service is unavailable. Please try again later.',
          code: 'AUTH_UNAVAILABLE',
        });
      }
    }

    try {
      request.user = await verifyToken(token);
      return next();
    } catch {
      return response.status(401).json({
        message: 'Your session is invalid or has expired. Please sign in again.',
        code: 'INVALID_AUTH_TOKEN',
      });
    }
  };
}

const requireAuth = createRequireAuth();

export { createRequireAuth, requireAuth };
