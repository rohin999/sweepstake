import { PEOPLE } from "../data/people";
import { PICKS } from "../data/picks";
import type { Person } from "./types";

/** Map every drafted team id to the person who owns it. */
export function buildOwnerMap(): Map<string, Person> {
  const ownerByTeamId = new Map<string, Person>();
  for (const pick of PICKS) {
    const person = PEOPLE.find((p) => p.id === pick.personId);
    if (!person) continue;
    for (const teamId of pick.teamIds) ownerByTeamId.set(teamId, person);
  }
  return ownerByTeamId;
}
