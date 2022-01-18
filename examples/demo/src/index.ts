import NyaNyaDB from './nyanyadb'
console.log(1)
console.log(window['NyaNyaDB'])

// const db = new NyaNyaDB({
// 	databaseName: 'react_test',
// 	version: 1,
// })
// console.log('当前版本:', db.GetVersion())
// const userInfoSchema = new NyaNyaDB.Schema<{
// 	id?: number
// 	uid: number
// 	name: string
// 	username: string
// 	gender: string
// 	bio: string
// 	createTime?: number
// }>(
// 	{
// 		id: {
// 			type: Number,
// 			primaryKey: true,
// 			createIndex: true,
// 			autoIncrement: true,
// 		},
// 		uid: {
// 			type: Number,
// 			required: true,
// 			createIndex: true,
// 			unique: true,
// 		},
// 		name: {
// 			type: String,
// 			required: true,
// 			createIndex: true,
// 			default: '',
// 		},
// 		gender: {
// 			type: String,
// 			required: true,
// 			createIndex: true,
// 			default: '',
// 		},
// 		username: {
// 			type: String,
// 			unique: true,
// 			required: true,
// 			createIndex: true,
// 		},
// 		nickname: {
// 			type: String,
// 			required: true,
// 			createIndex: true,
// 			default: 'nickcess',
// 		},
// 		bio: {
// 			type: String,
// 			required: true,
// 			createIndex: true,
// 			default: 'biocess111',
// 		},
// 		createTime: {
// 			type: Number,
// 			required: true,
// 			default: NyaNyaDB.getTimeStamp,
// 		},
// 	},
// 	{
// 		mergeOldData: true,
// 		deleteOldData: true,
// 	}
// )
// const chatRecordsSchema = new NyaNyaDB.Schema<{
// 	id?: number
// 	uid: number
// 	message: string
// 	createTime?: number
// }>(
// 	{
// 		id: {
// 			type: Number,
// 			primaryKey: true,
// 			createIndex: true,
// 			autoIncrement: true,
// 		},
// 		uid: {
// 			type: Number,
// 			required: true,
// 			createIndex: true,
// 			unique: false,
// 		},
// 		message: {
// 			type: String,
// 			required: true,
// 			createIndex: true,
// 			default: '',
// 		},
// 		createTime: {
// 			type: Number,
// 			createIndex: true,
// 			required: true,
// 			default: NyaNyaDB.getTimeStamp,
// 		},
// 	},
// 	{
// 		mergeOldData: true,
// 		deleteOldData: true,
// 	}
// )
// // chatRecordsModel.
// const UserInfo = db.CreateModel(userInfoSchema, 'userInfo')
// // console.log(UserInfo)
// const ChatRecords = db.CreateModel(chatRecordsSchema, 'chatRecords')
// // console.log(UserInfo, ChatRecords)

// // new <T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
// let username = ''
// for (let i = 1; i < 3; i++) {
// 	username = username + 'c'
// 	// new ChatRecords({
// 	// 	uid: 2,
// 	// 	message: '猜猜看' + i,
// 	// })
// 	// 	.Save()
// 	// 	.then(
// 	// 		(res) => {
// 	// 			console.log('创建成功', res)
// 	// 		},
// 	// 		(rej) => {
// 	// 			console.log('创建失败 Rej', rej)
// 	// 		}
// 	// 	)
// 	// 	.catch((rej) => {
// 	// 		console.log('创建失败 Catch', rej)
// 	// 	})
// 	// new UserInfo({
// 	// 	uid: i,
// 	// 	name: '嗯嗯嗯嗯嗯',
// 	// 	username: username + i,
// 	// 	gender: '女',
// 	// })
// 	// 	.Save()
// 	// 	.then(
// 	// 		(res) => {
// 	// 			console.log('创建成功', res)
// 	// 		},
// 	// 		(rej) => {
// 	// 			console.log(
// 	// 				'创建失败 Rej',
// 	// 				{
// 	// 					uid: i,
// 	// 					name: '嗯嗯嗯嗯嗯',
// 	// 					username: username + i,
// 	// 					gender: '女',
// 	// 				},
// 	// 				rej
// 	// 			)
// 	// 		}
// 	// 	)
// 	// 	.catch((rej) => {
// 	// 		console.log('创建失败 Catch', rej)
// 	// 	})
// }

// // UserInfo.Find({
// // 	uid: {
// // 		$range: [6, 8],
// // 	},
// // 	name: {
// // 		$value: '嗯嗯嗯嗯嗯',
// // 	},
// // 	gender: {
// // 		$value: '女',
// // 	},
// // })
// // 	.Sort(-1)
// // 	.Limit(4)
// // 	.Skip(0)
// // 	.Project({
// // 		id: 1,
// // 		name: 1,
// // 		gender: 1,
// // 	})
// // 	.Result()
// // 	.then((res) => {
// // 		console.log(res)
// // 	})
// // 	.catch((err) => {
// // 		console.log(err)
// // 	})

// ChatRecords.Find({
// 	createTime: {
// 		$range: [1642428834, 1642428863],
// 	},
// 	uid: {
// 		$value: 2,
// 	},
// })
// 	.Sort(-1)
// 	.Limit(4)
// 	.Skip(0)
// 	.Project({
// 		uid: 1,
// 		id: -1,
// 		message: 1,
// 		createTime: 1,
// 		users: {
// 			uid: 1,
// 			name: 1,
// 			gender: 1,
// 		},
// 	})
// 	.Lookup([
// 		{
// 			// 连表查询
// 			from: 'userInfo', // 关联到**表
// 			localField: 'uid', // 当前 表关联的字段
// 			foreignField: 'uid', // ** 表关联的字段
// 			as: 'users', //存储关联数据的k
// 		},
// 	])
// 	.Result()
// 	.then((res) => {
// 		console.log('最终', res)
// 	})
// 	.catch((err) => {
// 		console.log(err)
// 	})

// // ChatRecords.Update(
// // 	{
// // 		uid: {
// // 			$range: [6, 8],
// // 		},
// // 		name: {
// // 			$value: '嗯嗯嗯嗯嗯',
// // 		},
// // 		gender: {
// // 			$value: '女',
// // 		},
// // 	},
// // 	{
// // 		bio: '1111ee更新啦！！！！!',
// // 	}
// // )
// // 	.then((res) => {
// // 		console.log(res)
// // 	})
// // 	.catch((err) => {
// // 		console.log(err)
// // 	})

// // ChatRecords.Delete({
// // 	uid: {
// // 		$range: [10, 10],
// // 	},
// // 	name: {
// // 		$value: '嗯嗯嗯嗯嗯',
// // 	},
// // 	gender: {
// // 		$value: '女',
// // 	},
// // })
// // 	.then((res) => {
// // 		console.log(res)
// // 		if (res?.About) {
// // 			// res?.About()
// // 		}
// // 	})
// // 	.catch((err) => {
// // 		console.log(err)
// // 	})
