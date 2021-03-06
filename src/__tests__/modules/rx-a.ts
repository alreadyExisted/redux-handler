import { of, concat } from 'rxjs'
import { pending, fulfilled, rejected, completed, loading, available, sync } from '../../operators'
import { tap, takeUntil, filter, delay } from 'rxjs/operators'
import { rx } from '../../operators/rx'
import { handler } from '../handler'

export interface RxStoreA {
  pending?: string
  fulfilled?: string
  rejected?: string
  finalize?: string
  loading?: boolean
  notavailable: string
  prevent?: string

  milk?: number
  yoghurt?: number
  cheese?: number

  numberOfExecutionsRx: number
}

const initialState: RxStoreA = {
  notavailable: 'yes',
  numberOfExecutionsRx: 0
}

export const rxHandler = handler<RxStoreA>(initialState)

export const baseRx = rxHandler
  .action<{ data?: string, reject?: boolean, notavailable?: string }>()
  .pipe(
    available((getState, { args }) => getState().rxA.notavailable !== args.notavailable),
    rx(({ reject }) => {
      const n = of({ result: 'y' })
        .pipe(
          tap(x => {
            if (x.result === 'y' && reject)
              // tslint:disable-next-line:no-string-throw
              throw 'err'
          })
        )

      return n
    }),
    fulfilled((s, a) => ({ ...s, fulfilled: a.args.data + a.payload.result })),
    pending((s, a) => ({ ...s, pending: a.args.data })),
    rejected((s, a) => ({ ...s, rejected: a.error })),
    completed((s, a) => ({ ...s, finalize: a.args.data })),
    loading('loading')
  )

export const stopRx = rxHandler
  .action('STOP_RX')
  .empty()

export const preventedRx = rxHandler
  .action()
  .pipe(
    rx((_, { action$ }) => of({ xt: 'data' })
      .pipe(
        delay(300),
        takeUntil(action$.pipe(filter(x => x.type === stopRx.TYPE)))
      )
    ),
    fulfilled((s, a) => ({ ...s, prevent: a.payload.xt }))
  )


// ---------------------------------
// --- dispatch action in action ---
// ---------------------------------

export const produceYoghurt = rxHandler
  .action()
  .pipe(sync(s => ({ ...s, yoghurt: s.milk! / 2 })))

export const produceCheese = rxHandler
  .action()
  .pipe(sync(s => ({ ...s, cheese: s.milk! / 5 })))

export const getMilk = rxHandler
  .action()
  .pipe(
    rx(
      () => concat(
        of({ liters: 10 }),
        of(produceYoghurt()),
        of(produceCheese())
      )
    ),
    fulfilled((s, { payload }) => ({ ...s, milk: payload.liters }))
  )

export const incNumberOfExecutionsRx = rxHandler
  .action()
  .pipe(sync(s => ({ ...s, numberOfExecutionsRx: s.numberOfExecutionsRx + 1 })))

export const executeRx = rxHandler
  .action()
  .pipe(
    rx(
      () => of(incNumberOfExecutionsRx())
    )
  )