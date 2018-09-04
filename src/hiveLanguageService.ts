import { CompletionList, Diagnostic, Position, TextDocument } from 'vscode-languageserver-types';

import { Parser } from '@mammut-fe/hive-parser';
import { Program } from '@mammut-fe/hive-parser/lib/nodes';
import { HiveCompletion } from './services/hiveCompletion';


export interface LanguageService {
    doValidation(text: string): Promise<Diagnostic[]>;

    doComplete(document: TextDocument, position: Position, program: Program): CompletionList;

    parseProgram(input: string): Program;
}

function createFacade(parser: Parser, completion: HiveCompletion): LanguageService {
    return {
        doComplete: completion.doComplete.bind(completion),
        doValidation: null,
        parseProgram: parser.parse.bind(parser)
    };
}

export function getLanguageService() {
    return createFacade(new Parser(), new HiveCompletion());
}
