import { Schema, ModelOptionsType } from './schema'
import { Model, DocumentMethods, Project } from './model'
import { ErrorType } from './error'
import { CollectionsItem } from './collections'
// import { IndexedDBEventTarget, IDBHandlerType } from './eventTarget'

// export interface IDBEvent extends Event {
// 	srcElement: IDBOpenDBRequest
// 	target: IDBOpenDBRequest
// 	indexedDB: IndexedDB
// }
export type HandlerFuncType = (IDB: IndexedDB, options?: any) => void

export class IndexedDB {
  static Schema = Schema
  static Model = Model
  databaseName: string = ''
  version: number = 1
  openDBRequest?: IDBOpenDBRequest
  db?: IDBDatabase
  schemas: {
    [k: string]: Schema
  } = {}
  public CollectionDB?: IndexedDB
  historicalCollections: CollectionsItem[] = []

  modelInitHandlers: ((IndexedDB: IndexedDB) => void)[] = []
  private onUpgradeNeeded?: HandlerFuncType
  private onSuccess?: HandlerFuncType
  private onError?: HandlerFuncType
  private onVersionChange?: HandlerFuncType
  constructor(options: {
    databaseName: string
    version?: number
    onUpgradeNeeded?: HandlerFuncType
    onError?: HandlerFuncType
    onSuccess?: HandlerFuncType
    onVersionChange?: HandlerFuncType
    RUN?: (
      run: ({ }: {
        historicalCollections: CollectionsItem[]
        isRun: boolean
        CollectionDB?: IndexedDB
      }) => void
    ) => void
  }) {
    options.onUpgradeNeeded && (this.onUpgradeNeeded = options.onUpgradeNeeded)
    options.onError && (this.onError = options.onError)
    options.onVersionChange && (this.onVersionChange = options.onVersionChange)
    options.onSuccess && (this.onSuccess = options.onSuccess)
    this.databaseName = options.databaseName
    this.version = options?.version || 1

    if (typeof window === "undefined" || !window.indexedDB) {
      console.error(
        "Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available."
      )
      // IndexedDB.event.dispatchEvent(new Event('error'))
    } else {
      // console.log('options?.RUN', !!options?.RUN, this.databaseName)
      if (options?.RUN) {
        // console.log('isRun', this.models, options.databaseName)
        // const _this = this
        options?.RUN(({ isRun, CollectionDB, historicalCollections }) => {
          // console.log('isRun', isRun, this.models, options.databaseName)
          if (isRun) {
            this.CollectionDB = CollectionDB
            this.historicalCollections = historicalCollections
            this.CreateDB()
          }
        })
      } else {
        this.CreateDB()
      }
    }
  }
  public runModelInitHandlers() {
    this.modelInitHandlers.forEach((item) => {
      item(this)
    })
  }
  // 运行一个干净的IDB获取下历史记录
  // 未来这个通过自举实现，且存储在其他完全不同的库里
  // 暂定名：this.databaseName+'Collection'

  private CreateDB() {
    try {
      // console.log(this.databaseName, 'CreateDB')

      this.openDBRequest = window.indexedDB.open(
        this.databaseName,
        this.version
      )
      // console.log('openDBRequest', this.openDBRequest)
      this.openDBRequest.onerror = (event: any) => {
        console.error(this.openDBRequest?.error)
        this.onError && this.onError(this)
        // this.dispatchEvent('error')
        // 错误处理
      }
      this.openDBRequest.onupgradeneeded = (event: any) => {
        // console.log(this.databaseName, 'onupgradeneeded')
        const target: IDBOpenDBRequest = event.target
        this.db = target.result
        // console.log('onupgradeneeded', this)
        this.onUpgradeNeeded && this.onUpgradeNeeded(this)

        // this.dispatchEvent('upgradeNeeded')
      }
      this.openDBRequest.onsuccess = (event: any) => {
        // console.log(this.databaseName, 'onsuccess')
        const target: IDBOpenDBRequest = event.target
        this.db = target.result
        this.onSuccess && this.onSuccess(this)
        // this.dispatchEvent('success')
        this.db.onversionchange = (event: any) => {
          // console.log('versionchange')
          this.db?.close()
          this.onVersionChange && this.onVersionChange(this)
          // this.dispatchEvent('versionchange')
        }
        // console.log(this.db)
      }
      this.openDBRequest.onblocked = (event) => {
        console.log('onblocked')
      }
    } catch (error) {
      console.error(error)
    }
  }
  // private dispatchEvent(eventName: string) {
  // 	if (this.databaseName.indexOf('_config') < 0) {
  // 		console.log('dispatchEvent,', eventName, this.databaseName)
  // 		IndexedDB.event.dispatchEvent(new Event(eventName))
  // 	}
  // }
  // static event = new IndexedDBEventTarget()
  // static OnSuccess(func: IDBHandlerType) {
  // 	IndexedDB.event.addEventListener('success', (event: any) => {
  // 		func(event)
  // 	})
  // }
  // static OnError(func: IDBHandlerType) {
  // 	IndexedDB.event.addEventListener('error', (event: any) => {
  // 		func(event)
  // 	})
  // }
  // static OnVersionChange(func: IDBHandlerType) {
  // 	IndexedDB.event.addEventListener('versionChange', (event: any) => {
  // 		func(event)
  // 	})
  // }
  // static OnUpgradeNeeded(func: IDBHandlerType) {
  // 	IndexedDB.event.addEventListener('upgradeNeeded', (event: any) => {
  // 		func(event)
  // 	})
  // }

