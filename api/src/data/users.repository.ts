import type { User } from '../common/types.js';

export interface UserRecord extends User {
  passwordHash: string;
}

/** Login accounts. A user's id is their doctor or patient id. */
export abstract class UsersRepository {
  /** Emails are stored lowercase; `email` is normalized before lookup. */
  abstract findByEmail(email: string): Promise<UserRecord | null>;
}
