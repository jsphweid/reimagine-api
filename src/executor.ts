const ADMIN_PERMISSION = "reimagine:admin";

import { verifyToken } from "./auth";
import { ForbiddenError, UnauthenticatedError } from "./error";

class Executor {
  public readonly userId: string;
  private permissions: string[];

  public constructor(userId: string, permissions: string[]) {
    this.userId = userId;
    this.permissions = permissions;
  }

  public static fromToken(token: string): Promise<Executor | null> {
    return verifyToken(token)
      .then((parsed) => {
        return new Executor(parsed.sub, parsed.permissions || []);
      })
      .catch(() => {
        return null;
      });
  }

  public hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  public isAdmin(): boolean {
    return this.hasPermission(ADMIN_PERMISSION);
  }

  public static run(executor: Executor | null, fn: (e: Executor) => void) {
    fn(Executor.assertExists(executor));
  }

  public static assertExists(executor: Executor | null): Executor {
    if (!executor) {
      throw new UnauthenticatedError();
    }
    return executor;
  }

  public assertIsAdmin(): void {
    if (!this.isAdmin()) {
      throw new ForbiddenError("You must be an admin!");
    }
  }

  public assertUserId(userId: string): void {
    if (this.userId !== userId) {
      throw new ForbiddenError();
    }
  }

  public assertUserIdOrAdmin(userId: string): void {
    if (!this.isAdmin() && this.userId !== userId) {
      throw new ForbiddenError();
    }
  }
}

export default Executor;
