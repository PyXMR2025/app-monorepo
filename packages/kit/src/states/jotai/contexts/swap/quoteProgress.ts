import BigNumber from 'bignumber.js';

import { selectBestQuote } from '@onekeyhq/shared/src/utils/swapQuoteSortUtils';
import type { IFetchQuoteResult } from '@onekeyhq/shared/types/swap/types';

type ISwapActionableQuote = Pick<IFetchQuoteResult, 'toAmount'>;

type ISwapQuoteProgressInput = {
  quoteLoading: boolean;
  quoteEventFetching: boolean;
  quoteCurrentSelect?: ISwapActionableQuote;
  manualSelect?: Pick<IFetchQuoteResult, 'info'>;
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
};

type ISwapCurrentQuoteInput = {
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
}: ISwapQuoteEventFetchingInput) {
  return (
    quoteEventTotalCount.count > 0 &&
    currentEventProviderKeys.length < quoteEventTotalCount.count
  );
}

export function selectSwapCurrentQuote({
  sortedQuotes,
  manualSelect,
  quoteEventTotalCount,
  currentEventProviderKeys,
}: ISwapCurrentQuoteInput) {
  const currentEventProviderKeySet = new Set(currentEventProviderKeys);
  const candidateQuotes =
    quoteEventTotalCount.count > 0
      ? sortedQuotes.filter((quote) =>
          currentEventProviderKeySet.has(buildSwapQuoteProviderKey(quote)),
        )
      : sortedQuotes;

  return selectBestQuote(candidateQuotes, {
    manualSelect,
  });
}

export function isSwapQuoteActionable(
  quoteCurrentSelect?: ISwapActionableQuote,
) {
  return new BigNumber(quoteCurrentSelect?.toAmount ?? 0).gt(0);
}

export function isSwapManualSelectionPending({
  quoteEventFetching,
  manualSelect,
  currentEventProviderKeys,
}: Pick<
  ISwapQuoteProgressInput,
  'quoteEventFetching' | 'manualSelect' | 'currentEventProviderKeys'
>) {
  if (!quoteEventFetching || !manualSelect) {
    return false;
  }

  return !hasSwapCurrentEventProvider(manualSelect, currentEventProviderKeys);
}

export function getSwapQuoteProgressState({
  quoteLoading,
  quoteEventFetching,
  quoteCurrentSelect,
  manualSelect,
  currentEventProviderKeys,
}: ISwapQuoteProgressInput): ISwapQuoteProgressState {
  const hasActionableQuote = isSwapQuoteActionable(quoteCurrentSelect);
  const isManualSelectionPending = isSwapManualSelectionPending({
    quoteEventFetching,
    manualSelect,
    currentEventProviderKeys,
  });

  return {
    quoteLoading,
    quoteEventFetching,
    hasActionableQuote,
    isWaitingActionableQuote:
      quoteLoading ||
      (quoteEventFetching && (!hasActionableQuote || isManualSelectionPending)),
  };
}
