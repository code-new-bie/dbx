import { describe, expect, it, vi } from "vitest";
import type { InstalledPlugin } from "@/types/database";
import { createFrontendPluginRegistry } from "./frontendPlugin";
import { buildSqlFilePluginMenuItems } from "./sqlFilePluginContext";

function plugin(id: string, contributions: InstalledPlugin["manifest"]["contributions"], compatible = true): InstalledPlugin {
  return { compatibility: { compatible }, manifest: { id, name: id, version: "1.0.0", drivers: [], contributions } };
}

describe("SQL file plugin context menu", () => {
  it("passes the exact selected local path, with no editor contents or connection data", () => {
    const registry = createFrontendPluginRegistry([
      plugin("example", [
        { type: "workbench", id: "example.main", label: "Example" },
        { type: "context-menu", id: "example.file", menu: "sql-file", label: "Inspect file", action: { type: "open-workbench", workbench: "example.main" } },
        { type: "context-menu", id: "example.folder", menu: "sql-folder", label: "Inspect folder", action: { type: "open-workbench", workbench: "example.main" } },
      ]),
    ]);
    const open = vi.fn();
    const target = { kind: "file" as const, path: "C:/SQL/a @ 中文.sql", rootPath: "C:/SQL" };
    const items = buildSqlFilePluginMenuItems(registry, target, open);
    expect(items.map((i) => i.label)).toEqual(["Inspect file"]);
    items[0].action?.();
    expect(open).toHaveBeenCalledWith("example", "example.main", "Inspect file", { sqlFile: target });
    const folder = { kind: "folder" as const, path: "/sql/nested", rootPath: "/sql" };
    const folders = buildSqlFilePluginMenuItems(registry, folder, open);
    expect(folders.map((i) => i.label)).toEqual(["Inspect folder"]);
    folders[0].action?.();
    expect(open).toHaveBeenLastCalledWith("example", "example.main", "Inspect folder", { sqlFile: folder });
  });
  it("excludes unsupported, incompatible and dangling actions", () => {
    const registry = createFrontendPluginRegistry([
      plugin("a", [
        { type: "context-menu", id: "a.missing", menu: "sql-file", label: "Missing", action: { type: "open-workbench", workbench: "b.main" } },
        { type: "context-menu", id: "a.legacy", menu: "sql-file", label: "Legacy" },
        { type: "workbench", id: "a.main", label: "A" },
        { type: "context-menu", id: "a.dynamic", menu: "sql-file", label: "Dynamic", dynamic: true, action: { type: "open-workbench", workbench: "a.main" } },
      ]),
      plugin(
        "b",
        [
          { type: "workbench", id: "b.main", label: "B" },
          { type: "context-menu", id: "b.file", menu: "sql-file", label: "Disabled", action: { type: "open-workbench", workbench: "b.main" } },
        ],
        false,
      ),
    ]);
    expect(buildSqlFilePluginMenuItems(registry, { kind: "file", path: "/sql/x.sql", rootPath: "/sql" }, vi.fn())).toEqual([]);
  });
});
