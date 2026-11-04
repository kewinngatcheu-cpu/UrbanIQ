/**
 * ONE Business — central role & permission matrix. Pure (no I/O): safe on client and server,
 * but every decision that matters is re-checked on the server with the role loaded from the DB.
 */
import type { OrgRole } from "@/lib/db/types";

export const ORG_ROLES: OrgRole[] = ["owner", "admin", "manager", "employee", "viewer"];

export type Permission =
  | "org.manage" // company profile & settings
  | "org.billing" // plan & payment
  | "members.view"
  | "members.invite"
  | "members.manage" // change roles / remove members
  | "projects.view"
  | "projects.manage" // create/edit/archive projects
  | "tasks.view"
  | "tasks.create"
  | "tasks.manage" // edit/assign/delete any task
  | "tasks.update_own" // edit tasks assigned to or created by oneself
  | "memory.view"
  | "memory.write"
  | "memory.delete_any"
  | "clients.manage"
  | "actions.use"
  | "intelligence.view"
  | "activity.view";

const MATRIX: Record<OrgRole, Permission[]> = {
  owner: ["org.manage", "org.billing", "members.view", "members.invite", "members.manage", "projects.view", "projects.manage", "tasks.view", "tasks.create", "tasks.manage", "tasks.update_own", "memory.view", "memory.write", "memory.delete_any", "clients.manage", "actions.use", "intelligence.view", "activity.view"],
  admin: ["org.manage", "members.view", "members.invite", "members.manage", "projects.view", "projects.manage", "tasks.view", "tasks.create", "tasks.manage", "tasks.update_own", "memory.view", "memory.write", "memory.delete_any", "clients.manage", "actions.use", "intelligence.view", "activity.view"],
  manager: ["members.view", "projects.view", "projects.manage", "tasks.view", "tasks.create", "tasks.manage", "tasks.update_own", "memory.view", "memory.write", "memory.delete_any", "clients.manage", "actions.use", "intelligence.view", "activity.view"],
  employee: ["members.view", "projects.view", "tasks.view", "tasks.create", "tasks.update_own", "memory.view", "memory.write", "actions.use", "intelligence.view", "activity.view"],
  viewer: ["members.view", "projects.view", "tasks.view", "memory.view", "intelligence.view", "activity.view"],
};

export function can(role: OrgRole | null | undefined, permission: Permission): boolean {
  return !!role && MATRIX[role].includes(permission);
}

export function permissionsOf(role: OrgRole): Permission[] {
  return [...MATRIX[role]];
}

/** Which roles may `actor` assign to someone? Nobody can create a second owner; admins cannot create admins. */
export function assignableRoles(actor: OrgRole): Exclude<OrgRole, "owner">[] {
  if (actor === "owner") return ["admin", "manager", "employee", "viewer"];
  if (actor === "admin") return ["manager", "employee", "viewer"];
  return [];
}

/** May `actor` change/remove a member that currently has role `target`? */
export function canManageMember(actor: OrgRole, target: OrgRole): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  if (actor === "admin") return target !== "admin";
  return false;
}

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Business Owner",
  admin: "Business Admin",
  manager: "Manager",
  employee: "Employee",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: "Manages the company, billing and all members.",
  admin: "Manages the company, members and all content.",
  manager: "Manages projects, tasks, clients and knowledge.",
  employee: "Works on assigned tasks and contributes knowledge.",
  viewer: "Can view shared information, but not change it.",
};
