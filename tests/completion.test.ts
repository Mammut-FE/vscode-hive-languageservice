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

        let text = document.getText();
        let wordAtOffset = text[offset - 1];

        if (wordAtOffset === '.' || wordAtOffset === ',') {
            text = text.substr(0, offset) + 'PLACEHOLDER' + text.substr(offset);
        }

        let jsonDoc = ls.parseProgram(text);

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
                    label: 'school',
                    resultText: 'use school;'
                },
                {
                    label: 'library',
                    resultText: 'use library;'
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
                    label: 'school.student',
                    resultText: 'select * from school.student'
                },
                {
                    label: 'library.book',
                    resultText: 'select * from library.book'
                }
            ]
        });

        testCompletionFor('use school; select * from |', {
            items: [
                {
                    label: 'student',
                    resultText: 'use school; select * from student'
                },
                {
                    label: 'course',
                    resultText: 'use school; select * from course'
                }
            ]
        });

        testCompletionFor('select * from school.|', {
            items: [
                {
                    label: 'student',
                    resultText: 'select * from school.student'
                },
                {
                    label: 'course',
                    resultText: 'select * from school.course'
                }
            ]
        });
    });

    test('Select: select_list clause', function(): any {
        testCompletionFor('SELECT | FROM school.student', {
            items: [
                {
                    label: 'name',
                    resultText: 'SELECT name FROM school.student'
                },
                {
                    label: 'id',
                    resultText: 'SELECT id FROM school.student'
                },
                {
                    label: '*',
                    resultText: 'SELECT * FROM school.student'
                }
            ]
        });

        testCompletionFor('use school; select | from student', {
            items: [
                {
                    label: 'name',
                    resultText: 'use school; select name from student'
                },
                {
                    label: 'id',
                    resultText: 'use school; select id from student'
                },
                {
                    label: '*',
                    resultText: 'use school; select * from student'
                }
            ]
        });

        testCompletionFor('SELECT id, | FROM school.student', {
            items: [
                {
                    label: 'name',
                    resultText: 'SELECT id, name FROM school.student'
                }
            ]
        });
    });

    test('Select: join clause', function() {
        testCompletionFor('SELECT * FROM school.student t1, |', {
            items: [
                {
                    label: 'library.user',
                    resultText: 'SELECT * FROM school.student t1, library.user'
                }
            ]
        });

        testCompletionFor('SELECT * FROM school.student JOIN |', {
            items: [
                {
                    label: 'school.course',
                    resultText: 'SELECT * FROM school.student JOIN school.course'
                }
            ]
        });

        testCompletionFor('SELECT * FROM school.student LEFT JOIN |', {
            items: [
                {
                    label: 'school.course',
                    resultText: 'SELECT * FROM school.student LEFT JOIN school.course'
                }
            ]
        });
    });

    test('Select: select_list clause with from clause alias', function(): any {
        testCompletionFor('SELECT s.| FROM school.student s', {
            items: [
                {
                    label: 'name',
                    resultText: 'SELECT s.name FROM school.student s'
                },
                {
                    label: 'id',
                    resultText: 'SELECT s.id FROM school.student s'
                },
                {
                    label: '*',
                    resultText: 'SELECT s.* FROM school.student s'
                }
            ]
        });

        testCompletionFor('SELECT s.name, s.| FROM school.student s', {
            items: [
                {
                    label: 'id',
                    resultText: 'SELECT s.name, s.id FROM school.student s'
                },
                {
                    label: '*',
                    resultText: 'SELECT s.name, s.* FROM school.student s'
                }
            ]
        });

        testCompletionFor('SELECT s.name, c.| FROM school.student s, school.course c', {
            items: [
                {
                    label: 'id',
                    resultText: 'SELECT s.name, c.id FROM school.student s, school.course c'
                },
                {
                    label: '*',
                    resultText: 'SELECT s.name, c.* FROM school.student s, school.course c'
                }
            ]
        });

        testCompletionFor('use library; SELECT user.| FROM user JOIN book ON user.id = book.id', {
            items: [
                {
                    label: 'userid',
                    resultText: 'use library; SELECT user.userid FROM user JOIN book ON user.id = book.id'
                },
                {
                    label: '*',
                    resultText: 'use library; SELECT user.* FROM user JOIN book ON user.id = book.id'
                }
            ]
        });
    });
});
