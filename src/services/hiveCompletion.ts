import {
    Expr,
    getPath,
    ICol,
    Keyword,
    Node,
    NodeType,
    Program,
    Select,
    SubSelect,
    TableName,
    Use
} from '@mammut-fe/hive-parser';
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
import { ICompletionParticipant, IDatabase } from '../hiveLanguageTypes';
import { updateDatabase } from './databaseService';
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

    private getCompletionRangeFromNode(existingNode: Node): Range {
        if (existingNode && existingNode.offset <= this.offset) {
            const index = existingNode.getText().indexOf('.');
            let end, start;

            if (index > -1) {
                start = this.textDocument.positionAt(existingNode.offset + index + 1);
                end = start;
            } else {
                start = this.textDocument.positionAt(existingNode.offset + 1);
                end = existingNode.end !== -1 ? this.textDocument.positionAt(existingNode.end) : this.position;
            }

            return Range.create(start, end);
        }

        return this.defaultReplaceRange;
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

    private findBeforeSemicolonExpr(node: Node): Node {
        let offset = node.offset - 1;
        let prev = this.program.findChildAtOffset(offset, true);

        while (prev.type !== NodeType.Expr) {
            offset = prev.offset - 1;
            prev = this.program.findChildAtOffset(offset, true);
        }

        return prev;
    }

    private getCurrentDatabase(offset: number): string {
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

        return null;
    }

    private getCurrentTableInfo(node: Node, str: string) {
        let [dbName, tableName] = str.split('.');
        let columns: ICol[] = [];

        const select = node.findParent(NodeType.Select) as Select;
        const cteTables = select.getCteTables();

        if (cteTables.length > 0) {
            const rawTale = cteTables.filter(cteTable => {
                return cteTable.name === dbName;
            })[0];

            if (rawTale) {
                const { origin } = rawTale;
                const fromTables = origin.getFromTables();

                if (fromTables.length === 1) {
                    [dbName, tableName] = (fromTables[0].rawTable as string).split('.');
                }

                columns = origin.getSelectCols();
            }
        }

        if (tableName === undefined) {
            tableName = dbName;
            dbName = this.getCurrentDatabase(node.findParent(NodeType.Select).offset);
        }

        return {
            dbName,
            tableName,
            columns
        };
    }

    public doComplete(
        document: TextDocument,
        position: Position,
        program: Program,
        databases?: IDatabase[]
    ): CompletionList {
        this.offset = document.offsetAt(position);
        this.position = position;
        this.currentWord = getCurrentWord(document, this.offset);
        this.defaultReplaceRange = Range.create(
            Position.create(this.position.line, this.position.character - this.currentWord.length),
            this.position
        );
        this.textDocument = document;
        this.program = program;

        if (databases) {
            updateDatabase(databases);
        }

        try {
            let result: CompletionList = { isIncomplete: false, items: [] };
            this.nodePath = getPath(this.program, this.offset);

            for (let i = this.nodePath.length - 1; i >= 0; i--) {
                let node = this.nodePath[i];

                if (node.type === NodeType.Use) {
                } else if (node.type === NodeType.SubSelect) {
                    this.getCompletionsForSelectList(node, result);
                } else if (node.type === NodeType.SelectList) {
                    this.getCompletionsForSelectList(node.findParent(NodeType.SubSelect), result);
                } else if (node.type === NodeType.TableName) {
                    this.getCompletionsForFrom(node, result);
                } else if (node.type === NodeType.Expr) {
                    this.getCompletionsForExpr(node as Expr, result);
                } else if (node.type === NodeType.Keyword) {
                    this.getCompletionsForKeywords(node as Keyword, result);
                } else if (node.type === NodeType.Semicolon) {
                    this.getCompletionsSemicolon(node, result);
                } else if (node.parent === null) {
                    this.getCompletionsForTopLevel(result);
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

                let item: CompletionItem = {
                    label: value.name,
                    documentation: languageFacts.getEntryDescription(value),
                    textEdit: TextEdit.replace(this.getCompletionRangeFromNode(existingNode), insertString),
                    kind: value.kind,
                    insertTextFormat,
                    sortText: 'e',
                    detail: value.detail
                };
                result.items.push(item);
            }
        }
        return result;
    }

    public getCompletionForProgram(result: CompletionList): CompletionList {
        if (this.program === null) {
            return this.getCompletionsForTopLevel(result);
        }

        let node = this.program.findFirstChildBeforeOffset(this.offset);
        let prev: Node;

        if (!node) {
            return this.getCompletionsForTopLevel(result);
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

    public getCompletionsForTopLevel(result: CompletionList): CompletionList {
        if (this.currentWord.endsWith('.')) {
            const [dbName] = this.currentWord.split('.');

            for (let entry of languageFacts.getTableEntryList(dbName)) {
                result.items.push({
                    label: entry.name,
                    documentation: languageFacts.getEntryDescription(entry),
                    kind: CompletionItemKind.Text,
                    textEdit: TextEdit.replace(Range.create(this.defaultReplaceRange.end, this.defaultReplaceRange.end), entry.name),
                    detail: entry.detail
                });
            }
        } else {
            this.getCompletionsForKeywords(null, result);
            this.getCompletionsForFunctions(result);

            this.getCompletionsForDatabase(null, result, 'z');
        }

        return result;
    }

    public getCompletionsForFunctions(result: CompletionList): CompletionList {
        for (let entry of languageFacts.getFunctionsEntryList()) {
            result.items.push({
                label: entry.name,
                documentation: languageFacts.getEntryDescription(entry),
                kind: CompletionItemKind.Function,
                detail: 'function',
                sortText: 'g'
            });
        }

        return result;
    }

    public getCompletionsForKeywords(node: Node, result: CompletionList): CompletionList {
        if (node) {
            switch (node.getText().toLowerCase()) {
                case 'select':
                    this.getCompletionsForSelectList(node, result);
                    break;
            }
        } else {
            for (let entry of languageFacts.getKeywordEntryList()) {
                result.items.push({
                    label: entry.name,
                    documentation: languageFacts.getEntryDescription(entry),
                    kind: CompletionItemKind.Keyword,
                    detail: 'keyword',
                    sortText: 'f'
                });
            }
        }

        return result;
    }

    public getCompletionsForExpr(node: Expr, result: CompletionList): CompletionList {
        const exprText = node.getText().toLowerCase();

        if (exprText.indexOf('.') !== -1) {
            if (node.parent.type === NodeType.SelectListItem) {
                const [aliasName] = exprText.split('.');
                this.getCompletionsForSelectList(node, result, aliasName);
            } else {
                const [dbName] = exprText.split('.');

                this.getCompletionsForTable(node, result, dbName, 'a');
            }
        } else {
            switch (node.getText().toLowerCase()) {
                case 'use':
                    this.getCompletionsForUse(node, result);
                    break;
                case 'from':
                    this.getCompletionsForFrom(node, result);
                    break;
                case 'select':
                    this.getCompletionsForSelectList(node, result);
                    break;
                case 'join':
                    this.getCompletionsForJoin(node, result);
                    break;
                default:
                    this.getCompletionsForTopLevel(result);
            }
        }

        return result;
    }

    public getCompletionsForUse(node: Node, result: CompletionList): CompletionList {
        for (let entry of languageFacts.getUseStmtEntryList()) {
            this.getValueEnumProposals(entry, null, result);
        }

        this.getCompletionsForDatabase(null, result, 'a');

        return result;
    }

    public getCompletionsForFrom(node: Node, result: CompletionList): CompletionList {
        if (node.type === NodeType.TableName) {
            /**
             * select * from db.|
             * 优先提示 db 对应的表
             */

            let [db] = (node as TableName).getTableName().split('.');
            this.getCompletionsForTable(node, result, db, 'a');
        } else if (node.type === NodeType.Expr) {
            /**
             * select * from |
             * 依次提示 cte_table, use db, 所有的 db
             */

            const prev = this.findBeforeExprNode(node);

            const selectNode = prev.findParent(NodeType.Select) as Select;

            if (selectNode) {
                this.getTableCompletionList(selectNode, result);
            }
        }

        return result;
    }

    public getCompletionsForSelectList(node: Node, result: CompletionList, tableAliasName?: string): CompletionList {
        if (node instanceof Expr) {
            if (tableAliasName) {
                const subSelect = node.findParent(NodeType.SubSelect) as SubSelect;
                const fromTables = subSelect.getFromTables();
                const { rawTable } = fromTables.filter(({ rawTable, aliasName }) => {
                    return aliasName ? aliasName === tableAliasName : rawTable === tableAliasName;
                })[0];

                if (rawTable) {
                    const { dbName, tableName, columns } = this.getCurrentTableInfo(node, rawTable as string);

                    for (let entry of languageFacts.getColumnEntryList(dbName, tableName, columns)) {
                        result.items.push({
                            label: entry.name,
                            documentation: languageFacts.getEntryDescription(entry),
                            kind: CompletionItemKind.Text,
                            textEdit: TextEdit.replace(this.getCompletionRangeFromNode(node), entry.name),
                            detail: entry.detail,
                            sortText: 'a'
                        });
                    }
                }
            }

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
                const { dbName, tableName, columns } = this.getCurrentTableInfo(node, fromTable[0].aliasName);

                for (let entry of languageFacts.getColumnEntryList(dbName, tableName, columns)) {
                    result.items.push({
                        label: entry.name,
                        documentation: languageFacts.getEntryDescription(entry),
                        kind: CompletionItemKind.Text,
                        textEdit: TextEdit.replace(this.getCompletionRangeFromNode(null), entry.name),
                        detail: entry.detail,
                        sortText: 'a'
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

    public getTableCompletionList(node: Select, result: CompletionList): CompletionList {
        const cteTables = node.getCteTables();

        for (let entry of languageFacts.getCteTableEntryList(cteTables)) {
            result.items.push({
                label: entry.name,
                documentation: languageFacts.getEntryDescription(entry),
                kind: CompletionItemKind.Variable,
                textEdit: TextEdit.replace(this.getCompletionRangeFromNode(null), entry.name),
                detail: entry.detail,
                sortText: 'a'
            });
        }

        const currentDatabase = this.getCurrentDatabase(node.offset);

        if (currentDatabase) {
            this.getCompletionsForTable(null, result, currentDatabase, 'b');
        }

        this.getCompletionsForDatabase(null, result, 'c');

        return result;
    }

    private getCompletionsSemicolon(node: Node, result: CompletionList): CompletionList {
        const prevNode = this.findBeforeSemicolonExpr(node);

        this.getCompletionsForExpr(prevNode as Expr, result);

        return result;
    }

    private getCompletionsForDatabase(node: Node, result: CompletionList, sortText = 'd') {
        for (let entry of languageFacts.getDatabaseEntryList()) {
            result.items.push({
                label: entry.name,
                documentation: languageFacts.getEntryDescription(entry),
                kind: CompletionItemKind.Text,
                textEdit: TextEdit.replace(this.getCompletionRangeFromNode(node), entry.name),
                detail: entry.detail,
                sortText: sortText
            });
        }
    }

    private getCompletionsForTable(node: Node, result: CompletionList, databaseName: string, sortText = 'd') {
        for (let entry of languageFacts.getTableEntryList(databaseName)) {
            result.items.push({
                label: entry.name,
                documentation: languageFacts.getEntryDescription(entry),
                kind: CompletionItemKind.Text,
                textEdit: TextEdit.replace(this.getCompletionRangeFromNode(node), entry.name),
                detail: entry.detail,
                sortText
            });
        }
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
