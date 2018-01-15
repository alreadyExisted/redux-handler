import { Dispatch, Middleware, MiddlewareAPI } from 'redux'
import { ActionSystem, Lifecycle, Action } from './handler'
import { Subject, Observable } from 'rxjs'

export interface ErrorHandlerInjects {
  /**
   * Action type
   */
  type: string
}

export interface MiddlewareOptions {
  errorHandler?: (error: any, injects: ErrorHandlerInjects) => Action | void
}

export const handlerMiddleware: (options?: MiddlewareOptions) => Middleware = (options = {}) => <S>({ dispatch, getState }: MiddlewareAPI<S>) => {
  const action$ = new Subject<Action>()

  const promiseInjectors = { getState }

  return (next: Dispatch<S>) =>
    (action: ActionSystem) => {
      if (action.__state === Lifecycle.INIT) {
        action$.next(next(action) as any)

        if (action.__available && !action.__available(getState, action)) {
          if (typeof action.promise === 'function')
            return Promise.resolve()

          if (typeof action.observable === 'function')
            return Observable.empty().subscribe()
        }

        if (action.__pending)
          dispatch({
            ...action,
            __state: Lifecycle.Pending
          })

        if (typeof action.promise === 'function') {
          return action.promise(action.args, promiseInjectors).then(
            payload => {
              if (action.__fulfilled)
                dispatch({
                  ...action,
                  __state: Lifecycle.Fulfilled,
                  payload
                })

              if (action.__finally)
                dispatch({
                  ...action,
                  __state: Lifecycle.Finally
                })

              return payload
            },
            error => {
              if (action.__rejected)
                dispatch({
                  ...action,
                  __state: Lifecycle.Rejected,
                  payload: error,
                  error: true
                })

              if (action.__finally)
                dispatch({
                  ...action,
                  __state: Lifecycle.Finally
                })

              if (!action.__rejected)
                throw error

              return error
            })
        }

        if (typeof action.observable === 'function') {
          const obs = action.observable(action.args, { action$, getState, type: action.type })
            .mergeMap((output: Action) => {
              if (!output)
                throw new TypeError(`Action ${action.type} does not return a stream`)

              const payloads: any[] = []

              if (typeof output.type === 'string') {
                dispatch(output)
              }
              else {
                payloads.push(output)
              }

              return payloads
            })
            .finally(() => {
              if (action.__finally)
                dispatch({
                  ...action,
                  __state: Lifecycle.Finally
                })
            })
            .subscribe(payload => {
              if (action.__fulfilled)
                dispatch({
                  ...action,
                  __state: Lifecycle.Fulfilled,
                  payload
                })
            }, error => {
              if (action.__rejected)
                dispatch({
                  ...action,
                  __state: Lifecycle.Rejected,
                  payload: error,
                  error: true
                })

              if (options.errorHandler) {
                if (options && options.errorHandler) {
                  const errorAction = options.errorHandler(error, { type: action.type })

                  if (errorAction && typeof (errorAction as Action).type === 'string')
                    dispatch(errorAction as Action)
                }
              }

              if (!action.__rejected && !(options && options.errorHandler)) {
                // tslint:disable-next-line:no-console
                console.error(error)
              }
            })

          return obs
        }

        throw new Error()
      }

      const result = next(action) as any
      action$.next(result)
      return result
    }
}