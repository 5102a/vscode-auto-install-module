import {
    readFile,
    readDir,
    getExtensionConfig,
    isValidModule,
    isTestFile,
    removeFilePaths,
    removeLocalFiles,
    removeBuiltInModules,
    LogHelper,
} from './utils';
import * as vscode from 'vscode';
const detective = require('detective');
const es6detective = require('detective-es6');
import * as Path from 'path';
import { ModuleInfo } from './types';
import { ModuleDb } from './module-db';
import * as parser from '@babel/parser';
const traverse = require('@babel/traverse');

export class ModuleHelper {
    public static startTime = Date.now();
    constructor() {}

    // 获取已安装的模块
    static async getInstalledModules(
        workspacePath: string
    ): Promise<ModuleInfo[]> {
        // 获取package.json路径
        const packagePath = Path.resolve(workspacePath, 'package.json');
        // 读取package.json文件
        let data = '';
        try {
            data = await readFile(packagePath);
        } catch (error) {
            console.error(`read package.json error`, error);
        }
        let packageJson = {
            dependencies: {},
            devDependencies: {},
            peerDependencies: {},
        };
        try {
            packageJson = JSON.parse(data);
        } catch (error) {
            console.error('parse package.json error', error);
        }

        const installedModules = [];
        const dependencies = packageJson.dependencies || [];
        const devDependencies = packageJson.devDependencies || [];
        const peerDependencies = packageJson.peerDependencies || [];

        for (let key of Object.keys(dependencies)) {
            installedModules.push({
                name: key,
                dev: false,
            });
        }
        for (let key of Object.keys(devDependencies)) {
            installedModules.push({
                name: key,
                dev: true,
            });
        }
        for (let key of Object.keys(peerDependencies)) {
            installedModules.push({
                name: key,
                dev: false,
            });
        }

        // 返回package.json中记录的包
        return installedModules;
    }

    // 过滤有效文件
    static filterInvalidFile(files: vscode.Uri[]) {
        return files.filter((f) => {
            return (
                f.fsPath.indexOf('typings') === -1 &&
                f.fsPath.indexOf('node_modules') === -1 &&
                f.fsPath.indexOf('jspm_packages') === -1 &&
                f.fsPath.indexOf('d.ts') === -1
            );
        });
    }

    // 全局扫描文件
    static getFilesByScanLocation(scanLocation: vscode.GlobPattern) {
        return vscode.workspace.findFiles(
            scanLocation,
            '**/node_modules/**',
            99999
        );
    }

    // 获取已使用的模块
    static async getUsedModules(
        scanLocation: vscode.GlobPattern
    ): Promise<ModuleInfo[]> {
        let usedModules: ModuleInfo[] = [];
        try {
            // 获取所有扫描文件uri
            let uris = await this.getFilesByScanLocation(scanLocation);
            // 过滤有效文件uri
            uris = this.filterInvalidFile(uris);
            for (let uri of uris) {
                const fsPath = uri.fsPath;
                const usedArray = await this.getModulesInfoFromPath(fsPath);
                if (!ModuleDb.fileMap[fsPath]) {
                    ModuleDb.fileMap[fsPath] = new Set(
                        usedArray.map((m) => m.name)
                    );
                } else {
                    usedArray.forEach((m) =>
                        ModuleDb.fileMap[fsPath].add(m.name)
                    );
                }
                // 通过路径获取文件中模块信息
                usedModules.push(...usedArray);
            }
        } catch (error) {
            console.error(error);
        }
        return usedModules;
    }

    static async getModulesInfoFromPath(fsPath: string): Promise<ModuleInfo[]> {
        const usedModules: { [key: string]: ModuleInfo } = {};
        try {
            // 获取文件中引用的所有模块
            const modulesFromFile = await this.getModulesFromFile(fsPath);
            // 判断是否为测试文件,dev下为测试文件
            const dev = isTestFile(fsPath);
            for (let name of modulesFromFile) {
                usedModules[name] = {
                    name,
                    dev,
                    fsPath,
                };
            }
        } catch (error) {
            console.error(error);
        }
        // 过滤内置、和本地模块
        return this.filterRegistryModules(Object.values(usedModules));
    }

