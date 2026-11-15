import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { listClasses, listInvites, listSnapshots, listUsers } from "@/lib/server/repository";

/**
 * Single read of the whole workspace state. Teachers only see their own classes.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется вход в систему." }, { status: 401 });

  const [allClasses, allUsers, allInvites, allSnapshots] = await Promise.all([
    listClasses(),
    listUsers(),
    listInvites(),
    listSnapshots(),
  ]);

  const isAdmin = user.role === "admin";
  const classes = isAdmin
    ? allClasses
    : allClasses.filter((c) => c.teacherIds.includes(user.id));
  const classIds = new Set(classes.map((c) => c.id));

  return NextResponse.json({
    user,
    classes,
    users: isAdmin ? allUsers : allUsers.filter((u) => u.id === user.id),
    invites: isAdmin ? allInvites : allInvites.filter((i) => i.invitedBy === user.id),
    snapshots: allSnapshots.filter((s) => classIds.has(s.classId)),
  });
}
