import { ErrorType } from '../error'
import { Schema } from '../schema'
import { IndexedDB, HandlerFuncType } from '../indexeddb'

import { CollectionsItem } from '../collections'
const getLastStoreNames = (
	storeNames: {
		modelName: string
		version: number
		originalModelName: string
	}[]
) => {
	if (!storeNames?.length) {
		return null
	}
	return storeNames?.sort((a, b) => {
		return b.version - a.version
	})[0]
}
// import { IDBHandlerType } from '../eventTarget'
const mergeData: HandlerFuncType = async (IDB) => {
	// 5、再一次遍历模型，检测是否有前任
	// 6、获取所有模型
	const collectionsStore = IDB.CollectionDB?.GetObjectStore('collections')
	const getIndex = collectionsStore?.GetIndex('modelName')
	let getAllModel = await getIndex?.GetAll()
	// console.log(getAllModel, 'getAllModel')
	let runCount = 0
	const runModelInitHandlers = async () => {
		runCount++
		if (runCount === Object.keys(IDB.schemas).length) {
			const historicalCollections =
				await collectionsStore?.GetAll<CollectionsItem>()
			// console.log('runModelInitHandlers', historicalCollections)
			IDB.historicalCollections = historicalCollections
			IDB.runModelInitHandlers()
		}
	}
	Object.keys(IDB.schemas).forEach(async (_modelName) => {
		const modelName = IDB.GetModelName(_modelName)
		const model = IDB.schemas[_modelName]
		// console.log(modelName)
		// console.log(model)

		// 7、筛选出，除了当前自己的所有模型
		let getHistoricalModels = await collectionsStore
			?.GetIndex('originalModelName')
			.GetMany(IDBKeyRange.only(_modelName))
		// console.log('getHistoricalModelsOOO', getHistoricalModels, modelName)
		getHistoricalModels =
			getHistoricalModels?.filter((item) => {
				return item.modelName !== modelName
			}) || []
		// console.log('getHistoricalModels', getHistoricalModels, modelName)
		// console.log(getHistoricalModels)
		// 必须有历史模型
		if (!getHistoricalModels?.length) {
			runModelInitHandlers()
			return
		}

		const lastModel = getHistoricalModels[getHistoricalModels.length - 1]
		// 8、检测本次模型和之前最新的模型是否一致
		// 不一致就合并数据
		// * 未来应当将之前所有的版本数据都进行合并
		// console.log('上一个模型记录是否存在', !!lastModel)
		// if (lastModel) {
		// 	console.log(
		// 		IDB.formatRules(model?.rules).rules,
		// 		lastModel.model,
		// 		'模型rules是否一致',
		// 		JSON.stringify(IDB.formatRules(model?.rules).rules) ===
		// 			JSON.stringify(lastModel.model)
		// 	)
		// }
		if (
			lastModel &&
			JSON.stringify(IDB.formatRules(model?.rules).rules) !==
				JSON.stringify(lastModel.model)
		) {
			// console.log('开始走合并流程')
			// 查询当前模型数据
			const index = collectionsStore?.GetIndex('modelName')
			const getCurrentModel = await index?.Get(modelName)
			// console.log(
			// 	'是否更改此次内容',
			// 	getCurrentModel.lastMergeVersion.includes(lastModel.version)
			// )
			// console.log(getData, index)
			// 9、合并数据、
			// 9.1 检测之前的版本是否在目前版本里合并过
			if (
				model.options.mergeOldData &&
				!getCurrentModel.lastMergeVersion.includes(lastModel.version)
			) {
				const lastModelStore = IDB.GetObjectStore(lastModel.modelName)
				// 是否合并老数据
				// 老模型是否存在
				// console.log(
				// 	lastModelStore,
				// 	model.options.mergeOldData,
				// 	!getData.lastMergeVersion.includes(lastModel.version)
				// )
				// 10、获取之前的所有数据
				// 允许合并就将之前的数据全部添加到新模型
				const getAllData = await lastModelStore?.GetAll()
				// console.log('olddata', getAllData)
				let mergeData: Promise<any>[] = []
				// console.log(getAllData)
				// console.log(IDB)
				// console.log(modelName)
				const newModelStore = IDB.GetObjectStore(modelName)
				// console.log(newModelStore)
				if (newModelStore) {
					getAllData?.forEach((item) => {
						try {
							// console.log(Schema.formatDefaultData(item, model.rules))
							// console.log(newModelStore)
							// 9.2 * 未来这里要进行默认值处理
							mergeData.push(
								newModelStore.Add(Schema.formatDefaultData(item, model.rules))
							)
						} catch (error) {
							console.log(error)
						}
					})
				}
				// 9.3 异步处理所有合并数据
				Promise.allSettled(mergeData).then(async (res) => {
					// console.log('合并数据', res, modelName, lastModel)
					const collectionsStore =
						IDB.CollectionDB?.GetObjectStore('collections')
					if (collectionsStore) {
						const isUp = await collectionsStore.Update(getCurrentModel.id, {
							...getCurrentModel,
							lastMergeVersion: [lastModel.version],
						})
						const isUpLastModel = await collectionsStore?.Update(lastModel.id, {
							...lastModel,
							status: -1,
						})
						// console.log('isUp', isUpLastModel, isUp)
						// 9.4、删除老数据
						if (isUp && isUpLastModel && model.options.deleteOldData) {
							const lastModelStore = IDB.GetObjectStore(lastModel.modelName)
							const deleteAll = await lastModelStore?.DeleteAll()
							// console.log('deleteAll', deleteAll)
							// let primaryKey = Schema.GetPrimaryKey(lastModel.model)
							// getAllData?.forEach(async (item) => {
							// 	try {
							// 		// 未来，检测ID是否是主键
							// 		await lastModelStore?.Delete(item[primaryKey])
							// 	} catch (error) {
							// 		console.log(error)
							// 	}
							// })
							// // IDB.db?.deleteObjectStore(lastModel.modelnAME)
						}
						runModelInitHandlers()
					}
				})
			} else {
				// 10、是否删除老数据
				// 10.1、* 删除所有的内容，模型暂时可留，后面版本更改那里删除
				if (model.options.deleteOldData && lastModel) {
					// 如果是老版本，且要求删除老数据，那么直接遍历所有删除
					getHistoricalModels.forEach(async (item) => {
						const objectStore = IDB.GetObjectStore(item.modelName)
						await objectStore?.DeleteAll()
						// await objectStore?.DeleteAllIndexNames()
					})
				}
				runModelInitHandlers()
			}
		} else {
			// console.log('这里')
			runModelInitHandlers()
		}

		// console.log(IDB.version, lastModel.version)
		// const oldModelStore = IDB.GetObjectStore(lastModel.modelName)
		// if (oldModelStore) {
		//   const getAllData = await oldModelStore.GetAll()

		//   console.log('olddata', getAllData)
		//   if (model.options.mergeOldData) {
		//     getAllData.forEach((item) => {
		//       console.log(item)
		//     })
		//   }
		// }
		// return
		// if (model.options.mergeOldData) {
		// 	res(false)
		// }
		// // res(true)
	})
}
const addModelCollection: HandlerFuncType = async (
	IDB,
	{
		storeNamesObj,
	}: {
		storeNamesObj: {
			[k: string]: {
				modelName: string
				version: number
				originalModelName: string
			}[]
		}
	}
) => {
	// console.log(storeNamesObj)
	const collectionsStore = IDB.CollectionDB?.GetObjectStore('collections')
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
	// console.log(collectionsStore, IDB.models)
	const addModelPromiseAll: Promise<any>[] = []

	// 1、遍历当前所有模型
	Object.keys(IDB.schemas).forEach(async (_modelName) => {
		const lastStoreName = getLastStoreNames(storeNamesObj[_modelName])
		// console.log('lastStoreName', lastStoreName)
		if (!lastStoreName?.version) {
			console.error('Model ' + _modelName + ' not created.')
			return
		}

		const modelName = IDB.GetModelName(_modelName)
		const model = IDB.schemas[_modelName]
		if (!model.GetPrimaryKey()) {
			console.error(
				'[' + _modelName + '] ' + ErrorType.PRIMARY_KEY_VALUE_NOT_EXIST
			)
			return
		}

		// console.log(model)
		let rules: any = {}
		let primaryKey = {
			keyPath: 'id',
			autoIncrement: true,
		}
		if (model?.rules) {
			// 2、重新格式化模型数据
			const tempRules = IDB.formatRules(model?.rules)
			rules = tempRules.rules
			primaryKey = tempRules.primaryKey
		}
		try {
			// 3、创建模型，添加异步事件
			addModelPromiseAll.push(
				new Promise(async (res, rej) => {
					// const getIndex = collectionsStore?.GetIndex('modelName')

					// const getCurrentModel = await getIndex?.Get(modelName)
					// console.log('模型“' + modelName + '”是否存在', !!GetModel)
					// console.log(modelName)
					// console.log(getAllModel)

					let getHistoricalModels = await collectionsStore
						?.GetIndex('originalModelName')
						.GetMany(IDBKeyRange.only(_modelName))

					// console.log('getHistoricalModels', getHistoricalModels, modelName)
					// console.log('getHistoricalModels', getHistoricalModels)
					// 必须有历史模型
					let lastModel: any
					if (getHistoricalModels?.length) {
						getHistoricalModels?.forEach((item, index) => {
							// 看这里未来是否检测状态
							if (index !== (getHistoricalModels?.length || 0) - 1) {
								if (model.options.deleteOldData) {
									if ((item.status = -1)) {
										// console.log('删除', item)
										// const collectionsStore =
										// 	IDB.CollectionDB?.GetObjectStore('collections')
										collectionsStore?.Delete(item.id)
									} else {
										collectionsStore?.Update(item.id, {
											...item,
											status: 0,
										})
									}
								}
								// IDB.db?.deleteObjectStore(storeName)
							} else {
							}
							if (index === (getHistoricalModels?.length || 0) - 1) {
								// console.log('保留')
								lastModel = item
							}
						})
					}
					// console.log('GetModel', GetModel, modelName)
					// 如果模型和之前的某个版本一致，那么就跳过
					// console.log('lastModel.model', lastModel)
					// console.log(
					// 	'是否和上一个模型一样：',
					// 	JSON.stringify(rules) === JSON.stringify(lastModel?.model)
					// )
					// 最后一个历史模型存在
					// console.log('lastStoreName', lastStoreName)
					// console.log('lastModel', lastModel)
					if (lastModel?.id) {
						// 大于就说明当前的不是最新，需要创建
						// console.log(lastStoreName.version <= lastModel.version)
						if (lastStoreName.version <= lastModel.version) {
							// 模型一致，无需创建
							// console.log(
							// 	JSON.stringify(rules) === JSON.stringify(lastModel?.model)
							// )
							if (JSON.stringify(rules) === JSON.stringify(lastModel?.model)) {
								return res(true)
							}
							// 模型不一致，且版本一致请升级版本
							if (JSON.stringify(rules) !== JSON.stringify(lastModel?.model)) {
								if (lastModel.version === IDB.version) {
									console.error(
										'The model has changed from the previous version, please change the version number.'
									)
									res(false)
									return
								} else {
								}
							}
						}
					}
					// 最后一个模型不存在
					// console.log('开始创建新增模型')

					// 查询是否和上一个版本一致

					// 3.1 检测模型是否存在，不存在创建
					await collectionsStore?.Add({
						modelName: modelName,
						version: IDB.version,
						createTime: IndexedDB.getTimeStamp(),
						model: rules,
						originalModelName: _modelName,
						options: model.options,
						// 1 正常 0 未使用待处理数据 -1 已处理数据待删除
						status: 1,
						lastMergeVersion: [],
						isMergeData: false,
					})
					res(true)
				})
			)
		} catch (error) {
			console.log(error)
		}
	})
	// 4、执行模型添加的异步事件
	Promise.all(addModelPromiseAll).then(async (res: boolean[]) => {
		const getBools = res.filter((item) => {
			return item
		})
		if (res.length === getBools.length) {
			console.log('[IndexedDB] Schema model addition is completed.')
			// 在这里处理数据合并等
			mergeData(IDB)
		}
	})
}
export const onSuccess: HandlerFuncType = (IDB) => {
	// console.log(IDB, '开始执行Onsuccess')
	if (!IDB) return

	// 获取已创建的集合对象
	const count: number = IDB.db?.objectStoreNames?.length || 0
	const storeNamesObj: {
		[k: string]: {
			modelName: string
			version: number
			originalModelName: string
		}[]
	} = {}
	for (let i = 0; i < count || 0; i++) {
		// console.log(IDB.db?.objectStoreNames[i])
		if (IDB.db?.objectStoreNames[i]) {
			const storeName = IDB.db?.objectStoreNames[i].split('_')[0]
			if (!storeNamesObj[storeName]) {
				storeNamesObj[storeName] = [
					{
						modelName: IDB.db?.objectStoreNames[i],
						version: Number(IDB.db?.objectStoreNames[i].split('_')[1]),
						originalModelName: storeName,
					},
				]
			} else {
				storeNamesObj[storeName].push({
					modelName: IDB.db?.objectStoreNames[i],
					version: Number(IDB.db?.objectStoreNames[i].split('_')[1]),
					originalModelName: storeName,
				})
			}
		}
	}
	addModelCollection(IDB, {
		storeNamesObj: storeNamesObj,
	})
}
