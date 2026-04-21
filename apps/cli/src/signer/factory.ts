import { AppError, ERROR_CODES } from '../errors';

import { requireSignerBuilder, resolveSignerRegistration } from './registry';

import type { ISigner } from './types';
import type { ResolvedAuthSession } from '../core/auth/auth-types';

/**
 * Build an HD-only signer by chain impl.
 *
 * Used exclusively by AuthManager.persistHdWalletSession() to derive the
 * first address from a freshly-imported mnemonic — before any session
 * exists. Always returns a software signer; callers must not use this on
 * hardware sessions (hardware signers have no mnemonic to sign with).
 *
 * Commands should use getSignerFromSession() instead, which picks the
 * right signer based on the persisted session.
 */
export async function getHdSignerByImpl(impl: string): Promise<ISigner> {
  const registration = await resolveSignerRegistration(impl);
  const buildHd = requireSignerBuilder(registration, 'hd');
  return buildHd();
}

/**
 * Create a signer from an authenticated session.
 *
 * This is the primary API — wallet type is determined by the session, so
 * wallet commands never need to pass --hardware flags. Dispatch mirrors
 * kit-bg: look up the chain registration by impl, then call the builder
 * keyed by session.walletKind.
 */
export async function getSignerFromSession(
  session: ResolvedAuthSession,
  impl: string,
): Promise<ISigner> {
  const registration = await resolveSignerRegistration(impl);

  if (session.walletKind === 'hardware') {
    if (!session.device || !session.passphraseMode) {
      throw new AppError(
        ERROR_CODES.AUTH_SESSION_INVALID.code,
        'Hardware session is missing device or passphraseMode metadata.',
        'Run: onekey auth logout and login again with --hardware.',
      );
    }
    const buildHardware = requireSignerBuilder(registration, 'hardware');
    return buildHardware(session.device, session.passphraseMode);
  }

  const buildHd = requireSignerBuilder(registration, 'hd');
  return buildHd();
}
