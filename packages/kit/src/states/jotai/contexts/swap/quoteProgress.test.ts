import type { IFetchQuoteResult } from '@onekeyhq/shared/types/swap/types';

import {
  buildSwapQuoteProviderKey,
  getSwapQuoteProgressState,
  isSwapQuoteActionable,
  selectSwapCurrentQuote,
} from './quoteProgress';

function makeQuote(
  overrides: Partial<IFetchQuoteResult> & { quoteId: string },
): IFetchQuoteResult {
  return {
    info: {
      provider: 'providerA',
      providerName: 'Provider A',
    },
    fromTokenInfo: {
      networkId: 'evm--1',
      contractAddress: '',
      symbol: 'ETH',
      decimals: 18,
    },
    toTokenInfo: {
      networkId: 'evm--1',
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      symbol: 'USDT',
      decimals: 6,
    },
    ...overrides,
  };
}

describe('quoteProgress', () => {
  it('treats a quote with toAmount as actionable', () => {
    expect(isSwapQuoteActionable({ toAmount: '100' })).toBe(true);
  });

  it('treats a quote with limit data as actionable', () => {
    expect(
      isSwapQuoteActionable({
        limit: {
          min: '1',
        },
      }),
    ).toBe(true);
  });

  it('keeps waiting while quotes are loading', () => {
    expect(
      getSwapQuoteProgressState({
        quoteLoading: true,
        quoteEventFetching: false,
      }),
    ).toEqual({
      quoteLoading: true,
      quoteEventFetching: false,
      hasActionableQuote: false,
      isWaitingActionableQuote: true,
    });
  });

  it('keeps waiting while streaming has started but no actionable quote exists yet', () => {
    expect(
      getSwapQuoteProgressState({
        quoteLoading: false,
        quoteEventFetching: true,
      }),
    ).toEqual({
      quoteLoading: false,
      quoteEventFetching: true,
      hasActionableQuote: false,
      isWaitingActionableQuote: true,
    });
  });

  it('unblocks once the first actionable quote arrives even if streaming continues', () => {
    expect(
      getSwapQuoteProgressState({
        quoteLoading: false,
        quoteEventFetching: true,
        quoteCurrentSelect: {
          toAmount: '100',
        },
      }),
    ).toEqual({
      quoteLoading: false,
      quoteEventFetching: true,
      hasActionableQuote: true,
      isWaitingActionableQuote: false,
    });
  });

  it('stops waiting after streaming completes without an actionable quote', () => {
    expect(
      getSwapQuoteProgressState({
        quoteLoading: false,
        quoteEventFetching: false,
        quoteCurrentSelect: {},
      }),
    ).toEqual({
      quoteLoading: false,
      quoteEventFetching: false,
      hasActionableQuote: false,
      isWaitingActionableQuote: false,
    });
  });
});

describe('selectSwapCurrentQuote', () => {
  const oldBestQuote = makeQuote({
    quoteId: 'OLD_BEST',
    toAmount: '100',
  });
  const currentQuote = makeQuote({
    quoteId: 'CURRENT',
    toAmount: '95',
    info: {
      provider: 'providerB',
      providerName: 'Provider B',
    },
  });

  it('uses the sorted quote list when there is no active quote event', () => {
    expect(
      selectSwapCurrentQuote({
        sortedQuotes: [oldBestQuote, currentQuote],
        quoteEventTotalCount: {
          count: 0,
        },
        currentEventProviderKeys: [],
      })?.quoteId,
    ).toBe('OLD_BEST');
  });

  it('returns undefined while a new stream is waiting for its first provider quote', () => {
    expect(
      selectSwapCurrentQuote({
        sortedQuotes: [oldBestQuote],
        quoteEventTotalCount: {
          count: 2,
          eventId: 'event-2',
        },
        currentEventProviderKeys: [],
      }),
    ).toBeUndefined();
  });

  it('ignores stale carry-over quotes that have not refreshed in the current event', () => {
    expect(
      selectSwapCurrentQuote({
        sortedQuotes: [oldBestQuote, currentQuote],
        quoteEventTotalCount: {
          count: 2,
          eventId: 'event-2',
        },
        currentEventProviderKeys: [buildSwapQuoteProviderKey(currentQuote)],
      })?.quoteId,
    ).toBe('CURRENT');
  });

  it('keeps respecting manual selection within the current event provider set', () => {
    expect(
      selectSwapCurrentQuote({
        sortedQuotes: [oldBestQuote, currentQuote],
        manualSelect: currentQuote,
        quoteEventTotalCount: {
          count: 2,
          eventId: 'event-2',
        },
        currentEventProviderKeys: [
          buildSwapQuoteProviderKey(oldBestQuote),
          buildSwapQuoteProviderKey(currentQuote),
        ],
      })?.quoteId,
    ).toBe('CURRENT');
  });
});
