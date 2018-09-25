import { IColumn, IDatabase, IDatabaseServices, ITable } from '../hiveLanguageTypes';

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
let databaseServiceImpl: IDatabaseServices = null;

export class DataBaseServicesImpl implements IDatabaseServices {
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

    public getColumns(db: string, tableName: string): IColumn[] {
        const database = this.findDatabase(db);

        if (database) {
            const table = this.findTable(database, tableName);

            if (table) {
                return table.columns.map(column => column);
            }
        }

        return [];
    }

    private findDatabase(dbName: string): IDatabase | null {
        let result = dbs.filter(db => db.name === dbName);
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

export function updateDatabase(database: IDatabase[]): void {
    dbs = database;
}

export function getDatabaseService() {
    if (!databaseServiceImpl) {
        databaseServiceImpl = new DataBaseServicesImpl();
    }

    return databaseServiceImpl;
}
