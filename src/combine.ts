import { Reducer, combineReducers } from 'redux'
import { InternalHandler } from './types'

export interface Handlers<S> {
  children: {
    [P in keyof S]: InternalHandler<S[P]> | Handlers<S[P]>
  }
  buildReducer<RS>(other?: { [P in keyof RS]: Reducer<RS[P]> }): Reducer<S & RS>
}

export const combineHandlers: <S>(handlers: { [P in keyof S]: InternalHandler<S[P]> | Handlers<S[P]> }) => Handlers<S> =
  (handlers) => ({
    children: handlers,
    buildReducer: <RS>(other?: { [P in keyof RS]: Reducer<RS[P]> }) => {
      const reducers: { [key: string]: Reducer<any> } = other || {}

      for (const handler in handlers) {
        const h = handlers[handler]
        reducers[handler] = typeof (h as InternalHandler).buildReducer === 'function'
          ? (h as InternalHandler).buildReducer()
          : (h as Handlers<any>).buildReducer()
      }

      return combineReducers(reducers) as any
    }
  })