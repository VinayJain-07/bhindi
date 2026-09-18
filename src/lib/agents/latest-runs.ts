export function newestRunPerAgent<T extends { agentType: string }>(runsNewestFirst: T[]): T[] {
  const seen = new Set<string>();
  return runsNewestFirst.filter((run) => {
    if (seen.has(run.agentType)) return false;
    seen.add(run.agentType);
    return true;
  });
}
