const errorMiddleware = (error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  if (error.code === 11000) {
    if (error.keyPattern?.orderNumber || error.keyPattern?.idempotencyKey) {
      return response.status(409).json({
        success: false,
        message: 'This order has already been submitted',
      });
    }
    return response.status(409).json({
      success: false,
      message: error.keyPattern?.email
        ? 'An account with this email already exists'
        : 'A record with the same unique value already exists',
    });
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return response.status(413).json({
      success: false,
      message: 'Image files must be 5 MB or smaller',
    });
  }

  if (error.name === 'MulterError' || error.status === 413) {
    return response.status(error.status || 400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors)
      .map((validationError) => validationError.message)
      .join(', ');

    return response.status(400).json({
      success: false,
      message,
    });
  }

  if (error.name === 'CastError') {
    return response.status(400).json({
      success: false,
      message: 'Invalid request value',
    });
  }

  if (error.status === 400) {
    return response.status(400).json({
      success: false,
      message: error.message || 'Invalid request body',
    });
  }

  if (error.status === 404 || error.status === 409) {
    return response.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  console.error('Request failed:', error.message);
  return response.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
  });
};

module.exports = errorMiddleware;