  // 创建一个DBVersion的库来存储当前版本
  // private initVersionStore() {
  // 	// this.db?.deleteObjectStore('collections')
  // 	const collectionsStore = this.CreateObjectStore(
  // 		this.databaseName + '_version',
  // 		{
  // 			keyPath: 'id',
  // 			autoIncrement: true,
  // 		}
  // 	)
  // 	if (collectionsStore) {
  // 		collectionsStore.createIndex('databaseName', 'databaseName', {
  // 			unique: true,
  // 		})
  // 		collectionsStore.createIndex('version', 'version', {
  // 			unique: true,
  // 		})
  // 	}
  // }
  public GetRunningStoreName(storeName: string) {
    if (storeName === 'collections') {
      return 'collections'
    }
    // console.log(
    // 	'this.historicalCollections',
    // 	storeName.split('_')[0],
    // 	this.historicalCollections
    // )
    const modelNames = this.historicalCollections.filter((item) => {
      return item.originalModelName === storeName.split('_')[0]
    })
    // console.log(this.historicalCollections)
    return modelNames[modelNames.length - 1].modelName
  }
  public GetObjectStore(storeName: string, options?: {}) {
    if (!this?.db) return undefined
    const _this = this
    // storeName = this.GetRunningStoreName(storeName)
    // console.log(storeName)
    const transaction = this.db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const methods = {
      ObjectStore: store,
      Transaction: transaction,
      // // objectStore.delete(6)
      Delete(query: IDBValidKey | IDBKeyRange) {
        return new Promise<'success'>((response, reject) => {
          try {
            // console.log(doc, primaryKeyValue)
            if (!query) {
              reject(ErrorType.DELETE_QPRAMETER_NOT_EXIST)
              return
            }
            const requestUpdate = store.delete(query)
            requestUpdate.onerror = () => {
              // console.log(requestUpdate, doc, primaryKeyValue)
              reject(requestUpdate.error)
            }
            requestUpdate.onsuccess = () => {
              response('success')
            }
          } catch (error) {
            reject(error)
          }
        })
      },
      GetAllIndexNames() {
        const indexNamesArr: string[] = []
        const indexNames = store.indexNames
        for (const k in indexNames) {
          if (typeof indexNames[k] === 'string') {
            indexNamesArr[k] = indexNames[k]
          }
        }
        return indexNamesArr
      },
      DeleteIndex(indexName: string) {
        return new Promise<'success'>((response, reject) => {
          try {
            store.deleteIndex(indexName)
            response('success')
          } catch (error) {
            console.log(error)
            reject(error)
          }
        })
      },
      DeleteAllIndexNames() {
        return new Promise<'success'>((res, rej) => {
          try {
            const promiseAll: Promise<'success'>[] = []
            for (const k in store.indexNames) {
              if (typeof store.indexNames[k] === 'string') {
                promiseAll.push(methods.DeleteIndex(store.indexNames[k]))
              }
            }
            Promise.allSettled(promiseAll)
              .then((value) => {
                res('success')
              })
              .catch((value) => {
                rej(value)
              })
          } catch (error) {
            rej(error)
          }
        })
      },
      Update<T = any>(primaryKeyValue: IDBValidKey, doc: T) {
        return new Promise<T>((response, reject) => {
          try {
            // console.log(doc, primaryKeyValue)
            if (!primaryKeyValue) {
              reject(ErrorType.PRIMARY_KEY_VALUE_NOT_EXIST)
              return
            }
            // console.log(doc)
            const requestUpdate = store.put(doc)
            requestUpdate.onerror = () => {
              // console.log(requestUpdate, doc, primaryKeyValue)
              reject(requestUpdate.error)
            }
            requestUpdate.onsuccess = () => {
              response(doc)
            }
          } catch (error) {
            reject(error)
          }
        })
      },
      OpenCursor(
        query?: IDBValidKey | IDBKeyRange | null | undefined,
        direction?: IDBCursorDirection | undefined
      ) {
        const cursor = store.openCursor(query, direction)
        console.log('cursor', cursor)
      },
      Add<T = any>(value: T, key?: IDBValidKey): Promise<T> {
        return new Promise((res, rej) => {
          try {
            // console.log(value, key)
            const request = store.add(value, key)
            request.onsuccess = (event: any) => {
              // console.log('adddddddddddddddddd', value, event)
              let result = event.target.result

                ; (value as any)['id'] = result
              res(value)
            }
            request.onerror = (event) => {
              // console.log('error', event, request.error)
              rej({
                error: request.error?.message,
              })
            }
          } catch (error) {
            rej(error)
          }
        })
      },
      GetAll<T = any>() {
        return new Promise<T[]>((res, rej) => {
          try {
            const request = store.getAll()
            request.onsuccess = (event: any) => {
              res(event?.target?.result || [])
            }
            request.onerror = () => {
              rej(request.error)
            }
          } catch (error) {
            rej(error)
          }
        })
      },
      DeleteAll() {
        return new Promise<'success'>((res, rej) => {
          try {
            const request = store.clear()
            request.onsuccess = (event: any) => {
              res('success')
            }
            request.onerror = () => {
              rej(request.error)
            }
          } catch (error) {
            rej(error)
          }
        })
      },
      GetIndex(key: string) {
        const objectIndex = store.index(key)
        return {
          index: objectIndex,
          Get(key: any): Promise<any> {
            return new Promise((res, rej) => {
              try {
                const request = objectIndex.get(key)
                request.onsuccess = (event: any) => {
                  res(event.target.result)
                }
                request.onerror = () => {
                  rej(request.error)
                }
              } catch (error) {
                rej(error)
              }
            })
          },
          OpenCursor<T = any>(
            query?: IDBValidKey | IDBKeyRange | null | undefined,
            direction?: IDBCursorDirection | undefined,
            options: {
              limit: number
              skip: number
              in: {
                [k: string]: any[]
              }
              range: {
                [k: string]: any[]
              }
              // project: Project
            } = { limit: 0, skip: 0, in: {}, range: {} }
          ): Promise<T[]> {
            return new Promise((res, rej) => {
              // console.log('OpenCursor', objectIndex, query, direction, options)
              const data: T[] = []
              // console.log('query', query)
              const cursor = objectIndex.openCursor(query, direction)
              cursor.onerror = () => {
                rej(cursor.error)
              }
              const $rangeKeys = Object.keys(options.range)
              const $inKeys = Object.keys(options.in)
              // console.log('inkeys filterObj', options.in, $inKeys)
              let $skip = 0
              cursor.onsuccess = (event: any) => {
                let result = event.target.result
                // console.log(result)
                let $in = false
                let $range = false
                // console.log(result, options?.skip, !advanced)

                if (!result?.value) {
                  res(data)
                  // res(DocumentMethods.formatProject<T>(data, options?.project))
                  return
                }
                if ($rangeKeys.length) {
                  $rangeKeys.some((key) => {
                    if (
                      options.range[key].length &&
                      options.range[key][0] <= result?.value[key] &&
                      options.range[key][1] >= result?.value[key]
                    ) {
                      $range = true
                      return true
                    }
                  })
                  if (!$range) {
                    result.continue()
                    return
                  }
                }
                if ($inKeys.length) {
                  // console.log('inkeys filterObj 1`',
                  // result, options.in, $inKeys)
                  $in = false
                  $inKeys.some((key) => {
                    const valueJson = JSON.parse(result?.value[key] || "{}")
                    // console.log(
                    //   'inkeys filterObj 2',
                    //   options.in[key], result?.value[key],
                    //   valueJson,
                    //   valueJson[key],
                    //   options.in[key].indexOf(valueJson[key]) >= 0
                    // )
                    if (options.in[key].indexOf(valueJson[key]) >= 0) {
                      $in = true
                      return true
                    }
                  })
                  // console.log('inkeys filterObj3', $in)
                  if (!$in) {
                    result.continue()
                    return
                  }
                }
                if (options?.skip >= 1) {
                  if ($skip < options?.skip) {
                    $skip++
                    result.continue()
                    // result.advance(options?.skip) // 跳过多少条
                    return
                  }
                }
                // console.log($range, $in, result && $in, options.in)

                if (options?.limit > 0) {
                  // console.log(data.length < options?.limit)
                  if (data.length < options?.limit) {
                    data.push(result.value)
                    result.continue()
                  } else {
                    // res(
                    // 	DocumentMethods.formatProject<T>(data, options?.project)
                    // )

                    res(data)
                    return
                  }
                } else {
                  data.push(result.value)
                  result.continue()
                }
              }
            })
          },
          GetMany(
            query?: IDBValidKey | IDBKeyRange | null | undefined
          ): Promise<any[]> {
            return new Promise((res, rej) => {
              try {
                const request = objectIndex.getAll(query)
                request.onsuccess = (event: any) => {
                  // console.log(event.target.result, query)
                  res(event.target.result)
                }
                request.onerror = () => {
                  rej(request.error)
                }
              } catch (error) {
                rej(error)
              }
            })
          },
          GetAll(): Promise<any[]> {
            return new Promise((res, rej) => {
              try {
                const request = objectIndex.getAll()
                request.onsuccess = (event: any) => {
                  res(event.target.result)
                }
                request.onerror = () => {
                  rej(request.error)
                }
              } catch (error) {
                rej(error)
              }
            })
          },
          Update(key: any, update: any) {
            return new Promise((res, rej) => {
              // console.log('update', key, update)

              var requestGet = store.get(key)
              // console.log(requestGet)
              requestGet.onerror = function (event) {
                console.log('更新报错')
              }
              requestGet.onsuccess = function (event: any) {
                var data = event.target.result
                console.log(event, requestGet, data)
                Object.keys(update).forEach((item) => {
                  data[item] = update[item]
                })

                // // // 把更新过的对象放回数据库
                var requestUpdate = store.put(data)
                requestUpdate.onerror = function (event) {
                  console.log('失败', event)
                  res(false)
                  // 错误处理
                }
                requestUpdate.onsuccess = function (event) {
                  console.log('成功', event)
                  res(true)
                  // 完成，数据已更新！
                }
              }
            })
          },
          Has(value: any) {
            return new Promise((res, rej) => {
              try {
                const request = objectIndex.get(value)
                request.onsuccess = (event: any) => {
                  // console.log('objectIndex', objectIndex)
                  // console.log('success', value, event, request)
                  res(event.target.result)
                }
                request.onerror = () => {
                  // console.log(request.error)
                  rej(request.error)
                }
              } catch (error) {
                rej(error)
              }
            })
          },
        }
      },
      Has<T = any>(key: any): Promise<T> {
        return new Promise((res, rej) => {
          try {
            console.log('key', key)
            // const request = store.get(value, key)
            // request.onsuccess = (event) => {
            // 	res(value)
            // }
            // request.onerror = (event) => {
            // 	rej(request.error)
            // }
          } catch (error) {
            rej(error)
          }
        })
      },
    }
    return methods
  }
  public formatRules(oRules: ModelOptionsType) {
    let rules: any = {}
    let primaryKey = {
      keyPath: 'id',
      autoIncrement: true,
    }
    Object.keys(oRules).forEach((key) => {
      // console.log(model.rules[key], key)
      if (oRules[key].primaryKey) {
        primaryKey.keyPath = key
        primaryKey.autoIncrement = oRules[key].autoIncrement || false
      }
      rules[key] = {
        ...oRules[key],
        type: oRules[key].type.name.toLowerCase(),
      }
      if (oRules[key].default) {
        rules[key].default =
          typeof oRules[key].default === 'function'
            ? oRules[key].default.name
            : oRules[key].default
      }
    })
    return {
      rules,
      primaryKey,
    }
  }
  public GetModelName(storeName: string) {
    return storeName + '_' + this.version
  }
  // 新的集合有新的字段，老数据就填空即可。
  // 新集合不包含老字段，老字段直接舍弃即可。
  // 新集合舍弃老字段改命，则需要填写oldKey以转移数据
  public GetIndexKey(keys: string[]) {
    if (keys.length) {
      let tmp: string
      //bubble sort
      for (let i = keys.length - 1; i >= 1; i--) {
        for (let j = 1; j <= i; j++) {
          //charCodeAt(index) 方法可返回指定位置的字符的 Unicode 编码
          if (keys[j - 1].charCodeAt(0) > keys[j].charCodeAt(0)) {
            tmp = keys[j - 1]
            keys[j - 1] = keys[j]
            keys[j] = tmp
          }
        }
      }

      return {
        indexKey: keys.join('_'),
        keys: keys,
      }
    }
    return {
      indexKey: '',
      keys: [],
    }
    //将排序完的结果合成字符串
  }
  public CreateObjectStore(
    storeName: string,
    options: {
      keyPath: string
      autoIncrement: boolean
    } = {
        keyPath: 'id',
        autoIncrement: true,
      }
  ) {
    let isExist = false
    if (!this?.db) return undefined
    // console.log('this.db')
    if (this.db.objectStoreNames) {
      isExist = this.db.objectStoreNames.contains(storeName)
      // console.log(this.db.objectStoreNames.contains(storeName), '1')
      // for (let name of this.db.objectStoreNames) {
      // 	if (name === storeName) {
      // 		isExist = true
      // 		break
      // 	}
      // }
    }
    // console.log('isExist', isExist)
    if (!isExist) {
      console.log(this.db, storeName, options)
      let objectStore = this.db.createObjectStore(storeName, options)
      // console.log(objectStore)
      return objectStore
    } else {
      return undefined
    }
  }
  public GetVersion() {
    return this.version
  }
  public CreateModel<T>(schema: Schema<T>, modelName: string) {
    this.schemas[modelName] = schema
    // console.log(schema, modelName)
    // console.log(this.models, this)

    const createModel = Model.CreateModel(schema, modelName)

    this.modelInitHandlers.push(createModel.model.ChangeHandler())

    return createModel.DocumentModel
  }
  static getTimeStamp() {
    return Math.floor(new Date().getTime() / 1000)
  }
}

