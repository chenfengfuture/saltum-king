export class AppError extends Error {
  constructor(status, message, code = status * 10, headers = {}) {
    super(message)
    this.status = status
    this.code = code
    this.headers = headers
  }
}

export function requireCondition(condition, message, status = 400) {
  if (!condition) throw new AppError(status, message)
}
