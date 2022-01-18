import { ModelOptionsType, SchemaOptions } from './schema'
// import { PromiseClass } from '../common/promiseClass'
// import zango from 'zangodb'
import { Schema } from './schema'
import { IndexedDB } from './indexeddb'
import { ErrorType } from './error'
// import { IndexedDB, Schema, ErrorType } from './index'

// 如果第一层不传$and和$or那么
// 默认所有key都是全部$and
export type FilterKeys<T = {}> = {
	[K in keyof T]?: {
		// 值查询
		$value?: T[K]
		// 下面这2个不能同时出现
		// 范围检索。
		$range?: [T[K], T[K]]
		// 多个值查询
		$in?: T[K][]
		// 考虑是否添加$or还是&and

		// 数字专用
		// $gte
		// $gt
		// $lt
		// $lte
		// $eq
	}
	// $and?: Filter<T>
	// [k: string]:
}
export type FilterQuery = {
	// 值查询
	$value?: any
	// 下面这2个不能同时出现
	// 范围检索。
	$range?: [any, any]
	// 多个值查询
	$in?: any[]
	// 考虑是否添加$or还是&and

	// 数字专用
	// $gte
	// $gt
	// $lt
	// $lte
	// $eq
}
// 使用函数的方式解决类型问题
// const $And = (key,filter) => {
// }
export type Filter<T = Object> = T

// export type Filter<T = Object> = {
// 	$and: FilterKeys<T>
// 	$or: FilterKeys<T>
// }
export type Project = {
	[k: string]: boolean | number | Project
}
export type Sort = number | boolean
export type Limit = number
export type Skip = number
export type Update = {
	[k: string]: any
}
export type Lookup = {
	from: string
	localField: string
	foreignField: string
	as: string
}[]
export interface FindOptions {
	// 排序方式
	$sort?: number
	// 游标分页 检索多少个
	$limit?: number
	// 跳过多少个
	$skip?: number
	// $sort?: 'next' | 'nextunique' | 'prev' | 'prevunique'
}
type MethodName = 'Find' | 'Update' | 'Delete'

