# Security policy

Healthcare.AI stores sensitive health data, so security reports are taken seriously and
handled first.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private reporting instead:
**Security → Report a vulnerability** on this repository
(https://github.com/murtuza777/HealthCare.Ai/security/advisories/new).

Include what you found, how to reproduce it, and what an attacker could reach. You'll get a
reply within 7 days. Please give us a reasonable time to fix the problem before making it
public, and don't access, change or delete other people's data while testing.

## What counts

- Reading or changing another person's record, reports, conversations or shares
- Bypassing sign-in, caretaker permissions, share-link expiry or revocation
- Getting the assistant to reveal another person's data
- Secrets exposed in the repository or the client bundle

## What helps most

Test against your own local copy (`npm run dev`) rather than the public demo. The demo is a
shared instance and must not be used for load testing or automated scanning.
