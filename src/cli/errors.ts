// This is the parent error class for all expected
// errors that may occur during normal use of Freshmint
//
// We use a separate error class to differentiate
// these errors from unexpected exceptions.
export class FreshmintError extends Error {
  name = 'FreshmintError';
}
