import bcrypt from "bcryptjs";
import { DEMO_USER_CREDENTIALS, DEMO_PASSWORD_BCRYPT_COST } from "../../prisma/seed-data/demoCredentials.js";
import { RawPassword } from "../../src/domain/identity/value-objects/RawPassword.js";
import { PasswordHash } from "../../src/domain/identity/value-objects/PasswordHash.js";
import { BcryptPasswordHasher } from "../../src/infrastructure/identity/BcryptPasswordHasher.js";

// Subject to human review — seed-credential contract test

describe("demo seed credentials", () => {
  it("should_use_a_bcrypt_cost_of_12_consistent_with_the_app_hasher", () => {
    expect(DEMO_PASSWORD_BCRYPT_COST).toBe(12);
  });

  it("should_define_valid_raw_passwords_for_every_demo_user", () => {
    expect(DEMO_USER_CREDENTIALS.length).toBeGreaterThan(0);
    for (const credential of DEMO_USER_CREDENTIALS) {
      expect(() => RawPassword.create(credential.password)).not.toThrow();
    }
  });

  it("should_use_unique_ids_emails_and_usernames", () => {
    const ids = DEMO_USER_CREDENTIALS.map((c) => c.id);
    const emails = DEMO_USER_CREDENTIALS.map((c) => c.email);
    const usernames = DEMO_USER_CREDENTIALS.map((c) => c.username);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(emails).size).toBe(emails.length);
    expect(new Set(usernames).size).toBe(usernames.length);
  });

  it("should_log_in_with_a_cost_12_hash_of_the_documented_password", async () => {
    const hasher = new BcryptPasswordHasher(DEMO_PASSWORD_BCRYPT_COST);

    for (const credential of DEMO_USER_CREDENTIALS) {
      // What the seed stores: bcrypt hash of the documented password at the seed cost.
      const storedHash = await bcrypt.hash(credential.password, DEMO_PASSWORD_BCRYPT_COST);

      const verified = await hasher.verify(
        RawPassword.create(credential.password),
        PasswordHash.fromHash(storedHash),
      );

      expect(verified).toBe(true);
      // The cost segment of the produced hash must be 12 (not the old cost 10).
      expect(storedHash.split("$")[2]).toBe("12");
    }
  });
});
