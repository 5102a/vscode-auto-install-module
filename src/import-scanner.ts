import * as vscode from 'vscode';
import { ModuleDb } from './module-db';
import { CommandParams, ModuleType, Options } from './types';
import { setWorkspacePath, isTestFile } from './utils';
import { ModuleHelper } from './module-helper';

export class ImportScanner {
    private showOutput: boolean | undefined;

    private filesToScan: string;

    constructor(private config: vscode.WorkspaceConfiguration) {
        this.filesToScan = this.config.get<string>('filesToScan') || '';
    }

    // 扫描文件
    public async scan(request: CommandParams) {
        ModuleHelper.startTime = Date.now();
        // 项目workspace
        const { workspace } = request;
        setWorkspacePath(workspace.uri.fsPath);
        const scanLocation =
            workspace === undefined
                ? this.filesToScan
                : new vscode.RelativePattern(workspace, this.filesToScan);

        const workspacePath = workspace?.uri.fsPath || '';
        // 全局搜索
        const [installedModules, usedModules] = await Promise.all([
            ModuleHelper.getInstalledModules(workspacePath),
            ModuleHelper.getUsedModules(scanLocation), // 所有文件依赖模块集合
        ]);

        // 未安装模块
        const uninstalledModules = ModuleHelper.getUninstalledModules(
            installedModules,
            usedModules
        );

        // 已安装未使用模块
        const unusedModules = ModuleHelper.getUnusedModules(
            installedModules,
            usedModules
        );
        ModuleDb.setModules({
            installedModules,
            uninstalledModules,
            usedModules,
            unusedModules,
        });

        // 执行安装
        vscode.commands.executeCommand('extension.autoInstallModules', {
            workspace,
        });
    }

    public async edit(request: CommandParams) {
        ModuleHelper.startTime = Date.now();
        const { workspace, uri } = request;
        const fsPath = uri.fsPath || workspace?.uri.fsPath || '';
        if (!fsPath) {
            return;
        }
        const usedModulesByFile = await ModuleHelper.getModulesInfoFromPath(
            fsPath
        );
        const newFileMap = new Set(usedModulesByFile.map((m) => m.name));
        const { add, remove } = ModuleDb.diffFileModules(
            newFileMap,
            ModuleDb.fileMap[fsPath]
        );
        ModuleDb.fileMap[fsPath] = newFileMap;
        add.forEach((name: string) => {
            ModuleDb.addModule('uninstalled', {
                name,
                dev: isTestFile(fsPath),
                fsPath,
            });
        });
        remove.forEach((name: string) => {
            ModuleDb.addModule('unused', {
                name,
                dev: isTestFile(fsPath),
                fsPath,
            });
        });
        const a = ModuleDb;
        vscode.commands.executeCommand('extension.autoInstallModules', {
            workspace,
        });
    }

    public delete(request: CommandParams): void {
        ModuleHelper.startTime = Date.now();
        const { workspace } = request;
        const fsPath = request.workspace.uri.fsPath || '';
        if (!fsPath) {
            return;
        }
        for (const name of ModuleDb.fileMap[fsPath]) {
            for (const type of ['used', 'unused', 'installed', 'uninstalled']) {
                ModuleDb.deleteModule(type as ModuleType, name, fsPath);
            }
        }
        vscode.commands.executeCommand('extension.autoInstallModules', {
            workspace,
        });
    }
}
