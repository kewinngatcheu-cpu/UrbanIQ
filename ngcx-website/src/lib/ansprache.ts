import { ANSPRACHE } from '../config';

/** Gibt je nach zentraler Ansprache (config.ts) die ihr- oder Sie-Variante zurück. */
export const t = (ihr: string, sie: string): string => (ANSPRACHE === 'sie' ? sie : ihr);
