import { Node, getPath } from '@mammut-fe/hive-parser';
import { Program } from '@mammut-fe/hive-parser/lib/nodes';
import * as languageFacts from './languageFacts';
import { ICompletionParticipant } from '../hiveLanguageTypes';
import {
    TextDocument,
    Position,
    Range,
    CompletionList,
    CompletionItemKind,
    TextEdit
} from 'vscode-languageserver-types';

export class HiveCompletion {
    position: Position;
    offset: number;
    currentWord: string;
    textDocument: TextDocument;
    program: Program;
    defaultReplaceRange: Range;
    nodePath: Node[];
    completionParticipants: ICompletionParticipant[] = [];

    public doComplete(document: TextDocument, position: Position, program: Program): CompletionList {
        this.offset = document.offsetAt(position);
        this.position = position;
        this.currentWord = getCurrentWord(document, this.offset);
        this.defaultReplaceRange = Range.create(
            Position.create(this.position.line, this.position.character - this.currentWord.length),
            this.position
        );
        this.textDocument = document;
        this.program = program;
        try {
            let result: CompletionList = { isIncomplete: false, items: [] };
            this.nodePath = getPath(this.program, this.offset);

            for (let i = this.nodePath.length - 1; i >= 0; i--) {
                let node = this.nodePath[i];

                if (node.parent === null) {
                    this.getCompletionForTopLevel(result);
                } else {
                    continue;
                }

                if (result.items.length > 0 || this.offset > node.offset) {
                    return this.finalize(result);
                }
            }

            this.getCompletionForProgram(result);

            return this.finalize(result);
        } finally {
            // don't hold on any state, clear symbolContext
            this.position = null;
            this.currentWord = null;
            this.textDocument = null;
            this.program = null;
            this.defaultReplaceRange = null;
            this.nodePath = null;
        }
    }

    private finalize(result: CompletionList): CompletionList {
        let needSortText = result.items.some(i => !!i.sortText);
        if (needSortText) {
            for (let i of result.items) {
                if (!i.sortText) {
                    i.sortText = 'd';
                }
            }
        }
        return result;
    }

    protected getCompletionRange(existingNode: Node) {
        if (existingNode && existingNode.offset <= this.offset) {
            let end = existingNode.end !== -1 ? this.textDocument.positionAt(existingNode.end) : this.position;
            return Range.create(this.textDocument.positionAt(existingNode.offset), end);
        }
        return this.defaultReplaceRange;
    }

    public getCompletionForProgram(result: CompletionList): CompletionList {
        this.getCompletionForTopLevel(result);
        return result;
    }

    public getCompletionForTopLevel(result: CompletionList): CompletionList {
        this.getCompletionsForKeywords(result);
        this.getCompletionForFunctions(result);
        return result;
    }

    public getCompletionForFunctions(result: CompletionList): CompletionList {
        for (let entry of languageFacts.getFunctionsEntryList()) {
            result.items.push({
                label: entry.name,
                textEdit: TextEdit.replace(this.getCompletionRange(null), entry.name),
                documentation: languageFacts.getEntryDescription(entry),
                kind: CompletionItemKind.Function
            });
        }

        return result;
    }

    public getCompletionsForKeywords(result: CompletionList): CompletionList {
        for (let entry of languageFacts.getKeywordEntryList()) {
            result.items.push({
                label: entry.name,
                textEdit: TextEdit.replace(this.getCompletionRange(null), entry.name),
                documentation: languageFacts.getEntryDescription(entry),
                kind: CompletionItemKind.Keyword
            });
        }

        return result;
    }

}

function getCurrentWord(document: TextDocument, offset: number) {
    let i = offset - 1;
    let text = document.getText();
    while (i >= 0 && ' \t\n\r":{[()]},*>+'.indexOf(text.charAt(i)) === -1) {
        i--;
    }
    return text.substring(i + 1, offset);
}
