## Mobile E2E (Maestro)

These flows are designed for release-candidate smoke validation on real builds.

### Prereqs

- Install Maestro CLI
- Launch iOS simulator or Android emulator/device
- Start API and mobile app with test credentials configured

### Run all

```bash
maestro test apps/mobile/e2e
```

### Included flows

- `auth-browse-checkout.yaml`: login, browse, cart, checkout happy path
- `payment-cancel.yaml`: payment cancel path
- `network-recovery.yaml`: retry/resume behavior under flaky network
