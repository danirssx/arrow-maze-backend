import { RefreshToken } from "../../../src/domain/identity/RefreshToken.js";
import { RefreshTokenId } from "../../../src/domain/identity/value-objects/RefreshTokenId.js";
import { UserId } from "../../../src/domain/shared/UserId.js";

const ID = "550e8400-e29b-41d4-a716-446655440010";
const ID2 = "550e8400-e29b-41d4-a716-446655440011";
const USER = "550e8400-e29b-41d4-a716-446655440000";
const NOW = new Date("2024-01-15T10:00:00.000Z");
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function issue(): RefreshToken {
  return RefreshToken.issue(RefreshTokenId.create(ID), UserId.create(USER), "hash-1", NOW, TTL_MS);
}

describe("RefreshToken", () => {
  it("should_set_expiry_to_now_plus_ttl_and_be_pristine_when_issued", () => {
    const token = issue();
    expect(token.expiresAt.getTime()).toBe(NOW.getTime() + TTL_MS);
    expect(token.createdAt).toBe(NOW);
    expect(token.revokedAt).toBeNull();
    expect(token.replacedByTokenId).toBeNull();
    expect(token.tokenHash).toBe("hash-1");
    expect(token.userId.value).toBe(USER);
    expect(token.id.value).toBe(ID);
  });

  it("should_be_active_at_issue_time", () => {
    expect(issue().isActive(NOW)).toBe(true);
  });

  it("should_be_active_just_before_expiry", () => {
    const justBefore = new Date(NOW.getTime() + TTL_MS - 1);
    expect(issue().isExpired(justBefore)).toBe(false);
    expect(issue().isActive(justBefore)).toBe(true);
  });

  it("should_treat_the_exact_expiry_instant_as_expired", () => {
    const atExpiry = new Date(NOW.getTime() + TTL_MS);
    expect(issue().isExpired(atExpiry)).toBe(true);
    expect(issue().isActive(atExpiry)).toBe(false);
  });

  it("should_not_be_active_once_expiry_has_passed", () => {
    const afterExpiry = new Date(NOW.getTime() + TTL_MS + 1);
    expect(issue().isExpired(afterExpiry)).toBe(true);
    expect(issue().isActive(afterExpiry)).toBe(false);
  });

  it("should_not_be_active_once_revoked", () => {
    const token = issue();
    token.revoke(NOW);
    expect(token.isRevoked()).toBe(true);
    expect(token.revokedAt).toBe(NOW);
    expect(token.isActive(NOW)).toBe(false);
  });

  it("should_record_the_replacement_id_when_revoked_with_one", () => {
    const token = issue();
    token.revoke(NOW, RefreshTokenId.create(ID2));
    expect(token.replacedByTokenId?.value).toBe(ID2);
  });

  it("should_keep_the_first_revocation_when_revoked_twice", () => {
    const token = issue();
    const later = new Date(NOW.getTime() + 1000);
    token.revoke(NOW);
    token.revoke(later, RefreshTokenId.create(ID2));
    expect(token.revokedAt).toBe(NOW);
    expect(token.replacedByTokenId).toBeNull();
  });

  it("should_reconstitute_from_persisted_state", () => {
    const expiresAt = new Date(NOW.getTime() + TTL_MS);
    const token = RefreshToken.reconstitute(
      RefreshTokenId.create(ID),
      UserId.create(USER),
      "hash-1",
      expiresAt,
      NOW,
      null,
      null,
    );
    expect(token.id.value).toBe(ID);
    expect(token.isActive(NOW)).toBe(true);
  });
});
