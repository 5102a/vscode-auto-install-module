import { ModuleHelper } from './module-helper';
import * as vscode from 'vscode';
import { ModuleDb } from './module-db';
import { InstallOptions, ModuleInfo, ModuleType, RemoveOptions } from './types';
import * as child_process from 'child_process';
import { LogHelper, getWorkspacePath, LOG_FLAG } from './utils';

export class InstallModules {
    constructor(private config: vscode.WorkspaceConfiguration) {}
    install() {
        const uninstalledModules = ModuleDb.uninstalledModules;
        uninstalledModules.forEach((module: ModuleInfo) => {
            const command = this.getInstallCommand(module);
            this.runCommand(command, getWorkspacePath()).then((res) => {
                // 成功
                if (!res) {
                    // 未安装已使用模块,安装,从未安装中移除,添加到已安装中
                    ModuleDb.deleteModule('uninstalled', module.name);
                    ModuleDb.deleteModule('unused', module.name);
                    ModuleDb.addModule('installed', module);
                    ModuleDb.addModule('used', module);
                }
            });
        });
    }

    remove() {
        const unusedModules = ModuleDb.unusedModules;
        unusedModules.forEach((module: ModuleInfo) => {
            const command = this.getRemoveCommand(module);
            this.runCommand(command, getWorkspacePath()).then((res) => {
                // 成功
                if (!res) {
                    // 已安装未使用的模块,移除,从已安装中移除,从未使用中移除
                    for (const type of [
                        'used',
                        'unused',
                        'installed',
                        'uninstalled',
                    ]) {
                        ModuleDb.deleteModule(
                            type as ModuleType,
                            module.name,
                            module.fsPath
                        );
                    }
                }
            });
        });
    }

    getRemoveCommand(options: RemoveOptions) {
        const { name, dev, packageManager = 'yarn' } = options;
        let command;
        if (packageManager === 'npm') {
            command = `npm uninstall ${name} --save${dev ? '-dev' : ''}`;
        } else {
            command = `yarn remove ${name}${dev ? ' --dev' : ''}`;
        }
        return command;
    }

    getInstallCommand(options: InstallOptions) {
        const { name, dev, packageManager = 'yarn', exact = false } = options;
        let command;
        if (packageManager === 'npm') {
            command = `npm install ${name} --save${dev ? '-dev' : ''}${
                exact ? ' --save-exact' : ''
            }`;
        } else {
            command = `yarn add ${name}${dev ? ' --dev' : ''}`;
            // yarn always adds exact
        }
        return command;
    }
    async runCommand(command: string, cwd?: string) {
        LogHelper.log(command);

        return new Promise((resolve, reject) => {
            try {
                child_process.exec(
                    command,
                    {
                        cwd,
                    },
                    (err, data, error) => {
                        if (err) {
                            LogHelper.error(err);
                            reject(1);
                            return;
                        }
                        vscode.window.showInformationMessage(
                            `${LOG_FLAG}${command} cost ${
                                Date.now() - ModuleHelper.startTime
                            }ms`
                        );
                        LogHelper.log(`${command} success!`);
                        resolve(0);
                    }
                );
            } catch (error) {
                LogHelper.error(`${command} fail!`, error);
                reject(1);
            }
        });
    }
}
