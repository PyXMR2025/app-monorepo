import {
  getSwapQuoteProgressState,
  isSwapQuoteActionable,
} from './swapQuoteProgress';

describe('swapQuoteProgress', () => {
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
