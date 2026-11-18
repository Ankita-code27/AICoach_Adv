function notFoundHandler(request, response) {
  response.status(404).json({ message: `Route not found: ${request.method} ${request.originalUrl}`, code: 'NOT_FOUND' });
}

function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error('Request failed:', { name: error.name, message: error.message, stack: error.stack });
  }

  response.status(statusCode).json({
    message: error.expose ? error.message : 'Something went wrong on our end. Please try again.',
    code: error.code || 'INTERNAL_ERROR',
  });
}

export { errorHandler, notFoundHandler };
