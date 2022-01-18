import { ErrorType } from './error'

import { Schema } from './schema'
import { NyaNyaDB } from './nyanyadb'
import { Model } from './model'

import { CollectionsItem } from './collections'
import { IndexedDB, HandlerFuncType } from './indexeddb'
export {
	NyaNyaDB,
	CollectionsItem,
	Schema,
	HandlerFuncType,
	Model,
	IndexedDB,
	ErrorType,
}
;((win: Window) => {
	win['NyaNyaDB'] = NyaNyaDB
})(window)

export default NyaNyaDB
