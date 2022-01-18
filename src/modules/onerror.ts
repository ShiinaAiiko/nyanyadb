import { IndexedDB, HandlerFuncType } from '../indexeddb'
// import { HandlerFuncType } from '../indexeddb'
// import { IDBHandlerType } from '../eventTarget'
export const onError: HandlerFuncType = (IDB) => {
	console.log('IndexDB has reported an error.', event)
}
