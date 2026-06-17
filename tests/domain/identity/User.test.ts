import { User } from "../../../src/domain/identity/User.js";
import { UserRole } from "../../../src/domain/identity/enums/UserRole.js";
import { UserStatus } from "../../../src/domain/identity/enums/UserStatus.js";
import { UserRegistered } from "../../../src/domain/identity/events/UserRegistered.js";
import { UserPasswordChanged } from "../../../src/domain/identity/events/UserPasswordChanged.js";
import { UserSuspended } from "../../../src/domain/identity/events/UserSuspended.js";
import { Email } from "../../../src/domain/identity/value-objects/Email.js";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash.js";
import { UserId } from "../../../src/domain/identity/value-objects/UserId.js";
import { Username } from "../../../src/domain/identity/value-objects/Username.js";
import { BusinessRuleViolationError } from "../../../src/domain/errors/DomainError.js";

function makeUser(overrides?: { role?: UserRole }): User {
  return User.register(
    UserId.generate(),
    Email.create("test@example.com"),
    Username.create("testuser"),
    PasswordHash.fromHash("hashed_password"),
    overrides?.role
  );
}

describe("User", () => {
  describe("register", () => {
    it("should_create_active_user_when_all_valid_data_is_provided", () => {
      const user = makeUser();
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.isActive).toBe(true);
    });

    it("should_default_role_to_user_when_role_is_not_provided", () => {
      const user = makeUser();
      expect(user.role).toBe(UserRole.USER);
    });

    it("should_assign_provided_role_when_role_is_given", () => {
      const user = makeUser({ role: UserRole.ADMIN });
      expect(user.role).toBe(UserRole.ADMIN);
    });

    it("should_emit_user_registered_event_when_registered", () => {
      // Arrange
      const email = Email.create("test@example.com");
      const username = Username.create("testuser");
      const user = User.register(
        UserId.generate(),
        email,
        username,
        PasswordHash.fromHash("hash")
      );

      // Act
      const events = user.pullDomainEvents();

      // Assert
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserRegistered);
      const event = events[0] as UserRegistered;
      expect(event.email).toBe("test@example.com");
      expect(event.username).toBe("testuser");
      expect(event.role).toBe(UserRole.USER);
    });

    it("should_set_email_correctly_when_registered", () => {
      const email = Email.create("user@game.com");
      const user = User.register(
        UserId.generate(),
        email,
        Username.create("gamer"),
        PasswordHash.fromHash("hash")
      );
      expect(user.email.getValue()).toBe("user@game.com");
    });
  });

  describe("changePassword", () => {
    it("should_update_password_hash_when_new_hash_is_provided", () => {
      const user = makeUser();
      user.pullDomainEvents();
      const newHash = PasswordHash.fromHash("new_hash");

      user.changePassword(newHash);

      expect(user.passwordHash.getValue()).toBe("new_hash");
    });

    it("should_emit_user_password_changed_event_when_password_is_changed", () => {
      const user = makeUser();
      user.pullDomainEvents();

      user.changePassword(PasswordHash.fromHash("new_hash"));
      const events = user.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserPasswordChanged);
    });
  });

  describe("suspend", () => {
    it("should_set_status_to_suspended_when_user_is_active", () => {
      const user = makeUser();

      user.suspend();

      expect(user.status).toBe(UserStatus.SUSPENDED);
      expect(user.isActive).toBe(false);
    });

    it("should_emit_user_suspended_event_when_suspended", () => {
      const user = makeUser();
      user.pullDomainEvents();

      user.suspend();
      const events = user.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserSuspended);
    });

    it("should_throw_business_rule_violation_when_suspending_already_suspended_user", () => {
      const user = makeUser();
      user.suspend();

      expect(() => user.suspend()).toThrow(BusinessRuleViolationError);
    });
  });

  describe("pullDomainEvents", () => {
    it("should_clear_events_after_being_pulled", () => {
      const user = makeUser();
      user.pullDomainEvents();

      const events = user.pullDomainEvents();

      expect(events).toHaveLength(0);
    });

    it("should_return_only_events_since_last_pull", () => {
      const user = makeUser();
      user.pullDomainEvents();

      user.suspend();
      user.changePassword(PasswordHash.fromHash("h2"));
      const events = user.pullDomainEvents();

      expect(events).toHaveLength(2);
    });
  });

  describe("reconstitute", () => {
    it("should_rebuild_user_without_emitting_events_when_reconstituted", () => {
      const id = UserId.generate();
      const user = User.reconstitute(
        id,
        Email.create("test@example.com"),
        Username.create("testuser"),
        PasswordHash.fromHash("hash"),
        UserRole.USER,
        UserStatus.ACTIVE,
        new Date(),
        new Date()
      );

      expect(user.pullDomainEvents()).toHaveLength(0);
      expect(user.id.equals(id)).toBe(true);
    });
  });
});
