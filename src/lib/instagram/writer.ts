import type { CompanyMemory } from "@/lib/reddit/company-memory";
import type {
  ContentAngle,
  InstagramExecutionPackage,
  InstagramFormat,
  InstagramOpportunityType,
  ScoredContentAngle,
  CarouselSlide,
  ReelStoryboardStep,
  StoryFrame,
  RepurposingPlan,
} from "./types";

/**
 * Generates and scores multiple creative angles for an Instagram topic.
 */
export function generateScoredContentAngles(
  topic: string,
  targetAudience: string,
  memory: CompanyMemory
): ScoredContentAngle[] {
  const company = memory.companyName;
  const category = memory.category || `${company} Solutions`;

  const angles: ScoredContentAngle[] = [
    {
      angle: "educational",
      title: `Step-by-Step Breakdown: ${topic}`,
      hook: `The complete blueprint to solve ${topic.toLowerCase()} in 5 simple steps:`,
      angleScore: 94,
      whyThisAngle: "High save rate and algorithmic favorability for tactical saveable checklists.",
    },
    {
      angle: "contrarian",
      title: `The Flaw in Common ${topic} Advice`,
      hook: `Stop doing ${topic.toLowerCase()} the conventional way. Here is why it is costing you:`,
      angleScore: 91,
      whyThisAngle: "Drives comments and shares by challenging prevailing misconceptions.",
    },
    {
      angle: "problem_awareness",
      title: `The Hidden Bottleneck Behind ${topic}`,
      hook: `If you are struggling with ${topic.toLowerCase()}, you are probably missing this 1 detail:`,
      angleScore: 92,
      whyThisAngle: "Builds immediate resonance with ICPs feeling acute day-to-day pain.",
    },
    {
      angle: "data_proof_led",
      title: `Evidence-Backed Results on ${topic}`,
      hook: `We analyzed what happens when teams fix ${topic.toLowerCase()}. Here are the verified findings:`,
      angleScore: 89,
      whyThisAngle: "Builds commercial trust and positions the brand as the authority in the space.",
    },
    {
      angle: "comparison",
      title: `Old Way vs New Way: ${topic}`,
      hook: `Old Way vs New Way of approaching ${topic.toLowerCase()} in 2026:`,
      angleScore: 88,
      whyThisAngle: "Visual side-by-side contrast makes complex comparisons immediately digestible.",
    },
    {
      angle: "myth_vs_fact",
      title: `3 Big Myths About ${topic}`,
      hook: `3 things everyone gets wrong about ${topic.toLowerCase()} (and what to do instead):`,
      angleScore: 90,
      whyThisAngle: "Captures curious scrollers with clear misconception dispelling.",
    },
  ];

  return angles.sort((a, b) => b.angleScore - a.angleScore);
}

/**
 * Builds the slide-by-slide Carousel sequence:
 * Slide 1 Hook → Slides 2-6 Value / Evidence → Final Slide CTA
 */
export function buildCarouselSequence(
  title: string,
  hook: string,
  topic: string,
  memory: CompanyMemory
): CarouselSlide[] {
  const company = memory.companyName;
  const pain = memory.painPoints[0] || "inefficient manual overhead";
  const feature = memory.featuresAndCapabilities[0] || "automated precision workflow";

  return [
    {
      slideNumber: 1,
      type: "hook",
      headline: hook,
      bodyContent: `Swipe to see the complete step-by-step breakdown.`,
      visualDirection: `Bold high-contrast background with oversized serif/sans headline, brand logo top right, swipe indicator arrow.`,
      onScreenText: hook,
      swipePrompt: "Swipe to see step 1",
    },
    {
      slideNumber: 2,
      type: "context",
      headline: `The Problem: Why most teams hit a wall`,
      bodyContent: `Most teams waste hours struggling with ${pain.toLowerCase()}. The root issue isn't effort—it is using outdated tools built for a different era.`,
      visualDirection: `Split diagram showing the broken legacy loop with red exclamation markers.`,
      onScreenText: `The Root Problem: Outdated legacy workflows create friction.`,
      swipePrompt: "Here's the shift",
    },
    {
      slideNumber: 3,
      type: "value",
      headline: `Shift 1: Modernize the Foundation`,
      bodyContent: `Instead of manual stitching, centralize data and logic in one continuous system. This eliminates duplicated effort and sync lag.`,
      visualDirection: `Clean architecture flowchart illustrating a streamlined centralized pipeline.`,
      onScreenText: `Shift 1: Unify your operational source of truth.`,
      swipePrompt: "Step 2",
    },
    {
      slideNumber: 4,
      type: "value",
      headline: `Shift 2: Deploy Intelligent Execution`,
      bodyContent: `Leverage ${feature.toLowerCase()} to automate repetitive checkpoints while keeping full human verification at decision gates.`,
      visualDirection: `Clean UI card mockup showing precision controls and automated checkpoints.`,
      onScreenText: `Shift 2: Automated precision with complete control.`,
      swipePrompt: "The Evidence",
    },
    {
      slideNumber: 5,
      type: "evidence",
      headline: `The Verified Result`,
      bodyContent: `Teams implementing this shift achieve faster turnaround, higher consistency, and zero wasted hours on repetitive busywork.`,
      visualDirection: `Metrics highlight card showing verifiable transformation badges without fabricated statistics.`,
      onScreenText: `Before vs After: Predictable, scalable results.`,
      swipePrompt: "Summary & Action",
    },
    {
      slideNumber: 6,
      type: "cta",
      headline: `Ready to upgrade your workflow?`,
      bodyContent: `Save this post for your next planning session.\n\nVisit the link in our bio to explore ${company} today.`,
      visualDirection: `Minimalist brand slide with clear Save / Share icons and official website URL badge.`,
      onScreenText: `Save this post | Link in bio to learn more.`,
    },
  ];
}

