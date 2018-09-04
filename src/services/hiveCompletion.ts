import { Program, Node, getPath } from '@mammut-fe/hive-parser';
import { ICompletionParticipant } from '../hiveLanguageTypes';
import { TextDocument, Position, Range, CompletionList } from 'vscode-languageserver-types';

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

            for (let i = this.nodePath.length - 1; i > 0; i--) {
                let node = this.nodePath[i];
                console.log(node);
            }

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
}

function getCurrentWord(document: TextDocument, offset: number) {
    let i = offset - 1;
    let text = document.getText();
    while (i >= 0 && ' \t\n\r":{[()]},*>+'.indexOf(text.charAt(i)) === -1) {
        i--;
    }
    return text.substring(i + 1, offset);
}
