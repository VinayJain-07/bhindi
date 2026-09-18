import type { EvaluatedRedditOpportunity } from "./scorer";
import type { CompanyMemory } from "./company-memory";

export type ReplyVariant = {
  id: string;
  label: string;
  tone: "helpful" | "conversational" | "product_aware";
  text: string;
  reasoning: string;
};

function cleanSentence(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Generates 2-3 native, transparent, high-value Reddit response variants
 * strictly tailored to the specific company memory, domain category, products, and customer pains.
 */
export function generateRedditReplyVariants(
  opportunity: EvaluatedRedditOpportunity,
  memory: CompanyMemory
): ReplyVariant[] {
  const compName = memory.companyName;
  const category = memory.category || "solutions";
  const sub = opportunity.subreddit;
  const isRecRequest = opportunity.intent === "RECOMMENDATION_REQUEST" || opportunity.intent === "BUYING_INTENT";
  const isCompetitor = opportunity.intent === "COMPETITOR_DISSATISFACTION";

  const primaryProduct = memory.productsAndServices[0] || category;
  const primaryPain = opportunity.matchedProblem || memory.painPoints[0] || `managing ${category.toLowerCase()}`;
  const primaryJtbd = memory.jobsToBeDone[0] || `streamline ${category.toLowerCase()} operations`;
  const primaryDiff = memory.differentiators[0] || "automated workflows, transparent setup, and high reliability";
  const matchedComp = opportunity.competitor || memory.competitors[0]?.name;

  // -------------------------------------------------------------
  // Variant 1: Helpful / Educational (Pure value, actionable workflow)
  // -------------------------------------------------------------
  const helpfulSteps: string[] = [];
  if (memory.jobsToBeDone.length >= 3) {
    helpfulSteps.push(
      `1. **${cleanSentence(memory.jobsToBeDone[0])}:** Establish a clear baseline and eliminate manual bottlenecks early.`,
      `2. **${cleanSentence(memory.jobsToBeDone[1])}:** Prioritize the highest-leverage workflows with verifiable milestones.`,
      `3. **${cleanSentence(memory.jobsToBeDone[2])}:** Automate recurring maintenance so the team stays focused on core outcomes.`
    );
  } else {
    helpfulSteps.push(
      `1. **Diagnose & Standardize:** Map out where ${primaryPain.toLowerCase()} causes the most friction before adopting complex tools.`,
      `2. **Automate the repetitive layer:** Use modern platforms to handle data synchronization and routine updates automatically.`,
      `3. **Measure measurable impact:** Ensure every workflow change connects back to tangible time savings or performance gains.`
    );
  }

  const helpfulText = `When dealing with ${primaryPain.toLowerCase()} at scale, separating diagnosis from execution is usually the biggest time saver.

A practical framework that works well:
${helpfulSteps.join("\n")}

Focusing on these three areas usually eliminates 70-80% of the friction.`;

  const variantHelpful: ReplyVariant = {
    id: `${opportunity.id}-var-helpful`,
    label: "Helpful / Educational",
    tone: "helpful",
    text: helpfulText,
    reasoning: "Focuses 100% on actionable workflow value without promotional language. Ideal for establishing domain authority.",
  };

  // -------------------------------------------------------------
  // Variant 2: Conversational / Clarifying (Empathetic, shares rule of thumb)
  // -------------------------------------------------------------
  let conversationalText = "";
  if (isCompetitor && matchedComp) {
    conversationalText = `Ran into a very similar issue with ${matchedComp} recently. The complexity and pricing tier jumps can be a major headache as your team scales.

Are you looking primarily to solve ${primaryPain.toLowerCase()}, or is your main bottleneck finding a solution that offers ${primaryDiff.toLowerCase()} without enterprise overhead?

Depending on your team size, there are much more agile, purpose-built tools available now.`;
  } else if (isRecRequest) {
    conversationalText = `It really comes down to your team's specific requirements. When evaluating ${category.toLowerCase()} platforms, the biggest differentiator is usually how easily they handle ${primaryPain.toLowerCase()}.

What specific capabilities matter most for your stack (e.g. speed of setup, deep integrations, or ${primaryDiff.toLowerCase()})? That makes a big difference in which option fits best.`;
  } else {
    conversationalText = `We see this exact bottleneck come up frequently in ${sub}. The real challenge usually isn't finding tools—it's standardizing workflows so that ${primaryPain.toLowerCase()} doesn't eat up hours every week.

Have you tried breaking this down by high-frequency vs edge-case tasks? It usually helps clarify whether you need a dedicated platform or just better workflow automation.`;
  }

  const variantConversational: ReplyVariant = {
    id: `${opportunity.id}-var-conv`,
    label: "Conversational / Clarifying",
    tone: "conversational",
    text: conversationalText,
    reasoning: "Builds rapport with empathy and asks an engaging follow-up question to start a productive dialogue.",
  };

  // -------------------------------------------------------------
  // Variant 3: Product-Aware (Transparent disclosure, genuine solution fit)
  // -------------------------------------------------------------
  let productAwareText = "";
  if (isRecRequest || isCompetitor) {
    productAwareText = `We ran into this exact challenge when dealing with ${primaryPain.toLowerCase()}.

If you're evaluating modern options for ${category.toLowerCase()}, take a look at ${compName}. *(Full disclosure: I work on the ${compName} team).*

We built it specifically to provide ${primaryProduct.toLowerCase()} with ${primaryDiff.toLowerCase()}, so you don't have to wrestle with legacy complexity or slow turnaround. Happy to share more details if you're comparing solutions.`;
  } else {
    productAwareText = `The standard approach is automating the repetitive layer so your team can focus on high-impact strategy.

We built ${compName} *(disclosure: team member here)* to help teams ${primaryJtbd.toLowerCase()} and solve ${primaryPain.toLowerCase()} through ${primaryDiff.toLowerCase()}. Even if you go with another tool, the key takeaway is standardizing these workflows early rather than managing them manually.`;
  }

  const variantProductAware: ReplyVariant = {
    id: `${opportunity.id}-var-prod`,
    label: "Product-Aware (Disclosed)",
    tone: "product_aware",
    text: productAwareText,
    reasoning: "Transparently introduces the platform with full affiliation disclosure. Best for explicit tool recommendations and competitor switches.",
  };

  return [variantHelpful, variantConversational, variantProductAware];
}
