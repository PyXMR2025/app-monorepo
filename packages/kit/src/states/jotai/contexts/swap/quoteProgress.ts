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
