import { UserFactory } from "../../../src/domain/identity/UserFactory.js";
import { UserRole } from "../../../src/domain/identity/enums/UserRole.js";
import { UserStatus } from "../../../src/domain/identity/enums/UserStatus.js";
import { UserRegistered } from "../../../src/domain/identity/events/UserRegistered.js";
import { Email } from "../../../src/domain/identity/value-objects/Email.js";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash.js";
import { Username } from "../../../src/domain/identity/value-objects/Username.js";
import { UserId } from "../../../src/domain/shared/UserId.js";

const FIXED_ID_A = "11111111-1111-4111-a111-111111111111";
const FIXED_ID_B = "22222222-2222-4222-a222-222222222222";
const FIXED_NOW = new Date("2024-01-15T10:00:00.000Z");

describe("UserFactory", () => {
  describe("create", () => {
    it("should_create_active_user_when_valid_data_is_provided", () => {
      const user = UserFactory.create(
        UserId.create(FIXED_ID_A),
        Email.create("user@example.com"),
        Username.create("player1"),
        PasswordHash.fromHash("hashed"),
        FIXED_NOW,
        UserRole.USER,
      );

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.role).toBe(UserRole.USER);
    });

    it("should_use_injected_id_when_user_is_created", () => {
      const a = UserFactory.create(
        UserId.create(FIXED_ID_A),
        Email.create("a@example.com"),
        Username.create("player_a"),
        PasswordHash.fromHash("h1"),
        FIXED_NOW,
        UserRole.USER,
      );
      const b = UserFactory.create(
        UserId.create(FIXED_ID_B),
        Email.create("b@example.com"),
        Username.create("player_b"),
        PasswordHash.fromHash("h2"),
        FIXED_NOW,
        UserRole.USER,
      );

      expect(a.id.equals(b.id)).toBe(false);
    });

    it("should_emit_user_registered_event_when_user_is_created", () => {
      const user = UserFactory.create(
        UserId.create(FIXED_ID_A),
        Email.create("user@example.com"),
        Username.create("player1"),
        PasswordHash.fromHash("hashed"),
        FIXED_NOW,
        UserRole.USER,
      );

      const events = user.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserRegistered);
    });

    it("should_assign_admin_role_when_role_is_provided", () => {
      const user = UserFactory.create(
        UserId.create(FIXED_ID_A),
        Email.create("admin@example.com"),
        Username.create("sysadmin"),
        PasswordHash.fromHash("hashed"),
        FIXED_NOW,
        UserRole.ADMIN,
      );

      expect(user.role).toBe(UserRole.ADMIN);
    });
  });
});
