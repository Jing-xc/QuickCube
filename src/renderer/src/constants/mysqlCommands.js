export const mysqlCommands = {
    'connect': {
        desc: '连接到 MySQL 服务器',
        example: 'connect localhost root password mydatabase'
    },
    'use': {
        desc: '切换数据库',
        example: 'use mydatabase'
    },
    'show': {
        desc: '显示数据库或表信息',
        example: 'show databases; show tables;'
    },
    'select': {
        desc: '查询数据',
        example: 'SELECT * FROM table_name'
    },
    'insert': {
        desc: '插入数据',
        example: 'INSERT INTO table_name (column1, column2) VALUES (value1, value2)'
    },
    'update': {
        desc: '更新数据',
        example: 'UPDATE table_name SET column1 = value1 WHERE condition'
    },
    'delete': {
        desc: '删除数据',
        example: 'DELETE FROM table_name WHERE condition'
    },
    'create': {
        desc: '创建数据库或表',
        example: 'CREATE TABLE table_name (column1 type1, column2 type2)'
    },
    'drop': {
        desc: '删除数据库或表',
        example: 'DROP TABLE table_name'
    },
    'alter': {
        desc: '修改表结构',
        example: 'ALTER TABLE table_name ADD column_name datatype'
    },
    'describe': {
        desc: '显示表结构',
        example: 'DESCRIBE table_name'
    },
    'truncate': {
        desc: '清空表数据',
        example: 'TRUNCATE TABLE table_name'
    },
    'grant': {
        desc: '授予权限',
        example: 'GRANT ALL PRIVILEGES ON database.* TO \'username\'@\'host\''
    },
    'revoke': {
        desc: '撤销权限',
        example: 'REVOKE ALL PRIVILEGES ON database.* FROM \'username\'@\'host\''
    },
    'commit': {
        desc: '提交事务',
        example: 'COMMIT'
    },
    'rollback': {
        desc: '回滚事务',
        example: 'ROLLBACK'
    },
    'start': {
        desc: '开始事务',
        example: 'START TRANSACTION'
    },
    'explain': {
        desc: '显示查询执行计划',
        example: 'EXPLAIN SELECT * FROM table_name'
    }
}