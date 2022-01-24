import { ModelOptionsType } from './schema'
// createTime: 1642428783
// id: 1
// isMergeData: false
// lastMergeVersion: Array(0)
// length: 0
// model:
// bio: {type: 'string', required: true, createIndex: true, default: 'biocess111'}
// createTime: {type: 'number', required: true, default: 'getTimeStamp'}
// gender: {type: 'string', required: true, createIndex: true, default: ''}
// id: {type: 'number', primaryKey: true, createIndex: true, autoIncrement: true}
// name: {type: 'string', required: true, createIndex: true, default: ''}
// nickname: {type: 'string', required: true, createIndex: true, default: 'nickcess'}
// uid: {type: 'number', required: true, createIndex: true, unique: true}
// username: {type: 'string', unique: true, required: true, createIndex: true}
// modelName: "userInfo_2104"
// options:
// deleteOldData: true
// mergeOldData: true
// originalModelName: "userInfo"
// status: 1
// version: 2104
export type CollectionsItem = {
	id: number
	isMergeData: boolean
	lastMergeVersion: number[]
	model: ModelOptionsType
	modelName: string
	options: {
		deleteOldData: boolean
		mergeOldData: boolean
	}
	originalModelName: string
	status: number
	version: number
	createTime: number
}

export const runCollectionDB = () => {}