    // 过滤不需要安装的包
    static filterRegistryModules(modules: ModuleInfo[]) {
        return removeBuiltInModules(removeFilePaths(removeLocalFiles(modules)));
    }

    // 获取未使用的模块
    static getUninstallModule(
        installedModules: ModuleInfo[],
        usedModules: ModuleInfo[]
    ) {
        const usedModuleMap: { [key: string]: boolean } = {};
        usedModules.forEach(({ name }) => {
            usedModuleMap[name] = true;
        });
        installedModules.filter(({ name }) => !usedModuleMap[name]);
    }

    // 从文件中获取依赖模块信息
    static async getModulesFromFile(path: string): Promise<string[]> {
        let content = '';
        try {
            content = await readFile(path);
        } catch (error) {
            console.error(error);
        }
        let modules: string[] = [];
        try {
            // ast分析模块
            const ast = parser.parse(content, {
                sourceType: 'module',
                plugins: [
                    'typescript',
                    'asyncDoExpressions',
                    'asyncGenerators',
                    'classPrivateMethods',
                    'classPrivateProperties',
                    'classProperties',
                    'classStaticBlock',
                    'decimal',
                    'doExpressions',
                    'dynamicImport',
                    'estree',
                    'exportDefaultFrom',
                    'exportNamespaceFrom',
                    'functionBind',
                    'functionSent',
                    'importMeta',
                    'jsx',
                    'importAssertions',
                    'logicalAssignment',
                    'moduleBlocks',
                    'moduleStringNames',
                    'nullishCoalescingOperator',
                    'numericSeparator',
                    'objectRestSpread',
                    'optionalCatchBinding',
                    'optionalChaining',
                    'partialApplication',
                ],
            });
            traverse(ast, {
                enter(dir: { node: any }) {
                    const { node } = dir;

                    switch (node.type) {
                        case 'ImportDeclaration':
                            if (node.source && node.source.value) {
                                modules.push(node.source.value);
                            }
                            break;
                        case 'ExportNamedDeclaration':
                        case 'ExportAllDeclaration':
                            if (node.source && node.source.value) {
                                modules.push(node.source.value);
                            }
                            break;
                        default:
                            return;
                    }
                },
            });
            // modules.push(
            //     ...detective(content, { parse: { sourceType: 'module' } })
            // );
            // // const res = parser.parse(content, { sourceType: 'module' });
            // // let es6modules = es6detective(content, {
            // //     parse: { sourceType: 'module' },
            // // });
            // // modules = modules.concat(es6modules);
            // 验证有效模块名
            modules = modules.filter((module: any) => isValidModule(module));
        } catch (err) {
            LogHelper.error(
                `Could not parse ${path}. There is a syntax error in file`
            );
        }
        return modules;
    }

    // 获取已使用未安装的模块
    static getUninstalledModules(
        installedModules: ModuleInfo[],
        usedModules: ModuleInfo[]
    ): ModuleInfo[] {
        const installedModuleMap: { [key: string]: boolean } = {};
        const used: { [key: string]: boolean } = {};

        installedModules.forEach(({ name }) => {
            installedModuleMap[name] = true;
        });
        return usedModules.filter(({ name }) => {
            if (used[name]) {
                return false;
            }
            used[name] = true;
            return !installedModuleMap[name];
        });
    }

    // 获取已安装,未使用的模块
    static getUnusedModules(
        installedModules: ModuleInfo[],
        usedModules: ModuleInfo[]
    ) {
        const usedModulesMap: { [key: string]: boolean } = {};
        const installed: { [key: string]: boolean } = {};
        usedModules.forEach(({ name }) => {
            usedModulesMap[name] = true;
        });
        return installedModules.filter(({ name }) => {
            if (installed[name]) {
                return false;
            }
            installed[name] = true;
            return !usedModulesMap[name];
        });
    }
}
