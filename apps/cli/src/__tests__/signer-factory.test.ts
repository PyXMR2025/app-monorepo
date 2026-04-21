/* eslint-disable import/first */
// Mock the deep dependency that pulls in react-native
jest.mock('@onekeyhq/core/src/secret', () => ({
  revealableSeedFromMnemonic: jest.fn(),
}));

jest.mock(
  '../../packages/core/src/chains/evm',
  () => {
    // noop — SignerHd lazy-loads this, we don't exercise it here
  },
  { virtual: true },
);

import { getHdSignerByImpl } from '../signer/factory';
import { SignerHd } from '../signer/impls/evm/SignerHd';

describe('signer factory', () => {
  it('returns SignerHd for evm impl', async () => {
    const signer = await getHdSignerByImpl('evm');
    expect(signer).toBeInstanceOf(SignerHd);
  });

  it('throws for unsupported impl', async () => {
    await expect(getHdSignerByImpl('unknown')).rejects.toThrow(
      'Unsupported chain',
    );
  });

  it('returns same class for repeated calls', async () => {
    const a = await getHdSignerByImpl('evm');
    const b = await getHdSignerByImpl('evm');
    expect(a.constructor).toBe(b.constructor);
  });
});
