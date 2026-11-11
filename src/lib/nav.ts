/** Single source of truth for navigation + module build status (shown honestly in the UI). */
export type ModuleStatus = "live" | "partial" | "planned";
export interface NavItem {
  slug: string;
  href: string;
  label: string;
  icon: string; // lucide icon name
  status: ModuleStatus;
  phase: number;
  summary: string;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Zentrale", items: [
    { slug: "command-center", href: "/", label: "Command Center", icon: "LayoutDashboard", status: "live", phase: 1, summary: "Überblick über Tag, Aufgaben, Unternehmen und Systemstatus." },
    { slug: "jarvis", href: "/chat", label: "JARVIS AI", icon: "Sparkles", status: "live", phase: 1, summary: "Konversationelle KI mit Gedächtnis und Workspace-Kontext." },
    { slug: "my-day", href: "/my-day", label: "My Day", icon: "Sun", status: "live", phase: 2, summary: "Morgen-Briefing, Top-3-Prioritäten, empfohlene Zeitblöcke, Abend-Review mit Reflexion." },
    { slug: "tasks", href: "/tasks", label: "Tasks", icon: "CheckSquare", status: "live", phase: 1, summary: "Aufgaben mit Priorität, Fälligkeit, Workspace und Verschiebe-Erkennung." },
    { slug: "calendar", href: "/modules/calendar", label: "Calendar", icon: "Calendar", status: "planned", phase: 7, summary: "Google-/Apple-Kalender lesen (OAuth), Zeitblöcke vorschlagen, Termine nur mit Freigabe anlegen." },
  ]},
  { label: "Persönlich", items: [
    { slug: "discipline", href: "/discipline", label: "Discipline", icon: "Flame", status: "live", phase: 2, summary: "Habit-Tracking, Fokus-Sessions, Prokrastinationsmuster erkennen und Ursachen analysieren." },
    { slug: "goals", href: "/goals", label: "Goals", icon: "Target", status: "live", phase: 2, summary: "Ziele mit Meilensteinen, Fortschritt und Verknüpfung zu Aufgaben." },
    { slug: "finance", href: "/finance", label: "Personal Finance", icon: "Wallet", status: "live", phase: 2, summary: "Einnahmen, Ausgaben, Budgets, Sparziele, Szenarien. Manuelle Eingabe/CSV – keine automatische Bankverbindung." },
    { slug: "fitness", href: "/fitness", label: "Fitness", icon: "Dumbbell", status: "live", phase: 2, summary: "Trainingslog, Körperwerte mit Datum (alte Werte gelten nicht automatisch als aktuell)." },
    { slug: "university", href: "/university", label: "University", icon: "GraduationCap", status: "partial", phase: 2, summary: "Module, Prüfungen, Lernaufgaben, Notenschnitt. Analyse von Vorlesungsunterlagen folgt in Phase 3." },
  ]},
  { label: "Business", items: [
    { slug: "portfolio", href: "/business", label: "Business Portfolio", icon: "Briefcase", status: "partial", phase: 3, summary: "Alle Ventures mit eigenem Gedächtnis, Profil und Aufgaben. KPIs/Dashboards folgen in Phase 3." },
    { slug: "ngcx", href: "/business/ngcx", label: "NGCX", icon: "Hexagon", status: "partial", phase: 3, summary: "Decision Intelligence für IT-Dienstleister." },
    { slug: "venturesx", href: "/business/venturesx", label: "VenturesX", icon: "Rocket", status: "partial", phase: 3, summary: "Eigenständige Venture – Profil noch offen." },
    { slug: "research", href: "/modules/research", label: "Research Radar", icon: "Radar", status: "planned", phase: 3, summary: "Recherche mit Quellen und Datum, Trennung von Fakten/Interpretation/Annahmen. Keine erfundenen News." },
  ]},
  { label: "System", items: [
    { slug: "studio", href: "/modules/studio", label: "App & Software Studio", icon: "Code2", status: "planned", phase: 6, summary: "Apps, Websites und Spiele aus natürlicher Sprache – in isolierten Workspaces gebaut, getestet und als Vorschau geliefert." },
    { slug: "agents", href: "/agents", label: "Agent Center", icon: "Network", status: "partial", phase: 5, summary: "Aktivitätsprotokoll ist live. Executive Agent und Spezialisten folgen in Phase 5." },
    { slug: "memory", href: "/memory", label: "Memory Center", icon: "Brain", status: "live", phase: 1, summary: "Alles, was JARVIS weiß: suchen, bearbeiten, anheften, löschen, Verlauf, Export." },
    { slug: "integrations", href: "/integrations", label: "Integrations", icon: "Plug", status: "partial", phase: 7, summary: "Connector-Registry mit echtem Status." },
    { slug: "settings", href: "/settings", label: "Settings", icon: "Settings", status: "live", phase: 1, summary: "KI-Anbieter, Gedächtnis-Modus, Sprache." },
  ]},
];

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);
export const PHASE_NAMES: Record<number, string> = {
  1: "Foundation", 2: "Personal OS", 3: "Business Portfolio", 4: "Cross-Device & Voice",
  5: "Multi-Agent", 6: "Universal Builder", 7: "Connected Ecosystem", 8: "Advanced JARVIS",
};