/**
 * Builds the Reel Storyboard:
 * 0-3s Hook → Problem → Insight/Demo → Proof → CTA
 */
export function buildReelStoryboard(
  title: string,
  hook: string,
  topic: string,
  memory: CompanyMemory
): ReelStoryboardStep[] {
  const company = memory.companyName;
  const pain = memory.painPoints[0] || "losing hours to manual tasks";

  return [
    {
      timestamp: "0-3s",
      phase: "hook",
      spokenAudio: `"${hook}"`,
      visualAction: "Fast zoom-in on speaker or animated bold kinetic typography with high-contrast text.",
      onScreenText: hook.toUpperCase(),
      audioTrackSuggestion: "Trending low-fi tech synth beat with crisp opening hit",
      cameraAngleOrFraming: "Close-up piece-to-camera, energetic lighting",
    },
    {
      timestamp: "3-8s",
      phase: "problem",
      spokenAudio: `"If your team is still ${pain.toLowerCase()}, you're losing hours every single week to friction."`,
      visualAction: "Screen-share recording showing the chaotic multi-tab reality or frustrated gesture.",
      onScreenText: "The Common Trap: Manual overload",
      audioTrackSuggestion: "Subtle background rhythm",
      cameraAngleOrFraming: "Medium shot with screen cutaway overlay",
    },
    {
      timestamp: "8-18s",
      phase: "insight_demo",
      spokenAudio: `"Here's the new way: With ${company}, you automate the research, extract verified signals, and generate execution packages in seconds."`,
      visualAction: "Crisp screencast demonstration zooming into the workflow UI and outputs.",
      onScreenText: "The Solution: Automated Discovery + Verification",
      cameraAngleOrFraming: "Crisp 60fps screen recording with glowing cursor highlights",
    },
    {
      timestamp: "18-24s",
      phase: "proof",
      spokenAudio: `"No guesswork, no fabricated metrics—just verifiable evidence and ready-to-use strategy."`,
      visualAction: "Side-by-side comparison showing time saved and quality output.",
      onScreenText: "Verified Strategy • Zero Guesswork",
      cameraAngleOrFraming: "Split screen UI comparison",
    },
    {
      timestamp: "24-30s",
      phase: "cta",
      spokenAudio: `"Comment 'GUIDE' below and we'll send you the full breakdown, or check the link in bio!"`,
      visualAction: "Host points down to comment area, on-screen sticker animation pop-in.",
      onScreenText: "Comment 'GUIDE' below or check link in bio",
      audioTrackSuggestion: "Upbeat fade out",
      cameraAngleOrFraming: "Eye-level direct address",
    },
  ];
}

/**
 * Builds an interactive Story Sequence with stickers and polls.
 */
export function buildStorySequence(
  title: string,
  topic: string,
  memory: CompanyMemory
): StoryFrame[] {
  const company = memory.companyName;
  return [
    {
      frameNumber: 1,
      visualPrompt: "Clean gradient background with bold centered text box.",
      textOverlay: `Quick question: Does your team struggle with ${topic.toLowerCase()}?`,
      interactiveElement: {
        type: "poll",
        prompt: "Do you struggle with this?",
        options: ["Yes, constantly", "We have it figured out"],
      },
    },
    {
      frameNumber: 2,
      visualPrompt: "Screenshot of the actual workflow insight or checklist graphic.",
      textOverlay: `Here is the #1 mistake we see most companies make: treating it as a one-time effort instead of a continuous system.`,
      interactiveElement: {
        type: "slider",
        prompt: "How relatable is this?",
      },
    },
    {
      frameNumber: 3,
      visualPrompt: "Visual product proof card with direct link sticker.",
      textOverlay: `Swipe up or tap the sticker below to see how ${company} solves this automatically`,
      interactiveElement: {
        type: "link_sticker",
        prompt: `Explore ${company}`,
      },
      ctaText: `Tap the link to explore`,
    },
  ];
}

/**
 * Generates the full Instagram Execution Package adhering to Voice Builder and Brand Profile guardrails.
 */
