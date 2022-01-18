import { IndexedDB, HandlerFuncType } from '../indexeddb'
export const onVersionChange = (IDB: IndexedDB) => {
	console.log('onVersionChange')
	console.log('The version of this database has changed')
}
