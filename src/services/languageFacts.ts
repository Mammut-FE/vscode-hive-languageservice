import * as nls from 'vscode-nls';
import { data } from '../data/hive';
import * as hiveData from '../data/hive';

const localize = nls.loadMessageBundle();

export interface Value {
    name: string;
    description: string;
}

export interface IEntry {
    name: string;
    restrictions: string[];
    description: string;
    values: Value[];
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
}

class EntryImpl implements IEntry {
    constructor(public data: any) {

    }

    get name(): string {
        return this.data.name;
    }

    get description(): string {
        return this.data.dsec || hiveData.descriptions[this.data.name];
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
}


const keywords = hiveData.data.keywords;
let keywordsList: IEntry[];

export function getKeywordList() {
    if (!keywordsList) {
        keywordsList = [];
        for (let i = 0; i < keywords.length; i++) {
            let rawEntry = keywords[i];
            keywordsList.push(new EntryImpl(rawEntry));
        }
    }

    return keywordsList;
}