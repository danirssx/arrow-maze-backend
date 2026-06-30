import { ForbiddenError } from "../../../shared/errors/ApplicationError.js";

export function assertAdminActor(actorRole: string): void {
  if (actorRole !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
}
