import * as vscode from 'vscode';
import { ImportScanner } from './import-scanner';
import { InstallModules } from './install-modules';
import { CommandParams, Options } from './types';
import { getExtensionConfig, hasFolders } from './utils';

export class AutoInstall {
    constructor(private context: vscode.ExtensionContext) {}

    // 注册指令
    public registerCommands() {
        // 注册安装指令
        const nodeScanner = vscode.commands.registerCommand(
            'extension.autoInstallModules',
            () => {
                new InstallModules(getExtensionConfig()).install();
                new InstallModules(getExtensionConfig()).remove();
            }
        );

        // 注册扫描指令
        const importScan = vscode.commands.registerCommand(
            'extension.importScanModules',
            (request: CommandParams) => {
                let scanner = new ImportScanner(getExtensionConfig());

                if (request.showOutput) {
                    // 扫描安装
                    scanner.scan(request);
                } else if (request.edit) {
                    // 编辑
                    scanner.edit(request);
                } else if (request.delete) {
                    // 删除文件
                    scanner.delete(request);
                }
            }
        );

        // 注销
        this.context.subscriptions.push(importScan, nodeScanner);
    }

    // 注册文件监听
    public registerWatchers() {
        const multiWorkspace = vscode.workspace.workspaceFolders || [undefined];

        // 兼容单个、多个workspace
        multiWorkspace.forEach((workspace) => {
            const scanFileGlob =
                vscode.workspace
                    .getConfiguration('autoInstall')
                    .get<string>('filesToScan') || '';

            const globPattern = workspace
                ? new vscode.RelativePattern(workspace, scanFileGlob)
                : scanFileGlob;

            // 创建监听器
            const watcher =
                vscode.workspace.createFileSystemWatcher(globPattern);

            // 命令处理
            const commandHandler = (options: Options) => {
                return (uri: vscode.Uri) => {
                    vscode.commands.executeCommand(
                        'extension.importScanModules',
                        {
                            workspace,
                            uri,
                            ...options,
                        }
                    );
                };
            };

            // 文件变动
            watcher.onDidChange(commandHandler({ edit: true }));

            // 文件新增
            watcher.onDidCreate(commandHandler({ edit: true }));

            // 文件删除
            watcher.onDidDelete(commandHandler({ delete: true }));
        });
    }

    // 初始扫描
    public scanIfRequired(): void {
        const settings = this.context.workspaceState.get<any>(
            'auto-install-modules-settings'
        );

        const firstRun = settings === undefined || settings.firstRun;

        const multiWorkspace = vscode.workspace.workspaceFolders || [undefined];

        // 扫描所有workspace
        multiWorkspace.forEach((workspace) => {
            vscode.commands.executeCommand('extension.importScanModules', {
                workspace,
                showOutput: true,
            });
        });

        // settings.firstRun = true;

        this.context.workspaceState.update(
            'auto-install-modules-settings',
            settings
        );
    }

    public start(): boolean {
        // 检查workspace
        return hasFolders();
    }
}
