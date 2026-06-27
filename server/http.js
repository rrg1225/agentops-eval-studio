export class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function requireObjectBody(body) {
  if (!body || Array.isArray(body) || typeof body !== "object") {
    throw new ApiError(400, "invalid_request_body", "request body must be a JSON object");
  }
  return body;
}

export function requireText(value, field, minLength = 1) {
  const text = String(value || "").trim();
  if (text.length < minLength) {
    throw new ApiError(400, "invalid_request", `${field} must be at least ${minLength} characters`, {
      field,
      minLength
    });
  }
  return text;
}

export function notFound(req, _res, next) {
  next(new ApiError(404, "not_found", `route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(serviceName) {
  return (error, req, res, _next) => {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const payload = {
      service: serviceName,
      error: {
        code: error.code || (statusCode >= 500 ? "internal_error" : "request_error"),
        message: error.message || "unexpected server error",
        requestId: req.requestId
      }
    };
    if (error.details) payload.error.details = error.details;
    res.status(statusCode).json(payload);
  };
}
