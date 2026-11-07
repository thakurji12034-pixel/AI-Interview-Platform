class AppError extends Error {
  constructor(arg1, arg2 = 500, arg3 = 'INTERNAL_ERROR', details = null) {
    let message;
    let statusCode;
    let code;

    if (typeof arg1 === 'number') {
      statusCode = arg1;
      code = typeof arg2 === 'string' ? arg2 : 'ERROR';
      message = typeof arg3 === 'string' ? arg3 : 'Error occurred';
    } else {
      message = typeof arg1 === 'string' ? arg1 : 'Error occurred';
      statusCode = typeof arg2 === 'number' ? arg2 : 500;
      code = typeof arg3 === 'string' ? arg3 : 'INTERNAL_ERROR';
    }

    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
