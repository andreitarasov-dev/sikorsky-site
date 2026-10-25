# Changelog

## 0.5.4

- Disable likes gracefully when Firebase is not configured, instead of throwing a browser error.
- Correct virtual configuration types and expose `@sikorsky/site/virtual`, retaining the old type path for existing consumers.
- Add local two-site preview tooling, package validation against both websites, and a production fixture with desktop/mobile checks.
- Add explicit validated releases; no automatic publishing on push.

## 0.5.3

- Keep the footer at the bottom of short pages.
