import { AutoInstall } from './auto-install';
import * as vscode from 'vscode';
import { LogHelper } from './utils';

const config = vscode.workspace.getConfiguration('autoInstall');
LogHelper.log(config);

// 插件激活
export function activate(context: vscode.ExtensionContext) {
    try {
        const autoInstall = new AutoInstall(context);

        const start = autoInstall.start();

        if (!start) {
            return;
        }

        LogHelper.log('start');
        autoInstall.registerCommands();
        autoInstall.registerWatchers();
        autoInstall.scanIfRequired();
    } catch (error) {
        console.error(error);
    }
}

// 插件失活
export function deactivate() {}
