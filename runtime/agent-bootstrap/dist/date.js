"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayString = getTodayString;
exports.getIsoTimestamp = getIsoTimestamp;
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function getIsoTimestamp() {
    return new Date().toISOString();
}
