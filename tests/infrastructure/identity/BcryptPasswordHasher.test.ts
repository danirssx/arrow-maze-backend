import { BcryptPasswordHasher } from "../../../src/infrastructure/identity/BcryptPasswordHasher";
import { PasswordHash } from "../../../src/domain/identity/value-objects/PasswordHash";
import { RawPassword } from "../../../src/domain/identity/value-objects/RawPassword";

// Subject to human review — infrastructure adapter test
describe("BcryptPasswordHasher", () => {
  // Use saltRounds=1 for fast tests
  const hasher = new BcryptPasswordHasher(1);

  describe("hash", () => {
    it("should_return_password_hash_when_raw_password_is_valid", async () => {
      // Arrange
      const raw = RawPassword.create("ValidPass1!");

      // Act
      const result = await hasher.hash(raw);

      // Assert
      expect(result).toBeInstanceOf(PasswordHash);
      expect(result.value).not.toBe("ValidPass1!");
      expect(result.value.startsWith("$2")).toBe(true);
    });

    it("should_produce_different_hashes_when_called_twice_with_same_password", async () => {
      // Arrange
      const raw = RawPassword.create("ValidPass1!");

      // Act
      const hash1 = await hasher.hash(raw);
      const hash2 = await hasher.hash(raw);

      // Assert
      expect(hash1.value).not.toBe(hash2.value);
    });
  });

  describe("verify", () => {
    it("should_return_true_when_raw_password_matches_stored_hash", async () => {
      // Arrange
      const raw = RawPassword.create("ValidPass1!");
      const stored = await hasher.hash(raw);

      // Act
      const result = await hasher.verify(raw, stored);

      // Assert
      expect(result).toBe(true);
    });

    it("should_return_false_when_raw_password_does_not_match_stored_hash", async () => {
      // Arrange
      const raw = RawPassword.create("ValidPass1!");
      const wrong = RawPassword.create("WrongPass9!");
      const stored = await hasher.hash(raw);

      // Act
      const result = await hasher.verify(wrong, stored);

      // Assert
      expect(result).toBe(false);
    });
  });
});
