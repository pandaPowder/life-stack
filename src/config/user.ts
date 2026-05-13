import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface UserConfig {
  /** Your name, used in AI prompt context */
  userName: string;
  /** Spouse / partner / co-parent's name, used to filter messaging direction */
  partnerName: string;
  /** Children's first names, used to slice the parenting plan */
  children: string[];
  /** Brief description of your professional network (former employers, industry) */
  networkContext: string;
  /** How you want AI responses tailored — communication style, format preferences, etc. */
  communicationStyle: string;
}

const CONFIG_PATH = join(process.cwd(), 'user.config.json');

function loadConfig(): UserConfig {
  if (existsSync(CONFIG_PATH)) {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as UserConfig;
  }
  return {
    userName: process.env.USER_NAME ?? 'the user',
    partnerName: process.env.PARTNER_NAME ?? process.env.COPARENT_NAME ?? 'partner',
    children: process.env.CHILDREN?.split(',').map(s => s.trim()) ?? [],
    networkContext: process.env.NETWORK_CONTEXT ?? '',
    communicationStyle: '',
  };
}

export const userConfig: UserConfig = loadConfig();
