export const redisCommands = {
    'get': {
        desc: '获取键值',
        example: 'get mykey'
    },
    'set': {
        desc: '设置键值',
        example: 'set mykey myvalue'
    },
    'del': {
        desc: '删除键',
        example: 'del mykey'
    },
    'exists': {
        desc: '检查键是否存在',
        example: 'exists mykey'
    },
    'keys': {
        desc: '查找所有符合给定模式的键',
        example: 'keys user:*'
    },
    'incr': {
        desc: '将键值递增',
        example: 'incr counter'
    },
    'decr': {
        desc: '将键值递减',
        example: 'decr counter'
    },
    'hget': {
        desc: '获取哈希表中的字段值',
        example: 'hget user:1 name'
    },
    'hset': {
        desc: '设置哈希表字段值',
        example: 'hset user:1 name zhangsan'
    },
    'hdel': {
        desc: '删除哈希表字段',
        example: 'hdel user:1 name'
    },
    'hkeys': {
        desc: '获取哈希表所有字段',
        example: 'hkeys user:1'
    },
    'hvals': {
        desc: '获取哈希表所有值',
        example: 'hvals user:1'
    },
    'lpush': {
        desc: '在列表头部插入元素',
        example: 'lpush mylist value1 value2'
    },
    'rpush': {
        desc: '在列表尾部插入元素',
        example: 'rpush mylist value'
    },
    'lpop': {
        desc: '移除并返回列表第一个元素',
        example: 'lpop mylist'
    },
    'rpop': {
        desc: '移除并返回列表最后一个元素',
        example: 'rpop mylist'
    },
    'lrange': {
        desc: '获取列表指定范围内的元素',
        example: 'lrange mylist 0 -1'
    },
    'sadd': {
        desc: '向集合添加成员',
        example: 'sadd myset member1 member2'
    },
    'srem': {
        desc: '移除集合成员',
        example: 'srem myset member1'
    },
    'smembers': {
        desc: '获取集合所有成员',
        example: 'smembers myset'
    },
    'zadd': {
        desc: '向有序集合添加成员',
        example: 'zadd rankings 89.5 user1'
    },
    'zrange': {
        desc: '获取有序集合指定范围内的成员',
        example: 'zrange rankings 0 -1 withscores'
    },
    'expire': {
        desc: '设置键的过期时间(秒)',
        example: 'expire mykey 3600'
    },
    'ttl': {
        desc: '获取键的剩余过期时间',
        example: 'ttl mykey'
    },
    'type': {
        desc: '获取键的数据类型',
        example: 'type mykey'
    },
    'info': {
        desc: '获取Redis服务器信息',
        example: 'info'
    },
    'select': {
        desc: '切换数据库',
        example: 'select 1'
    },
    'flushdb': {
        desc: '清空当前数据库',
        example: 'flushdb'
    },
    'ping': {
        desc: '测试连接',
        example: 'ping'
    },
    'connect': {
        desc: '连接Redis服务器',
        example: 'connect 127.0.0.1 6379'
    },
    'clear': {
        desc: '清空终端',
        example: 'clear'
    },
    'help': {
        desc: '显示帮助信息',
        example: 'help'
    }
}