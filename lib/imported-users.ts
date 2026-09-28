// lib/imported-users.ts
//
// Placeholder accounts created by the review import scripts
// (nezal-seed/seed-customer-reviews-xlsx.js, nezal-seed/seed-client-reviews.js).
// The Review schema requires a user ref, so every imported reviewer gets a
// User with an @imported.nezal address. They are not real customers: they
// must not count as users, can't be registered over, and can't be deleted
// while their reviews still point at them.
//
// Accounts are flagged with `isImported: true` (backfilled by
// nezal-seed/mark-imported-users.js). The email-domain check is a fallback
// so accounts created before the backfill are still recognised.

export const IMPORTED_EMAIL_DOMAIN = "@imported.nezal"
export const IMPORTED_EMAIL_REGEX = /@imported\.nezal$/i

export function isImportedEmail(email: unknown): boolean {
  return typeof email === "string" && IMPORTED_EMAIL_REGEX.test(email.trim())
}

export function isImportedUser(user: { isImported?: boolean | null; email?: string | null } | null | undefined) {
  return !!user && (user.isImported === true || isImportedEmail(user.email))
}

/** Mongo filter matching real (non-imported) users. */
export function realUserFilter() {
  return { isImported: { $ne: true }, email: { $not: IMPORTED_EMAIL_REGEX } }
}

/** Mongo filter matching imported placeholder users. */
export function importedUserFilter() {
  return { $or: [{ isImported: true }, { email: IMPORTED_EMAIL_REGEX }] }
}
