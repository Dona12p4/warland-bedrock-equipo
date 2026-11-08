import {umbralBuildingConfig as cfg} from './umbral-building-config.js';
// Exact material IDs. The item need not have been mined in this dimension.
const permanent=new Set(cfg.permanentBlocks??cfg.allowedBlocks??[]);
export const isPermanentUmbralBlock=id=>permanent.has(id);
