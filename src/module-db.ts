/* eslint-disable curly */
import { CommandParams, ModuleInfo, ModulesInfoMap, ModuleType } from './types';

export class ModuleDb {
    private static modules: ModulesInfoMap = {
        usedModules: [],
        unusedModules: [],
        installedModules: [],
        uninstalledModules: [],
    };

    public static fileMap: { [key: string]: Set<string> } = {};

    public static diffFileModules(
        newModules: Set<string>,
        oldModules: Set<string>
    ) {
        if (!oldModules) {
            return { add: newModules, remove: [] };
        } else {
            let add = [];
            let remove = [];
            for (const name of newModules) {
                if (!oldModules.has(name)) {
                    add.push(name);
                }
            }
            for (const name of oldModules) {
                if (!newModules.has(name)) {
                    remove.push(name);
                }
            }
            return { add, remove };
        }
    }

    public static setModules(modules: any) {
        this.modules = { ...this.modules, ...modules };
    }

    public static addModule(
        moduleType: 'used' | 'unused' | 'installed' | 'uninstalled',
        module: ModuleInfo
    ) {
        const index = this[`${moduleType}Modules`].findIndex(
            (m) => m.name === module.name
        );
        if (index === -1) {
            this[`${moduleType}Modules`].push(module);
        }
    }

    public static deleteModule(
        moduleType: ModuleType,
        moduleName: string,
        fsPath?: string
    ) {
        const modules = this[`${moduleType}Modules`];
        const removeIndexArray = modules.map((m, i) => {
            if (
                ((fsPath && fsPath === m.fsPath) || !fsPath) &&
                m.name === moduleName
            ) {
                return i;
            }
            return -1;
        });
        const res = modules.filter((v, i) => {
            if (removeIndexArray.includes(i)) {
                return false;
            }
            return true;
        });
        this.setModules({
            [`${moduleType}Modules`]: res,
        });
    }

    public static get usedModules() {
        return this.modules.usedModules;
    }

    public static get unusedModules() {
        return this.modules.unusedModules;
    }

    public static get installedModules() {
        return this.modules.installedModules;
    }

    public static get uninstalledModules() {
        return this.modules.uninstalledModules;
    }
}
