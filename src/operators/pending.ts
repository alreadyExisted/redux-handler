import { ActionHandler, Lifecycle, Action } from '../types'
import { AsyncOperator } from '../api'

export interface PendingAction<A = any> extends Action {
  args: A
}

/**
 * Occurs before async method is called
 */
export const pending = <RS, S, TArgs, T, A>(hr: ActionHandler<S, PendingAction<TArgs>>):
  AsyncOperator<RS, S, TArgs, T, T, A, A> =>
  ({
    hooks: {
      init: ({ chain }) => {
        chain.asyncActionHandlers[Lifecycle.Pending].push(hr)
      }
    }
  })