import { IndexedDB, HandlerFuncType } from './indexeddb'

import { CollectionsItem } from './collections'
import { onSuccess } from './modules/onsuccess'
import { onError } from './modules/onerror'
import { onUpgradeNeeded } from './modules/onupgradeneeded'
import { onVersionChange } from './modules/onversionchange'

export class NyaNyaDB extends IndexedDB {
	// public CollectionDB?: IndexedDB
	// public historicalCollections: CollectionsItem[] = []

	constructor(options: {
		databaseName: string
		version?: number
		onUpgradeNeeded?: HandlerFuncType
		onSuccess?: HandlerFuncType
		onError?: HandlerFuncType
		onVersionChange?: HandlerFuncType
	}) {
		super({
			databaseName: options.databaseName,
			version: options?.version || 1,
			onUpgradeNeeded(IDB) {
				onUpgradeNeeded(IDB)
				options.onUpgradeNeeded && options.onUpgradeNeeded(IDB)
			},

			// 运行一个干净的IDB获取下历史记录
			// 未来这个通过自举实现，且存储在其他完全不同的库里
			RUN: (run) => {
				// console.log('CreateCollectionDB')
				const IDB = new IndexedDB({
					databaseName: options.databaseName + '_config',
					version: options?.version || 1,
					onUpgradeNeeded: () => {
						// console.log('回调函数,' + 'onUpgradeNeeded', event)
						// console.log(IDB.db?.objectStoreNames)
						let isExist = false
						for (
							let i = 0;
							i < Number(IDB.db?.objectStoreNames.length) || 0;
							i++
						) {
							// console.log(IDB.db?.objectStoreNames[i])
							if (IDB.db?.objectStoreNames[i] === 'collections') {
								isExist = true
							}
						}

						if (!isExist) {
							// 创建 collectionsStore
							const collectionsStore = IDB.CreateObjectStore('collections', {
								keyPath: 'id',
								autoIncrement: true,
							})
							if (collectionsStore) {
								// console.log(collectionsStore)
								collectionsStore.createIndex('modelName', 'modelName', {
									unique: false,
								})
								collectionsStore.createIndex('version', 'version', {
									unique: false,
								})
								collectionsStore.createIndex(
									'originalModelName',
									'originalModelName',
									{
										unique: false,
									}
								)
							}
						}
					},
					async onSuccess() {
						const collectionsStore = IDB?.GetObjectStore('collections')
						const historicalCollections =
							await collectionsStore?.GetAll<CollectionsItem>()

						// console.log('this', this, _this)
						// (_this.CollectionDB = IDB),
						// (_this.historicalCollections = historicalCollections),
						historicalCollections &&
							run({
								isRun: true,
								CollectionDB: IDB,
								historicalCollections: historicalCollections,
							})
					},
				})
				// console.log(IDB)

				// console.log('第一次执行')
			},
			onSuccess(IDB) {
				onSuccess(IDB)
				options.onSuccess && options.onSuccess(IDB)
			},
			onError(IDB) {
				onError(IDB)
				options.onError && options.onError(IDB)
			},
			onVersionChange(IDB) {
				onError(IDB)
				options.onVersionChange && options.onVersionChange(IDB)
			},
		})
		// console.log('out', this)
		// const _this = this

		this.modelInitHandlers.push(async () => {})
	}
	public async runModelInitHandlers() {
		// console.log('Temp runModelInitHandlers')

		const collectionsStore = this.CollectionDB?.GetObjectStore('collections')
		// console.log('collectionsStore', collectionsStore)
		let getHistoricalModels = await collectionsStore
			?.GetIndex('originalModelName')
			?.GetAll()
		// console.log(getHistoricalModels)
		if (getHistoricalModels) {
			this.historicalCollections = getHistoricalModels
			this.modelInitHandlers.forEach((item) => {
				// console.log(item)
				item(this)
			})
		}
	}
}