export class DocumentMethods<T = any> {
	private filter?: Filter<Object> = {}
	private sort?: Sort
	private model: Model<T | undefined>
	private limit: Limit = -1
	private skip: Skip = -1
	private lookup: Lookup = []
	private project: Project = {}
	private methodName: MethodName = 'Find'
	constructor({
		model,
		methodName,
	}: {
		model: Model<T | undefined>
		methodName: MethodName
	}) {
		this.model = model
		this.methodName = methodName
	}
	public Save() {}
	public Find<T = Object>(filter: Filter<T>) {
		this.filter = filter
		return this
	}
	public async Update<T>(filter: Filter<T>, update: Update) {
		return await this.model.addHandler<{
			About?: () => void
			nMatched: number
			nModified: number
		}>(async (response, reject) => {
			try {
				const updateKeys = Object.keys(update)
				// 1、检测Key是否存在
				if (
					!updateKeys.length &&
					!this.model.schema.VerifyMultipleField(update)
				) {
					return reject({
						error: ErrorType.UPDATE_PARAMETER_NOT_EXIST,
					})
				}
				// 3、查找数据
				this.Find(filter)
					.Result()
					.then((getList) => {
						if (!getList.length) {
							response({
								nMatched: getList.length,
								nModified: 0,
							})
							return
						}

						const objectStore = this.model.IDB?.GetObjectStore(
							this.model.IDB.GetRunningStoreName(this.model.modelName)
						)
						if (objectStore) {
							const updatePromiseAll: Promise<T>[] = []
							getList.forEach((item: any) => {
								// console.log(item)
								// 4、更新数据
								updateKeys.forEach((subKey) => {
									if (item[subKey]) {
										item[subKey] = update[subKey]
									}
								})
								updatePromiseAll.push(
									objectStore.Update(
										item[this.model.schema.GetPrimaryKey()],
										item
									)
								)
							})
							Promise.allSettled(updatePromiseAll)
								.then((value) => {
									console.log(value)
									// objectStore.Transaction.abort()
									response({
										About: () => {
											objectStore.Transaction.abort()
										},
										nMatched: getList.length,
										nModified: value.filter((item) => {
											return item.status === 'fulfilled'
										}).length,
									})
								})
								.catch(() => {
									response({
										About: () => {
											objectStore.Transaction.abort()
										},
										nMatched: getList.length,
										nModified: 0,
									})
								})
						} else {
							reject({ error: ErrorType.OBJECT_STORE_NOT_EXIST })
						}
					})
					.catch((err) => {
						console.log(err)
						response({
							nMatched: 0,
							nModified: 0,
						})
					})
				console.log(filter, update)
			} catch (error) {
				reject({ error: error })
			}
		})
	}
	public async Delete<T>(filter: Filter<T>) {
		return await this.model.addHandler<{
			About?: () => void
			nMatched: number
			nDeleted: number
		}>(async (response, reject) => {
			try {
				// console.log('Delete', filter)
				// // 1、查找数据

				// 3、查找数据
				this.Find(filter)
					.Result()
					.then((getList) => {
						if (!getList.length) {
							response({
								nMatched: getList.length,
								nDeleted: 0,
							})
							return
						}
						const objectStore = this.model.IDB?.GetObjectStore(
							this.model.IDB?.GetRunningStoreName(this.model.modelName)
						)
						if (objectStore) {
							const updatePromiseAll: Promise<'success'>[] = []
							getList.forEach((item: any) => {
								console.log(item)
								updatePromiseAll.push(
									objectStore.Delete(item[this.model.schema.GetPrimaryKey()])
								)
							})
							Promise.allSettled(updatePromiseAll)
								.then((value) => {
									console.log(value)
									// objectStore.Transaction.abort()
									response({
										About: () => {
											objectStore.Transaction.abort()
										},
										nMatched: getList.length,
										nDeleted: value.filter((item) => {
											return item.status === 'fulfilled'
										}).length,
									})
								})
								.catch(() => {
									response({
										About: () => {
											objectStore.Transaction.abort()
										},
										nMatched: getList.length,
										nDeleted: 0,
									})
								})
						} else {
							reject({ error: ErrorType.OBJECT_STORE_NOT_EXIST })
						}
					})
					.catch((err) => {
						console.log(err)
						response({
							nMatched: 0,
							nDeleted: 0,
						})
					})
			} catch (error) {
				reject({ error: error })
			}
		})
	}
	public Lookup(lookup: Lookup) {
		this.lookup = this.lookup.concat(lookup)
		return this
	}
	public Sort(sort: Sort) {
		this.sort = sort
		return this
	}

