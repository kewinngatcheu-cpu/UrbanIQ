import { test } from "node:test";
import assert from "node:assert/strict";
import { can, permissionsOf, assignableRoles, canManageMember, ORG_ROLES } from "../../src/lib/permissions/roles.ts";

test("only the business owner manages billing", () => {
  for (const r of ORG_ROLES) assert.equal(can(r, "org.billing"), r === "owner", r);
});

test("viewer can read but never write", () => {
  for (const p of permissionsOf("viewer")) assert.ok(p.endsWith(".view"), `viewer has ${p}`);
  for (const p of ["tasks.create", "memory.write", "projects.manage", "actions.use", "members.invite"] as const) assert.equal(can("viewer", p), false, p);
});

test("employee works on tasks and knowledge but cannot manage people or projects", () => {
  assert.ok(can("employee", "tasks.create") && can("employee", "tasks.update_own") && can("employee", "memory.write"));
  for (const p of ["tasks.manage", "projects.manage", "members.invite", "members.manage", "memory.delete_any", "org.manage"] as const) assert.equal(can("employee", p), false, p);
});

test("permissions only grow from viewer to owner", () => {
  const order = ["viewer", "employee", "manager", "admin", "owner"] as const;
  for (let i = 1; i < order.length; i++) {
    for (const p of permissionsOf(order[i - 1])) assert.ok(can(order[i], p), `${order[i]} lacks ${p}`);
  }
});

test("nobody can create a second owner; admins cannot create admins", () => {
  for (const r of ORG_ROLES) assert.ok(!assignableRoles(r).includes("owner" as never), r);
  assert.deepEqual(assignableRoles("admin"), ["manager", "employee", "viewer"]);
  assert.deepEqual(assignableRoles("manager"), []);
  assert.deepEqual(assignableRoles("employee"), []);
});

test("member management hierarchy", () => {
  assert.equal(canManageMember("owner", "admin"), true);
  assert.equal(canManageMember("admin", "admin"), false);
  assert.equal(canManageMember("admin", "employee"), true);
  for (const r of ORG_ROLES) assert.equal(canManageMember(r, "owner"), false, `${r} → owner`);
  assert.equal(canManageMember("manager", "viewer"), false);
});

test("unknown or missing roles have no permissions", () => {
  assert.equal(can(null, "tasks.view"), false);
  assert.equal(can(undefined, "memory.view"), false);
});
