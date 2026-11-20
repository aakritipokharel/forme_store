const errorMiddleware = (error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  if (error.code === 11000) {
    return response.status(409).json({
      success: false,
      message: 'An account with this email already exists',
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
      message: 'Invalid request body',
    });
  }

  console.error('Request failed:', error.message);
  return response.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
  });
};

module.exports = errorMiddleware;
