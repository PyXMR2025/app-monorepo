import BigNumber from 'bignumber.js';

import { selectBestQuote } from '@onekeyhq/shared/src/utils/swapQuoteSortUtils';
import type { IFetchQuoteResult } from '@onekeyhq/shared/types/swap/types';

type ISwapActionableQuote = Pick<IFetchQuoteResult, 'toAmount'>;

type ISwapQuoteProgressInput = {
  quoteLoading: boolean;
  quoteEventFetching: boolean;
  quoteCurrentSelect?: ISwapActionableQuote;
};

type ISwapQuoteProgressState = {
  quoteLoading: boolean;
  quoteEventFetching: boolean;
  hasActionableQuote: boolean;
  isWaitingActionableQuote: boolean;
};

type ISwapQuoteEventFetchingInput = {
  quoteEventTotalCount: {
    count: number;
  };
  currentEventReceivedCount: number;
  quoteEventCompleted: boolean;
};

type ISwapCurrentQuoteInput = {
  sortedQuotes: IFetchQuoteResult[];
  manualSelect?: IFetchQuoteResult;
  quoteEventTotalCount: {
    count: number;
    eventId?: string;
  };
  currentEventProviderKeys: string[];
  quoteEventCompleted: boolean;
};

export function buildSwapQuoteProviderKey(
  quote: Pick<IFetchQuoteResult, 'info'>,
) {
  return `${quote.info.provider}-${quote.info.providerName}`;
}

export function hasSwapCurrentEventProvider(
  quote: Pick<IFetchQuoteResult, 'info'> | undefined,
  currentEventProviderKeys: string[],
) {
  if (!quote) {
    return false;
  }

  return currentEventProviderKeys.includes(buildSwapQuoteProviderKey(quote));
}

export function isSwapQuoteEventFetching({
  quoteEventTotalCount,
  currentEventReceivedCount,
  quoteEventCompleted,
}: ISwapQuoteEventFetchingInput) {
  return (
    quoteEventTotalCount.count > 0 &&
    !quoteEventCompleted &&
    currentEventReceivedCount < quoteEventTotalCount.count
  );
}

export function selectSwapCurrentQuote({
  sortedQuotes,
  manualSelect,
  quoteEventTotalCount,
  currentEventProviderKeys,
  quoteEventCompleted,
}: ISwapCurrentQuoteInput) {
  const currentEventProviderKeySet = new Set(currentEventProviderKeys);
  const candidateQuotes =
    quoteEventTotalCount.count > 0
      ? sortedQuotes.filter((quote) =>
          currentEventProviderKeySet.has(buildSwapQuoteProviderKey(quote)),
        )
      : sortedQuotes;

  if (
    manualSelect &&
    quoteEventTotalCount.count > 0 &&
    !hasSwapCurrentEventProvider(manualSelect, currentEventProviderKeys)
  ) {
    if (!quoteEventCompleted) {
      return undefined;
    }

    return selectBestQuote(candidateQuotes);
  }

  return selectBestQuote(candidateQuotes, {
    manualSelect,
  });
}

export function isSwapQuoteActionable(
  quoteCurrentSelect?: ISwapActionableQuote,
) {
  return new BigNumber(quoteCurrentSelect?.toAmount ?? 0).gt(0);
}

export function getSwapQuoteProgressState({
  quoteLoading,
  quoteEventFetching,
  quoteCurrentSelect,
}: ISwapQuoteProgressInput): ISwapQuoteProgressState {
  const hasActionableQuote = isSwapQuoteActionable(quoteCurrentSelect);

  return {
    quoteLoading,
    quoteEventFetching,
    hasActionableQuote,
    isWaitingActionableQuote:
      quoteLoading || (quoteEventFetching && !hasActionableQuote),
  };
}
