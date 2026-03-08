import type { ParentingPlan } from '../types/index.js';
export declare class AIService {
    private genAI;
    private model;
    constructor(apiKey: string);
    /**
     * Summarizes the raw school email text and Sway content.
     */
    generateParentingPlan(rawText: string): Promise<ParentingPlan>;
}
//# sourceMappingURL=ai.service.d.ts.map