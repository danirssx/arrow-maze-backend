import fs from "node:fs";

describe("README admin local setup docs", () => {
  const readme = fs.readFileSync("README.md", "utf8");

  it("should_document_the_local_dev_admin_credential_as_non_secret", () => {
    expect(readme).toContain("admin@arrowmaze.test");
    expect(readme).toContain("admin_arrow");
    expect(readme).toContain("ArrowDemo!Admin");
    expect(readme).toContain("non-secret");
    expect(readme).toContain("Never reuse them in production");
  });

  it("should_list_the_admin_read_endpoints", () => {
    expect(readme).toContain("GET  /admin/levels");
    expect(readme).toContain("GET  /admin/users");
  });
});
