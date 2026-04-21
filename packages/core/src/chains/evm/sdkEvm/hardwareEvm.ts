/**
 * Pure functions for hardware EVM transaction normalization and assembly.
 *
 * Extracted from the ~80 lines of duplicated logic that existed in both:
 *   - kit-bg/vaults/impls/evm/KeyringHardware.ts
 *   - cli/signer/impls/evm/EvmHardwareSigner.ts
 *
 * Both consumers now import from here, ensuring a single source of truth.
 */

import { checkIsDefined } from '@onekeyhq/shared/src/utils/assertUtils';
import numberUtils from '@onekeyhq/shared/src/utils/numberUtils';

import { buildSignedTxFromSignatureEvm } from './signatureEvm';

import type {
  IHardwareEvmTransaction,
  IHardwareEvmTransactionEIP1559,
} from './hardwareEvmTypes';
import type { UnsignedTransaction } from '@ethersproject/transactions';

/**
 * Input shape accepted by buildHardwareEvmTransaction.
 * Intentionally loose to accept both IEncodedTxEvm and CLI's Record<string, unknown>.
 */
export interface IBuildHardwareEvmTxInput {
  // nonce / gasLimit / chainId are optional at the type level because
  // IEncodedTxEvm declares them as optional too. At runtime they are
  // validated with checkIsDefined() before use and throw if missing.
  nonce?: string | number;
  gasLimit?: string | number;
  gas?: string | number;
  chainId?: string | number;
  value?: string;
  data?: string;
  to?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  accessList?: Array<{ address: string; storageKeys: string[] }>;
  [key: string]: unknown;
}

/**
 * Normalize an encoded tx into the hardware SDK format + ethers UnsignedTransaction.
 *
 * This is the core logic that was duplicated in both KeyringHardware and
 * EvmHardwareSigner. Now it lives here as a single pure function.
 */
export function buildHardwareEvmTransaction(
  encodedTx: IBuildHardwareEvmTxInput,
): {
  hwTransaction: IHardwareEvmTransaction | IHardwareEvmTransactionEIP1559;
  unsignedTx: UnsignedTransaction;
} {
  const nonce = numberUtils.numberToHex(checkIsDefined(encodedTx.nonce), {
    prefix0x: true,
  });
  const gasLimit = numberUtils.numberToHex(checkIsDefined(encodedTx.gasLimit), {
    prefix0x: true,
  });
  const chainId = Number(encodedTx.chainId);
  const value = encodedTx.value ?? '0x0';
  const data = encodedTx.data ?? '0x';
  const to = encodedTx.to ?? '';

  const isEip1559 = encodedTx.maxFeePerGas || encodedTx.maxPriorityFeePerGas;

  let hwTransaction: IHardwareEvmTransaction | IHardwareEvmTransactionEIP1559;

  if (isEip1559) {
    hwTransaction = {
      to,
      value,
      data,
      chainId,
      nonce,
      gasLimit,
      gasPrice: undefined,
      maxFeePerGas: checkIsDefined(encodedTx.maxFeePerGas),
      maxPriorityFeePerGas: checkIsDefined(encodedTx.maxPriorityFeePerGas),
      ...(encodedTx.accessList ? { accessList: encodedTx.accessList } : {}),
    } as IHardwareEvmTransactionEIP1559;
  } else {
    hwTransaction = {
      to,
      value,
      data,
      chainId,
      nonce,
      gasLimit,
      gasPrice: checkIsDefined(encodedTx.gasPrice),
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    } as IHardwareEvmTransaction;
  }

  // Build UnsignedTransaction for ethers RLP serialization
  const unsignedTx: UnsignedTransaction = {
    to: hwTransaction.to,
    gasPrice: hwTransaction.gasPrice,
    gasLimit: hwTransaction.gasLimit,
    nonce: parseInt(hwTransaction.nonce, 16),
    data: hwTransaction.data,
    value: hwTransaction.value,
    chainId: hwTransaction.chainId,
  };

  if (isEip1559) {
    unsignedTx.type = 2;
    unsignedTx.maxFeePerGas = hwTransaction.maxFeePerGas ?? undefined;
    unsignedTx.maxPriorityFeePerGas =
      hwTransaction.maxPriorityFeePerGas ?? undefined;

    if ((hwTransaction as IHardwareEvmTransactionEIP1559).accessList) {
      unsignedTx.accessList = (
        hwTransaction as IHardwareEvmTransactionEIP1559
      ).accessList;
    }
  }

  return { hwTransaction, unsignedTx };
}

/**
 * Assemble a final signed EVM transaction from a hardware signature.
 * Wraps buildSignedTxFromSignatureEvm with a consistent return type.
 */
export function assembleHardwareSignedEvmTx(
  unsignedTx: UnsignedTransaction,
  signature: { v: string | number; r: string; s: string },
  encodedTx: Record<string, unknown>,
): { rawTx: string; txid: string; encodedTx: Record<string, unknown> } {
  const { rawTx, txid } = buildSignedTxFromSignatureEvm({
    tx: unsignedTx,
    signature,
  });
  return { rawTx, txid, encodedTx };
}
