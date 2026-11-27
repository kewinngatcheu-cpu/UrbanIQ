/**
 * Image library (Unsplash License – free to use, attribution appreciated).
 * Each image was visually checked. Images are MOOD IMAGES for the visual
 * world of a destination; not every picture shows the exact place. The UI
 * labels them accordingly. To use a destination-specific photo, add an entry
 * here and reference its key in data.ts.
 */
export interface LibraryImage {
  /** Unsplash photo id ("photo-…"). */
  id: string;
  credit: string;
  /** What the image actually shows. */
  alt: string;
}

export const IMAGES: Record<string, LibraryImage> = {
  lindos: { id: "photo-1588796503044-0a7c50edbd12", credit: "Antonio Magrì", alt: "Türkisfarbene Bucht unter Felsen mit Akropolis" },
  balos: { id: "photo-1572375901777-1b257481cbb0", credit: "Vlad Kiselov", alt: "Lagune zwischen Felsen aus der Luft" },
  clearbeach: { id: "photo-1664118145742-f2ad1c09c10b", credit: "Tobias Jetter", alt: "Kristallklares türkises Wasser am Strand" },
  seaTables: { id: "photo-1602584386319-fa8eb4361c2c", credit: "Despina Galani", alt: "Tische direkt am Wasser in einem Kykladen-Hafen" },
  whiteVillage: { id: "photo-1527108097555-a5c5e36f3dd0", credit: "Serhat Beyazkaya", alt: "Weiße Häuser am Hang über dem Meer" },
  ionianTown: { id: "photo-1587974136998-4fcc253b6183", credit: "CALIN STAN", alt: "Küstenort mit kleiner Insel im Ionischen Meer" },
  oia: { id: "photo-1580502304784-8985b7eb7260", credit: "James Ting", alt: "Oia auf Santorini im Abendlicht" },
  oia2: { id: "photo-1570077188670-e3a8d69ac5ff", credit: "Pretty Pink", alt: "Weiß-blaue Kykladenarchitektur" },
  cycladesSteps: { id: "photo-1533105079780-92b9be482077", credit: "Ryan Spencer", alt: "Weiße Treppen und blaues Meer" },
  littleVenice: { id: "photo-1601581875309-fafbf2d3ed3a", credit: "Johnny Africa", alt: "Terrasse am Meer in Mykonos" },
  positano: { id: "photo-1561956021-947f09ae0101", credit: "Jordan Steranka", alt: "Positano an der Amalfiküste" },
  positanoNight: { id: "photo-1583844056361-4418a8f2a985", credit: "Sebastian Leonhardt", alt: "Positano beleuchtet in der Dämmerung" },
  italianVillage: { id: "photo-1568282167464-cb0d811b05c2", credit: "Letizia Agosta", alt: "Italienischer Küstenort am Hang" },
  italianHouses: { id: "photo-1530476219733-88085e45aa2c", credit: "Sander Crombach", alt: "Häuser über dem Meer an einer italienischen Steilküste" },
  dubaiNight: { id: "photo-1765801122549-2c11dc9cbd78", credit: "Dawid Tkocz", alt: "Dubai Marina bei Nacht" },
  burjAlArab: { id: "photo-1518684079-3c830dcef090", credit: "Christoph Schulz", alt: "Burj Al Arab, Dubai" },
  dubaiSkyline: { id: "photo-1611577810610-642f8ac05c32", credit: "Emma Harrisova", alt: "Hochhäuser am Wasser in Dubai" },
  abuDhabi: { id: "photo-1615747476328-41153cf6da54", credit: "Ismail Merad", alt: "Moderne weiße Architektur" },
  overwater: { id: "photo-1514282401047-d79a71a590e8", credit: "Ishan @seefromthesky", alt: "Wasserbungalows auf den Malediven" },
  islandResort: { id: "photo-1573843981267-be1999ff37cd", credit: "Rayyu Maldives", alt: "Inselresort aus der Luft" },
  shallowLagoon: { id: "photo-1759676015346-a2ea5f4a3caa", credit: "Adam Juman", alt: "Glasklares flaches Wasser und Palmen" },
  palms: { id: "photo-1547528114-f4daa226e256", credit: "Ekmed Ali", alt: "Kokospalmen am Strand" },
  dubrovnikWalls: { id: "photo-1555990793-da11153b2473", credit: "Spencer Davis", alt: "Altstadt von Dubrovnik aus der Luft" },
  dubrovnik: { id: "photo-1414862625453-d87604a607e4", credit: "Ivan Ivankovic", alt: "Dubrovnik mit Stadtmauer am Meer" },
  kayakCove: { id: "photo-1565784623727-8cebf4712b2d", credit: "Cat Bassano", alt: "Kajaks in einer grünen Bucht" },
  redSeaPalms: { id: "photo-1665643956022-ee053e925743", credit: "Omar Elsharawy", alt: "Strand mit Palmen am Roten Meer" },
  whiteSand: { id: "photo-1630328640617-e240b76ec179", credit: "Jean-Baptiste D.", alt: "Weißer Sandstrand und helles Wasser" },
  redSeaBeach: { id: "photo-1566288592686-d91a0b04e0e0", credit: "Kévin et Laurianne Langlais", alt: "Strandschirme an der Wüstenküste" },
  mayaBay: { id: "photo-1534008897995-27a23e859048", credit: "Mulberry Digital", alt: "Maya Bay zwischen Kalksteinfelsen" },
  phiPhi: { id: "photo-1589394815804-964ed0be2eb5", credit: "Mike Swigunski", alt: "Boote vor Kalksteinfelsen in Thailand" },
  longtails: { id: "photo-1552465011-b4e21bf6e79a", credit: "Sumit Chinchane", alt: "Longtail-Boote am Strand" },
  karst: { id: "photo-1494949360228-4e9bde560065", credit: "Marcin Kaliński", alt: "Felsinsel mit Longtail-Boot" },
  rivieraBay: { id: "photo-1763113975476-e9037317497f", credit: "Philippe Bontemps", alt: "Küstenort an türkiser Bucht" },
  rivieraVillage: { id: "photo-1782039148032-09b0a07d8e04", credit: "Rich Martello", alt: "Panorama eines Riviera-Dorfes über dem Mittelmeer" },
  stripedUmbrellas: { id: "photo-1759849403075-7ab5be114053", credit: "Kamilla Isalieva", alt: "Gestreifte Sonnenschirme am Strand" },
  poolLoungers: { id: "photo-1693933714044-131908e39427", credit: "Lisha Riabinina", alt: "Liegen am Hotelpool" },
  coastalCity: { id: "photo-1773146818214-cd5b7fe42152", credit: "Aysegul Aytören", alt: "Küstenstadt mit langem Sandstrand" },
  cliffBeach: { id: "photo-1513073945753-eb763d2a99de", credit: "Serdar Dincer", alt: "Strand unter Felsklippen" },
  blueLagoon: { id: "photo-1569660073216-1a6762baad6a", credit: "Artem Bryzgalov", alt: "Blaue Lagune mit Booten unter Bergen" },
  poolTerrace: { id: "photo-1780914149187-c4f302dafbb0", credit: "Pavel Gromov", alt: "Resort-Pool mit Garten" },
  poolSeaView: { id: "photo-1598598795006-ea2174659eaa", credit: "Bhumil Chheda", alt: "Hotelpool mit Meerblick" },
  greenCoast: { id: "photo-1570799088236-903069fde316", credit: "Alev Takil", alt: "Strand vor grünen Bergen" },
  islandTown: { id: "photo-1767045572136-868c9407818b", credit: "Alexis Presa", alt: "Küstenort mit Strand am Hügel" },
  pineCove: { id: "photo-1537042145424-98c3022ed567", credit: "Marc Schadegg", alt: "Türkise Bucht hinter Pinienzweigen" },
  cala: { id: "photo-1672264430465-781cd9154896", credit: "Artem Zhukov", alt: "Felsbucht mit klarem Wasser" },
  narrowCove: { id: "photo-1734639403228-476663647bcf", credit: "Chloé Lefleur", alt: "Schmale Bucht mit türkisem Wasser" },
  ksamil: { id: "photo-1742244214797-4e3856333d70", credit: "Unsplash", alt: "Strand mit Hotels und türkisem Wasser an der albanischen Riviera" },
  ksamilAerial: { id: "photo-1758838344709-9414ca9dadc3", credit: "Unsplash", alt: "Strandbuchten mit Schirmen aus der Luft" },
  ksamilBoats: { id: "photo-1653982969676-2408ca464041", credit: "Unsplash", alt: "Türkises Wasser mit Booten und Schirmen" },
  strawUmbrellas: { id: "photo-1723445734447-208cc4e0d959", credit: "Unsplash", alt: "Strohschirme am Sandstrand" },
  islets: { id: "photo-1529776554120-56027bd36834", credit: "Unsplash", alt: "Kleine Inseln vor der Küste" },
  montenegroBay: { id: "photo-1785177638809-6c9f22f6ceb9", credit: "Ruben Aster", alt: "Küstenort an türkiser Bucht in Montenegro" },
  montenegroTown: { id: "photo-1760294440763-0dd85aa722b9", credit: "Ruben Aster", alt: "Küstenort mit Segelbooten in der Bucht" },
  kotor: { id: "photo-1614122027743-50a9e6e8002f", credit: "olga brajnovic", alt: "Bucht von Kotor aus der Höhe" },
  kotorChurch: { id: "photo-1615352916571-99807ec84e29", credit: "Radik Sitdikov", alt: "Kirchturm an der Bucht" },
  perast: { id: "photo-1502824420498-012d4c4f0c42", credit: "Faruk Kaymak", alt: "Steinhäuser am Wasser" },
  shanghai: { id: "photo-1474181487882-5abf3f0ba6c2", credit: "Li Yang", alt: "Shanghai Skyline bei Nacht" },
  shanghaiSunset: { id: "photo-1545893835-abaa50cbe628", credit: "Freeman Zhou", alt: "Lujiazui-Skyline im Abendlicht" },
  essaouiraBoats: { id: "photo-1565985482571-03a42ea59d80", credit: "Emma Van Sant", alt: "Blaue Fischerboote im Hafen von Essaouira" },
  essaouiraHarbour: { id: "photo-1646590640485-df729f1bcfed", credit: "Youssef Aboutaleb", alt: "Hafenbecken mit Booten" },
  ramparts: { id: "photo-1743963790208-07ce117cdfc6", credit: "Dimitri Ana", alt: "Stadtmauer am Atlantik" },
  camelBeach: { id: "photo-1613057157282-cc3cbe630b26", credit: "Peter Schulz", alt: "Kamele am Atlantikstrand" },
  atlanticCliffs: { id: "photo-1757440156710-574dcfae0bcc", credit: "Mick Waanders", alt: "Steilküste mit Wasserfall am Atlantik" },
  greenMountains: { id: "photo-1628413283166-a7666966d26b", credit: "Colin Watts", alt: "Grüne Berge über dem Ozean" },
};

export function imageUrl(key: string, width = 1200): string {
  // Self-contained builds (Claude artifact) inline images as data URIs.
  const inlined = (globalThis as { __SE_IMAGES?: Record<string, string> }).__SE_IMAGES;
  if (inlined) return inlined[key] ?? inlined.clearbeach;
  const img = IMAGES[key] ?? IMAGES.clearbeach;
  return `https://images.unsplash.com/${img.id}?w=${width}&q=72&auto=format&fit=crop`;
}

export function imageCredit(key: string): string {
  return (IMAGES[key] ?? IMAGES.clearbeach).credit;
}
