export class UnauthenticatedError extends Error {
  constructor(msg: string = "You are not authenticated!") {
    super(msg);
    Object.setPrototypeOf(this, UnauthenticatedError.prototype);
  }
}

export class ForbiddenError extends Error {
  constructor(msg: string = "You are not authorized to do this!") {
    super(msg);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}
