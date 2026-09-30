export type Service = {
  slug: string;
  name: string;
  short: string;
  intro: string;
  includes: string[];
  signs: string[];
  faqs: { q: string; a: string }[];
};

export const SERVICES: Service[] = [
  {
    slug: "roof-replacement",
    name: "Roof replacement",
    short:
      "A full tear-off and new roof system when repairs no longer make sense.",
    intro:
      "When a roof is near the end of its life, patching it costs more each year. A full replacement resets the clock: new decking where needed, new underlayment, flashing and a fresh roof surface installed as one system.",
    includes: [
      "Inspection and written estimate before any work starts",
      "Removal of the old roofing and disposal of debris",
      "Repair or replacement of damaged decking",
      "New underlayment, flashing, ventilation and roof covering",
      "Final cleanup, including a magnet sweep for nails",
    ],
    signs: [
      "Shingles that are curling, cracking or missing granules",
      "Leaks in more than one area of the house",
      "Daylight visible through the attic boards",
      "A roof that has already been repaired several times",
    ],
    faqs: [
      {
        q: "How long does a replacement take?",
        a: "Most residential roofs take one to three days, depending on size, roof pitch, materials and weather.",
      },
      {
        q: "Do I need to be home during the work?",
        a: "No. We will walk through the plan with you beforehand and confirm access to the property and driveway.",
      },
      {
        q: "Can the new roof go over the old one?",
        a: "Sometimes, but a tear-off lets us inspect and repair the decking underneath, which is why we recommend it in most cases.",
      },
    ],
  },
  {
    slug: "roof-repair",
    name: "Roof repair",
    short: "Targeted fixes for leaks, damaged shingles and failed flashing.",
    intro:
      "Most leaks start small: a lifted shingle, a cracked pipe boot, flashing that has pulled away. Fixing the actual source early protects your ceilings, insulation and framing.",
    includes: [
      "Leak tracing from the attic and the roof surface",
      "Shingle, tile or panel replacement",
      "Flashing, vent and pipe boot repair",
      "Sealing and reinforcement of vulnerable areas",
      "Photos of the problem and the completed repair",
    ],
    signs: [
      "Water stains on ceilings or walls",
      "Shingles lifted or missing after wind",
      "Damp insulation or musty smell in the attic",
      "Granules collecting in gutters",
    ],
    faqs: [
      {
        q: "Can you repair just the damaged section?",
        a: "Yes, when the rest of the roof is in good condition. If the surrounding roof is also failing, we will tell you and explain the options.",
      },
      {
        q: "How fast can a leak be stopped?",
        a: "Active leaks can often be temporarily protected the same day, with the permanent repair scheduled right after.",
      },
    ],
  },
  {
    slug: "new-installation",
    name: "New roof installation",
    short: "Roofing for new builds, additions and garages.",
    intro:
      "A new roof is installed once and has to perform for decades. We plan the layout, ventilation and drainage with the rest of the structure so water goes where it should.",
    includes: [
      "Review of plans and roof layout",
      "Material recommendations for your climate and budget",
      "Underlayment, flashing and ventilation installed to specification",
      "Coordination with your builder or general contractor",
    ],
    signs: [
      "You are building a new home or addition",
      "A garage, porch or outbuilding needs roofing",
      "You are converting a flat roof to a pitched one",
    ],
    faqs: [
      {
        q: "Can you work with my general contractor?",
        a: "Yes. We coordinate schedule and access so roofing fits the rest of the build.",
      },
      {
        q: "Which material should I choose?",
        a: "It depends on climate, roof pitch, budget and appearance. We walk you through the trade-offs during the estimate.",
      },
    ],
  },
  {
    slug: "storm-damage",
    name: "Storm damage restoration",
    short:
      "Inspection, temporary protection and repairs after wind, hail or falling debris.",
    intro:
      "After a storm, the first goal is to stop further water damage. We document the damage, protect the roof, and complete permanent repairs, with the photos and details your insurance company will ask for.",
    includes: [
      "Post-storm roof inspection with photo documentation",
      "Emergency tarping to prevent further water intrusion",
      "Detailed estimate you can share with your insurer",
      "Permanent repair or replacement once approved",
    ],
    signs: [
      "Hail dents on vents, gutters or metal flashing",
      "Shingles blown off or displaced",
      "Branches or debris that hit the roof",
      "New leaks right after a storm",
    ],
    faqs: [
      {
        q: "Will you work with my insurance company?",
        a: "We provide documentation and an itemized estimate. Claim decisions are always made by your insurer.",
      },
      {
        q: "Should I climb up to check the damage?",
        a: "No. A wet or damaged roof is unsafe. Call us and we will inspect it.",
      },
    ],
  },
  {
    slug: "metal-roofing",
    name: "Metal roofing",
    short: "Standing seam and metal panel roofs built for long service life.",
    intro:
      "Metal roofs shed water and snow quickly and hold up well against wind. Correct panel layout, fastening and flashing details make the difference between a roof that lasts and one that leaks.",
    includes: [
      "Panel profile and color selection",
      "Precise measuring and panel layout",
      "Trim, flashing and penetration details",
      "Installation over a properly prepared deck",
    ],
    signs: [
      "You want a longer-lasting alternative to shingles",
      "Your area gets heavy snow or high winds",
      "You are replacing an older metal roof",
    ],
    faqs: [
      {
        q: "Is a metal roof noisy in the rain?",
        a: "With solid decking and underlayment, a metal roof is not noticeably louder than other roofing.",
      },
      {
        q: "Can metal go over existing shingles?",
        a: "In some cases. We check local code and the condition of the deck before recommending it.",
      },
    ],
  },
  {
    slug: "gutters",
    name: "Gutters and drainage",
    short:
      "Gutter installation and repair that keeps water away from your foundation.",
    intro:
      "Gutters are part of the roof system. When they overflow or pull away, water reaches fascia, siding and foundation. Properly sized and pitched gutters send it away from the house.",
    includes: [
      "Seamless gutter installation",
      "Downspout placement and extensions",
      "Repair and re-hanging of loose or sagging gutters",
      "Fascia inspection while the gutters are off",
    ],
    signs: [
      "Water spilling over the edge during rain",
      "Gutters pulling away from the fascia",
      "Stains or erosion along the foundation",
    ],
    faqs: [
      {
        q: "Should gutters be replaced with a new roof?",
        a: "It is a good time to inspect them. Access is easiest while the roof edge is open, so replacing them then can save labor.",
      },
    ],
  },
];

export const SERVICE_OPTIONS: [string, string][] = SERVICES.map((s) => [
  s.slug,
  s.name,
]);

export const getService = (slug: string) =>
  SERVICES.find((s) => s.slug === slug);
export const serviceName = (slug: string) =>
  getService(slug)?.name ?? slug.replace(/-/g, " ");
