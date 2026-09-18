export function withoutSkillProvenance<T extends { skillProvenance: unknown }>(document: T): Omit<T, "skillProvenance"> {
  const publicDocument = { ...document };
  Reflect.deleteProperty(publicDocument, "skillProvenance");
  return publicDocument as Omit<T, "skillProvenance">;
}
