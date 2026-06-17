import { UserFactory } from "../../../src/domain/identity/UserFactory.js";
import { UserRole } from "../../../src/domain/identity/enums/UserRole.js";
import { UserStatus } from "../../../src/domain/identity/enums/UserStatus.js";
import { UserRegistered } from "../../../src/domain/identity/events/UserRegistered.js";
import { Email } from "../../../src/domain/identity/value-objects/Email.js";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash.js";
import { Username } from "../../../src/domain/identity/value-objects/Username.js";

describe("UserFactory", () => {
  describe("create", () => {
    it("should_create_active_user_when_valid_data_is_provided", () => {
      const user = UserFactory.create(
        Email.create("user@example.com"),
        Username.create("player1"),
        PasswordHash.fromHash("hashed")
      );

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.role).toBe(UserRole.USER);
    });

    it("should_generate_unique_id_when_user_is_created", () => {
      const a = UserFactory.create(
        Email.create("a@example.com"),
        Username.create("player_a"),
        PasswordHash.fromHash("h1")
      );
      const b = UserFactory.create(
        Email.create("b@example.com"),
        Username.create("player_b"),
        PasswordHash.fromHash("h2")
      );

      expect(a.id.equals(b.id)).toBe(false);
    });

    it("should_emit_user_registered_event_when_user_is_created", () => {
      const user = UserFactory.create(
        Email.create("user@example.com"),
        Username.create("player1"),
        PasswordHash.fromHash("hashed")
      );

      const events = user.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserRegistered);
    });

    it("should_assign_admin_role_when_role_is_provided", () => {
      const user = UserFactory.create(
        Email.create("admin@example.com"),
        Username.create("sysadmin"),
        PasswordHash.fromHash("hashed"),
        UserRole.ADMIN
      );

      expect(user.role).toBe(UserRole.ADMIN);
    });
  });
});
