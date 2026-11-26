import type { ContextMenuItem } from "@/components/ui/CustomContextMenu.vue";
import type { FrontendPluginRegistry } from "./frontendPlugin";

export interface SqlFilePluginContext {
  kind: "file" | "folder";
  path: string;
  rootPath: string;
}

/** No editor contents, credentials or SQL connection metadata cross this boundary. */
export function buildSqlFilePluginMenuItems(
  registry: FrontendPluginRegistry,
  target: SqlFilePluginContext,
  open: (pluginId: string, workbenchId: string, title: string, context: Record<string, unknown>) => void,
  enableDecorations?: (pluginId: string, contributionId: string, target: SqlFilePluginContext) => void,
): ContextMenuItem[] {
  if (!target.path || !target.rootPath) return [];
  const context = { sqlFile: { kind: target.kind, path: target.path, rootPath: target.rootPath } };
  return registry.listContextMenuItems(target.kind === "file" ? "sql-file" : "sql-folder").flatMap(({ plugin, contribution }) => {
    const action = contribution.action;
    if (contribution.dynamic || action?.type !== "open-workbench" || !registry.findWorkbench(plugin.manifest.id, action.workbench)) return [];
    return [
      {
        label: contribution.label,
        action: () => {
          if (target.kind === "folder" && contribution.decorations) enableDecorations?.(plugin.manifest.id, contribution.id, target);
          open(plugin.manifest.id, action.workbench, contribution.label, context);
        },
      },
    ];
  });
}

export const SQL_FILE_DECORATION_LIMIT = 10000;
export const SQL_FILE_DECORATION_BADGES = ["A", "M", "D", "R", "C", "?", "!"] as const;
export type SqlFileDecorationBadge = (typeof SQL_FILE_DECORATION_BADGES)[number];

export function sqlFileDecorationKey(path: string): string {
  // Do not reinterpret a legitimate Unix filename containing a backslash.
  const normalized = /^[a-z]:[\\/]/i.test(path) || path.startsWith("\\\\") ? path.replace(/\\/g, "/") : path;
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
}

/** Untrusted sidecar data: only bounded, in-scope paths and known single-character badges. */
export function sanitizeSqlFileDecorations(rootPath: string, value: unknown): Map<string, SqlFileDecorationBadge> {
  const result = new Map<string, SqlFileDecorationBadge>();
  if (!Array.isArray(value) || value.length > SQL_FILE_DECORATION_LIMIT) return result;
  const root = sqlFileDecorationKey(rootPath);
  const prefix = root.endsWith("/") ? root : root + "/";
  for (const row of value) {
    if (!row || typeof row !== "object" || typeof row.path !== "string" || row.path.length > 4096 || typeof row.badge !== "string") continue;
    const path = sqlFileDecorationKey(row.path);
    if (!path.startsWith(prefix) || path.split("/").some((part) => part === "." || part === "..") || /[\x00-\x1f]/.test(path)) continue;
    const badge = SQL_FILE_DECORATION_BADGES.find((candidate) => candidate === row.badge);
    if (badge) result.set(path, badge);
  }
  return result;
}
