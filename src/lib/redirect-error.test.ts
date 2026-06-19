import assert from "node:assert/strict";
import test from "node:test";

import { isNextRedirectError, rethrowIfNextRedirectError } from "@/lib/redirect-error";

test("redirect helper detects Next.js redirect signals", () => {
  assert.equal(isNextRedirectError({ digest: "NEXT_REDIRECT;replace;/dashboard;307;" }), true);
  assert.equal(isNextRedirectError(new Error("plain error")), false);
  assert.equal(isNextRedirectError({ digest: "SOMETHING_ELSE" }), false);
});

test("redirect helper rethrows Next.js redirect signals", () => {
  assert.throws(
    () => rethrowIfNextRedirectError({ digest: "NEXT_REDIRECT;replace;/dashboard;307;" }),
    /NEXT_REDIRECT/,
  );
});
