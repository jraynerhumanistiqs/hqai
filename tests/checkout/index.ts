// Entry point so `npx tsx --test tests/checkout/` runs the whole suite:
// tsx resolves the directory to this index, and importing the test files
// registers their node:test suites. Add new test files here.

import './stripe.test'
import './funnel-events.test'
