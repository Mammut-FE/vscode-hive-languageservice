<<<<<<< HEAD
import { Expr, getPath, Keyword, Node, NodeType, Select, SubSelect, TableName, Use } from '@mammut-fe/hive-parser';
=======
import {
    Expr,
    getPath,
    Identifier,
    Keyword,
    Node,
    NodeType,
    Select,
    SubSelect,
    TableName,
    Use
} from '@mammut-fe/hive-parser';
>>>>>>> bc1a604d110ec9a74a1ad8dde999cfcd6a831faa
import { Program } from '@mammut-fe/hive-parser/lib/nodes';
import {
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    InsertTextFormat,
    Position,
    Range,
    TextDocument,
    TextEdit
} from 'vscode-languageserver-types';
import { ICompletionParticipant } from '../hiveLanguageTypes';
import * as languageFacts from './languageFacts';

const SnippetFormat = InsertTextFormat.Snippet;

export class HiveCompletion {
    position: Position;
    offset: number;
    currentWord: string;
    textDocument: TextDocument;
    program: Program;
    defaultReplaceRange: Range;
    nodePath: Node[];
    completionParticipants: ICompletionParticipant[] = [];

    private getCompletionRange(existingNode: Node) {
        if (existingNode && existingNode.offset <= this.offset) {
            let end = existingNode.end !== -1 ? this.textDocument.positionAt(existingNode.end) : this.position;
            return Range.create(this.textDocument.positionAt(existingNode.offset + 1), end);
        }
        return this.defaultReplaceRange;
    }

    private getCurrentDatabase(offset: number) {
        const block = this.program.getBlockNode();

        const useNodes = block.getChildren().filter(node => {
            return node.type === NodeType.Use;
        });

        for (let i = useNodes.length - 1; i >= 0; i--) {
            let useNode = useNodes[i];

            if (offset > useNode.end) {
                return (useNode as Use).getUseDbName();
            }
        }

        return '';
    }

    private findBeforeExprNode(node: Expr): Node {
        let offset = node.offset - 1;
        let prev = this.program.findChildAtOffset(offset, true);

        while (prev.type === NodeType.Expr) {
            offset = prev.offset - 1;
            prev = this.program.findChildAtOffset(offset, true);
        }

        return prev;
    }

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

