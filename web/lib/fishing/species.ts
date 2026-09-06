/**
 * Species profiles.
 *
 * Preferred ranges reflect general angling consensus for these fish, weighted
 * toward the cool northern water of the upper St. Lawrence. They are a starting
 * point for tuning, not measured values — which is exactly why they sit in one
 * table rather than being scattered through the scoring code.
 *
 * Adding a species means adding an entry here and nothing else.
 */

import type { SpeciesProfile } from "./types";

export const SPECIES: SpeciesProfile[] = [
  {
    id: "largemouth-bass",
    name: "Largemouth Bass",
    water: { ideal: [65, 80], tolerable: [48, 90] },
    wind: { ideal: [3, 12], tolerable: [0, 25] },
    cloud: { ideal: [40, 90] },
    periods: ["dawn", "dusk"],
    pressure: { falling: 1, stable: 0.85, rising: 0.55 },
    strategy: {
      location: "Wind-blown shorelines, weed edges and shallow structure",
      presentation: "Topwater at first light, spinnerbait or soft plastic as the sun climbs",
    },
    note: "Feeds hardest on a falling glass ahead of weather.",
  },
  {
    id: "smallmouth-bass",
    name: "Smallmouth Bass",
    water: { ideal: [60, 74], tolerable: [45, 84] },
    wind: { ideal: [5, 16], tolerable: [0, 28] },
    cloud: { ideal: [25, 80] },
    periods: ["dawn", "morning", "dusk"],
    pressure: { falling: 0.95, stable: 0.9, rising: 0.6 },
    strategy: {
      location: "Rocky points, current seams and drop-offs in 8–20 ft",
      presentation: "Tube, drop-shot or jerkbait worked along the rock",
    },
    note: "The signature St. Lawrence fish; a little chop helps.",
  },
  {
    id: "walleye",
    name: "Walleye",
    water: { ideal: [55, 70], tolerable: [38, 78] },
    wind: { ideal: [6, 18], tolerable: [0, 30] },
    cloud: { ideal: [50, 100] },
    periods: ["dusk", "night", "dawn"],
    pressure: { falling: 0.9, stable: 0.9, rising: 0.6 },
    strategy: {
      location: "Break lines and current edges; shallower after dark",
      presentation: "Jig and minnow, or a slow crankbait along the break",
    },
    note: "Light-shy — low sun, chop or stained water all work in your favour.",
  },
  {
    id: "northern-pike",
    name: "Northern Pike",
    water: { ideal: [55, 70], tolerable: [40, 80] },
    wind: { ideal: [3, 14], tolerable: [0, 26] },
    cloud: { ideal: [20, 80] },
    periods: ["morning", "dusk"],
    pressure: { falling: 0.95, stable: 0.85, rising: 0.65 },
    strategy: {
      location: "Weed flats, bays and the edges of cabbage beds",
      presentation: "Large spoon, spinnerbait or a suspending jerkbait",
    },
    note: "Ambush feeder; cooler water keeps them shallow.",
  },
  {
    id: "musky",
    name: "Musky",
    water: { ideal: [60, 74], tolerable: [48, 82] },
    wind: { ideal: [5, 18], tolerable: [0, 28] },
    cloud: { ideal: [30, 95] },
    periods: ["dusk", "night", "dawn"],
    pressure: { falling: 1, stable: 0.8, rising: 0.5 },
    strategy: {
      location: "Deep weed edges, current breaks and main-river structure",
      presentation: "Large glide bait or bucktail; figure-eight every cast",
    },
    note: "The fish of ten thousand casts — moon and weather changes matter most.",
  },
  {
    id: "trout",
    name: "Trout",
    water: { ideal: [50, 63], tolerable: [36, 70] },
    wind: { ideal: [0, 10], tolerable: [0, 20] },
    cloud: { ideal: [40, 100] },
    periods: ["dawn", "dusk"],
    pressure: { falling: 0.85, stable: 1, rising: 0.7 },
    strategy: {
      location: "Cold inflows, deeper shade lines and spring holes",
      presentation: "Small spoon, streamer or live bait fished slow and deep",
    },
    note: "Cold water is the whole game; they shut down as it warms.",
  },
  {
    id: "crappie",
    name: "Crappie",
    water: { ideal: [58, 72], tolerable: [45, 80] },
    wind: { ideal: [0, 9], tolerable: [0, 18] },
    cloud: { ideal: [20, 75] },
    periods: ["dawn", "dusk"],
    pressure: { falling: 0.85, stable: 1, rising: 0.7 },
    strategy: {
      location: "Brush, docks and standing timber in 6–15 ft",
      presentation: "Small jig or minnow under a float, fished slowly",
    },
    note: "Schooling fish — find one and you have found many.",
  },
  {
    id: "catfish",
    name: "Catfish",
    water: { ideal: [70, 85], tolerable: [55, 92] },
    wind: { ideal: [0, 14], tolerable: [0, 26] },
    cloud: { ideal: [0, 100] },
    periods: ["night", "dusk"],
    pressure: { falling: 0.9, stable: 0.95, rising: 0.8 },
    strategy: {
      location: "Deep holes, channel edges and below current breaks",
      presentation: "Cut bait or nightcrawler fished on the bottom",
    },
    note: "Warm water and darkness; the least fussy fish on this list.",
  },
  {
    id: "striped-bass",
    name: "Striped Bass",
    water: { ideal: [58, 72], tolerable: [45, 78] },
    wind: { ideal: [5, 18], tolerable: [0, 28] },
    cloud: { ideal: [20, 90] },
    periods: ["dawn", "dusk", "night"],
    pressure: { falling: 0.95, stable: 0.9, rising: 0.6 },
    strategy: {
      location: "Current rips, deep channel edges and bait schools",
      presentation: "Swimbait, live bait or a trolled deep-diving plug",
    },
    note: "Follows the bait; moving water beats still.",
  },
  {
    id: "salmon",
    name: "Salmon",
    water: { ideal: [46, 58], tolerable: [36, 66] },
    wind: { ideal: [3, 15], tolerable: [0, 26] },
    cloud: { ideal: [40, 100] },
    periods: ["dawn", "dusk"],
    pressure: { falling: 0.85, stable: 1, rising: 0.75 },
    strategy: {
      location: "Cold, deep water and river mouths; troll the thermocline",
      presentation: "Spoon or flasher-and-fly at depth",
    },
    note: "Cold water and low light; strongly seasonal.",
  },
];

export const DEFAULT_SPECIES_ID = "smallmouth-bass";

export function findSpecies(id: string): SpeciesProfile {
  return SPECIES.find((s) => s.id === id) ?? SPECIES[0];
}