	public Limit(limit: Limit) {
		this.limit = limit
		return this
	}
	public Skip(skip: Skip) {
		this.skip = skip
		return this
	}
	public Project(project: Project) {
		this.project = project
		return this
	}
	public async Result() {
		return await this.model.addHandler<T[]>(async (response, reject) => {
			try {
				// console.log(2121212121, 'Result')
				switch (this.methodName) {
					default:
						if (!this.model?.IDB?.db) {
							return reject({
								error: ErrorType.DATABASE_NOT_EXIST,
							})
						}
						const checkFilterErr = this.checkFilter(this.filter || {})
						if (checkFilterErr) {
							return reject({
								error: ErrorType.FILTER_INDEX_KEY_NOT_EXIST,
							})
						}
						const objectStore = this.model.IDB.GetObjectStore(
							this.model.IDB.GetRunningStoreName(this.model.modelName)
						)
						// console.log(objectStore)
						// console.log(this.filter || {})
						const filterObj = this.getFilter(this.filter || {})
						// console.log('filterObj', filterObj)
						if (objectStore && filterObj && filterObj?.$boundRange) {
							const getIndex = objectStore.GetIndex(filterObj.$indexKey)
							// console.log(getIndex)

							if (getIndex) {
								getIndex
									.OpenCursor<T>(
										filterObj?.$boundRange,
										this.getSortDirection(this.sort),
										{
											limit: this.limit,
											skip: this.skip,
											in: filterObj.$in || {},
											range: filterObj.$range || {},
											// project: this.project,
										}
									)
									.then((data) => {
										// console.log('res', data)
										// console.log(this.lookup)
										if (!this.lookup.length) {
											response(
												DocumentMethods.formatProject<T>(data, this.project)
											)
											return
										}
										let lookupFilter: {
											[from: string]: {
												filter: {
													[key: string]: {
														$value: any
													}
												}
												as: string
											}
										} = {}

										data.forEach((item: any) => {
											this.lookup.forEach((lItem) => {
												if (item[lItem.localField]) {
													if (!lookupFilter[lItem.from]) {
														lookupFilter[lItem.from] = {
															as: lItem.as,
															filter: {},
														}
													}
													lookupFilter[lItem.from].filter[lItem.foreignField] =
														{
															$value: item[lItem.localField],
														}
												}
												// lookupPromiseAll.push()
											})
										})
										// console.log(lookupFilter)
										if (!Object.keys(lookupFilter).length) {
											response(
												DocumentMethods.formatProject<T>(data, this.project)
											)
											return
										}
										const lookupPromiseAll: Promise<any>[] = []
										Object.keys(lookupFilter).forEach((modelName) => {
											// console.log(lookupFilter[modelName])
											if (
												lookupFilter[modelName] &&
												Object.keys(lookupFilter[modelName].filter).length
											) {
												// console.log(
												// 	ModelStore.models[modelName],
												// 	modelName,
												// 	lookupFilter[modelName]
												// )
												lookupPromiseAll.push(
													new Promise((res, rej) => {
														new DocumentMethods({
															model: ModelStore.models[modelName],
															methodName: 'Find',
														})
															.Find(lookupFilter[modelName].filter)
															.Result()
															.then((value) => {
																const obj: any = {}
																obj[lookupFilter[modelName].as] = value

																res(obj)
															})
															.catch((err) => {
																rej(err)
															})
													})
												)
											}
										})
										if (!lookupPromiseAll.length) {
											response(
												DocumentMethods.formatProject<T>(data, this.project)
											)
											return
										}

										// 未来考虑连表多个的情况
										Promise.all(lookupPromiseAll)
											.then((value) => {
												// console.log(value)
												data.forEach((item: any) => {
													value.forEach((vItem) => {
														if (vItem) {
															Object.keys(vItem).forEach((vItemKey) => {
																item[vItemKey] = vItem[vItemKey]
															})
														}
													})
												})
												// console.log(data)

												response(
													DocumentMethods.formatProject<T>(data, this.project)
												)
												// DocumentMethods.formatProject(value, project)
												// value = value.filter
											})
											.catch((err) => {
												reject({ error: err })
											})
										// console.log(this.model)
										// console.log(this.lookup)
										// console.log(ModelStore.models)

										// new DocumentMethods({
										// 	ModelStore.models[],
										// 	methodName: 'Find',
										// })
										// 	.Find(lookupFilter)
										// 	.Result()
										// 	.then((value) => {
										// 		console.log(value)
										// 		// this.lookup.forEach((item) => {
										// 		// 	lookupPromiseAll.push(this.Find({}).Result())
										// 		// })
										// 		console.log(this.project)
										// 		response(data)
										// 	})
										// 	.catch((reason) => {
										// 		reject(reason)
										// 	})
									})
									.catch((err) => {
										// console.log(err)
										reject({ error: err })
									})
							} else {
								return response([])
							}
						} else {
							return response([])
						}
						break
				}
			} catch (error) {
				reject({ error: error })
			}
		})
	}

	/**
   * 
   * 
   next 从数据源开始位置遍历
   nextunique	从数据源开始遍历；当取值有重复时，只获取一次。
   prev 从数据源的最后位置位置开取值
   prevunique	从数据源的最后位置开始取值，只获取一次。
   * @param sort 
   * @returns 
   */
	private getSortDirection(sort?: Sort): IDBCursorDirection {
		if (sort === undefined) {
			return 'next'
		}
		if (sort > 0) {
			return 'next'
		} else {
			return 'prev'
		}
	}
	private checkFilter(filter: Filter<Object>) {
		let err = ''
		Object.keys(filter).some((key) => {
			if (!this?.model?.schema.rules[key]) {
				err = '“' + key + '”' + ' does not exist;'
				return true
			}
			if (!this?.model?.schema.rules[key].createIndex) {
				err = '“' + key + '”' + ' is not index;'
				return true
			}
		})
		// console.log(filterValues)
		return err
	}

