import { IColumn, IDatabase, ITable } from '../hiveLanguageTypes';

let dbs: IDatabase[] = [
    {
        name: 'school',
        tables: [
            {
                name: 'student',
                columns: [{
                    name: 'id'
                }, {
                    name: 'sex'
                }, {
                    name: 'age'
                }, {
                    name: 'name'
                }]
            },
            {
                name: 'course',
                columns: [{
                    name: 'id'
                }, {
                    name: 'name'
                }, {
                    name: 'hour'
                }, {
                    name: 'score'
                }]
            }
        ]
    },
    {
        name: 'library',
        tables: [
            {
                name: 'user',
                columns: [
                    { name: 'userid' },
                    { name: 'password' }
                ]
            },
            {
                name: 'book',
                columns: [
                    { name: 'bookid' },
                    { name: 'bookname' }
                ]
            }
        ]
    }
];
let databaseServiceImpl: DataBaseServices = null;

export class DataBaseServices {
    public getDatabaseList(): IDatabase[] {
        return dbs.map(db => db);
    }

    public getTables(db: string): ITable[] {
        const database = this.findDatabase(db);

        if (database) {
            return database.tables.map(table => table);
        }

        return [];
    }

    public getColumns(dbName: string, tableName: string): IColumn[] {
        const table = this.findTable(dbName, tableName);

        if (table) {
            return table.columns.map(column => column);
        }

        return [];
    }

    public findDatabase(dbName: string): IDatabase | null {
        let result = dbs.filter(db => db.name === dbName);
        return result.length > 0 ? result[0] : null;
    }

    public findTable(dbName: string, tableName: string): ITable | null {
        const db = this.findDatabase(dbName);

        if (!db) return null;

        const result = db.tables.filter(table => table.name === tableName);
        return result.length > 0 ? result[0] : null;
    }

    public findColumn(dbName: string, tableName: string, colName: string): IColumn | null {
        const table = this.findTable(dbName, tableName);

        if (!table) return null;

        const result = table.columns.filter(col => col.name === colName);
        return result.length > 0 ? result[0] : null;
    }
}

export function updateDatabase(database: IDatabase[]): void {
    dbs = database;
}

export function getDatabaseService() {
    if (!databaseServiceImpl) {
        databaseServiceImpl = new DataBaseServices();
    }

    return databaseServiceImpl;
}
