import BigNumber from 'bignumber.js';

import { selectBestQuote } from '@onekeyhq/shared/src/utils/swapQuoteSortUtils';
import type { IFetchQuoteResult } from '@onekeyhq/shared/types/swap/types';

type ISwapActionableQuote = Pick<IFetchQuoteResult, 'toAmount'>;

type ISwapQuoteProgressInput = {
  quoteLoading: boolean;
  quoteEventFetching: boolean;
  sortedQuotes: IFetchQuoteResult[];
  quoteCurrentSelect?: ISwapActionableQuote;
  manualSelect?: IFetchQuoteResult;
  quoteEventTotalCount: {
    count: number;
    eventId?: string;
  };
  currentEventProviderKeys: string[];
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
  currentEventProviderKeys: string[];
  quoteEventCompleted: boolean;
};

type ISwapQuoteProgressQuoteInput = {
  sortedQuotes: IFetchQuoteResult[];
  manualSelect?: IFetchQuoteResult;
  quoteEventTotalCount: {
    count: number;
    eventId?: string;
  };
  currentEventProviderKeys: string[];
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
  currentEventProviderKeys,
  quoteEventCompleted,
}: ISwapQuoteEventFetchingInput) {
  return (
    quoteEventTotalCount.count > 0 &&
    !quoteEventCompleted &&
    currentEventProviderKeys.length < quoteEventTotalCount.count
  );
}

export function selectSwapQuoteProgressQuote({
  sortedQuotes,
  manualSelect,
  quoteEventTotalCount,
  currentEventProviderKeys,
}: ISwapQuoteProgressQuoteInput) {
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
    return undefined;
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
  sortedQuotes,
  quoteCurrentSelect,
  manualSelect,
  quoteEventTotalCount,
  currentEventProviderKeys,
}: ISwapQuoteProgressInput): ISwapQuoteProgressState {
  const progressQuoteCurrentSelect = quoteEventFetching
    ? selectSwapQuoteProgressQuote({
        sortedQuotes,
        manualSelect,
        quoteEventTotalCount,
        currentEventProviderKeys,
      })
    : quoteCurrentSelect;
  const hasActionableQuote = isSwapQuoteActionable(progressQuoteCurrentSelect);

  return {
    quoteLoading,
    quoteEventFetching,
    hasActionableQuote,
    isWaitingActionableQuote:
      quoteLoading || (quoteEventFetching && !hasActionableQuote),
  };
}
