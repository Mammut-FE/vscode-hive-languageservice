import * as hiveLanguageService from '../src/hiveLanguageService';

import {
    CompletionList,
    TextDocument,
    Position,
    CompletionItemKind,
    InsertTextFormat,
    Range
} from 'vscode-languageserver-types';

export interface ItemDescription {
    label: string;
    detail?: string;
    documentation?: string;
    kind?: CompletionItemKind;
    insertTextFormat?: InsertTextFormat;
    resultText?: string;
    notAvailable?: boolean;
}

function asPromise<T>(result: T): Promise<T> {
    return Promise.resolve(result);
}


export let assertCompletion = function(completions: CompletionList, expected: ItemDescription, document: TextDocument, offset: number) {
    let matches = completions.items.filter(completion => {
        return completion.label === expected.label;
    });
    if (expected.notAvailable) {
        test(expected.label + ' should not be present', () => {
            expect(matches.length).toEqual(0);
        });
    } else {
        test(expected.label + ' should only existing once: Actual: ' + completions.items.map(c => c.label).join(', '), () => {
            expect(matches.length).toEqual(1);
        });
    }

    let match = matches[0];
    if (expected.detail) {
        expect(match.detail).toEqual(expected.detail);
    }
    if (expected.documentation) {
        expect(match.documentation).toEqual(expected.documentation);
    }
    if (expected.kind) {
        expect(match.kind).toEqual(expected.kind);
    }
    if (expected.resultText) {
        expect(TextDocument.applyEdits(document, [match.textEdit])).toEqual(expected.resultText);
    }
    if (expected.insertTextFormat) {
        expect(match.insertTextFormat).toEqual(expected.insertTextFormat);
    }
};

describe('Hive - Completion', () => {
    let testCompletionFor = function(value: string, expected: { count?: number, items?: ItemDescription[] }) {
        let offset = value.indexOf('|');
        value = value.substr(0, offset) + value.substr(offset + 1);

        let ls = hiveLanguageService.getLanguageService();


        let document = TextDocument.create('test://test/test.css', 'css', 0, value);
        let position = Position.create(0, offset);

        let jsonDoc = ls.parseProgram(document.getText());
        let list = ls.doComplete(document, position, jsonDoc);

        if (typeof expected.count === 'number') {
            expect(list.items).toEqual(expected.count);
        }
        if (expected.items) {
            for (let item of expected.items) {
                assertCompletion(list, item, document, offset);
            }
        }
    };
});

















