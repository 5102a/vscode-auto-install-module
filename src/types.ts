import * as vscode from 'vscode';
export interface Options {
    edit?: boolean;
    delete?: boolean;
    showOutput?: boolean;
}

export interface CommandParams extends Options {
    workspace: vscode.WorkspaceFolder;
    uri: vscode.Uri;
}

export interface ModuleInfo {
    name: string;
    dev: boolean;
    fsPath?: string;
}

export interface InstallOptions extends ModuleInfo {
    packageManager?: string;
    exact?: boolean;
}

export interface RemoveOptions extends ModuleInfo {
    packageManager?: string;
}

export interface Module {
    name: string;
}

export interface ModulesInfoMap {
    [key: string]: ModuleInfo[];
}

export type ModuleType = 'used' | 'unused' | 'installed' | 'uninstalled';