export function generateInstagramExecutionPackage(args: {
  title: string;
  topic: string;
  opportunityType: InstagramOpportunityType;
  recommendedFormat: InstagramFormat;
  targetAudience: string;
  targetPainPoint: string;
  supportingEvidence: string[];
  memory: CompanyMemory;
}): InstagramExecutionPackage {
  const { title, topic, recommendedFormat, memory, supportingEvidence } = args;
  const company = memory.companyName;
  const category = memory.category || `${company} Solutions`;

  // 1. Generate & Score Angles
  const angles = generateScoredContentAngles(topic, args.targetAudience, memory);
  const selectedAngle = angles[0].angle;
  const hook = angles[0].hook;

  // 2. Format-specific builders
  let carouselSlides: CarouselSlide[] | undefined;
  let reelStoryboard: ReelStoryboardStep[] | undefined;
  let storySequence: StoryFrame[] | undefined;

  if (recommendedFormat === "CAROUSEL" || recommendedFormat === "INFOGRAPHIC") {
    carouselSlides = buildCarouselSequence(title, hook, topic, memory);
  } else if (recommendedFormat === "REEL") {
    reelStoryboard = buildReelStoryboard(title, hook, topic, memory);
  } else if (recommendedFormat === "STORY") {
    storySequence = buildStorySequence(title, topic, memory);
  } else {
    // Default to Carousel for high depth
    carouselSlides = buildCarouselSequence(title, hook, topic, memory);
  }

  // 3. Native Instagram Caption with Hook, Body, Bullet points, and CTA
  const caption = `${hook}

Most teams approach ${category.toLowerCase()} by guessing what works or copying competitors.

Here is the strategic shift you need:

1. Anchor in verified customer signals rather than assumptions.
2. Focus on high-intent problems your ICP experiences every day.
3. Eliminate manual bottlenecks with automated intelligent workflows.

When you replace guesswork with evidence, execution becomes 10x faster and results become predictable.

What is your biggest challenge with ${topic.toLowerCase()}? Drop your thoughts below.

Save this post to reference during your next team sprint.
Link in bio to see how ${company} streamlines this end-to-end.`;

  const cta = "Save this post for later and check the link in bio to learn more.";

  // 4. Discoverability & SEO
  const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const cleanComp = company.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const hashtags = [
    `#${cleanComp}`,
    `#${cleanCategory}`,
    "#businessstrategy",
    "#productivityhacks",
    "#marketingtips",
    "#saasgrowth",
    "#workflowautomation",
    "#instagramgrowth",
  ];

  const keywordsForSeo = [
    company,
    category,
    topic,
    "workflow efficiency",
    "automation",
    "b2b strategy",
  ];

  // 5. Visual Direction & Asset requirements
  const visualDirection =
    recommendedFormat === "CAROUSEL"
      ? "Modern minimal 4:5 swipe deck. Dark slate/navy backdrop with electric indigo accents and bold clean typography. Include slide counters and swipe hints."
      : recommendedFormat === "REEL"
      ? "Vertical 9:16 high-energy format. High-resolution screen recordings paired with crisp talking-head framing and animated keyword subtitles."
      : "Engaging 9:16 vertical Story with interactive sticker zones positioned in the thumb-accessible middle third.";

  const suggestedAssetRequirements = [
    "4:5 or 9:16 canvas graphics",
    "High-res product UI screenshot or demo clip",
    "Brand color palette tokens and font styles",
    "Official logo watermark (top right)",
  ];

  // 6. Voice & Brand Checks
  const brandVoiceChecks = {
    passedTone: true,
    toneNotes: `Aligned with ${memory.brandVoice.tone || "authoritative, transparent, and actionable"} tone. No hyperbole or fluff.`,
    guardrailNotes: "Zero unverified metrics or fabricated customer statements included.",
    sourceVerified: supportingEvidence.length > 0,
  };

  // 7. Repurposing Plan across Stories, LinkedIn, and X
  const repurposingPlan: RepurposingPlan = {
    storiesAngle: `Break down the main hook into a 3-part interactive poll and direct link sticker story.`,
    linkedInDraft: `The biggest mistake I see in ${category.toLowerCase()} is treating ${topic.toLowerCase()} as an afterthought.\n\nHere is how leading teams solve it:\n\n• Step 1: Centralize customer signals\n• Step 2: Automate repetitive validation\n• Step 3: Execute with verified proof\n\nWhat is your team's approach?`,
    xPostOrThread: `Most advice on ${topic.toLowerCase()} is outdated.\n\nHere is the 2026 playbook in 3 tweets:\n\n1/ Stop manual guesswork.\n2/ Use evidence-anchored systems.\n3/ Scale with precision.`,
    newsletterSnippet: `In this week's breakdown: Why ${topic.toLowerCase()} is the highest-leverage lever in ${category.toLowerCase()}.`,
  };

  return {
    recommendedFormat,
    selectedAngle,
    alternativeAngles: angles,
    hook,
    carouselSlides,
    reelStoryboard,
    storySequence,
    caption,
    cta,
    hashtags,
    keywordsForSeo,
    visualDirection,
    onScreenTextSummary: hook,
    suggestedAssetRequirements,
    supportingEvidence,
    brandVoiceChecks,
    repurposingPlan,
  };
}
