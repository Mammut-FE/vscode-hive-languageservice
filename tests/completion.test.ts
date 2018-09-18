import * as hiveLanguageService from '../src/hiveLanguageService';
import * as hiveData from '../src/data/hive';

import {
    CompletionList,
    TextDocument,
    Position,
    CompletionItemKind,
    InsertTextFormat
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

export let assertCompletion = function(
    completions: CompletionList,
    expected: ItemDescription,
    document: TextDocument,
    offset: number
) {
    let matches = completions.items.filter(completion => {
        return completion.label === expected.label;
    });
    // if (expected.notAvailable) {
    //     test(expected.label + ' should not be present', () => {
    //         expect(matches.length).toEqual(0);
    //     });
    // } else {
    //     test(
    //         expected.label + ' should only existing once: Actual: ' + completions.items.map(c => c.label).join(', '),
    //         () => {
    //             expect(matches.length).toEqual(1);
    //         }
    //     );
    // }

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
    let testCompletionFor = function(value: string, expected: { count?: number; items?: ItemDescription[] }) {
        let offset = value.indexOf('|');
        value = value.substr(0, offset) + value.substr(offset + 1);

        let ls = hiveLanguageService.getLanguageService();

        let document = TextDocument.create('test://test/test.hive', 'hive', 0, value);
        let position = Position.create(0, offset);

        let jsonDoc = ls.parseProgram(document.getText());
        let list = ls.doComplete(document, position, jsonDoc);

        if (typeof expected.count === 'number') {
            expect(list.items.length).toEqual(expected.count);
        }
        if (expected.items) {
            for (let item of expected.items) {
                assertCompletion(list, item, document, offset);
            }
        }
    };

    test('top level', function(): any {
        testCompletionFor('u|', { count: hiveData.data.keywords.length + hiveData.data.builtInFunctions.length });

        testCompletionFor(' |', { count: hiveData.data.keywords.length + hiveData.data.builtInFunctions.length });
    });

    test('use', function(): any {
        testCompletionFor('use |', {
            items: [
                {
                    label: 'db1',
                    resultText: 'use db1;'
                },
                {
                    label: 'database2',
                    resultText: 'use database2;'
                },
                {
                    label: 'DEFAULT',
                    resultText: 'use DEFAULT;'
                }
            ]
        });
    });

    test('Select: from clause', function(): any {
        testCompletionFor('select * from |', {
            items: [
                {
                    label: 'db1.db1-table1',
                    resultText: 'select * from db1.db1-table1'
                },
                {
                    label: 'database2.database2-table1',
                    resultText: 'select * from database2.database2-table1'
                }
            ]
        });

        testCompletionFor('use db1; select * from |', {
            items: [
                {
                    label: 'db1-table1',
                    resultText: 'use db1; select * from db1-table1'
                },
                {
                    label: 'db1-table2',
                    resultText: 'use db1; select * from db1-table2'
                }
            ]
        });
    });

    test('Select: select_list clause', function(): any {
        testCompletionFor('SELECT | FROM db1.db1_table1', {
            items: [
                {
                    label: 'col1',
                    resultText: 'SELECT col1 FROM db1.db1_table1'
                },
                {
                    label: 'col2',
                    resultText: 'SELECT col2 FROM db1.db1_table1'
                },
                {
                    label: '*',
                    resultText: 'SELECT * FROM db1.db1_table1'
                }
            ]
        });

        testCompletionFor('use db1; select | from db1_table1', {
            items: [
                {
                    label: 'col1',
                    resultText: 'use db1; select col1 from db1_table1'
                },
                {
                    label: 'col2',
                    resultText: 'use db1; select col2 from db1_table1'
                },
                {
                    label: '*',
                    resultText: 'use db1; select * from db1_table1'
                }
            ]
        });

        testCompletionFor('SELECT col1, | FROM db1.db1_table1', {
            items: [
                {
                    label: 'col2',
                    resultText: 'SELECT col1, col2 FROM db1.db1_table1'
                }
            ]
        });
    });
});
