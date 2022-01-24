import { ErrorType } from './error'
export interface ModelOptionsType {
	[k: string]: {
		type: Function
		autoIncrement?: boolean
		default?: any
		createIndex?: boolean
		primaryKey?: boolean
		unique?: boolean
		required?: boolean
		// oldKey?: string
		// 预留
		// 秒级
		expires?: number
	}
}

export type SchemaOptions = {
	mergeOldData: boolean
	deleteOldData: boolean
	mergerules?: {
		[newField: string]: [oldField: string]
	}
}

export class Schema<T = any> {
	public rules: ModelOptionsType
	public options: SchemaOptions
	// types?: {
	// 	[K in keyof ModelOptionsType]: GetModelOptionsValueType<ModelOptionsType[K]>
	// }
	public types?: T

	// rules: ModelOptionsType<string> = {}
	// 新增options
	// 版本更新数据与字段更新策略
	// 1、新的集合有新的字段，老数据就默认值即可
	// 新集合不包含老字段，老字段直接舍弃即可。
	// 2、全新数据，舍弃一切老版本
	// 3、新集合舍弃老字段改名，提供当前版本新字段对应老字段的规则

	constructor(
		rules: ModelOptionsType,
		options: SchemaOptions = {
			mergeOldData: false,
			deleteOldData: true,
		}
	) {
		// console.log(options)
		this.rules = rules
		this.options = options

		// console.log(this.options)
		// console.log(this.rules.id.type.name.toLowerCase(), typeof 21)
		// console.log(this.rules)
	}
	private init() {
		this.rules = {}
		this.options = {
			mergeOldData: false,
			deleteOldData: true,
		}
	}

	public Verify(data: any) {
		let err = ''
		Object.keys(this.rules).forEach((ruleKey) => {
			if (this.rules[ruleKey]) {
				if (this.rules[ruleKey].default && !data[ruleKey]) {
					switch (typeof this.rules[ruleKey].default) {
						case 'function':
							data[ruleKey] = this.rules[ruleKey].default()
							break

						default:
							data[ruleKey] = this.rules[ruleKey].default
							break
					}
				}
				if (
					this.rules[ruleKey].required &&
					!data[ruleKey] &&
					!this.rules[ruleKey].default
				) {
					if (this.rules[ruleKey].type.name.toLowerCase() === 'number') {
						if (data[ruleKey] != 0) {
							err += '“' + ruleKey + '”: Cannot be blank; '
							return
						}
					} else {
						err += '“' + ruleKey + '”: Cannot be blank; '
						return
					}
				}
				if (
					data[ruleKey] &&
					this.rules[ruleKey].type.name.toLowerCase() !== typeof data[ruleKey]
				) {
					if (this.rules[ruleKey].type.name.toLowerCase() === 'array') {
						if (data[ruleKey].constructor.name !== 'Array') {
							err += '“' + ruleKey + '”: Data type error; '
						}
					} else {
						err += '“' + ruleKey + '”: Data type error; '
					}
				}
			}
		})
		return err
	}
	static formatDefaultData(doc: any, rules: ModelOptionsType) {
		const newDoc: { [key: string]: any } = {}
		Object.keys(rules).forEach((key) => {
			if (!doc[key]) {
				if (rules[key].hasOwnProperty('default')) {
					newDoc[key] = rules[key].default
				}
			} else {
				newDoc[key] = doc[key]
			}
		})
		return newDoc
	}
	public FieldVerify(k: string, v: any) {
		if (!this.rules[k]) {
			return false
		}
		if (this.rules[k].type.name.toLowerCase() !== typeof v) {
			return false
		}
		return true
	}
	static GetPrimaryKey(rules: ModelOptionsType) {
		let primaryKey = ''
		Object.keys(rules).some((k) => {
			if (rules[k].primaryKey) {
				primaryKey = k
				return true
			}
		})
		return primaryKey
	}
	public GetPrimaryKey() {
		let primaryKey = ''
		Object.keys(this.rules).some((k) => {
			if (this.rules[k].primaryKey) {
				primaryKey = k
				return true
			}
		})
		return primaryKey
	}
	public VerifyMultipleField(doc: { [k: string]: any }) {
		let bool = true
		Object.keys(doc).some((k) => {
			if (!doc[k]) {
				bool = false
				return true
			}
			if (!this.rules[k]) {
				bool = false
				return true
			}
			if (this.rules[k].type.name.toLowerCase() !== typeof doc[k]) {
				bool = false
				return true
			}
		})
		return bool
	}
}
