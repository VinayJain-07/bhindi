import { describe, expect, it } from "vitest";
import {
  extractConversationProspects,
  extractVerifiedPhoneNumber,
  extractVerifiedLinkedinUrl,
  extractVerifiedEmail,
  deriveProperIntentSignal,
  extractContactInfo,
} from "./conversation-mining";

describe("conversation-mining verification & intent signal grounding", () => {
  describe("deriveProperIntentSignal", () => {
    it("derives Vendor Recommendation Request for recommendation queries", () => {
      const result = deriveProperIntentSignal("RECOMMENDATION_REQUEST", "Looking for best attribution tool", "");
      expect(result.intentSignal).toBe("Vendor Recommendation Request");
      expect(result.intentCategory).toBe("Explicit Intent");
    });

    it("derives Competitor Dissatisfaction for switching/pricing friction", () => {
      const result = deriveProperIntentSignal("COMPETITOR_DISSATISFACTION", "Cancelling our current vendor after 2x price hike", "");
      expect(result.intentSignal).toBe("Competitor Dissatisfaction & Migration");
      expect(result.intentCategory).toBe("Pain Expression");
    });

    it("derives High Buying Intent for procurement and implementation discussions", () => {
      const result = deriveProperIntentSignal("BUYING_INTENT", "Need to implement outbound tool before next quarter", "");
      expect(result.intentSignal).toBe("High Buying Intent & Tool Implementation");
      expect(result.intentCategory).toBe("Explicit Intent");
    });
  });

  describe("extractVerifiedPhoneNumber", () => {
    it("verifies and formats valid 10-digit North American numbers", () => {
      const res = extractVerifiedPhoneNumber("4155552671");
      expect(res.verified).toBe(true);
      expect(res.phone).toBe("+1 (415) 555-2671");
    });

    it("verifies and formats international phone numbers with country code", () => {
      const res = extractVerifiedPhoneNumber("+44 20 7946 0919");
      expect(res.verified).toBe(true);
      expect(res.phone).toContain("44");
    });

    it("rejects false positives like calendar years, IDs, or short strings", () => {
      expect(extractVerifiedPhoneNumber("2026").verified).toBe(false);
      expect(extractVerifiedPhoneNumber("1999").verified).toBe(false);
      expect(extractVerifiedPhoneNumber("12345").verified).toBe(false);
      expect(extractVerifiedPhoneNumber("1111111111").verified).toBe(false);
      expect(extractVerifiedPhoneNumber(null).verified).toBe(false);
    });
  });

  describe("extractVerifiedLinkedinUrl", () => {
    it("verifies valid individual profile URLs", () => {
      const res = extractVerifiedLinkedinUrl("https://www.linkedin.com/in/priya-sharma-growth");
      expect(res.verified).toBe(true);
      expect(res.linkedinUrl).toBe("https://www.linkedin.com/in/priya-sharma-growth");
    });

    it("verifies valid company profile URLs", () => {
      const res = extractVerifiedLinkedinUrl("https://linkedin.com/company/acme-corp");
      expect(res.verified).toBe(true);
      expect(res.linkedinUrl).toBe("https://www.linkedin.com/company/acme-corp");
    });

    it("rejects non-profile LinkedIn URLs like search results and feed links", () => {
      expect(extractVerifiedLinkedinUrl("https://www.linkedin.com/search/results/all/?keywords=tech").verified).toBe(false);
      expect(extractVerifiedLinkedinUrl("https://www.linkedin.com/feed/").verified).toBe(false);
      expect(extractVerifiedLinkedinUrl("https://www.linkedin.com/in/search").verified).toBe(false);
    });
  });

  describe("extractVerifiedEmail", () => {
    it("verifies valid business emails", () => {
      const res = extractVerifiedEmail("priya.s@cloudscale.io");
      expect(res.verified).toBe(true);
      expect(res.email).toBe("priya.s@cloudscale.io");
    });

    it("rejects synthetic and dummy emails", () => {
      expect(extractVerifiedEmail("john@company.com").verified).toBe(false);
      expect(extractVerifiedEmail("test@example.com").verified).toBe(false);
      expect(extractVerifiedEmail("support@random.com").verified).toBe(false);
    });
  });

  describe("extractContactInfo", () => {
    it("accurately reports unlisted status when contacts are not publicly provided", () => {
      const contact = extractContactInfo({}, "https://reddit.com/r/marketing/1", "Reddit");
      expect(contact.phoneVerified).toBe(false);
      expect(contact.linkedinVerified).toBe(false);
      expect(contact.emailVerified).toBe(false);
      expect(contact.phoneStatus).toBe("Unlisted in public discussion");
      expect(contact.linkedinStatus).toBe("Unlisted");
      expect(contact.confidence).toBe("Unlisted");
    });

    it("marks verified phone and verified linkedin when valid details are provided", () => {
      const contact = extractContactInfo({
        phone: "+1 415 555 0192",
        linkedinUrl: "https://www.linkedin.com/in/alex-growth",
      }, "https://x.com/alex_growth", "X");

      expect(contact.phoneVerified).toBe(true);
      expect(contact.linkedinVerified).toBe(true);
      expect(contact.phoneStatus).toBe("Verified");
      expect(contact.linkedinStatus).toBe("Verified Profile");
      expect(contact.confidence).toBe("Verified");
    });
  });

  describe("extractConversationProspects grounding & zero hallucination", () => {
    it("only returns genuine opportunities from agent runs without hallucinating fake fallbacks", () => {
      const prospects = extractConversationProspects([
        {
          agentType: "REDDIT",
          output: {
            opportunities: [
              {
                id: "real-opp-1",
                verified: true,
                author: "agency_owner",
                sourceUrl: "https://reddit.com/r/agency/comments/qualified",
                subreddit: "r/agency",
                title: "Looking for best reporting platform",
                intent: "BUYING_INTENT",
                score: { total: 91 },
                confidence: 88,
                spamRisk: 0.05,
                matchedIcp: "B2B agency owner",
                matchedProblem: "Manual client reporting bottlenecks",
                matchedProduct: "Automated reporting",
                discoveredAt: "2026-09-03T10:00:00.000Z",
              },
            ],
          },
        },
      ], 6);

      // Must strictly return the 1 real opportunity; NO fake fallbacks like Vikram Mehta or NexusFlow Labs
      expect(prospects).toHaveLength(1);
      const lead = prospects[0];
      expect(lead.identity).toBe("agency_owner");
      expect(lead.score).toBe(91);
      expect(lead.intentSignal).toBe("Vendor Recommendation Request");
      expect(lead.whyTarget).toContain("Targeting u/agency_owner");
      expect(lead.contact.phoneStatus).toBe("Unlisted in public discussion");
      expect(lead.contact.phoneVerified).toBe(false);
    });

    it("returns empty list if runs have no qualified opportunities", () => {
      const prospects = extractConversationProspects([
        {
          agentType: "REDDIT",
          output: { opportunities: [] },
        },
      ], 6);

      expect(prospects).toHaveLength(0);
    });

    it("extracts prospects across multi-source platforms including LinkedIn, X, and Reddit with verified signals", () => {
      const prospects = extractConversationProspects([
        {
          agentType: "LINKEDIN",
          output: {
            opportunities: [
              {
                id: "li-1",
                author: "Priya Sharma",
                companyName: "CloudScale Inc",
                role: "Head of Growth",
                sourceUrl: "https://www.linkedin.com/in/priyasharma-growth",
                platform: "LinkedIn",
                title: "Searching for live conversation mining platform",
                intent: "BUYING_INTENT",
                score: { total: 93 },
                matchedIcp: "B2B SaaS Growth Head",
                matchedProblem: "Dark social attribution",
              },
            ],
          },
        },
        {
          agentType: "X",
          output: {
            opportunities: [
              {
                id: "x-1",
                author: "tech_founder_x",
                sourceUrl: "https://x.com/tech_founder_x/status/198273",
                platform: "X",
                title: "Looking for pipeline reporting tools",
                intent: "RECOMMENDATION_REQUEST",
                phone: "+1 650 555 9210",
                score: { total: 89 },
                matchedIcp: "SaaS Founder",
                matchedProblem: "Manual reporting",
              },
            ],
          },
        },
      ], 6);

      expect(prospects).toHaveLength(2);
      const linkedinLead = prospects.find((p) => p.identity === "Priya Sharma");
      const xLead = prospects.find((p) => p.identity === "tech_founder_x");

      expect(linkedinLead).toBeDefined();
      expect(linkedinLead?.platform).toBe("LinkedIn");
      expect(linkedinLead?.contact.linkedinVerified).toBe(true);
      expect(linkedinLead?.contact.linkedinUrl).toBe("https://www.linkedin.com/in/priyasharma-growth");

      expect(xLead).toBeDefined();
      expect(xLead?.identity).toBe("tech_founder_x");
      expect(xLead?.contact.phoneVerified).toBe(true);
      expect(xLead?.contact.phone).toContain("650");
    });
  });
});

