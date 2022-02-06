const ADMIN_PERMISSION = "reimagine:admin";

import { verifyToken } from "./auth";
import { ForbiddenError } from "./error";

class Executor {
  private userId: string;
  private permissions: string[];

  public constructor(userId: string, permissions: string[]) {
    this.userId = userId;
    this.permissions = permissions;
  }

  public static fromToken(token: string): Promise<Executor | null> {
    return verifyToken(token)
      .then((parsed) => {
        console.log("parsed!", parsed);
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

  public assertIsAdmin(): void {
    if (!this.isAdmin()) {
      throw new ForbiddenError("You must be an admin!");
    }
  }
}

export default Executor;
