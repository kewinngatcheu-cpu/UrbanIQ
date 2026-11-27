/**
 * The 15 questions. Pure data – rendered by the survey UI and interpreted by
 * the engine (src/lib/engine/profile.ts). Option keys are stable identifiers
 * that are stored in the database; labels may be edited freely.
 */

export interface Option {
  key: string;
  label: string;
  hint?: string;
  /** Image library key for visual cards. */
  image?: string;
}

export type Part =
  | { kind: "single"; field: string; options: Option[]; layout?: "cards" | "list" | "quotes" }
  | { kind: "multi"; field: string; options: Option[]; min: number; max: number; layout?: "cards" | "chips" | "list" }
  | { kind: "slider"; field: string; label: string; min: number; max: number; minLabel: string; maxLabel: string; midLabel?: string }
  | { kind: "pairs"; field: string; pairs: { key: string; a: string; b: string }[] }
  | { kind: "text"; field: string; label: string; placeholder: string; maxLength: number };

export interface Question {
  id: QuestionId;
  number: string;
  title: string;
  prompt: string;
  note?: string;
  parts: Part[];
}

export type QuestionId =
  | "q1" | "q2" | "q3" | "q4" | "q5" | "q6" | "q7" | "q8" | "q9" | "q10" | "q11" | "q12" | "q13" | "q14" | "q15";

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    number: "01",
    title: "The Summer Vibe",
    prompt: "Wie soll sich unser gemeinsamer Sommerurlaub anfühlen?",
    note: "Maximal zwei auswählen.",
    parts: [
      {
        kind: "multi",
        field: "vibes",
        min: 1,
        max: 2,
        layout: "cards",
        options: [
          { key: "mediterranean", label: "Mediterranean Dream", hint: "Sonne, türkisblaues Wasser und mediterrane Architektur.", image: "oia2" },
          { key: "luxury", label: "Luxury Escape", hint: "Hochwertiges Hotel, Pool, gutes Essen und ein gehobenes Urlaubsgefühl.", image: "poolSeaView" },
          { key: "beach", label: "Beach Life", hint: "Strand, Beach Clubs, Musik und lange Sommertage.", image: "strawUmbrellas" },
          { key: "romantic", label: "Romantic Getaway", hint: "Sonnenuntergänge, Dinner am Meer und gemeinsame Zeit.", image: "oia" },
          { key: "explore", label: "Explore & Discover", hint: "Neue Orte entdecken und besondere Erlebnisse sammeln.", image: "blueLagoon" },
          { key: "social", label: "Summer Social", hint: "Junge Menschen, Restaurants, Musik und eine lebendige Atmosphäre.", image: "rivieraVillage" },
          { key: "relax", label: "Pure Relaxation", hint: "Entspannung, Hotelpool und Ruhe.", image: "poolTerrace" },
        ],
      },
    ],
  },
  {
    id: "q2",
    number: "02",
    title: "The Perfect Beach",
    prompt: "Wie sieht dein Traumstrand aus?",
    parts: [
      {
        kind: "single",
        field: "beach",
        layout: "cards",
        options: [
          { key: "whiteTurquoise", label: "Weißer Sand & türkisblaues Wasser", image: "shallowLagoon" },
          { key: "coves", label: "Kleine versteckte Buchten", image: "narrowCove" },
          { key: "club", label: "Eleganter Beach Club mit Liegen & Musik", image: "strawUmbrellas" },
          { key: "long", label: "Langer, weitläufiger Sandstrand", image: "coastalCity" },
          { key: "restaurants", label: "Strand mit Restaurants & Bars am Wasser", image: "seaTables" },
          { key: "variety", label: "Abwechslungsreiche Strände per Ausflug", image: "kayakCove" },
        ],
      },
      { kind: "slider", field: "beachImportance", label: "Wie wichtig ist dir die Strandqualität?", min: 1, max: 10, minLabel: "Nebensache", maxLabel: "Entscheidend" },
    ],
  },
  {
    id: "q3",
    number: "03",
    title: "Hotel Dream",
    prompt: "Wie stellst du dir unser Hotel vor?",
    parts: [
      {
        kind: "single",
        field: "hotel",
        layout: "list",
        options: [
          { key: "boutique4", label: "Modernes 4-Sterne-Boutiquehotel mit schönem Pool" },
          { key: "luxury5", label: "Luxuriöses 5-Sterne-Resort" },
          { key: "beachfront", label: "Stylisches Hotel direkt am Strand" },
          { key: "romanticDesign", label: "Kleines romantisches Designhotel" },
          { key: "relaxedModern", label: "Modernes Hotel mit entspannter Atmosphäre und schönem Außenbereich" },
          { key: "bigResort", label: "Großes Resort mit verschiedenen Restaurants und Aktivitäten" },
        ],
      },
      {
        kind: "multi",
        field: "hotelCriteria",
        min: 3,
        max: 3,
        layout: "chips",
        options: [
          { key: "pool", label: "Pool" },
          { key: "beachNear", label: "Strandnähe" },
          { key: "design", label: "Zimmerdesign" },
          { key: "breakfast", label: "Frühstück" },
          { key: "seaView", label: "Meerblick" },
          { key: "clean", label: "Sauberkeit" },
          { key: "service", label: "Service" },
          { key: "location", label: "Lage" },
        ],
      },
    ],
  },
  {
    id: "q4",
    number: "04",
    title: "Destination Atmosphere",
    prompt: "Welche Art von Urlaubsort gefällt dir am meisten?",
    parts: [
      {
        kind: "single",
        field: "atmosphere",
        layout: "cards",
        options: [
          { key: "livelyTown", label: "Lebendige Küstenstadt mit Restaurants und Promenade", image: "coastalCity" },
          { key: "romanticVillage", label: "Kleiner romantischer Ort mit mediterranem Charme", image: "italianVillage" },
          { key: "exclusiveCoast", label: "Exklusive Küstenregion mit schönen Hotels und Beach Clubs", image: "poolLoungers" },
          { key: "island", label: "Insel mit vielen Stränden und Ausflugsmöglichkeiten", image: "lindos" },
          { key: "historicCity", label: "Historische Stadt direkt am Meer", image: "dubrovnik" },
          { key: "modernIntl", label: "Moderne internationale Destination mit Architektur & Lifestyle", image: "dubaiNight" },
        ],
      },
    ],
  },
  {
    id: "q5",
    number: "05",
    title: "After Sunset",
    prompt: "Wie möchtest du deine Abende verbringen?",
    note: "Bis zu drei auswählen. Klassische Club- und Partyurlaube sind bewusst kein Hauptkriterium.",
    parts: [
      {
        kind: "multi",
        field: "evenings",
        min: 1,
        max: 3,
        layout: "list",
        options: [
          { key: "dinnerSea", label: "Romantisches Dinner am Meer" },
          { key: "rooftop", label: "Rooftop-Bar mit Musik und Aussicht" },
          { key: "beachBar", label: "Beach Bar mit DJ und Sonnenuntergang" },
          { key: "oldTown", label: "Spaziergang durch eine beleuchtete Altstadt" },
          { key: "promenade", label: "Promenade mit Restaurants, Musik und sommerlicher Stimmung" },
          { key: "cocktails", label: "Elegante Cocktailbars und Lounges" },
          { key: "liveMusic", label: "Live-Musik und Open-Air-Events" },
          { key: "hotel", label: "Entspannte Abende im Hotel" },
        ],
      },
    ],
  },
  {
    id: "q6",
    number: "06",
    title: "Our Perfect Day",
    prompt: "Wie sieht dein perfekter Urlaubstag aus?",
    parts: [
      {
        kind: "single",
        field: "day",
        layout: "list",
        options: [
          { key: "classic", label: "Frühstück, Strand, Mittagessen, Pool, Dinner und Abendspaziergang." },
          { key: "poolClub", label: "Ausschlafen, Hotelpool, Beach Club und eine schöne Bar." },
          { key: "excursion", label: "Frühstück, Ausflug, neue Strände entdecken und romantisches Dinner." },
          { key: "active", label: "Strand, Wassersport, Shopping und Musik am Abend." },
          { key: "mix", label: "Eine Mischung aus allem ohne festen Tagesplan." },
        ],
      },
    ],
  },
  {
    id: "q7",
    number: "07",
    title: "Exploration Level",
    prompt: "Wie viel möchtest du während der sieben Tage unternehmen?",
    parts: [
      {
        kind: "slider",
        field: "exploration",
        label: "Dein Erlebnis-Level",
        min: 1,
        max: 10,
        minLabel: "Hotel, Pool & Strand",
        midLabel: "Einige Ausflüge & Entspannung",
        maxLabel: "Jeden Tag Neues",
      },
    ],
  },
  {
    id: "q8",
    number: "08",
    title: "Crowd & Atmosphere",
    prompt: "Welche Atmosphäre bevorzugst du?",
    parts: [
      {
        kind: "single",
        field: "crowdVibe",
        layout: "list",
        options: [
          { key: "quietExclusive", label: "Ruhig und exklusiv" },
          { key: "relaxedRestaurants", label: "Entspannt mit ausreichend Restaurants" },
          { key: "youngLively", label: "Jung und lebendig, aber nicht überfüllt" },
          { key: "touristVaried", label: "Touristisch und abwechslungsreich" },
          { key: "mix", label: "Mischung aus ruhigen Stränden und lebendigen Orten" },
        ],
      },
      { kind: "slider", field: "avoidCrowds", label: "Wie wichtig ist es dir, Massentourismus zu vermeiden?", min: 1, max: 10, minLabel: "Egal", maxLabel: "Sehr wichtig" },
    ],
  },
  {
    id: "q9",
    number: "09",
    title: "Travel Comfort",
    prompt: "Wie weit darf unser Hotel vom Flughafen entfernt sein?",
    note: "Die gesamte Flugzeit ab Berlin fließt zusätzlich in die Bewertung ein.",
    parts: [
      {
        kind: "single",
        field: "transfer",
        layout: "list",
        options: [
          { key: "t30", label: "Maximal 30 Minuten" },
          { key: "t60", label: "30–60 Minuten" },
          { key: "t90", label: "60–90 Minuten" },
          { key: "t120", label: "Bis zu zwei Stunden" },
          { key: "tAny", label: "Auch längere Transfers sind akzeptabel" },
        ],
      },
    ],
  },
  {
    id: "q10",
    number: "10",
    title: "Budget Priorities",
    prompt: "Welches Gesamtbudget für zwei Personen inklusive Flug und Hotel bevorzugst du?",
    parts: [
      {
        kind: "single",
        field: "budget",
        layout: "list",
        options: [
          { key: "b1500", label: "1.500–1.800 €" },
          { key: "b1800", label: "1.800–2.000 €" },
          { key: "b2000", label: "2.000–2.250 €" },
          { key: "b2250", label: "2.250–2.500 €" },
          { key: "b2500", label: "2.500–2.800 €" },
          { key: "b3000", label: "Bis zu 3.000 €, wenn das Erlebnis außergewöhnlich ist" },
        ],
      },
      {
        kind: "multi",
        field: "invest",
        min: 0,
        max: 2,
        layout: "chips",
        options: [
          { key: "hotel", label: "Hotelqualität" },
          { key: "beach", label: "Strandqualität" },
          { key: "location", label: "Bessere Lage" },
          { key: "restaurants", label: "Restaurants" },
          { key: "excursions", label: "Ausflüge" },
          { key: "flight", label: "Flugkomfort" },
        ],
      },
    ],
  },
  {
    id: "q11",
    number: "11",
    title: "The Destination Moodboard",
    prompt: "Welche dieser Urlaubswelten spricht dich spontan am meisten an?",
    note: "Eine oder zwei Welten wählen – folge deinem Bauchgefühl.",
    parts: [
      {
        kind: "multi",
        field: "worlds",
        min: 1,
        max: 2,
        layout: "cards",
        options: [
          { key: "greek", label: "Greek Summer", hint: "Weiße Häuser, Buchten und türkises Wasser.", image: "oia" },
          { key: "italian", label: "Italian Riviera", hint: "Elegante Küstenorte und mediterrane Lebensart.", image: "positano" },
          { key: "arabian", label: "Arabian Luxury", hint: "Dubai, moderne Architektur und luxuriöse Hotels.", image: "dubaiNight" },
          { key: "tropical", label: "Tropical Paradise", hint: "Palmen, türkisblaues Wasser und exotische Strände.", image: "overwater" },
          { key: "adriatic", label: "Adriatic Escape", hint: "Kroatische Küsten und romantische Altstädte.", image: "dubrovnik" },
          { key: "asian", label: "Asian Summer", hint: "Exotische Inseln, besondere Hotels und fremde Kulturen.", image: "mayaBay" },
          { key: "northafrican", label: "North African Escape", hint: "Wunderschöne Resorts, Sonne und orientalische Atmosphäre.", image: "essaouiraBoats" },
          { key: "french", label: "French Riviera", hint: "Elegante Küstenorte, Restaurants und mediterraner Lifestyle.", image: "rivieraVillage" },
        ],
      },
    ],
  },
  {
    id: "q12",
    number: "12",
    title: "The Little Details",
    prompt: "Welche drei Dinge machen einen Urlaub besonders?",
    note: "Genau drei auswählen.",
    parts: [
      {
        kind: "multi",
        field: "details",
        min: 3,
        max: 3,
        layout: "chips",
        options: [
          { key: "sunsets", label: "Wunderschöne Sonnenuntergänge" },
          { key: "pool", label: "Hotelpool" },
          { key: "turquoise", label: "Türkisblaues Wasser" },
          { key: "romanticRestaurants", label: "Romantische Restaurants" },
          { key: "beachClubs", label: "Beach Clubs" },
          { key: "music", label: "Musik und sommerliche Abendstimmung" },
          { key: "oldTowns", label: "Kleine Altstädte" },
          { key: "photoSpots", label: "Besondere Fotospots" },
          { key: "boatTrips", label: "Bootsfahrten" },
          { key: "stylishRoom", label: "Stilvolles Hotelzimmer" },
          { key: "seaWalks", label: "Spaziergänge am Meer" },
          { key: "culinary", label: "Kulinarische Erlebnisse" },
        ],
      },
    ],
  },
  {
    id: "q13",
    number: "13",
    title: "The Perfect Compromise",
    prompt: "Entscheide dich jeweils zwischen zwei Möglichkeiten.",
    parts: [
      {
        kind: "pairs",
        field: "compromises",
        pairs: [
          { key: "c1", a: "Traumstrand mit wenig Nachtleben", b: "Lebendiger Urlaubsort mit etwas weniger spektakulärem Strand" },
          { key: "c2", a: "Luxuriöseres Hotel", b: "Schönere Umgebung mit mehr Ausflugsmöglichkeiten" },
          { key: "c3", a: "Ruhige romantische Atmosphäre", b: "Junge lebendige Sommerstimmung" },
          { key: "c4", a: "Inselurlaub", b: "Internationale Küstenstadt" },
          { key: "c5", a: "Teureres Urlaubsziel mit besonderem Hotel", b: "Günstigeres Urlaubsziel mit mehr Aktivitäten" },
        ],
      },
    ],
  },
  {
    id: "q14",
    number: "14",
    title: "Non-Negotiables",
    prompt: "Was darf auf keinen Fall fehlen?",
    note: "Maximal vier auswählen.",
    parts: [
      {
        kind: "multi",
        field: "musts",
        min: 0,
        max: 4,
        layout: "chips",
        options: [
          { key: "warm", label: "Warmes Wetter" },
          { key: "beach", label: "Schöner Strand" },
          { key: "water", label: "Kristallklares Wasser" },
          { key: "pool", label: "Schönes Hotel mit Pool" },
          { key: "transfer", label: "Kurzer Flughafentransfer" },
          { key: "food", label: "Gute Restaurants" },
          { key: "evening", label: "Musik und Abendstimmung" },
          { key: "uncrowded", label: "Keine überfüllten Urlaubsorte" },
          { key: "romance", label: "Romantische Atmosphäre" },
          { key: "excursions", label: "Ausflugsmöglichkeiten" },
          { key: "value", label: "Gutes Preis-Leistungs-Verhältnis" },
        ],
      },
      {
        kind: "text",
        field: "avoid",
        label: "Was möchtest du auf keinen Fall erleben?",
        placeholder: "z. B. Partyhochburg, extreme Hitze, lange Umstiege …",
        maxLength: 300,
      },
    ],
  },
  {
    id: "q15",
    number: "15",
    title: "The Final Dream",
    prompt: "Welcher Satz beschreibt deinen perfekten Sommerurlaub am besten?",
    parts: [
      {
        kind: "single",
        field: "dream",
        layout: "quotes",
        options: [
          { key: "turquoise", label: "I want us to wake up somewhere beautiful, spend the day by turquoise water and watch the sunset together." },
          { key: "luxury", label: "I want a beautiful hotel, a stunning pool, great food and a feeling of luxury." },
          { key: "explore", label: "I want us to explore a beautiful destination and discover hidden places." },
          { key: "lively", label: "I want beautiful beaches, music, restaurants and a lively summer atmosphere." },
          { key: "romantic", label: "I want a romantic escape where everything feels relaxed and special." },
          { key: "everything", label: "I want the perfect combination of everything." },
        ],
      },
      { kind: "slider", field: "excitement", label: "How excited are you for our Summer Escape 2027?", min: 1, max: 10, minLabel: "Curious", maxLabel: "Counting the days" },
    ],
  },
];

export const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q])) as Record<QuestionId, Question>;