// static GetHistoricalCollectionRecords = (
//   databaseName: string,
//   version: number
// ) => {
//   return new Promise<CollectionsItem[]>((response, reject) => {
//     console.log('runIDB')
//     if (!window.indexedDB) {
//       console.error(
//         "Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available."
//       )
//       IndexedDB.event.dispatchEvent(new Event('error'))
//     } else {
//       const IDBRequest = window.indexedDB.open(
//         databaseName + '_config',
//         version
//       )

//       IDBRequest.onerror = (event: any) => {
//         // console.log('RunIDB onerror')
//         reject(IDBRequest.error)
//       }
//       IDBRequest.onsuccess = (event: any) => {
//         // console.log('RunIDB onsuccess')
//         const target: IDBOpenDBRequest = event.target
//         const db = target.result
//         const transaction = db.transaction(['collections'], 'readwrite')
//         const store = transaction.objectStore('collections')
//         const getAllRequest = store.getAll()

//         getAllRequest.onerror = () => {
//           console.log(getAllRequest.error)
//         }
//         getAllRequest.onsuccess = (event: any) => {
//           response(event.target.result)
//         }
//       }
//       IDBRequest.onupgradeneeded = (event: any) => {
//         // console.log('RunIDB onsuccess')
//         const target: IDBOpenDBRequest = event.target
//         const db = target.result

//         console.log('onupgradeneeded')
//         const collectionsStore = db.createObjectStore('collections', {
//           keyPath: 'id',
//           autoIncrement: true,
//         })
//         if (collectionsStore) {
//           // console.log(collectionsStore)
//           collectionsStore.createIndex('modelName', 'modelName', {
//             unique: false,
//           })
//           collectionsStore.createIndex('version', 'version', {
//             unique: false,
//           })
//         }
//       }
//     }
//   })
// }