	private getFilter(filter: Filter<Object>) {
		const $indexKeys: string[] = []
		const $indexKeyValues: any[] = []
		const $in: {
			[k: string]: any[]
		} = {}
		let $indexKey = ''
		let $boundRange: any = null
		const $range: {
			[k: string]: any[]
		} = {}
		if (!this?.model.IDB?.db) {
			return {
				$indexKey: $indexKey,
				$boundRange,
				$value: [],
				$range,
				$in: $in,
			}
		}
		const tempFilter: Filter<any> = filter

		Object.keys(tempFilter).forEach((key, index) => {
			if (tempFilter[key]?.$value) {
				$indexKeys.push(key)
				$indexKeyValues.push(tempFilter[key]?.$value)
			}
			if (tempFilter[key]?.$in && tempFilter[key]?.$in?.length) {
				$in[key] = tempFilter[key]?.$in || []
			}
			if (tempFilter[key]?.$range && tempFilter[key]?.$range?.length) {
				$range[key] = tempFilter[key]?.$range || []
			}
		})
		// console.log('filter', filter)
		const getIndexKey = this.model.IDB.GetIndexKey($indexKeys)

		getIndexKey.keys.forEach((key, index) => {
			// console.log(key, index, tezmpFilter[key]?.$value)
			if (tempFilter[key]?.$value) {
				$indexKeyValues[index] = tempFilter[key]?.$value
			}
		})
		// console.log(filterValues)

		// 在这里判断，如果没有value，就走range，
		// 还没有就走in，还没有就走ID

		if ($indexKeyValues.length) {
			$indexKey = getIndexKey.indexKey
			$boundRange = IDBKeyRange.only($indexKeyValues)
			return {
				$indexKey: $indexKey,
				$boundRange: $boundRange,
				$values: $indexKeyValues,
				$range,
				$in: $in,
			}
		}
		const $rangeKeys = Object.keys($range || {})
		if ($rangeKeys.length) {
			$indexKey = $rangeKeys[0]
			$boundRange = IDBKeyRange.bound(
				[$range[$rangeKeys[0]][0]],
				[$range[$rangeKeys[0]][1]],
				false,
				false
			)
			delete $range[$rangeKeys[0]]
			return {
				$indexKey: $indexKey,
				$boundRange: $boundRange,
				$values: $indexKeyValues,
				$range,
				$in: $in,
			}
		}
		if (Object.keys($in).length) {
			$indexKey = Object.keys($in)[0]
			// 暂时空缺
		}
	}

	static formatProject<T = any>(data: T[], project: Project) {
		const projectKeys = Object.keys(project)
		if (!projectKeys.length) {
			return data
		}
		const formatItem = (item: any, project: any) => {
			const newItem: any = {}
			Object.keys(project).forEach((key) => {
				switch (item[key]?.constructor) {
					case Object:
						newItem[key] = formatItem(item[key], project[key])
						break

					default:
						switch (project[key]?.constructor) {
							case Boolean:
								if (project[key] && item[key]) {
									newItem[key] = item[key]
								}
								break
							case Number:
								if (project[key] > 0 && item[key]) {
									newItem[key] = item[key]
								}
								break
							case Object:
								if (item[key]?.constructor === Array) {
									newItem[key] = item[key].map((subItem: any) => {
										return formatItem(subItem, project[key])
									})
								}
								break
							default:
								break
						}
						break
				}
			})
			return newItem
		}
		return data.map((item: any) => {
			return formatItem(item, project)
		})
	}
}

class ModelStore {
	static models: {
		[key: string]: Model
	} = {}
}

export class Model<T = any> {
	public schema: Schema
	public modelName: string
	public IDB?: IndexedDB
	private handlers: {
		handler: () => void
		isRun: boolean
	}[] = []
	constructor(options: { schema: Schema; modelName: string }) {
		this.schema = options.schema
		this.modelName = options.modelName
	}

