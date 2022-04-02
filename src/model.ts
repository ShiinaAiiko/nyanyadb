import { ModelOptionsType, SchemaOptions } from './schema'
// import { PromiseClass } from '../common/promiseClass'
// import zango from 'zangodb'
import { Schema } from './schema'
import { IndexedDB } from './indexeddb'
import { ErrorType } from './error'
// import { IndexedDB, Schema, ErrorType } from './index'

// 如果第一层不传$and和$or那么
// 默认所有key都是全部$and
// 暂时不支持$and和$or
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

export type FindOptions = {
	$lookup?: Lookup
	$project?: Project
	$sort?: Sort
	$limit?: Limit
	$skip?: Skip
}[]
export type FindAllOptions = {
	$lookup?: Lookup
	$project?: Project
	$sort?: Sort
}[]

export type FindOneOptions = {
	$lookup?: Lookup
	$project?: Project
}[]

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
// export interface FindOptions {
// 	// 排序方式
// 	$sort?: number
// 	// 游标分页 检索多少个
// 	$limit?: number
// 	// 跳过多少个
// 	$skip?: number
// 	// $sort?: 'next' | 'nextunique' | 'prev' | 'prevunique'
// }
type MethodName =
	| 'Find'
	| 'FindOne'
	| 'Update'
	| 'Delete'
	| 'SaveAndUpdate'
	| 'Save'
	| 'FindAll'

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
	}: // methodName,
	{
		model: Model<T | undefined>
		// methodName?: MethodName
	}) {
		this.model = model
		// methodName && (this.methodName = methodName)
	}
	public Find<F = Object>(filter: Filter<F>, ...options: FindOptions) {
		// public Find<T = Object>(filter: Filter<T>, ...options: any[]) {
		this.methodName = 'Find'
		this.filter = filter
		options.forEach((item) => {
			if (item.$project) {
				this.project = item.$project
			}
			if (item.$lookup) {
				this.lookup = item.$lookup
			}
			if (item.$skip) {
				this.skip = item.$skip
			}
			if (item.$limit) {
				this.limit = item.$limit
			}
			if (item.$sort) {
				this.sort = item.$sort
			}
		})
		// console.log(options)
		return this
	}
	public FindAll(...options: FindAllOptions) {
		// public Find<T = Object>(filter: Filter<T>, ...options: any[]) {
		this.methodName = 'FindAll'
		options.forEach((item) => {
			if (item.$project) {
				this.project = item.$project
			}
			if (item.$lookup) {
				this.lookup = item.$lookup
			}
			if (item.$sort) {
				this.sort = item.$sort
			}
		})
		// console.log(options)
		return this
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
	// 仅Find、FindAll可用
	public async Result<ResultT = T>() {
		return await this.model.addHandler<ResultT[]>(async (response, reject) => {
			try {
				if (!this.model?.IDB?.db) {
					return reject({
						error: ErrorType.DATABASE_NOT_EXIST,
					})
				}
				const objectStore = this.model.IDB.GetObjectStore(
					this.model.IDB.GetRunningStoreName(this.model.modelName)
				)
				// console.log(2121212121, 'Result')
				switch (this.methodName) {
					case 'FindAll':
						if (objectStore) {
							objectStore
								.GetAll<T>()
								.then((data) => {
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
												lookupFilter[lItem.from].filter[lItem.foreignField] = {
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
								})
								.catch((err) => {
									// console.log(err)
									reject({ error: err })
								})
						} else {
							return response([])
						}
						break
					case 'Find':
						if (!objectStore) {
							return response([])
						}
						// if (filterObj?.$or) {
						// 	console.log(filterObj.$or)
						// 	// fromUid_toUid
						// 	const getIndex = objectStore.GetIndex('fromUid_toUid')
						// 	console.log(getIndex)

						// 	getIndex
						// 		.OpenCursor<T>(
						// 			IDBKeyRange.bound([2, 1], [106, 1], false, false),
						// 			this.getSortDirection(this.sort),
						// 			{
						// 				limit: this.limit,
						// 				skip: this.skip,
						// 				in: filterObj.$in || {},
						// 				range: filterObj.$range || {},
						// 				// project: this.project,
						// 			}
						// 		)
						// 		.then((data) => {
						// 			console.log('res', data)
						// 		})
						// 		.catch((err) => {
						// 			// console.log(err)
						// 			reject({ error: err })
						// 		})
						// 	return
						// }

						const checkFilterErr = this.checkFilter(this.filter || {})
						// console.log('checkFilterErr', checkFilterErr)
						if (checkFilterErr) {
							return reject({
								error: checkFilterErr,
							})
						}
						const filterObj = this.getFilter(this.filter || {})
						// console.log(
						// 	'filterObj',
						// 	this.model.modelName,
						// 	filterObj,
						// 	this.filter
						// )
						if (filterObj && filterObj?.$boundRange) {
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
					default:
						break
				}
			} catch (error) {
				reject({ error: error })
			}
		})
	}
	public async Count() {
		// console.log(this.filter,await this.Result())
		return (await this.Result()).length
	}
	public async FindOne<FindOneT = T, F = Object>(
		filter: Filter<F>,
		...options: FindOneOptions
	) {
		this.methodName = 'FindOne'
		this.filter = filter
		options.forEach((item) => {
			if (item.$project) {
				this.project = item.$project
			}
			if (item.$lookup) {
				this.lookup = item.$lookup
			}
		})

		return await this.model.addHandler<FindOneT>(async (response, reject) => {
			try {
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
				const filterObj = this.getFilter(this.filter || {})

				// console.log(2121212121, 'Result')
				switch (this.methodName) {
					case 'FindOne':
						if (objectStore && filterObj && filterObj?.$boundRange) {
							const getIndex = objectStore.GetIndex(filterObj.$indexKey)
							// console.log(getIndex)

							if (getIndex) {
								getIndex
									.OpenCursor<T>(
										filterObj?.$boundRange,
										this.getSortDirection(this.sort),
										{
											limit: 1,
											skip: 0,
											in: {},
											range: {},
											// project: this.project,
										}
									)
									.then((data) => {
										// console.log(this.lookup)
										if (!this.lookup.length) {
											response(
												DocumentMethods.formatProject<T>(data, this.project)[0]
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
												DocumentMethods.formatProject<T>(data, this.project)[0]
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
												DocumentMethods.formatProject<T>(data, this.project)[0]
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
													DocumentMethods.formatProject<T>(
														data,
														this.project
													)[0]
												)
												// DocumentMethods.formatProject(value, project)
												// value = value.filter
											})
											.catch((err) => {
												reject({ error: err })
											})
									})
									.catch((err) => {
										// console.log(err)
										reject({ error: err })
									})
							} else {
								return response(null)
							}
						} else {
							return response(null)
						}
						break
					default:
						break
				}
			} catch (error) {
				reject({ error: error })
			}
		})
	}
	public async Update<F>(filter: Filter<F>, update: Update) {
		this.methodName = 'Update'

		return await this.model.addHandler<{
			About?: () => void
			nMatched: number
			nModified: number
			errors?: string[]
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
									// console.log(subKey, update.hasOwnProperty(subKey))
									if (update.hasOwnProperty(subKey)) {
										if (typeof update[subKey] === 'object') {
											item[subKey] = JSON.parse(JSON.stringify(update[subKey]))
                    } else {
                      item[subKey] =update[subKey]
                    }
									}
								})
								// console.log(item, update)
								// console.log(
								// 	'update',
								// 	item[this.model.schema.GetPrimaryKey()],
								// 	item
								// )
								updatePromiseAll.push(
									objectStore.Update(
										item[this.model.schema.GetPrimaryKey()],
										item
									)
								)
							})
							Promise.allSettled(updatePromiseAll)
								.then((value) => {
									// console.log('getList', getList)
									// console.log('value', value)
									// objectStore.Transaction.abort()
									response({
										About: () => {
											objectStore.Transaction.abort()
										},
										nMatched: getList.length,
										nModified: value.filter((item) => {
											return item.status === 'fulfilled'
										}).length,
										errors: value
											.map((item) => {
												return item.status === 'rejected' ? item.reason : ''
											})
											.filter((item) => {
												return item
											}),
									})
								})
								.catch(() => {
									response({
										About: () => {
											objectStore.Transaction.abort()
										},
										nMatched: getList.length,
										nModified: 0,
										errors: [],
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
				// console.log(filter, update)
			} catch (error) {
				reject({ error: error })
			}
		})
	}
	public async Delete<F>(filter: Filter<F>) {
		this.methodName = 'Delete'

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
								// console.log(item)
								updatePromiseAll.push(
									objectStore.Delete(item[this.model.schema.GetPrimaryKey()])
								)
							})
							Promise.allSettled(updatePromiseAll)
								.then((value) => {
									// console.log(value)
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
	public async Save<T>(doc: T) {
		this.methodName = 'Save'
		return await this.model.addHandler<T>(async (response, reject) => {
			try {
				if (!this.model?.IDB?.db) {
					return reject({
						error: ErrorType.DATABASE_NOT_EXIST,
					})
				}
				const verifyErr = this.model.schema.Verify(doc)

				if (verifyErr) {
					// console.error(verifyErr)
					reject({
						error: verifyErr,
					})
				} else {
					const objectStore = this.model.IDB.GetObjectStore(
						this.model.IDB.GetRunningStoreName(this.model.modelName)
					)
					// console.log(objectStore)
					if (objectStore) {
						objectStore
							.Add<T>(doc)
							.then((addRes) => {
								response(addRes)
							})
							.catch((err) => {
								// console.log(err)
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
	public async SaveAndUpdate<T>(doc: T, keys: string[]) {
		this.methodName = 'SaveAndUpdate'

		return await this.model.addHandler<T>(async (response, reject) => {
			try {
				if (!this.model?.IDB?.db) {
					return reject({
						error: ErrorType.DATABASE_NOT_EXIST,
					})
				}
				const verifyErr = this.model.schema.Verify(doc)

				if (verifyErr) {
					// console.error(verifyErr)
					reject({
						error: verifyErr,
					})
				} else {
					if (!keys.length) {
						reject({ error: ErrorType.INDEX_KEY_NOT_SPECIFIED })
					}
					const objectStore = this.model.IDB.GetObjectStore(
						this.model.IDB.GetRunningStoreName(this.model.modelName)
					)
					// console.log('objectStore', objectStore)
					if (objectStore) {
						const filter = {}
						keys.forEach((key) => {
							filter[key] = {
								$value: doc[key],
							}
						})
						// 更新
						const up = await this.Update(filter, doc)
						if (up.nMatched === 0 && up.nModified === 0) {
							// 保存
							const objectStore = this.model.IDB.GetObjectStore(
								this.model.IDB.GetRunningStoreName(this.model.modelName)
							)
							const save = await objectStore?.Add<T>(doc)
							if (save) {
								response(save)
							}
						} else {
							response(doc)
						}
					} else {
						reject({ error: ErrorType.OBJECT_STORE_NOT_EXIST })
					}
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
	// 暂时不支持$and和$or
	private checkFilter(filter: Filter<Object>) {
		let err = ''
		// console.log('filter', filter, filter.constructor.name)
		if (filter.constructor.name === 'Array') {
			const filterArr: any = filter
			filterArr.forEach((item: any) => {
				err += this.checkFilter(item)
			})
		} else {
			Object.keys(filter).some((key) => {
				// console.log(filter[key], key)
				// if (key === '$and') {
				// 	err += this.checkFilter(filter[key])
				// 	return true
				// }
				// if (key === '$or') {
				// 	err += this.checkFilter(filter[key])
				// 	return true
				// }
				if (!this?.model?.schema.rules[key]?.createIndex) {
					err += '“' + key + '”' + ' is not index;'
					return true
				}
				if (!this?.model?.schema.rules[key]) {
					err += '“' + key + '”' + ' does not exist;'
					return true
				}
			})
		}
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
		let $or: {
			[k: string]: any
		}[] = []
		let $and: {
			[k: string]: any
		}[] = []
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
		const parseFilter = (tempFilter: any) => {
			if (tempFilter.constructor.name === 'Array') {
				const filterArr: any = filter
				filterArr.forEach((item: any) => {
					parseFilter(item)
				})
			} else {
				Object.keys(tempFilter).forEach((key, index) => {
					// console.log(key, tempFilter[key])
					if (key === '$or') {
						$or = tempFilter[key]
					}
					if (key === '$and') {
						$and = tempFilter[key]
					}
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
			}
		}
		parseFilter(filter)
		// if ($or.length || $and.length) {
		// 	return {
		// 		$indexKey: $indexKey,
		// 		$boundRange: $boundRange,
		// 		$values: $indexKeyValues,
		// 		$range,
		// 		$in: $in,
		// 		$or,
		// 		$and,
		// 	}
		// }
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
				$or,
				$and,
			}
		}
		const $rangeKeys = Object.keys($range || {})
		// console.log($rangeKeys.length)
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
				$or,
				$and,
			}
		}
		// console.log(Object.keys($in).length)
		if (Object.keys($in).length) {
			$indexKey = Object.keys($in)[0]
			// 暂时空缺
		}
		return {
			$indexKey: $indexKey,
			$boundRange: $boundRange,
			$values: $indexKeyValues,
			$range,
			$in: $in,
			$or,
			$and,
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
			DocumentModel: class DocumentModel<T = SchemaType> {
				doc: SchemaType
				constructor(doc: SchemaType) {
					this.doc = doc
					// super(doc)
					// extends PromiseClass<T>
				}

				static Create() {
					return DocumentModel
				}
				static Update<F = Object>(filter: Filter<F>, update: Update) {
					return new DocumentMethods<SchemaType>({
						model,
					}).Update<F>(filter, update)
				}

				static Find<F = Object>(filter: Filter<F>, ...options: FindOptions) {
					return new DocumentMethods<SchemaType>({
						model,
					}).Find<F>(filter, ...options)
				}

				static FindAll(...options: FindAllOptions) {
					return new DocumentMethods<SchemaType>({
						model,
					}).FindAll(...options)
				}

				static FindOne<T = SchemaType, F = Object>(
					filter: Filter<F>,
					...options: FindOneOptions
				) {
					return new DocumentMethods<SchemaType>({
						model,
					}).FindOne<T, F>(filter, ...options)
				}
				static Delete<F = Object>(filter: Filter<F>) {
					return new DocumentMethods<SchemaType>({
						model,
					}).Delete<F>(filter)
				}
				// keys为指定的key，且必须添加索引
				// 无数据保存，有数据更新
				public async SaveAndUpdate(keys: string[]) {
					return new DocumentMethods<SchemaType>({
						model,
					}).SaveAndUpdate<SchemaType>(this.doc, keys)
				}

				public async Save() {
					return new DocumentMethods<SchemaType>({
						model,
					}).Save<SchemaType>(this.doc)
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

	// public async FindOne(filter: Filter<T>, options?: FindOptions) {
	// 	return await this.addHandler<T | string>(async (response, reject) => {
	// 		if (!this?.IDB?.db) {
	// 			return reject(ErrorType.DATABASE_NOT_EXIST)
	// 		}
	// 		console.log(filter, options)
	// 		const objectStore = this.IDB.GetObjectStore(
	// 			this.IDB.GetRunningStoreName(this.modelName)
	// 		)
	// 		if (objectStore) {
	// 			console.log(objectStore)
	// 		}
	// 		// const verifyErr = this.schema.Verify(data)

	// 		// if (this.schema.Verify(data)) {
	// 		// 	console.error(verifyErr)
	// 		// 	response(verifyErr)
	// 		// } else {
	// 		// 	const objectStore = this.IDB.GetObjectStore(
	// 		// 		this.IDB.GetRunningStoreName(this.modelName)
	// 		// 	)
	// 		// 	if (objectStore) {
	// 		// 		objectStore
	// 		// 			.Add<T>(data)
	// 		// 			.then((addRes) => {
	// 		// 				response(addRes)
	// 		// 			})
	// 		// 			.catch((err) => {
	// 		// 				reject(err)
	// 		// 			})
	// 		// 	} else {
	// 		// 		reject(ErrorType.OBJECT_STORE)
	// 		// 	}
	// 		// }
	// 	})
	// }
	// public async FindAll(options?: FindOptions) {
	// 	console.log(options)
	// }
	// public async Update(filter: Filter<T>, update?: Update) {
	// 	console.log(filter, update)
	// }
	// public async Delete(filter: Filter<T>) {
	// 	console.log(filter)
	// }
	// public async DeleteAll() {
	// 	console.log('deleteAll')
	// }
	// public async Size(filter: Filter<T>) {
	// 	console.log(filter)
	// }
	// public async Aggregate(filter: Filter<T>) {
	// 	console.log(filter)
	// }
}