                if (node.type === NodeType.Use) {
                } else if (node.type === NodeType.SubSelect) {
                    this.getCompletionsForSelect(node, result);
                } else if (node.type === NodeType.SelectList) {
                    this.getCompletionsForSelect(node.findParent(NodeType.SubSelect), result);
                } else if (node.type === NodeType.TableName) {
                    this.getCompletionsForFrom(node, result);
                } else if (node.type === NodeType.Expr) {
                    this.getCompletionsForExpr(node as Expr, result);
                } else if (node.type === NodeType.Keyword) {
                    this.getCompletionsForKeywords(node as Keyword, result);
                } else if (node.parent === null) {
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

    public getValueEnumProposals(
        entry: languageFacts.IEntry,
        existingNode: Node,
        result: CompletionList
    ): CompletionList {
        if (entry.values) {
            for (let value of entry.values) {
                let insertString = value.name;
                let insertTextFormat;
                if (insertString.endsWith(')')) {
                    let from = insertString.lastIndexOf('(');
                    if (from !== -1) {
                        insertString = insertString.substr(0, from) + '($1)';
                        insertTextFormat = SnippetFormat;
                    }
                }

                if (value.needComma) {
                    insertString = insertString + ';';
                }

                let item: CompletionItem = {
                    label: value.name,
                    documentation: languageFacts.getEntryDescription(value),
                    textEdit: TextEdit.replace(this.getCompletionRange(existingNode), insertString),
                    kind: value.kind,
                    insertTextFormat,
                    sortText: 'z'
                };
                result.items.push(item);
            }
        }
        return result;
    }

    public getCompletionForProgram(result: CompletionList): CompletionList {
        if (this.program === null) {
            return this.getCompletionForTopLevel(result);
        }

        let node = this.program.findFirstChildBeforeOffset(this.offset);
        let prev: Node;

        if (!node) {
            return this.getCompletionForTopLevel(result);
        }

        while (node) {
            prev = node;
            node = node.findFirstChildBeforeOffset(this.offset);
        }

        if (prev instanceof Expr) {
            this.getCompletionsForExpr(prev, result);
        }

        if (prev.type === NodeType.ID) {
            this.getCompletionsForIdentifier(prev, result);
        }

        return result;
    }

    public getCompletionForTopLevel(result: CompletionList): CompletionList {
        this.getCompletionsForKeywords(null, result);
        this.getCompletionForFunctions(result);

        return result;
    }

    public getCompletionForFunctions(result: CompletionList): CompletionList {
        for (let entry of languageFacts.getFunctionsEntryList()) {
            result.items.push({
                label: entry.name,
                documentation: languageFacts.getEntryDescription(entry),
                kind: CompletionItemKind.Function
            });
        }

        return result;
    }

    public getCompletionsForKeywords(node: Node, result: CompletionList): CompletionList {
        if (node) {
            switch (node.getText().toLowerCase()) {
                case 'select':
                    this.getCompletionsForSelect(node, result);
                    break;
            }
        } else {
            for (let entry of languageFacts.getKeywordEntryList()) {
                result.items.push({
                    label: entry.name,
                    documentation: languageFacts.getEntryDescription(entry),
                    kind: CompletionItemKind.Keyword
                });
            }
        }

        return result;
    }

    public getCompletionsForExpr(node: Expr, result: CompletionList): CompletionList {
        switch (node.getText().toLowerCase()) {
            case 'use':
                this.getCompletionsForUse(node, result);
                break;
            case 'from':
                this.getCompletionsForFrom(node, result);
                break;
            case 'select':
                this.getCompletionsForSelect(node, result);
                break;
            case 'join':
                this.getCompletionsForJoin(node, result);
                break;
            default:
                this.getCompletionForTopLevel(result);
        }

        return result;
    }

    public getCompletionsForUse(node: Node, result: CompletionList): CompletionList {
        for (let entry of languageFacts.getUseStmtEntryList()) {
            this.getValueEnumProposals(entry, null, result);
        }

        for (let entry of languageFacts.getDatabaseEntryList()) {
            result.items.push({
                label: entry.name,
                documentation: languageFacts.getEntryDescription(entry),
                kind: CompletionItemKind.Text,
                textEdit: TextEdit.replace(this.getCompletionRange(null), entry.name + ';')
            });
        }

        return result;
    }

    public getCompletionsForFrom(node: Node, result: CompletionList): CompletionList {
        if (node.type === NodeType.Expr) {
            let prev = this.findBeforeExprNode(node);

            let selectNode = prev.findParent(NodeType.Select) as Select;

            if (selectNode) {
                this.getTableCompletionList(selectNode, result);
            }
        } else if (node.type === NodeType.TableName) {
            let [db] = (node as TableName).getTableName().split('.');

            for (let entry of languageFacts.getTableEntryList(db)) {
                result.items.push({
                    label: entry.name,
                    documentation: languageFacts.getEntryDescription(entry),
                    kind: CompletionItemKind.Text,
                    textEdit: TextEdit.replace(this.getCompletionRange((node as TableName).identifier.dotNode), entry.name)
                });
            }
        }

        return result;
    }

    public getCompletionsForSelect(node: Node, result: CompletionList): CompletionList {
        if (node instanceof Expr) {
            for (let entry of languageFacts.getSelectStmtEntryList()) {
                this.getValueEnumProposals(entry, null, result);
            }
        } else if (node instanceof Keyword || node instanceof SubSelect) {
            const subSelect = node.findParent(NodeType.SubSelect) as SubSelect;
            const selectCols = subSelect.getSelectCols();

            const fromTable = selectCols.filter(col => {
                return col.name.toLowerCase() === 'from';
            });

            if (fromTable.length > 0) {
                let _ = fromTable[0].aliasName.split('.');
                let dbName, tableName;

                if (_.length > 1) {
                    [dbName, tableName] = _;
                } else {
                    dbName = this.getCurrentDatabase(node.findParent(NodeType.Select).offset);
                    [tableName] = _;
                }

                for (let entry of languageFacts.getColumnEntryList(dbName, tableName)) {
                    result.items.push({
                        label: entry.name,
                        documentation: languageFacts.getEntryDescription(entry),
                        kind: CompletionItemKind.Text,
                        textEdit: TextEdit.replace(this.getCompletionRange(null), entry.name)
                    });
                }
            }
        }

        return result;
    }

    public getCompletionsForIdentifier(node: Node, result: CompletionList): CompletionList {
        if (node.findParent(NodeType.FromClause)) {
            this.getCompletionsForJoin(node, result);
        }

        return result;
    }

    public getCompletionsForJoin(node: Node, result: CompletionList): CompletionList {
        let selectNode;

        if (node.type === NodeType.ID) {
            selectNode = node.findParent(NodeType.Select) as Select;
        } else if (node.type === NodeType.Expr) {
            const prev = this.findBeforeExprNode(node);

            selectNode = prev.findParent(NodeType.Select) as Select;
        }

        if (selectNode) {
            this.getTableCompletionList(selectNode, result);
        }

        return result;
    }

    public getTableCompletionList(node: Node, result: CompletionList): CompletionList {
        let currentDatabase = this.getCurrentDatabase(node.offset);

        for (let entry of languageFacts.getTableEntryList(currentDatabase)) {
            result.items.push({
                label: entry.name,
                documentation: languageFacts.getEntryDescription(entry),
                kind: CompletionItemKind.Text,
                textEdit: TextEdit.replace(this.getCompletionRange(null), entry.name)
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
