import BigNumber from 'bignumber.js';

import { selectBestQuote } from '@onekeyhq/shared/src/utils/swapQuoteSortUtils';
import type { IFetchQuoteResult } from '@onekeyhq/shared/types/swap/types';

type ISwapActionableQuote = Pick<IFetchQuoteResult, 'toAmount'>;
export type ISwapManualSelectQuoteProvider = Pick<
  IFetchQuoteResult,
  'eventId' | 'info'
> &
  Partial<
    Pick<
      IFetchQuoteResult,
      'fromTokenInfo' | 'protocol' | 'quoteId' | 'toTokenInfo'
    >
  >;

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
  currentEventSortedQuotes: IFetchQuoteResult[];
  manualSelect?: ISwapManualSelectQuoteProvider;
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

export function buildSwapManualSelectQuoteProvider(
  quote: ISwapManualSelectQuoteProvider | undefined,
): ISwapManualSelectQuoteProvider | undefined {
  if (!quote) {
    return undefined;
  }

  return {
    eventId: quote.eventId,
    info: {
      provider: quote.info.provider,
      providerName: quote.info.providerName,
    },
  };
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
  currentEventSortedQuotes,
  manualSelect,
  quoteEventTotalCount,
  currentEventProviderKeys,
}: ISwapCurrentQuoteInput) {
  const manualSelectInCurrentEvent =
    manualSelect &&
    (quoteEventTotalCount.count === 0 ||
      (hasSwapCurrentEventProvider(manualSelect, currentEventProviderKeys) &&
        (!quoteEventTotalCount.eventId ||
          manualSelect.eventId === quoteEventTotalCount.eventId)));

  if (manualSelectInCurrentEvent) {
    const manualQuote = currentEventSortedQuotes.find(
      (quote) =>
        buildSwapQuoteProviderKey(quote) ===
        buildSwapQuoteProviderKey(manualSelect),
    );
    if (isSwapQuoteActionable(manualQuote)) {
      return manualQuote;
    }
  }

  return selectBestQuote(currentEventSortedQuotes);
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
