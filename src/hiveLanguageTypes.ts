export interface ICompletionParticipant {
}

import { Range, TextEdit, Position } from 'vscode-languageserver-types';

export { Range, TextEdit, Position };

export interface IDatabaseServices {
    getDatabaseList(): IDatabase[];

    getTables(db: string): ITable[];

    getColumns(db: string, table: string): IColumn[];

    findDatabase(db: string): IDatabase | null;

    findTable(db: string, table: string): ITable | null;

    findColumn(db: string, table: string, col: string): IColumn | null;
}

export interface IDatabase {
    name: string;
    tables: ITable[];

    [key: string]: any;
}

export interface ITable {
    name: string;
    columns: IColumn[];

    [key: string]: any;

}

export interface IColumn {
    name: string;

    [key: string]: any;
}
