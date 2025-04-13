class RemoteDesktopError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'RemoteDesktopError';
  }
}

export const ErrorCodes = {
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  STREAM_ERROR: 'STREAM_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  COMMAND_ERROR: 'COMMAND_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
};

export function handleError(error, notifyFn) {
  console.error('Error occurred:', error);

  let message = 'An unexpected error occurred';
  let type = 'error';

  if (error instanceof RemoteDesktopError) {
    switch (error.code) {
      case ErrorCodes.CONNECTION_ERROR:
        message = 'Failed to connect to remote device';
        break;
      case ErrorCodes.STREAM_ERROR:
        message = 'Screen streaming error occurred';
        break;
      case ErrorCodes.PERMISSION_ERROR:
        message = 'Permission denied for requested operation';
        break;
      case ErrorCodes.COMMAND_ERROR:
        message = 'Failed to execute remote command';
        break;
      case ErrorCodes.FILE_ERROR:
        message = 'File operation failed';
        break;
      case ErrorCodes.AUTH_ERROR:
        message = 'Authentication failed';
        break;
    }

    if (error.details) {
      message += `: ${error.details}`;
    }
  } else {
    message = error.message || message;
  }

  if (notifyFn) {
    notifyFn({
      title: 'Error',
      message,
      type
    });
  }

  return { message, type };
}

export function createError(code, details = null) {
  const messages = {
    [ErrorCodes.CONNECTION_ERROR]: 'Connection error occurred',
    [ErrorCodes.STREAM_ERROR]: 'Screen streaming error occurred',
    [ErrorCodes.PERMISSION_ERROR]: 'Permission denied',
    [ErrorCodes.COMMAND_ERROR]: 'Command execution failed',
    [ErrorCodes.FILE_ERROR]: 'File operation failed',
    [ErrorCodes.AUTH_ERROR]: 'Authentication failed'
  };

  return new RemoteDesktopError(code, messages[code], details);
}

export default {
  RemoteDesktopError,
  ErrorCodes,
  handleError,
  createError
};