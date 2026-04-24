"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROJECT_TYPE = exports.PROJECT_TYPES = void 0;
exports.normalizeProjectType = normalizeProjectType;
exports.PROJECT_TYPES = [
    'frontend',
    'backend',
    'tool',
    'desktop',
    'mobile',
    'fullstack',
];
exports.DEFAULT_PROJECT_TYPE = 'tool';
function normalizeProjectType(value) {
    if (!value) {
        return exports.DEFAULT_PROJECT_TYPE;
    }
    if (value === 'web') {
        return 'frontend';
    }
    if (value === 'api') {
        return 'backend';
    }
    if (exports.PROJECT_TYPES.includes(value)) {
        return value;
    }
    throw new Error(`Unsupported project type "${value}". Supported types: ${exports.PROJECT_TYPES.join(', ')}`);
}
