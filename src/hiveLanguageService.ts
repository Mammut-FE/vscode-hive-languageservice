import { CompletionList, Diagnostic } from 'vscode-languageserver-types';

export interface LanguageService {
  doValidation(text: string): Promise<Diagnostic[]>;
  
  doComplete(): CompletionList;
}

function createFacade(): LanguageService {
  return {
    doComplete: null,
    doValidation: null
  };
}

export function getLanguageService() {
  return createFacade();
}
