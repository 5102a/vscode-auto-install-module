import * as vscode from 'vscode';
import * as FS from 'fs';
import { Module, ModuleInfo } from './types';

const isBuiltInModule = require('is-builtin-module');
export const LOG_FLAG = '[Auto Install Module] ';

export const hasFolders = () => {
    return !!vscode.workspace.workspaceFolders;
};

export const isMultiWorkspace = () => {
    return !!(
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
    );
};

export const getExtensionConfig = () => {
    return vscode.workspace.getConfiguration('autoInstall');
};

export const readFile = (path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        FS.readFile(
            path,
            'utf8',
            (err: NodeJS.ErrnoException | null, data: string) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            }
        );
    });
};

export const readDir = (path: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        FS.readdir(
            path,
            (err: NodeJS.ErrnoException | null, files: string[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(files);
            }
        );
    });
};

// 验证有效模块
export const isValidModule = ({ name }: { name: string }) => {
    const regex = new RegExp('^([a-z0-9-_]{1,})$');
    return regex.test(name);
};

export const isTestFile = (name: string) =>
    name.endsWith('.spec.js') || name.endsWith('.test.js');

export const removeLocalFiles = (modules: ModuleInfo[]) =>
    modules.filter((module) => !module.name.includes('./'));

export const removeFilePaths = (modules: ModuleInfo[]) => {
    for (let module of modules) {
        const slicedName = module.name.split('/')[0];
        if (slicedName.slice(0, 1) !== '@') {
            module.name = slicedName;
        }
    }
    return modules;
};

export const removeBuiltInModules = (modules: ModuleInfo[]) =>
    modules.filter((module) => !isBuiltInModule(module.name));

export class LogHelper {
    static log(...rest: any[]) {
        console.log(`${LOG_FLAG} `, ...rest);
    }
    static error(...rest: any[]) {
        console.error(`${LOG_FLAG} `, ...rest);
    }
    static warn(...rest: any[]) {
        console.warn(`${LOG_FLAG} `, ...rest);
    }
    static info(...rest: any[]) {
        console.info(`${LOG_FLAG} `, ...rest);
    }
    static debug(...rest: any[]) {
        console.error(`${LOG_FLAG} `, ...rest);
    }
}

let workspacePath = '';
export const setWorkspacePath = (path: string) => {
    workspacePath = path;
};

export const getWorkspacePath = () => {
    return workspacePath;
};
