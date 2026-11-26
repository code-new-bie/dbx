import type { ContextMenuItem } from "@/components/ui/CustomContextMenu.vue";
import type { FrontendPluginRegistry } from "./frontendPlugin";

export interface SqlFilePluginContext {
  kind: "file" | "folder";
  path: string;
  rootPath: string;
}

/** No editor contents, credentials or SQL connection metadata cross this boundary. */
export function buildSqlFilePluginMenuItems(registry: FrontendPluginRegistry, target: SqlFilePluginContext, open: (pluginId: string, workbenchId: string, title: string, context: Record<string, unknown>) => void): ContextMenuItem[] {
  if (!target.path || !target.rootPath) return [];
  const context = { sqlFile: { kind: target.kind, path: target.path, rootPath: target.rootPath } };
  return registry.listContextMenuItems(target.kind === "file" ? "sql-file" : "sql-folder").flatMap(({ plugin, contribution }) => {
    const action = contribution.action;
    if (contribution.dynamic || action?.type !== "open-workbench" || !registry.findWorkbench(plugin.manifest.id, action.workbench)) return [];
    return [
      {
        label: contribution.label,
        action: () => open(plugin.manifest.id, action.workbench, contribution.label, context),
      },
    ];
  });
}
