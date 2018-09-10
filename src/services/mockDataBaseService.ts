export interface IDatabaseServices {
    getDatabaseList(): string[];

    getTables(db: string): string[];

    getColumns(db: string, table: string): string[];
}

export interface IDatabase {
    id?: string | number | symbol;
    desc?: string;
    data?: any;
    name: string;
    tables: ITable[];
}

export interface ITable {
    id?: string | number | symbol;
    desc?: string;
    data?: any;
    name: string;
    db: string;
    columns: IColumn[];
}

export interface IColumn {
    id?: string | number | symbol;
    desc?: string;
    data?: any;
    name: string;
    table: string;
    db: string;
}

export class MockDataBaseServicesImpl implements IDatabaseServices {
    constructor(public dbs: IDatabase[]) {
    }

    public getDatabaseList(): string[] {
        return this.dbs.map(db => db.name);
    }

    public getTables(db: string): string[] {
        const database = this.findDatabase(db);

        return database.tables.map(table => table.name);
    }

    public getColumns(db: string, tableName: string): string[] {
        const database = this.findDatabase(db);
        const table = this.findTable(database, tableName);

        return table.columns.map(column => column.name);
    }

    private findDatabase(dbName: string): IDatabase | null {
        let result = this.dbs.filter(db => db.name === dbName);
        return result.length > 0 ? result[0] : null;
    }

    private findTable(db: IDatabase, tableName: string): ITable | null {
        let result = db.tables.filter(table => table.name === tableName);
        return result.length > 0 ? result[0] : null;
    }

    private findColumn(table: ITable, columnName: string): IColumn | null {
        let result = table.columns.filter(column => column.name === columnName);
        return result.length > 0 ? result[0] : null;
    }
}

const mockDatabase: IDatabase[] = [
    {
        name: 'db1',
        tables: [
            {
                name: 'db1-table1',
                db: 'db1',
                columns: [{
                    name: 'col1',
                    table: 'db1-table1',
                    db: 'db1'
                }, {
                    name: 'col1',
                    table: 'db1-table1',
                    db: 'db1'
                }, {
                    name: 'col1',
                    table: 'db1-table1',
                    db: 'db1'
                }]
            },
            {
                name: 'db1-table1',
                db: 'db1',
                columns: [{
                    name: 'col1',
                    table: 'db1-table1',
                    db: 'db1'
                }, {
                    name: 'col1',
                    table: 'db1-table1',
                    db: 'db1'
                }, {
                    name: 'col1',
                    table: 'db1-table1',
                    db: 'db1'
                }]
            }
        ]
    },
    {
        name: 'database2',
        tables: [
            {
                name: 'database2-table1',
                db: 'database2',
                columns: [{
                    name: 'col1',
                    table: 'database2-table1',
                    db: 'database2'
                }, {
                    name: 'col1',
                    table: 'database2-table1',
                    db: 'database2'
                }, {
                    name: 'col1',
                    table: 'database2-table1',
                    db: 'database2'
                }]
            },
            {
                name: 'db2-table1',
                db: 'db2',
                columns: [{
                    name: 'col1',
                    table: 'db2-table1',
                    db: 'db2'
                }, {
                    name: 'col1',
                    table: 'db2-table1',
                    db: 'db2'
                }, {
                    name: 'col1',
                    table: 'db2-table1',
                    db: 'db2'
                }]
            }
        ]
    }
];

export default new MockDataBaseServicesImpl(mockDatabase);