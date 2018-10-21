import { ICol, ICteTable } from '@mammut-fe/hive-parser';
import { CompletionItemKind } from 'vscode-languageserver-types';
import * as hiveData from '../data/hive';

import { getDatabaseService } from './databaseService';

const databaseService = getDatabaseService();

export interface Value {
    name: string;
    description: string;
    kind: CompletionItemKind;
    detail?: string;
}

export interface IEntry {
    name: string;
    restrictions: string[];
    description: string;
    values: Value[];
    detail?: string;
}

class ValueImpl implements Value {
    constructor(public data: any) {
    }

    get name(): string {
        return this.data.name;
    }

    get description(): string {
        return this.data.desc || hiveData.descriptions[this.data.name];
    }

    get kind(): CompletionItemKind {
        return this.data.kind || CompletionItemKind.Text;
    }

    get needComma(): boolean {
        return !!this.data.needComma;
    }

    get detail(): string {
        return this.data.detail;
    }
}

class EntryImpl implements IEntry {
    constructor(public data: any) {
    }

    get name(): string {
        return this.data.name;
    }

    get description(): string {
        return this.data.desc || hiveData.descriptions[this.data.name];
    }

    get restrictions(): string[] {
        if (this.data.restrictions) {
            return (this.data.restrictions as string).split(',').map(s => s.trim());
        } else {
            return [];
        }
    }

    get values(): Value[] {
        if (!this.data.values) {
            return [];
        }
        if (!Array.isArray(this.data.values)) {
            return [new ValueImpl(this.data.values.value)];
        }
        return this.data.values.map(v => new ValueImpl(v));
    }

    get detail(): string {
        return this.data.detail;
    }
}

const keywords = hiveData.data.keywords;
let keywordsList: IEntry[];

export function getKeywordEntryList() {
    if (!keywordsList) {
        keywordsList = [];
        for (let i = 0; i < keywords.length; i++) {
            let rawEntry = keywords[i];
            rawEntry.name = rawEntry.name.toLowerCase();
            keywordsList.push(new EntryImpl(rawEntry));
        }
    }

    return keywordsList;
}

const builtInFunctions = hiveData.data.builtInFunctions;
let builtInFunctionEntryList: IEntry[];

export function getFunctionsEntryList(): IEntry[] {
    if (!builtInFunctionEntryList) {
        builtInFunctionEntryList = [];
        for (let i = 0; i < builtInFunctions.length; i++) {
            let rawEntry = builtInFunctions[i];
            rawEntry.name += '()';
            builtInFunctionEntryList.push(new EntryImpl(rawEntry));
        }
    }

    return builtInFunctionEntryList;
}

const useStmtList = hiveData.data.use;
let useStmtEntryList: IEntry[];

export function getUseStmtEntryList() {
    if (!useStmtEntryList) {
        useStmtEntryList = [];
        for (let i = 0; i < useStmtList.length; i++) {
            let rawEntry = useStmtList[i];
            useStmtEntryList.push(new EntryImpl(rawEntry));
        }
    }

    return useStmtEntryList;
}

const selectStmtList = hiveData.data.select;
let selectStmtEntryList: IEntry[];

export function getSelectStmtEntryList() {
    if (!selectStmtEntryList) {
        selectStmtEntryList = [];
        for (let i = 0; i < selectStmtList.length; i++) {
            let rawEntry = selectStmtList[i];
            selectStmtEntryList.push(new EntryImpl(rawEntry));
        }
    }

    return selectStmtEntryList;
}

export function getDatabaseEntryList(): IEntry[] {
    return databaseService.getDatabaseList().map(db => {
        return new EntryImpl({
            name: db.name,
            detail: 'database'
        });
    });
}

export function getTableEntryList(db: string): IEntry[] {
    return databaseService.getTables(db).map(table => {
        return new EntryImpl({
            name: table.name,
            detail: 'table'
        });
    });
}

export function getColumnEntryList(dbName: string, tableName: string, columns: ICol[] = []): IEntry[] {
    const cache = {};
    let isAll = columns.length === 0;

    columns.forEach(col => {
        if (col.name === '*') {
            isAll = true;
        }
        cache[col.name] = true;
    });

    const columnsList = databaseService
        .getColumns(dbName, tableName)
        .filter(column => {
            return isAll || cache[column.name];
        })
        .map(column => {
            return new EntryImpl({
                name: column.name,
                detail: 'column'
            });
        });

    columnsList.push(new EntryImpl({ name: '*', detail: 'keyword' }));

    return columnsList;
}

export function getCteTableEntryList(cteTables: ICteTable[]): IEntry[] {
    return cteTables.map(cteTable => {
        return new EntryImpl({
            name: cteTable.name,
            detail: 'table'
        });
    });
}

export function getEntryDescription(entry: { description: string; data?: any }): string | null {
    if (!entry.description || entry.description === '') {
        return null;
    }

    let desc: string = '';

    desc += entry.description;

    if (entry.data && entry.data.syntax) {
        desc += `\n\nSyntax: ${entry.data.syntax}`;
    }
    return desc;
}

