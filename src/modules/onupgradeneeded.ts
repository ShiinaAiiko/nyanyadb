import { ErrorType } from '../error'
import { IndexedDB, HandlerFuncType } from '../indexeddb'
// import { IDBHandlerType } from '../eventTarget'

import { CollectionsItem } from '../collections'
// 创建一个Collections的DB库来存储当前版本和历史集合
const createModels: HandlerFuncType = (IDB) => {
	const collectionsStore = IDB.CollectionDB?.GetObjectStore('collections')
	// console.log(collectionsStore)
	// 还是提前获取吧
	const modelsObj: { [k: string]: CollectionsItem[] } = {}
	// console.log('getHistoricalCollections', IDB.historicalCollections)
	IDB.historicalCollections.forEach((item) => {
		if (item.originalModelName) {
			if (!modelsObj[item.originalModelName]) {
				modelsObj[item.originalModelName] = [item]
			} else {
				modelsObj[item.originalModelName].push(item)
			}
		}
	})

	// 删除除最后一个历史无效记录，
	// console.log(IDB.db?.objectStoreNames.length)
	const count: number = IDB.db?.objectStoreNames?.length || 0
	const storeNamesObj: { [k: string]: string[] } = {}
	for (let i = 0; i < count || 0; i++) {
		// console.log(IDB.db?.objectStoreNames[i])
		if (IDB.db?.objectStoreNames[i]) {
			const storeName = IDB.db?.objectStoreNames[i].split('_')[0]
			if (!storeNamesObj[storeName]) {
				storeNamesObj[storeName] = [IDB.db?.objectStoreNames[i]]
			} else {
				storeNamesObj[storeName].push(IDB.db?.objectStoreNames[i])
			}
		}
	}
	// console.log('storeNamesObj', storeNamesObj)

	// 在这里创建该model的集合
	console.log(IDB.models)
	Object.keys(IDB.models).forEach((_modelName) => {
		const modelName = IDB.GetModelName(_modelName)
		const model = IDB.models[_modelName]
		console.log(model)
		if (!model.GetPrimaryKey()) {
			console.error(
				'[' + _modelName + '] ' + ErrorType.PRIMARY_KEY_VALUE_NOT_EXIST
			)
			return
		}

		// 检测该模型是否创建
		let lastModel: CollectionsItem
		if (modelsObj[_modelName]?.length) {
			modelsObj[_modelName].forEach((item, index) => {
				// 看这里未来是否检测状态

				if (index !== modelsObj[_modelName].length - 1) {
					if (model.options.deleteOldData) {
						if (item.status === -1) {
							// console.log('删除', item.modelName)
							collectionsStore?.Delete(item.id)
						}
					}
					// IDB.db?.deleteObjectStore(storeName)
				} else {
					// console.log('保留')
				}
				if (index === modelsObj[_modelName].length - 1) {
					lastModel = item
				}
			})
		}

		// 删除无用模型
		// 未来看是否保持至少有一个
		if (model.options.deleteOldData) {
			// console.log(storeNamesObj)
			storeNamesObj[_modelName]?.forEach((item) => {
				let isExist = false
				modelsObj[_modelName].some((subItem) => {
					if (subItem.modelName === item) {
						isExist = true
						return true
					}
				})
				if (!isExist) {
					// console.log(isExist, item)
					IDB.db?.deleteObjectStore(item)
				}
			})
		}

		// 最后一个历史模型存在
		// console.log('lastModel', lastModel)
		// console.log(
		// 	lastModel?.id && !storeNamesObj[_modelName]?.length,
		// 	storeNamesObj && storeNamesObj[_modelName]
		// )
		console.log('getlast', lastModel, storeNamesObj)
		if (lastModel?.id && storeNamesObj[_modelName]?.length) {
			const tempRules = IDB.formatRules(model?.rules)

			// 模型一致，无需创建
			if (JSON.stringify(tempRules.rules) === JSON.stringify(lastModel.model)) {
				// console.log('模型一致，无需创建')

				return
			}
			// 模型不一致，且版本一致请升级版本
			if (JSON.stringify(tempRules) !== JSON.stringify(lastModel.model)) {
				if (lastModel.version === IDB.version) {
					console.error(
						'The model has changed from the previous version, please change the version number.'
					)
					return
				} else {
				}
			}
		}
		// console.log('开始创建模型', modelName)

		let keys: {
			indexKey: string
			keys: string[]
			unique: boolean
		}[] = []
		let primaryKey = {
			keyPath: 'id',
			autoIncrement: true,
		}

		if (model?.rules) {
			Object.keys(model.rules).forEach((key) => {
				// console.log(model.rules[key], key)
				if (model.rules[key].primaryKey) {
					primaryKey.keyPath = key
					primaryKey.autoIncrement = model.rules[key].autoIncrement || false
				}
				if (model.rules[key].createIndex) {
					if (keys.length) {
						keys.forEach((keysItem) => {
							const indexKeys = IDB.GetIndexKey(keysItem.keys.concat([key]))
							keys.push({
								indexKey: indexKeys.indexKey,
								keys: indexKeys.keys,
								unique: model.rules[key].unique || false,
							})
						})
					}
					const indexKeys = IDB.GetIndexKey([key])
					keys.push({
						indexKey: indexKeys.indexKey,
						keys: indexKeys.keys,
						unique: model.rules[key].unique || false,
					})
				}
			})
			// console.log('createObjectStore', primaryKey, keys)

			const store = IDB.CreateObjectStore(modelName, primaryKey)
			// console.log('store', store)
			keys.forEach((item) => {
				// console.log(item)
				store?.createIndex(item.indexKey, item.keys, {
					unique: item.unique,
				})
			})
		}
	})

	// console.log(IDB.db)
	// console.log('IDB.historicalCollection', IDB.historicalCollection)
	// // const objectStore = IDB.db
	// // 	?.transaction(['collections'], 'readwrite')
	// // 	.objectStore('collections')
	// // console.log('objectStore', objectStore)
	// Object.keys(IDB.models).forEach(async (modelName) => {
	// 	storeNamesObj[modelName].forEach((storeName, index) => {
	// 		// console.log(storeName, index, storeNamesObj[modelName].length)
	// 		if (index !== storeNamesObj[modelName].length - 1) {
	// 			console.log('删除', storeName)

	// 			if (IDB.models[modelName].options.deleteOldData) {
	// 				IDB.db?.deleteObjectStore(storeName)
	// 			}
	// 		} else {
	// 			console.log('保留', storeName)
	// 		}
	// 	})
	// })
}
export const onUpgradeNeeded: HandlerFuncType = (IDB) => {
	console.log('Start creating a model.')
	// console.log('onUpgradeNeeded', event)
	// const IDB = event.target?.IndexedDB
	console.log(IDB)
	if (!IDB) return
	// IDB.db.deleteObjectStore('chatRecords_1')
	// IDB.db?.deleteObjectStore('chatRecords_5')
	// IDB.db.deleteObjectStore('chatRecords_1384')
	// 先在这里处理模型
	// IDB.db.createObjectStore('collections', {
	// 	keyPath: 'id',
	// 	autoIncrement: true,
	// })
	// 初始化存储集合模型的Store
	// console.log('在这里创建', IDB.CollectionDB)
	// initCollectionsStore(IDB)
	createModels(IDB)
	// deleteModels(IDB)
}
