import { useCallback, useReducer } from 'react';
import { evaluate } from '../calculator/evaluate';
import { formatTokens, formatUnits } from '../calculator/format';
import { errorMessage } from '../calculator/messages';
import { ExpressionError, parse } from '../calculator/parser';
import { initialState, reducer } from '../calculator/state';
import type { Action, CalculatorApi, Node } from '../calculator/types';

export interface Calculator {
  /** The expression being entered, or the result, as display text. */
  expression: string;
  /** The same text split into the items the cursor steps over. */
  units: string[];
  /** How many items are left of the cursor. */
  cursor: number;
  /** The last evaluated expression, shown above its result. */
  previous: string | null;
  /** The message of the last failure. */
  error: string | null;
  /** An evaluation is in progress. */
  pending: boolean;
  /** Handles a button press or a key press. */
  press: (action: Action) => void;
}

/**
 * The calculator's state and behavior. Input actions go to the reducer;
 * equals parses the expression and evaluates it through the service.
 */
export function useCalculator(api: CalculatorApi): Calculator {
  const [state, dispatch] = useReducer(reducer, initialState);

  const press = useCallback(
    (action: Action) => {
      if (action.type !== 'equals') {
        dispatch(action);
        return;
      }
      if (state.pending || state.evaluated || state.tokens.length === 0) return;

      let tree: Node;
      try {
        tree = parse(state.tokens);
      } catch (error) {
        const message = error instanceof ExpressionError ? error.message : errorMessage(error);
        dispatch({ type: 'evaluationFailed', message });
        return;
      }

      dispatch({ type: 'evaluationStarted' });
      evaluate(tree, api).then(
        (result) => dispatch({ type: 'evaluationSucceeded', result }),
        (error: unknown) => dispatch({ type: 'evaluationFailed', message: errorMessage(error) }),
      );
    },
    [state, api],
  );

  return {
    expression: formatTokens(state.tokens),
    units: formatUnits(state.tokens),
    cursor: state.cursor,
    previous: state.previous,
    error: state.error,
    pending: state.pending,
    press,
  };
}
