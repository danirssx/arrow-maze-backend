import bcrypt from "bcryptjs";
import {
  DEMO_USER_CREDENTIALS,
  DEMO_PASSWORD_BCRYPT_COST,
  QA_FULL_CATALOG_USER_ID,
  QA_PROGRESSION_POLICY,
} from "../../prisma/seed-data/demoCredentials.js";
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

  // --- MAZ-194: dedicated full-catalog QA account ---
  it("should_include_a_dedicated_qa_full_catalog_account", () => {
    const qa = DEMO_USER_CREDENTIALS.find((c) => c.id === QA_FULL_CATALOG_USER_ID);

    expect(qa).toBeDefined();
    expect(() => RawPassword.create(qa!.password)).not.toThrow();
  });

  it("should_choose_normal_progression_as_the_qa_account_policy", () => {
    // Chosen for the ticket's open decision: the QA account progresses like a normal
    // user (no local/dev lock bypass), so normal users' progression is never weakened.
    expect(QA_PROGRESSION_POLICY).toBe("normal-progression");
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
