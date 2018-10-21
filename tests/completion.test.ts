import {
    CompletionItemKind,
    CompletionList,
    InsertTextFormat,
    Position,
    TextDocument
} from 'vscode-languageserver-types';
import * as hiveData from '../src/data/hive';
import * as hiveLanguageService from '../src/hiveLanguageService';

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
        const MOCK_DB_LENGTH = 2;
        const count = hiveData.data.keywords.length + hiveData.data.builtInFunctions.length + MOCK_DB_LENGTH;

        testCompletionFor('u|', { count });

        testCompletionFor(' |', { count });
    });

    test('use', function(): any {
        testCompletionFor('use |', {
            items: [
                {
                    label: 'school',
                    resultText: 'use school',
                    detail: 'database'
                },
                {
                    label: 'library',
                    resultText: 'use library',
                    detail: 'database'
                },
                {
                    label: 'default',
                    resultText: 'use default',
                    detail: 'keyword'
                }
            ]
        });

        testCompletionFor('use |;', {
            items: [
                {
                    label: 'school',
                    resultText: 'use school;',
                    detail: 'database'
                },
                {
                    label: 'library',
                    resultText: 'use library;',
                    detail: 'database'
                },
                {
                    label: 'default',
                    resultText: 'use default;',
                    detail: 'keyword'
                }
            ]
        });
    });

    test('Select: from clause', function(): any {
        testCompletionFor('select * from |', {
            items: [
                {
                    label: 'school',
                    resultText: 'select * from school',
                    detail: 'database'
                },
                {
                    label: 'library',
                    resultText: 'select * from library',
                    detail: 'database'
                }
            ]
        });

        testCompletionFor('use school; select * from |', {
            items: [
                {
                    label: 'student',
                    resultText: 'use school; select * from student',
                    detail: 'table'
                },
                {
                    label: 'course',
                    resultText: 'use school; select * from course',
                    detail: 'table'
                },
                {
                    label: 'school',
                    resultText: 'use school; select * from school',
                    detail: 'database'
                },
                {
                    label: 'library',
                    resultText: 'use school; select * from library',
                    detail: 'database'
                }
            ]
        });

        testCompletionFor('select * from school.|', {
            items: [
                {
                    label: 'student',
                    resultText: 'select * from school.student',
                    detail: 'table'
                },
                {
                    label: 'course',
                    resultText: 'select * from school.course',
                    detail: 'table'
                }
            ]
        });
    });

    test('Select: select_list clause', function(): any {
        testCompletionFor('SELECT | FROM school.student', {
            items: [
                {
                    label: 'name',
                    resultText: 'SELECT name FROM school.student',
                    detail: 'column'
                },
                {
                    label: 'id',
                    resultText: 'SELECT id FROM school.student',
                    detail: 'column'
                },
                {
                    label: '*',
                    resultText: 'SELECT * FROM school.student',
                    detail: 'keyword'
                }
            ]
        });

        testCompletionFor('use school; select | from student', {
            items: [
                {
                    label: 'name',
                    resultText: 'use school; select name from student',
                    detail: 'column'
                },
                {
                    label: 'id',
                    resultText: 'use school; select id from student',
                    detail: 'column'
                },
                {
                    label: '*',
                    resultText: 'use school; select * from student',
                    detail: 'keyword'
                }
            ]
        });

        testCompletionFor('SELECT id, | FROM school.student', {
            items: [
                {
                    label: 'name',
                    resultText: 'SELECT id, name FROM school.student',
                    detail: 'column'
                }
            ]
        });
    });

    test('Select: join clause', function() {
        testCompletionFor('SELECT * FROM school.student t1, |', {
            items: [
                {
                    label: 'library',
                    resultText: 'SELECT * FROM school.student t1, library',
                    detail: 'database'
                }
            ]
        });

        testCompletionFor('SELECT * FROM school.student t1, library.|', {
            items: [
                {
                    label: 'user',
                    resultText: 'SELECT * FROM school.student t1, library.user',
                    detail: 'table'
                }
            ]
        });

        testCompletionFor('SELECT * FROM school.student JOIN |', {
            items: [
                {
                    label: 'school',
                    resultText: 'SELECT * FROM school.student JOIN school',
                    detail: 'database'
                }
            ]
        });

        testCompletionFor('SELECT * FROM school.student JOIN school.|', {
            items: [
                {
                    label: 'student',
                    resultText: 'SELECT * FROM school.student JOIN school.student',
                    detail: 'table'
                }
            ]
        });

        testCompletionFor('SELECT * FROM school.student LEFT JOIN |', {
            items: [
                {
                    label: 'school',
                    resultText: 'SELECT * FROM school.student LEFT JOIN school',
                    detail: 'database'
                }
            ]
        });

        testCompletionFor('SELECT * FROM school.student LEFT JOIN school.|', {
            items: [
                {
                    label: 'course',
                    resultText: 'SELECT * FROM school.student LEFT JOIN school.course',
                    detail: 'table'
                }
            ]
        });
    });

    test('Select: select_list clause with from clause alias', function(): any {
        testCompletionFor('SELECT s.| FROM school.student s', {
            items: [
                {
                    label: 'name',
                    resultText: 'SELECT s.name FROM school.student s',
                    detail: 'column'
                },
                {
                    label: 'id',
                    resultText: 'SELECT s.id FROM school.student s',
                    detail: 'column'
                },
                {
                    label: '*',
                    resultText: 'SELECT s.* FROM school.student s',
                    detail: 'keyword'
                }
            ]
        });

        testCompletionFor('SELECT s.name, s.| FROM school.student s', {
            items: [
                {
                    label: 'id',
                    resultText: 'SELECT s.name, s.id FROM school.student s',
                    detail: 'column'
                },
                {
                    label: '*',
                    resultText: 'SELECT s.name, s.* FROM school.student s',
                    detail: 'keyword'
                }
            ]
        });

        testCompletionFor('SELECT s.name, c.| FROM school.student s, school.course c', {
            items: [
                {
                    label: 'id',
                    resultText: 'SELECT s.name, c.id FROM school.student s, school.course c',
                    detail: 'column'
                },
                {
                    label: '*',
                    resultText: 'SELECT s.name, c.* FROM school.student s, school.course c',
                    detail: 'keyword'
                }
            ]
        });

        testCompletionFor('use library; SELECT user.| FROM user JOIN book ON user.id = book.id', {
            items: [
                {
                    label: 'userid',
                    resultText: 'use library; SELECT user.userid FROM user JOIN book ON user.id = book.id',
                    detail: 'column'
                },
                {
                    label: '*',
                    resultText: 'use library; SELECT user.* FROM user JOIN book ON user.id = book.id',
                    detail: 'keyword'
                }
            ]
        });
    });

    test('Select: cte select', function(): any {
        testCompletionFor('with s as (select * from school.student) select * from |', {
            items: [
                {
                    label: 's',
                    resultText: 'with s as (select * from school.student) select * from s',
                    detail: 'table'
                },
                {
                    label: 'school',
                    resultText: 'with s as (select * from school.student) select * from school',
                    detail: 'database'
                }
            ]
        });

        testCompletionFor('with s as (select * from school.student) select * from school.|', {
            items: [
                {
                    label: 'student',
                    resultText: 'with s as (select * from school.student) select * from school.student',
                    detail: 'table'
                }
            ]
        });

        testCompletionFor('with s as (select * from school.student) select | from s', {
            items: [
                {
                    label: 'name',
                    resultText: 'with s as (select * from school.student) select name from s',
                    detail: 'column'
                },
                {
                    label: '*',
                    resultText: 'with s as (select * from school.student) select * from s',
                    detail: 'keyword'
                }
            ]
        });

        testCompletionFor('with s as (select id, name from school.student) select | from s', {
            items: [
                {
                    label: 'id',
                    resultText: 'with s as (select id, name from school.student) select id from s',
                    detail: 'column'
                },
                {
                    label: 'name',
                    resultText: 'with s as (select id, name from school.student) select name from s',
                    detail: 'column'
                },
                {
                    label: '*',
                    resultText: 'with s as (select id, name from school.student) select * from s',
                    detail: 'keyword'
                }
            ]
        });
    });

    test('Other', function(): any {
        testCompletionFor('drop table |', {
            items: [
                {
                    label: 'school',
                    resultText: 'drop table school',
                    detail: 'database'
                }
            ]
        });

        testCompletionFor('with t as (select * from |)', {
            items: [
                {
                    label: 'school',
                    resultText: 'with t as (select * from school)',
                    detail: 'database'
                }
            ]
        });

        testCompletionFor('drop table school.|', {
            items: [
                {
                    label: 'student',
                    resultText: 'drop table school.student',
                    detail: 'table'
                }
            ]
        });
    });

});
