Feature: Backend CORS multi-origin allowlist
  The backend allows the existing Expo client origin and the admin web origin from
  CORS_ORIGIN while leaving unrelated origins without CORS access.

  @s1
  Scenario: Expo origin is allowed
    Given CORS_ORIGIN contains "http://localhost:8081,http://localhost:5173"
    When a request to GET /health comes from origin "http://localhost:8081"
    Then the response includes Access-Control-Allow-Origin "http://localhost:8081"

  @s2
  Scenario: Admin web origin is allowed
    Given CORS_ORIGIN contains "http://localhost:8081,http://localhost:5173"
    When a request to GET /health comes from origin "http://localhost:5173"
    Then the response includes Access-Control-Allow-Origin "http://localhost:5173"

  @s3
  Scenario: Unconfigured origin is not allowed
    Given CORS_ORIGIN contains "http://localhost:8081,http://localhost:5173"
    When a request to GET /health comes from origin "http://malicious.local"
    Then the response does not include Access-Control-Allow-Origin

  @s4
  Scenario: Requests without Origin are not rejected
    Given CORS_ORIGIN contains "http://localhost:8081,http://localhost:5173"
    When a request to GET /health has no Origin header
    Then the response status is 200
    And the response does not include Access-Control-Allow-Origin

  @s5
  Scenario: Comma-separated origins are trimmed
    Given CORS_ORIGIN contains " http://localhost:8081, , http://localhost:5173 "
    When the environment is loaded
    Then the configured CORS origins are "http://localhost:8081" and "http://localhost:5173"