	static CreateModel<T>(schema: Schema<T>, modelName: string) {
		const model = new Model<typeof schema.types>({
			schema,
			modelName,
		})
		// console.log(model)
		ModelStore.models[modelName] = model
		type SchemaType = typeof schema.types | undefined | null

		return {
			model,
			DocumentModel: class DocumentModel<
				T = typeof schema.types | undefined | null
			> {
				doc: T
				constructor(doc: T) {
					this.doc = doc
					// super(doc)
					// extends PromiseClass<T>
				}

				static Create() {
					return DocumentModel
				}
				static Update<T = Object>(filter: Filter<T>, update: Update) {
					return new DocumentMethods<SchemaType>({
						model,
						methodName: 'Update',
					}).Update<T>(filter, update)
				}

				static Find<T = Object>(filter: Filter<T>) {
					return new DocumentMethods<SchemaType>({
						model,
						methodName: 'Find',
					}).Find<T>(filter)
				}

				static Delete<T = Object>(filter: Filter<T>) {
					return new DocumentMethods<SchemaType>({
						model,
						methodName: 'Delete',
					}).Delete<T>(filter)
				}

				public async Save() {
					return await model.addHandler<T>(async (response, reject) => {
						try {
							if (!model?.IDB?.db) {
								return reject({
									error: ErrorType.DATABASE_NOT_EXIST,
								})
							}
							const verifyErr = model.schema.Verify(this.doc)

							if (model.schema.Verify(this.doc)) {
								console.error(verifyErr)
								reject({
									error: verifyErr,
								})
							} else {
								const objectStore = model.IDB.GetObjectStore(
									model.IDB.GetRunningStoreName(model.modelName)
								)
								// console.log(objectStore)
								if (objectStore) {
									objectStore
										.Add<T>(this.doc)
										.then((addRes) => {
											response(addRes)
										})
										.catch((err) => {
											reject(err)
										})
								} else {
									reject({ error: ErrorType.OBJECT_STORE_NOT_EXIST })
								}
							}
						} catch (error) {
							reject({ error: error })
						}
					})
				}
				// public Save(): DocumentModel<T> {
				// 	try {
				// 		console.log(this.value)
				// 		console.log('开始保存')
				// 		// const modelPromise = new DocumentModel<T>(this.doc)

				// 		// return modelPromise
				// 		this.response = this.value
				// 		throw '1111'
				// 		// this.response
				// 		return this
				// 	} catch (error) {
				// 		this.reject(error)
				// 		return this
				// 	}
				// }
			},
		}
	}
	public ChangeHandler() {
		const _this = this
		return (IndexedDB?: IndexedDB) => {
			_this.IDB = IndexedDB
			if (this.handlers.length) {
				this.handlers.forEach((handlerItem) => {
					// console.log(4444444, !handlerItem.isRun)
					if (!handlerItem.isRun) {
						handlerItem.isRun = true
						handlerItem.handler()
					}
				})
			}
			// console.log(_this.IDB, _this.schema, _this.modelName)
			// console.log('获取db', _this, IndexedDB)
		}
	}
	public addHandler<T>(
		func: (
			response: (value: T) => void,
			reject: (value: unknown) => void
		) => void
	): Promise<T> {
		return new Promise((res, rej) => {
			try {
				if (!this.schema.GetPrimaryKey()) {
					return rej(
						'[' + this.modelName + '] ' + ErrorType.PRIMARY_KEY_VALUE_NOT_EXIST
					)
				}
				if (!this?.IDB?.db) {
					// console.log('add')
					this.handlers.push({
						handler: () => {
							// console.log(222222)
							func(res, rej)
						},
						isRun: false,
					})
					return
				} else {
					// console.log(33333333)
					func(res, rej)
				}
			} catch (error) {
				console.log(error)
				rej(error)
			}
		})
	}

	// public Find(): ModelPromise<any> {
	// 	const modelPromise = new ModelPromise(1)

	// 	return modelPromise
	// }

	// public async Find(filter: Filter<T>, options?: FindOptions) {
	// 	return await this.addHandler<T[]>(async (response, reject) => {
	// 		try {
	// 			if (!this?.IDB?.db) {
	// 				return reject({
	// 					error: ErrorType.DATABASE_NOT_EXIST,
	// 				})
	// 			}
	// 			const checkFilterErr = this.checkFilter(filter)
	// 			if (checkFilterErr) {
	// 				return reject({
	// 					error: ErrorType.FILTER_INDEX_KEY_NOT_EXIST,
	// 				})
	// 			}
	// 			// console.log(filter, options)
	// 			const objectStore = this.IDB.GetObjectStore(
	// 				this.IDB.GetRunningStoreName(this.modelName)
	// 			)
	// 			if (objectStore) {
	// 				// console.log(objectStore)

