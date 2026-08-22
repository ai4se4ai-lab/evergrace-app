"use client";

import {
  deleteCategory,
  deleteMaster,
  saveCategory,
  saveMaster,
} from "@/actions/admin-content";
import { TaxonomyManager, type TaxonomyRow } from "@/components/admin/taxonomy-manager";

/**
 * Thin client wrappers that bind the shared TaxonomyManager to its actions.
 * They exist because Server Actions can't be passed from a Server Component
 * into a Client Component as props without a `"use server"` boundary per prop —
 * importing them here is simpler and keeps the pages as Server Components.
 */

export function CategoryManager({ rows }: { rows: TaxonomyRow[] }) {
  return (
    <TaxonomyManager
      kind="category"
      rows={rows}
      onSave={({ id, name, detail }) => saveCategory({ id, name, blurb: detail })}
      onDelete={deleteCategory}
    />
  );
}

export function MasterManager({ rows }: { rows: TaxonomyRow[] }) {
  return (
    <TaxonomyManager
      kind="master"
      rows={rows}
      onSave={({ id, name, detail }) => saveMaster({ id, name, style: detail })}
      onDelete={deleteMaster}
    />
  );
}
