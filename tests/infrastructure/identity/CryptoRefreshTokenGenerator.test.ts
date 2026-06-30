import { CryptoRefreshTokenGenerator } from "../../../src/infrastructure/identity/CryptoRefreshTokenGenerator";

// Subject to human review — infrastructure adapter test
describe("CryptoRefreshTokenGenerator", () => {
  const generator = new CryptoRefreshTokenGenerator();

  it("should_generate_a_non_empty_token", () => {
    expect(generator.generate().length).toBeGreaterThan(0);
  });

  it("should_generate_unique_tokens", () => {
    expect(generator.generate()).not.toBe(generator.generate());
  });

  it("should_hash_a_token_deterministically", () => {
    expect(generator.hash("a-token")).toBe(generator.hash("a-token"));
  });

  it("should_produce_different_hashes_for_different_tokens", () => {
    expect(generator.hash("token-a")).not.toBe(generator.hash("token-b"));
  });

  it("should_not_reveal_the_raw_token_inside_its_hash", () => {
    const raw = "super-secret-token";
    expect(generator.hash(raw)).not.toContain(raw);
  });
});