	// 				const filterObj = this.getFilter(filter)
	// 				// console.log(filterObj)
	// 				if (filterObj) {
	// 					let indexKey = filterObj.indexKey || ''
	// 					const filterRange = filterObj.range
	// 					const rangeKeys = Object.keys(filterRange) || []
	// 					let boundRange: any = []
	// 					if (!indexKey) {
	// 						if (rangeKeys.length) {
	// 							indexKey = rangeKeys[0]
	// 							boundRange = filterRange[rangeKeys[0]]
	// 							delete filterRange[rangeKeys[0]]
	// 						}
	// 					}
	// 					console.log(indexKey, filterRange, rangeKeys)
	// 					const getIndex = objectStore.GetIndex(indexKey)
	// 					console.log(getIndex)
	// 					if (getIndex) {
	// 						console.log(filterObj)
	// 						// 如果是in的话，则使用range的时候进行筛选
	// 						// 如果是range的话，则使用range
	// 						// 如果有indexkey，则使用only，range和in采用业务筛选
	// 						let idbKeyRange: IDBKeyRange | null = null
	// 						// 当有indexKey的时候
	// 						if (filterObj.indexKeyValues?.length) {
	// 							idbKeyRange = IDBKeyRange.only(filterObj.indexKeyValues)
	// 						}
	// 						if (!idbKeyRange && boundRange.length) {
	// 							// 只有range的时候
	// 							idbKeyRange = IDBKeyRange.bound(
	// 								[boundRange[0]],
	// 								[boundRange[1]],
	// 								false,
	// 								false
	// 							)
	// 							// IDBKeyRange.bound("Bill", "Donna", false, true);
	// 						}
	// 						console.log(idbKeyRange)
	// 						if (!idbKeyRange) {
	// 							return response([])
	// 						}
	// 						getIndex
	// 							.OpenCursor<T>(
	// 								idbKeyRange,
	// 								this.getSortDirection(options?.$sort),
	// 								{
	// 									limit: options?.$limit || 0,
	// 									skip: options?.$skip || 0,
	// 									in: filterObj.in || {},
	// 									range: filterObj.indexKeyValues?.length
	// 										? {}
	// 										: filterRange || {},
	// 								}
	// 							)
	// 							.then((data) => {
	// 								response(data)
	// 							})
	// 							.catch((err) => {
	// 								reject(err)
	// 							})
	// 					} else {
	// 						return reject({
	// 							error: ErrorType.INDEX_KEY_NOT_EXIST,
	// 						})
	// 					}
	// 				} else {
	// 					return reject({
	// 						error: ErrorType.FILTER_INDEX_KEY_NOT_EXIST,
	// 					})
	// 				}
	// 			} else {
	// 				return reject({
	// 					error: ErrorType.OBJECT_STORE,
	// 				})
	// 			}
	// 		} catch (error) {
	// 			return reject({
	// 				error: error,
	// 			})
	// 		}
	// 	})
	// }

	public async FindOne(filter: Filter<T>, options?: FindOptions) {
		return await this.addHandler<T | string>(async (response, reject) => {
			if (!this?.IDB?.db) {
				return reject(ErrorType.DATABASE_NOT_EXIST)
			}
			console.log(filter, options)
			const objectStore = this.IDB.GetObjectStore(
				this.IDB.GetRunningStoreName(this.modelName)
			)
			if (objectStore) {
				console.log(objectStore)
			}
			// const verifyErr = this.schema.Verify(data)

			// if (this.schema.Verify(data)) {
			// 	console.error(verifyErr)
			// 	response(verifyErr)
			// } else {
			// 	const objectStore = this.IDB.GetObjectStore(
			// 		this.IDB.GetRunningStoreName(this.modelName)
			// 	)
			// 	if (objectStore) {
			// 		objectStore
			// 			.Add<T>(data)
			// 			.then((addRes) => {
			// 				response(addRes)
			// 			})
			// 			.catch((err) => {
			// 				reject(err)
			// 			})
			// 	} else {
			// 		reject(ErrorType.OBJECT_STORE)
			// 	}
			// }
		})
	}
	public async FindAll(options?: FindOptions) {
		console.log(options)
	}
	public async Update(filter: Filter<T>, update?: Update) {
		console.log(filter, update)
	}
	public async Delete(filter: Filter<T>) {
		console.log(filter)
	}
	public async DeleteAll() {
		console.log('deleteAll')
	}
	public async Size(filter: Filter<T>) {
		console.log(filter)
	}
	public async Aggregate(filter: Filter<T>) {
		console.log(filter)
	}
}
