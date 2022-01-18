export enum ErrorType {
	DATABASE_NOT_EXIST = 'Database does not exist.',
	OBJECT_STORE_NOT_EXIST = 'ObjectStore does not exist.',
	INDEX_KEY_NOT_EXIST = 'Index key does not exist.',
	FILTER_INDEX_KEY_NOT_EXIST = 'The filter key is not the index key.',
	PRIMARY_KEY_VALUE_NOT_EXIST = 'Primary key value does not exist.',
	UPDATE_PARAMETER_NOT_EXIST = 'The updated parameter does not exist.',
	DELETE_QPRAMETER_NOT_EXIST = 'Delete parameter does not exist.',
}
